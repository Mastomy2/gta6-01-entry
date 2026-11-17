// Solmar Bay: the city itself. A fixed 3200x2400 world with a road grid, a
// beach and sea on the east edge, a pier, and named blocks (bank, garage,
// safehouse, hospital). Buildings are generated from a seeded RNG so the map
// is identical every run. Collision and road queries live here.

export const WORLD = { width: 3200, height: 2400 };

// Road centre lines (horizontal and vertical), each 120 px wide.
export const ROADS_X = [400, 1000, 1600, 2200, 2800];
export const ROADS_Y = [400, 900, 1400, 1900];
export const ROAD_W = 120;

export const PLACES = {
  spawn: { x: 1000, y: 900, label: 'Solmar Bay' },
  garage: { x: 400, y: 1900, label: 'Rico\'s Garage' },
  pier: { x: 3060, y: 1400, label: 'Marina Pier' },
  bank: { x: 1600, y: 900, label: 'Bay Trust Bank' },
  safehouse: { x: 2800, y: 400, label: 'Safehouse' },
  hospital: { x: 2200, y: 1900, label: 'St. Marina Hospital' },
  plaza: { x: 1600, y: 1400, label: 'Plaza del Sol' },
};

const BUILDING_COLORS = ['#c98f5f', '#b5764a', '#8fa3b8', '#a8b8c8', '#d9a066', '#7f96ad', '#e0b183', '#93a8bd'];

function mulberry32(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCity() {
  const rand = mulberry32(20261124);
  const buildings = [];
  const xs = [0, ...ROADS_X, WORLD.width];
  const ys = [0, ...ROADS_Y, WORLD.height];
  // Each block between roads holds 1-4 buildings, leaving the named places clear.
  for (let bx = 0; bx < xs.length - 1; bx += 1) {
    for (let by = 0; by < ys.length - 1; by += 1) {
      const x0 = xs[bx] + (bx === 0 ? 20 : ROAD_W / 2 + 24);
      const x1 = xs[bx + 1] - (bx === xs.length - 2 ? 20 : ROAD_W / 2 + 24);
      const y0 = ys[by] + (by === 0 ? 20 : ROAD_W / 2 + 24);
      const y1 = ys[by + 1] - (by === ys.length - 2 ? 20 : ROAD_W / 2 + 24);
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const count = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i += 1) {
        const w = 90 + rand() * Math.max(40, (x1 - x0) / count - 100);
        const h = 80 + rand() * Math.max(30, (y1 - y0) - 100);
        const x = x0 + rand() * Math.max(1, x1 - x0 - w);
        const y = y0 + rand() * Math.max(1, y1 - y0 - h);
        const rect = { x, y, w, h, color: BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)], height: 20 + rand() * 60 };
        // Keep the named places and the spawn clear of buildings.
        let clear = true;
        for (const key of Object.keys(PLACES)) {
          const p = PLACES[key];
          if (p.x > rect.x - 90 && p.x < rect.x + rect.w + 90 && p.y > rect.y - 90 && p.y < rect.y + rect.h + 90) clear = false;
        }
        if (clear) buildings.push(rect);
      }
    }
  }
  // The bank is a big landmark building right on its corner.
  buildings.push({ x: 1660, y: 820, w: 150, h: 110, color: '#e8d9a0', height: 90, landmark: 'BANK' });
  buildings.push({ x: 340, y: 1840, w: 110, h: 90, color: '#7fae8a', height: 40, landmark: 'GARAGE' });
  buildings.push({ x: 2740, y: 330, w: 110, h: 90, color: '#c97f7f', height: 45, landmark: 'SAFE' });

  return { buildings, rand };
}

export function isOnRoad(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y }; }
  }
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry }; }
  }
  return best;
}

export function hitsBuilding(city, x, y, r) {
  if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

// Slide a circle along walls: try the full move, then each axis alone.
export function moveWithCollision(city, x, y, dx, dy, r) {
  if (!hitsBuilding(city, x + dx, y + dy, r)) return { x: x + dx, y: y + dy };
  if (!hitsBuilding(city, x + dx, y, r)) return { x: x + dx, y };
  if (!hitsBuilding(city, x, y + dy, r)) return { x, y: y + dy };
  return { x, y };
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function randomRoadPoint(rand) {
  if (rand() < 0.5) {
    return { x: ROADS_X[Math.floor(rand() * ROADS_X.length)], y: 60 + rand() * (WORLD.height - 120) };
  }
  return { x: 60 + rand() * (WORLD.width - 120), y: ROADS_Y[Math.floor(rand() * ROADS_Y.length)] };
}
