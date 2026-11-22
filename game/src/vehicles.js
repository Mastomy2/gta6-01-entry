// Solmar Bay — cars.
// One job: the car itself (shared physics for driving, crashing and
// damage) plus the city's traffic: 16 cars cruising the road grid and
// 8 parked cars waiting to be stolen.

import {
  WORLD_W, WORLD_H, ROAD_W, V_ROADS, H_ROADS, CAR_ACCEL, CAR_BRAKE,
  CAR_REVERSE_MAX, CAR_MAX_SPEED, CAR_SPORT_MAX, CAR_STEER, CAR_COLORS,
  TRAFFIC_COUNT, PARKED_COUNT,
} from './config.js';
import { makeRng, range, pick, chance } from './random.js';
import { isBlocked, randomRoadPoint, randomParkedSpot, angleDiff, dist } from './world.js';
import { spawnSparks, spawnSmoke, spawnExplosion } from './particles.js';
import { addShake } from './shake.js';

let nextCarId = 1;

export function makeCar(x, y, angle, kind, color) {
  return {
    id: nextCarId++,
    x, y, angle,
    speed: 0,
    hp: 100,
    color: color || pick(makeRng(nextCarId * 7919 + 13), CAR_COLORS),
    kind: kind || 'sedan', // sedan | taxi | van | sport | cruiser
    role: 'traffic', // traffic | parked | player | police
    axis: 'h',
    dir: 1,
    lane: 0,
    cruiseSpeed: 150,
    dead: false,
    smokeTimer: 0,
    honkTimer: 0,
  };
}

export function spawnTraffic(seed) {
  const rng = makeRng(seed + 101);
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const p = randomRoadPoint(rng);
    const kind = chance(rng, 0.12) ? 'taxi' : chance(rng, 0.14) ? 'sport' : chance(rng, 0.12) ? 'van' : 'sedan';
    const car = makeCar(p.x, p.y, p.axis === 'h' ? 0 : Math.PI / 2, kind, kind === 'taxi' ? '#e8c832' : undefined);
    car.role = 'traffic';
    car.axis = p.axis;
    car.dir = chance(rng, 0.5) ? 1 : -1;
    car.lane = (chance(rng, 0.5) ? -1 : 1) * 20;
    car.speed = range(rng, 120, 190);
    car.cruiseSpeed = car.speed;
    car.angle = p.axis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    cars.push(car);
  }
  return cars;
}

export function spawnParked(seed) {
  const rng = makeRng(seed + 202);
  const cars = [];
  for (let i = 0; i < PARKED_COUNT; i++) {
    const spot = randomParkedSpot(rng);
    const kind = chance(rng, 0.2) ? 'sport' : 'sedan';
    const car = makeCar(spot.x, spot.y, spot.angle, kind);
    car.role = 'parked';
    cars.push(car);
  }
  return cars;
}

// Shared car physics: accelerate / brake / steer, then move with building
// collision. Returns true when the car hit something hard this frame.
export function driveCar(S, car, throttle, steer, dt) {
  // MARLA's hands on the wheel: +8% top speed while she rides along.
  const boost = car.crewBoost ? 1.08 : 1;
  const maxSpeed = (car.kind === 'sport' ? CAR_SPORT_MAX : CAR_MAX_SPEED) * boost;
  if (throttle > 0) {
    car.speed += CAR_ACCEL * throttle * dt;
  } else if (throttle < 0) {
    if (car.speed > 8) car.speed -= CAR_BRAKE * dt;
    else car.speed -= CAR_ACCEL * 0.55 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 90 * dt;
    if (Math.abs(car.speed) < 6) car.speed = 0;
  }
  car.speed = Math.max(-CAR_REVERSE_MAX, Math.min(maxSpeed, car.speed));
  const steerAmount = steer * CAR_STEER * Math.min(1, Math.abs(car.speed) / 140) * Math.sign(car.speed || 1);
  car.angle += steerAmount * dt;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (isBlocked(S.world, nx, ny, 16)) {
    if (Math.abs(car.speed) > 130) {
      car.hp -= 6;
      spawnSparks(S.particles, nx, ny);
      S.audio.crash();
      if (car.role === 'player') addShake(S, 0.3);
    }
    car.speed *= -0.25;
    return true;
  }
  car.x = Math.max(30, Math.min(WORLD_W - 30, nx));
  car.y = Math.max(30, Math.min(WORLD_H - 30, ny));
  return false;
}

// Traffic AI: cruise along a road, sometimes turning at intersections.
export function updateTraffic(S, dt) {
  for (const car of S.cars) {
    if (car.role !== 'traffic' || car.dead) continue;
    // Ease back to cruise speed.
    if (car.speed < car.cruiseSpeed) car.speed += 60 * dt;
    if (car.speed > car.cruiseSpeed) car.speed -= 120 * dt;

    const atCrossing = (car.axis === 'v')
      ? H_ROADS.some((ry) => Math.abs(car.y - ry) < 14)
      : V_ROADS.some((rx) => Math.abs(car.x - rx) < 14);
    if (atCrossing && Math.random() < 0.25 * dt * 4) {
      // Turn onto the crossing road.
      if (car.axis === 'v') {
        const ry = H_ROADS.reduce((a, b) => (Math.abs(car.y - a) < Math.abs(car.y - b) ? a : b));
        car.axis = 'h';
        car.y = ry;
        car.dir = Math.random() < 0.5 ? 1 : -1;
        car.angle = car.dir > 0 ? 0 : Math.PI;
        car.lane = (Math.random() < 0.5 ? -1 : 1) * 20;
      } else {
        const rx = V_ROADS.reduce((a, b) => (Math.abs(car.x - a) < Math.abs(car.x - b) ? a : b));
        car.axis = 'v';
        car.x = rx;
        car.dir = Math.random() < 0.5 ? 1 : -1;
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.lane = (Math.random() < 0.5 ? -1 : 1) * 20;
      }
    }

    if (car.axis === 'v') {
      const targetX = nearestRoadCoord(car.x, V_ROADS) + car.lane;
      car.x += (targetX - car.x) * Math.min(1, 2 * dt);
      car.y += car.dir * car.speed * dt;
      if (car.y < 40) { car.y = 40; car.dir = 1; car.angle = Math.PI / 2; }
      if (car.y > WORLD_H - 40) { car.y = WORLD_H - 40; car.dir = -1; car.angle = -Math.PI / 2; }
    } else {
      const targetY = nearestRoadCoord(car.y, H_ROADS) + car.lane;
      car.y += (targetY - car.y) * Math.min(1, 2 * dt);
      car.x += car.dir * car.speed * dt;
      if (car.x < 40) { car.x = 40; car.dir = 1; car.angle = 0; }
      if (car.x > WORLD_W - 40) { car.x = WORLD_W - 40; car.dir = -1; car.angle = Math.PI; }
    }
  }
}

function nearestRoadCoord(v, roads) {
  return roads.reduce((a, b) => (Math.abs(v - a) < Math.abs(v - b) ? a : b));
}

// Car-to-car bumps: push apart, damage both a little at speed.
export function resolveCarBumps(S) {
  const all = S.cars.filter((c) => !c.dead);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 46 && d > 0.01) {
        const push = (46 - d) / 2;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 160) {
          a.hp -= 4;
          b.hp -= 4;
          spawnSparks(S.particles, (a.x + b.x) / 2, (a.y + b.y) / 2);
          S.audio.crash();
          if (a.role === 'player' || b.role === 'player') addShake(S, 0.45);
        }
      }
    }
  }
}

// Smoke and explosion for wrecked cars. Returns cars that just blew up.
export function updateCarDamage(S, dt) {
  const blown = [];
  for (const car of S.cars) {
    if (car.dead) continue;
    if (car.hp < 50 && car.hp > 0) {
      car.smokeTimer -= dt;
      if (car.smokeTimer <= 0) {
        car.smokeTimer = 0.12;
        spawnSmoke(S.particles, car.x - Math.cos(car.angle) * 14, car.y - Math.sin(car.angle) * 14);
      }
    }
    if (car.hp <= 0) {
      car.dead = true;
      car.hp = 0;
      spawnExplosion(S.particles, car.x, car.y, true);
      S.audio.explosion();
      if (dist(car.x, car.y, S.player.x, S.player.y) < 700) addShake(S, 0.9);
      blown.push(car);
    }
  }
  return blown;
}

// Top-down car drawing, shared by every car kind.
export function drawCar(ctx, car) {
  if (car.dead) {
    // Burnt-out wreck.
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, -24, -12, 48, 24, 6);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = car.kind === 'van' ? 52 : 46;
  const wid = car.kind === 'van' ? 26 : 22;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -len / 2 + 3, -wid / 2 + 3, len, wid, 7);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 7);
  ctx.fill();
  // Cabin / windshield.
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  roundRect(ctx, -len * 0.18, -wid / 2 + 3, len * 0.3, wid - 6, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,240,0.5)';
  roundRect(ctx, len * 0.22, -wid / 2 + 3, 6, wid - 6, 3);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 2, 3, 5);
  ctx.fillRect(len / 2 - 3, wid / 2 - 7, 3, 5);
  // Police light bar.
  if (car.kind === 'cruiser') {
    const blink = Math.floor(performance.now() / 180) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2a2a' : '#2a5bff';
    ctx.fillRect(-4, -wid / 2 - 2, 8, 5);
    ctx.fillStyle = blink ? '#2a5bff' : '#ff2a2a';
    ctx.fillRect(-4, wid / 2 - 3, 8, 5);
  }
  ctx.restore();

  // Damage smoke is handled by particles; hp bar for the player's car only.
  if (car.role === 'player' && car.hp < 100) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(car.x - 22, car.y - 34, 44, 6);
    ctx.fillStyle = car.hp > 50 ? '#57d957' : car.hp > 25 ? '#ffb02e' : '#ff3b30';
    ctx.fillRect(car.x - 21, car.y - 33, 42 * (car.hp / 100), 4);
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
