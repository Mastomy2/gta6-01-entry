// Pedestrians: ordinary people walking the sidewalks of Solmar Bay. They
// stroll along the road edges, chat at corners, and run away screaming (in
// particles and motion, not in text) when shots are fired or a car speeds
// at them. Some carry cash or ammo pickups when they are startled.

import { ROADS_X, ROADS_Y, WORLD, dist, moveWithCollision } from './city.js';

const PED_COLORS = ['#f2e6c9', '#c9d6f2', '#f2c9d8', '#c9f2d4', '#e8d9a0', '#d8c9f2'];

function mulberry32(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function spawnPedestrians(G, count) {
  const rand = mulberry32(4242);
  for (let i = 0; i < count; i += 1) {
    const horizontal = rand() < 0.5;
    let x;
    let y;
    if (horizontal) {
      x = 60 + rand() * (WORLD.width - 120);
      y = ROADS_Y[Math.floor(rand() * ROADS_Y.length)] + (rand() < 0.5 ? -78 : 78);
    } else {
      x = ROADS_X[Math.floor(rand() * ROADS_X.length)] + (rand() < 0.5 ? -78 : 78);
      y = 60 + rand() * (WORLD.height - 120);
    }
    G.peds.push({
      x, y,
      angle: rand() * Math.PI * 2,
      speed: 45 + rand() * 35,
      fleeing: false,
      fleeTimer: 0,
      color: PED_COLORS[Math.floor(rand() * PED_COLORS.length)],
      dead: false,
      driver: false,
      walkPhase: rand() * Math.PI * 2,
    });
  }
}

export function updatePedestrians(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    const dPlayer = dist(ped, p);
    const playerCar = G.playerCar;
    const carSpeed = playerCar ? Math.abs(playerCar.speed) : 0;
    // Flee from gunfire, a speeding car, or a nearby wanted chase.
    if (G.playerShooting || (playerCar && dPlayer < 120 && carSpeed > 200) || (G.wanted >= 3 && dPlayer < 140)) {
      if (!ped.fleeing) {
        ped.fleeing = true;
        ped.fleeTimer = 2 + Math.random() * 2;
      }
    }
    if (ped.fleeTimer > 0) {
      ped.fleeTimer -= dt;
      if (ped.fleeTimer <= 0) ped.fleeing = false;
    }
    let vx = 0;
    let vy = 0;
    if (ped.fleeing) {
      const away = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.angle = away;
      vx = Math.cos(away) * 190;
      vy = Math.sin(away) * 190;
    } else {
      // Stroll along the sidewalk: keep walking, turn at random corners.
      if (Math.random() < 0.004) ped.angle += (Math.random() - 0.5) * Math.PI;
      vx = Math.cos(ped.angle) * ped.speed;
      vy = Math.sin(ped.angle) * ped.speed;
    }
    ped.walkPhase += dt * (ped.fleeing ? 14 : 7);
    const next = moveWithCollision(G.city, ped.x, ped.y, vx * dt, vy * dt, 12);
    if (next.x === ped.x && next.y === ped.y && (vx !== 0 || vy !== 0)) {
      ped.angle += Math.PI / 2; // bumped into a building: turn the corner
    } else {
      ped.x = next.x;
      ped.y = next.y;
    }
    // Stay inside the world.
    ped.x = Math.max(16, Math.min(WORLD.width - 16, ped.x));
    ped.y = Math.max(16, Math.min(WORLD.height - 16, ped.y));
  }
  G.peds = G.peds.filter((ped) => !ped.dead);
  // Keep the streets populated.
  if (G.peds.length < 22 && Math.random() < 0.02) {
    spawnPedestrians(G, 1);
  }
}
