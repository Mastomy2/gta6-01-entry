// Solmar Bay — generator kota: jalan grid, blok bangunan, teluk, pantai, palem.
import { WORLD, DISTRICTS } from './config.js';
import { makeRng, clamp } from './random.js';

export function roadXs() {
  const xs = [];
  for (let i = 0; i < WORLD.roadCountX; i++) xs.push(WORLD.roadFirstX + i * WORLD.roadGapX);
  return xs;
}
export function roadYs() {
  const ys = [];
  for (let i = 0; i < WORLD.roadCountY; i++) ys.push(WORLD.roadFirstY + i * WORLD.roadGapY);
  return ys;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    const r = d.rect;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return d;
  }
  return DISTRICTS[2];
}

export function isOnRoad(x, y) {
  const half = WORLD.roadWidth / 2;
  for (const rx of roadXs()) if (Math.abs(x - rx) <= half) return true;
  for (const ry of roadYs()) if (Math.abs(y - ry) <= half) return true;
  return false;
}

// Titik jalan terdekat (snap ke garis tengah jalan).
export function nearestRoadPoint(x, y) {
  let bestX = roadXs()[0], bestD = Infinity;
  for (const rx of roadXs()) { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; bestX = rx; } }
  let bestY = roadYs()[0]; bestD = Infinity;
  for (const ry of roadYs()) { const d = Math.abs(y - ry); if (d < bestD) { bestD = d; bestY = ry; } }
  const dx = Math.abs(x - bestX), dy = Math.abs(y - bestY);
  return dx < dy ? { x: bestX, y } : { x, y: bestY };
}

export function randomRoadPoint(rng) {
  const xs = roadXs(), ys = roadYs();
  if (rng.chance(0.5)) return { x: rng.pick(xs), y: rng.range(160, WORLD.height - 160) };
  return { x: rng.range(160, WORLD.width - 160), y: rng.pick(ys) };
}

const ROOF_COLORS = ['#b8a88a', '#9a8f7a', '#c2b49a', '#8f9aa8', '#a88f7a', '#7a8a9a'];
const WALL_COLORS = ['#d8cbb2', '#cbb89a', '#bfae94', '#d8d2c2', '#c2b2a2', '#aeb8c2'];
const PALETTE = ['#e8e2d2', '#d8cbb2', '#cbb89a'];

export function createWorld(seed) {
  const rng = makeRng(seed);
  const xs = roadXs(), ys = roadYs();
  const buildings = [];
  const palms = [];
  const containers = [];
  const yachts = [];

  // Bangunan: satu atau dua per blok jalan.
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const bx = xs[i] + WORLD.roadWidth / 2 + 14;
      const by = ys[j] + WORLD.roadWidth / 2 + 14;
      const bw = WORLD.roadGapX - WORLD.roadWidth - 28;
      const bh = WORLD.roadGapY - WORLD.roadWidth - 28;
      const d = districtAt(bx + bw / 2, by + bh / 2);
      if (d.id === 'beach') continue; // strip pantai: boardwalk, bukan blok
      const count = rng.chance(0.35) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = count === 2 ? bw / 2 - 8 : bw;
        const h = count === 2 ? bh : bh;
        const x = count === 2 ? bx + k * (bw / 2 + 8) : bx;
        const tall = d.id === 'downtown' && rng.chance(0.55);
        const roof = rng.chance(0.16) ? 'pool' : rng.chance(0.10) ? 'helipad' : 'plain';
        buildings.push({
          x, y: by, w, h,
          wall: rng.pick(WALL_COLORS), roof: rng.pick(ROOF_COLORS),
          height: tall ? rng.int(3, 6) : rng.int(1, 2),
          roofProp: roof, district: d.id,
          windows: rng.int(2, 5),
        });
      }
      // Palem di sudut blok (lebih rapat di beach & marina).
      if (rng.chance(d.id === 'marina' ? 0.7 : 0.4)) {
        palms.push({ x: bx + rng.range(10, bw - 10), y: by + rng.range(10, bh - 10) });
      }
    }
  }

  // Boardwalk pantai: deret palem + kios di strip utara.
  for (let x = 160; x < WORLD.width - 120; x += 130) {
    palms.push({ x: x + rng.range(-20, 20), y: 400 + rng.range(-14, 14) });
    if (rng.chance(0.3)) {
      buildings.push({ x, y: 300, w: 46, h: 34, wall: rng.pick(PALETTE), roof: '#e8a13a',
        height: 1, roofProp: 'plain', district: 'beach', windows: 1, kiosk: true });
    }
  }

  // Teluk barat: deret yacht di air.
  for (let i = 0; i < 7; i++) {
    yachts.push({ x: 34 + rng.range(0, 40), y: 560 + i * 260 + rng.range(-40, 40), angle: rng.range(-0.3, 0.3) });
  }

  // Kontainer di docks.
  for (let i = 0; i < 26; i++) {
    containers.push({
      x: rng.range(2320, 3300), y: rng.range(560, 2500),
      w: 64, h: 26, color: rng.pick(['#c96a3a', '#3a7ac9', '#4a9a4a', '#c9a13a', '#8a5fc9']),
    });
  }

  // Zebra cross di setiap persimpangan.
  const crossings = [];
  for (const rx of xs) for (const ry of ys) crossings.push({ x: rx, y: ry });

  // Titik spawn: garasi plaza downtown.
  const spawn = { x: 1220, y: 880, angle: Math.PI / 2 };

  return { seed, buildings, palms, containers, yachts, crossings, spawn };
}

// Apakah titik (x,y) menabrak bangunan? Kembalikan bangunan itu atau null.
export function hitBuilding(world, x, y, pad) {
  for (const b of world.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

// Dorong lingkaran keluar dari bangunan; kembalikan true bila bertabrakan.
export function resolveBuildingCollision(world, obj, radius) {
  const b = hitBuilding(world, obj.x, obj.y, radius * 0.5);
  if (!b) return false;
  const cx = clamp(obj.x, b.x, b.x + b.w);
  const cy = clamp(obj.y, b.y, b.y + b.h);
  const dx = obj.x - cx, dy = obj.y - cy;
  const d = Math.hypot(dx, dy) || 0.001;
  const push = radius - d;
  if (push > 0) { obj.x += (dx / d) * push; obj.y += (dy / d) * push; }
  return true;
}
