// Solmar Bay — the city itself.
// One job: build the map (roads, blocks, buildings, beach, plaza, park,
// props) and answer the questions gameplay asks about it: is this point a
// road, is it inside a building, where is the nearest road.

import {
  WORLD_W, WORLD_H, ROAD_W, V_ROADS, H_ROADS, BEACH_Y, WATER_Y,
  PLAZA, PARK, PALETTE,
} from './config.js';
import { makeRng, range, intRange, pick, chance } from './random.js';

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    seed,
    buildings: [],
    lamps: [],
    hydrants: [],
    palms: [],
    zebras: [],
    pools: [],
    helipad: null,
    fountain: { x: PLAZA.cx, y: PLAZA.cy, r: 42 },
  };

  // Blocks are the rectangles between neighbouring roads. Each block gets
  // buildings unless it is the plaza, the park, or the beach strip.
  const xs = [0, ...V_ROADS, WORLD_W];
  const ys = [0, ...H_ROADS, WORLD_H];
  const roofColors = [PALETTE.buildingRoof, PALETTE.buildingRoof2, PALETTE.buildingRoof3];
  for (let bi = 0; bi < xs.length - 1; bi++) {
    for (let bj = 0; bj < ys.length - 1; bj++) {
      const bx = xs[bi] + ROAD_W / 2 + 26;
      const by = ys[bj] + ROAD_W / 2 + 26;
      const bw = xs[bi + 1] - ROAD_W / 2 - 26 - bx;
      const bh = ys[bj + 1] - ROAD_W / 2 - 26 - by;
      if (bw < 90 || bh < 90) continue;
      // Plaza block.
      if (bx < PLAZA.x + PLAZA.w && bx + bw > PLAZA.x && by < PLAZA.y + PLAZA.h && by + bh > PLAZA.y) continue;
      // Park block.
      if (bx < PARK.x + PARK.w && bx + bw > PARK.x && by < PARK.y + PARK.h && by + bh > PARK.y) continue;
      // Beach strip: nothing built south of the beach line.
      if (by + bh > BEACH_Y - 40) continue;
      const count = bw > 300 && bh > 220 && chance(rng, 0.55) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        let w, h, x, y;
        if (count === 1) {
          w = range(rng, bw * 0.55, bw * 0.8);
          h = range(rng, bh * 0.55, bh * 0.8);
          x = bx + (bw - w) / 2;
          y = by + (bh - h) / 2;
        } else if (k === 0) {
          w = bw * 0.44;
          h = bh * 0.8;
          x = bx;
          y = by + bh * 0.1;
        } else {
          w = bw * 0.44;
          h = bh * 0.8;
          x = bx + bw * 0.56;
          y = by + bh * 0.1;
        }
        const roof = pick(rng, roofColors);
        const building = { x, y, w, h, roof, pool: false, helipad: false };
        if (chance(rng, 0.22) && w > 150 && h > 120) {
          building.pool = true;
          world.pools.push({ x: x + w * 0.55, y: y + h * 0.2, w: w * 0.32, h: h * 0.5 });
        }
        world.buildings.push(building);
      }
    }
  }

  // Helipad on the biggest north-east roof.
  let best = null;
  for (const b of world.buildings) {
    if (b.x > 2400 && b.y < 700 && (!best || b.w * b.h > best.w * best.h)) best = b;
  }
  if (best) {
    best.helipad = true;
    world.helipad = { x: best.x + best.w / 2, y: best.y + best.h / 2, r: Math.min(best.w, best.h) * 0.32 };
  }

  // Street lamps along every road, on the sidewalk edge.
  for (const x of V_ROADS) {
    for (let y = 120; y < WORLD_H - 100; y += 280) {
      world.lamps.push({ x: x - ROAD_W / 2 - 14, y });
      world.lamps.push({ x: x + ROAD_W / 2 + 14, y: y + 140 });
    }
  }
  for (const y of H_ROADS) {
    for (let x = 120; x < WORLD_W - 100; x += 280) {
      world.lamps.push({ x, y: y - ROAD_W / 2 - 14 });
      world.lamps.push({ x: x + 140, y: y + ROAD_W / 2 + 14 });
    }
  }

  // Fire hydrants near random corners.
  for (let i = 0; i < 26; i++) {
    const vx = pick(rng, V_ROADS);
    const hy = pick(rng, H_ROADS);
    world.hydrants.push({
      x: vx + (chance(rng, 0.5) ? -1 : 1) * (ROAD_W / 2 + 22),
      y: hy + (chance(rng, 0.5) ? -1 : 1) * (ROAD_W / 2 + 22),
    });
  }

  // Palms: a row along Ocean Drive and a scatter through the park.
  for (let x = 180; x < WORLD_W - 100; x += 170) {
    world.palms.push({ x: x + range(rng, -20, 20), y: BEACH_Y - 70 + range(rng, -14, 14) });
  }
  for (let i = 0; i < 18; i++) {
    world.palms.push({
      x: PARK.x + range(rng, 30, PARK.w - 30),
      y: PARK.y + range(rng, 30, PARK.h - 30),
    });
  }
  for (let i = 0; i < 8; i++) {
    world.palms.push({
      x: range(rng, 120, WORLD_W - 120),
      y: range(rng, BEACH_Y + 30, WATER_Y - 30),
    });
  }

  // Zebra crossings at every intersection.
  for (const x of V_ROADS) {
    for (const y of H_ROADS) {
      world.zebras.push({ x, y });
    }
  }

  return world;
}

export function isOnRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

export function isOnBeach(x, y) {
  return y >= BEACH_Y && y < WATER_Y;
}

export function isInWater(x, y) {
  return y >= WATER_Y;
}

// True when the point is inside any building (inflated a little).
export function isBlocked(world, x, y, pad = 6) {
  for (const b of world.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return true;
  }
  return false;
}

export function clampToWorld(x, y, margin = 24) {
  return {
    x: Math.max(margin, Math.min(WORLD_W - margin, x)),
    y: Math.max(margin, Math.min(WORLD_H - margin, y)),
  };
}

// Nearest point on any road centreline, for spawning traffic and cops.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of V_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, axis: 'v', road: rx }; }
  }
  for (const ry of H_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, axis: 'h', road: ry }; }
  }
  return best;
}

// A random point on a sidewalk beside a road (for pedestrians).
export function randomSidewalkPoint(rng) {
  if (chance(rng, 0.5)) {
    const rx = pick(rng, V_ROADS);
    return { x: rx + (chance(rng, 0.5) ? -1 : 1) * (ROAD_W / 2 + 26), y: range(rng, 80, WORLD_H - 80) };
  }
  const ry = pick(rng, H_ROADS);
  return { x: range(rng, 80, WORLD_W - 80), y: ry + (chance(rng, 0.5) ? -1 : 1) * (ROAD_W / 2 + 26) };
}

// A random point on a road (for traffic spawn).
export function randomRoadPoint(rng) {
  if (chance(rng, 0.5)) {
    return { x: pick(rng, V_ROADS), y: range(rng, 80, WORLD_H - 80), axis: 'v' };
  }
  return { x: range(rng, 80, WORLD_W - 80), y: pick(rng, H_ROADS), axis: 'h' };
}

export function randomParkedSpot(rng) {
  // Parked along a roadside, clear of intersections.
  const rx = pick(rng, V_ROADS);
  const side = chance(rng, 0.5) ? -1 : 1;
  let y = range(rng, 140, WORLD_H - 140);
  for (const hy of H_ROADS) if (Math.abs(y - hy) < 110) y += 130;
  return { x: rx + side * (ROAD_W / 2 - 16), y, angle: side > 0 ? Math.PI / 2 : -Math.PI / 2 };
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Shortest signed turn from angle a to angle b.
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
