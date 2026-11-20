// Vehicles: arcade car physics for the player's car, traffic AI that follows
// the road grid, parked cars to steal, and enter / exit / steal logic.
// Stealing a car is a crime: it raises the wanted level (see police.js).

import { ROADS_X, ROADS_Y, WORLD, dist, hitsBuilding, isOnRoad, nearestRoadPoint, randomRoadPoint } from './city.js';

export const CAR_COLORS = ['#e63946', '#2a9d8f', '#e9c46a', '#4361ee', '#f4a261', '#9b5de5', '#06d6a0', '#ef476f', '#adb5bd', '#ffbe0b'];
const CAR_W = 46;
const CAR_H = 24;

function mulberry32(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCar(x, y, angle, color, opts) {
  return {
    x, y, angle, speed: 0,
    color: color || CAR_COLORS[0],
    stolen: false,
    parked: !!(opts && opts.parked),
    traffic: !!(opts && opts.traffic),
    police: !!(opts && opts.police),
    // Traffic AI state: which road it follows and which way along it.
    roadAxis: 'x',
    roadValue: 0,
    dir: 1,
    turnCooldown: 0,
    driver: !!(opts && opts.driver),
    hp: 100,
    braking: false,
  };
}

export function spawnTraffic(G, count) {
  const rand = mulberry32(777 + count);
  for (let i = 0; i < count; i += 1) {
    const pt = randomRoadPoint(rand);
    const horizontal = rand() < 0.5;
    const car = makeCar(pt.x, pt.y, horizontal ? (rand() < 0.5 ? 0 : Math.PI) : (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], { traffic: true, driver: true });
    car.roadAxis = horizontal ? 'x' : 'y';
    car.roadValue = horizontal ? pt.y : pt.x;
    car.dir = car.angle === 0 || car.angle === Math.PI / 2 ? 1 : -1;
    car.speed = 90 + rand() * 60;
    G.traffic.push(car);
  }
}

export function spawnParkedCars(G) {
  const spots = [
    { x: 470, y: 900 }, { x: 930, y: 400 }, { x: 1670, y: 1400 }, { x: 2130, y: 900 },
    { x: 2730, y: 1900 }, { x: 1070, y: 1400 }, { x: 1530, y: 1900 }, { x: 2270, y: 400 },
    { x: 330, y: 1400 }, { x: 2870, y: 900 }, { x: 930, y: 1900 }, { x: 1670, y: 400 },
  ];
  spots.forEach((s, i) => {
    const horizontal = i % 2 === 0;
    G.parked.push(makeCar(s.x, s.y, horizontal ? 0 : Math.PI / 2, CAR_COLORS[i % CAR_COLORS.length], { parked: true }));
  });
}

// Nearest car (parked or traffic) the player could enter, within reach.
export function nearestEnterableCar(G) {
  const p = G.player;
  let best = null;
  let bestD = 70;
  for (const car of G.parked) {
    const d = dist(p, car);
    if (d < bestD) { bestD = d; best = car; }
  }
  for (const car of G.traffic) {
    const d = dist(p, car);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  if (!car) return false;
  if (car.traffic) {
    // Steal it from traffic: the driver bails out and runs.
    G.traffic = G.traffic.filter((c) => c !== car);
    car.traffic = false;
    car.driver = false;
    G.peds.push({ x: car.x + 30, y: car.y + 10, angle: Math.random() * Math.PI * 2, speed: 150, fleeing: true, fleeTimer: 4, color: '#f2e6c9', driver: true });
    G.addCrime(1, 'stole a car');
    G.audio.steal();
    G.announce('You stole the car! The driver ran off. Wanted +1.');
  } else if (car.parked) {
    G.parked = G.parked.filter((c) => c !== car);
    car.parked = false;
    G.addCrime(1, 'stole a parked car');
    G.audio.steal();
    G.announce('You stole a parked car! Wanted +1.');
  }
  car.stolen = true;
  p.onFoot = false;
  p.car = car;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  G.playerCar = car;
  return true;
}

export function exitCar(G) {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  p.onFoot = true;
  p.car = null;
  G.playerCar = null;
  // Step out to the side of the car.
  p.x = car.x - Math.sin(car.angle) * 34;
  p.y = car.y + Math.cos(car.angle) * 34;
  p.angle = car.angle;
  if (!G.parked.includes(car) && !G.traffic.includes(car) && !car.police) G.parked.push(car);
  car.speed = 0;
}

function collideCarWithWorld(G, car, nx, ny) {
  // Cars are rectangles; approximate with a circle of radius 24 against buildings.
  if (hitsBuilding(G.city, nx, ny, 24)) return true;
  if (nx < 30 || ny < 30 || nx > WORLD.width - 30 || ny > WORLD.height - 30) return true;
  return false;
}

// A battered engine (hp < 50) puffs dark smoke from the hood while the car
// rolls — the visible "this chase cost Rico" cue (round 3). Called every
// frame from updatePlayerCar; the random gate keeps it a puff, not a cloud.
export function emitDamageSmoke(G, car) {
  if (car.hp >= 50 || Math.random() >= 0.45) return;
  const hx = car.x + Math.cos(car.angle) * 24;
  const hy = car.y + Math.sin(car.angle) * 24;
  G.particles.damageSmoke(hx, hy, car.angle);
}

export function updatePlayerCar(G, dt, move) {
  const car = G.playerCar;
  if (!car) return;
  const p = G.player;
  const forward = move.y < 0 ? 1 : move.y > 0 ? -0.55 : 0; // W gas, S brake/reverse
  const steer = move.x; // A left, D right
  const accel = 340;
  const maxSpeed = 520;
  const maxReverse = 180;
  if (forward > 0) car.speed += accel * dt;
  else if (forward < 0) car.speed -= accel * 0.9 * dt;
  else {
    // Rolling drag.
    car.speed -= car.speed * 1.4 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = Math.max(-maxReverse, Math.min(maxSpeed, car.speed));
  // Steering only bites while moving, and flips when reversing.
  if (Math.abs(car.speed) > 8) {
    car.angle += steer * 2.4 * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 120);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (collideCarWithWorld(G, car, nx, ny)) {
    if (Math.abs(car.speed) > 140) {
      G.particles.sparks(car.x, car.y);
      G.particles.addShake(8);
      G.audio.crash();
    }
    car.speed *= -0.25;
  } else {
    car.x = nx;
    car.y = ny;
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  // Braking: S held while still rolling forward.
  car.braking = move.y > 0 && car.speed > 40;
  // Hard cornering at speed leaves skid marks from the rear wheels.
  const perpX = -Math.sin(car.angle);
  const perpY = Math.cos(car.angle);
  const rearX = car.x - Math.cos(car.angle) * 18;
  const rearY = car.y - Math.sin(car.angle) * 18;
  const wheelL = { x: rearX + perpX * 9, y: rearY + perpY * 9 };
  const wheelR = { x: rearX - perpX * 9, y: rearY - perpY * 9 };
  const skidding = Math.abs(steer) > 0.55 && Math.abs(car.speed) > 220;
  if (skidding && car._skidL && car._skidR) {
    G.skids.push({ x1: car._skidL.x, y1: car._skidL.y, x2: wheelL.x, y2: wheelL.y, life: 1 });
    G.skids.push({ x1: car._skidR.x, y1: car._skidR.y, x2: wheelR.x, y2: wheelR.y, life: 1 });
    if (G.skids.length > 500) G.skids.splice(0, G.skids.length - 500);
  }
  if (skidding) {
    car._skidL = wheelL;
    car._skidR = wheelR;
  } else {
    car._skidL = null;
    car._skidR = null;
  }
  // A damaged engine smokes dark from the hood.
  emitDamageSmoke(G, car);
  // Exhaust smoke and speed audio.
  if (Math.abs(car.speed) > 60 && Math.random() < 0.5) G.particles.smoke(car.x, car.y, car.angle);
  G.audio.setEngine(Math.abs(car.speed) / maxSpeed);
  // Running over pedestrians is a crime.
  for (const ped of G.peds) {
    if (ped.driver) continue;
    if (dist(car, ped) < 30 && Math.abs(car.speed) > 80) {
      ped.dead = true;
      G.particles.burst(ped.x, ped.y, 10, '#e63946', 160, 0.5, 3);
      G.addCrime(1, 'hit a pedestrian');
      G.audio.crash();
      G.particles.addShake(5);
    }
  }
  // Bumping traffic cars slows both and annoys drivers.
  for (const t of G.traffic) {
    if (dist(car, t) < 44) {
      const push = 60;
      t.x += Math.cos(car.angle) * push * dt * 10;
      t.y += Math.sin(car.angle) * push * dt * 10;
      car.speed *= 0.94;
    }
  }
}

export function updateTraffic(G, dt) {
  const player = G.player;
  for (const car of G.traffic) {
    car.turnCooldown -= dt;
    // Keep to the road: if it drifted off, steer back toward its road line.
    const onRoad = isOnRoad(car.x, car.y);
    let targetAngle = car.angle;
    if (car.roadAxis === 'x') {
      const dy = car.roadValue - car.y;
      targetAngle = car.dir > 0 ? 0 : Math.PI;
      if (Math.abs(dy) > 8) targetAngle += Math.sign(dy) * 0.35 * car.dir;
    } else {
      const dx = car.roadValue - car.x;
      targetAngle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (Math.abs(dx) > 8) targetAngle -= Math.sign(dx) * 0.35 * car.dir;
    }
    if (!onRoad) {
      const rp = nearestRoadPoint(car.x, car.y);
      targetAngle = Math.atan2(rp.y - car.y, rp.x - car.x);
    }
    // At an intersection, sometimes turn onto the crossing road.
    const nearX = ROADS_X.some((rx) => Math.abs(car.x - rx) < 30);
    const nearY = ROADS_Y.some((ry) => Math.abs(car.y - ry) < 30);
    if (nearX && nearY && car.turnCooldown <= 0 && Math.random() < 0.01) {
      car.roadAxis = car.roadAxis === 'x' ? 'y' : 'x';
      car.roadValue = car.roadAxis === 'x' ? car.y : car.x;
      car.dir = Math.random() < 0.5 ? 1 : -1;
      car.turnCooldown = 4;
    }
    // Gentle steering toward the target angle.
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    // Flee the player when the player speeds at them or shoots.
    const dPlayer = dist(car, player);
    const wantSpeed = (G.wanted > 0 && dPlayer < 160) || G.playerShooting ? 200 : 110 + Math.sin(car.x * 0.01) * 20;
    car.speed += (wantSpeed - car.speed) * dt * 0.8;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (hitsBuilding(G.city, nx, ny, 24)) {
      car.angle += Math.PI / 2;
      car.speed *= 0.5;
    } else {
      car.x = nx;
      car.y = ny;
    }
    // Wrap around the far side of the map so traffic never runs out.
    if (car.x < -60) car.x = WORLD.width + 50;
    if (car.x > WORLD.width + 60) car.x = -50;
    if (car.y < -60) car.y = WORLD.height + 50;
    if (car.y > WORLD.height + 60) car.y = -50;
  }
  // Parked cars never move; the player's abandoned car sits where it was left.
}
