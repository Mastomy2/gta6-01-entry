// Solmar Bay — demo scenes and the autopilot.
// One job: deterministic staged setups for the four screenshots
// (?scene=chase|beach|plaza|heist) and the self-driving autopilot
// (?auto=1) that plays mission 1 to completion and reports AUTOPILOT DONE.

import { makeCar } from './vehicles.js';
import { dist, angleDiff, isBlocked } from './world.js';
import { spawnExplosion } from './particles.js';
import { driveCar } from './vehicles.js';
import { say } from './dialogue.js';

const SCENE_SEEDS = { chase: 7, beach: 8, plaza: 9, heist: 10 };

export function sceneSeed(name) {
  return SCENE_SEEDS[name] || 42;
}

// Put the world in a fixed, dramatic state for a screenshot. The game
// keeps running (traffic, particles, police), so the shot is a real frame
// of play, not a painting.
export function setupScene(S, name) {
  S.scene = name;
  S.sceneMode = true;
  S.mode = 'play';
  S.boomTimer = 0;
  const p = S.player;

  // Round 8: every staged shot gets its own sky. The weather is locked
  // so the frame the screenshot catches is the frame that was staged.
  const w = S.weather;
  if (name === 'chase') {
    w.timeOfDay = 0.82; // deep night, lamps on
    w.rain = 0.8; w.rainTarget = 0.8; w.locked = true;
  } else if (name === 'beach') {
    w.timeOfDay = 0.52; // dusk, warm light on wet sand
    w.rain = 0.35; w.rainTarget = 0.35; w.locked = true;
  } else if (name === 'plaza') {
    w.timeOfDay = 0.3; // hard daylight for the standoff
    w.rain = 0; w.rainTarget = 0; w.locked = true;
  } else if (name === 'heist') {
    w.timeOfDay = 0.8; // night, rain on the getaway
    w.rain = 0.6; w.rainTarget = 0.6; w.locked = true;
  }

  if (name === 'chase') {
    p.money = 1250;
    p.wanted = 3;
    S.missions.index = 0;
    S.missions.step = 1;
    const car = makeCar(900, 860, 0, 'sport', '#c23b2e');
    car.role = 'player';
    car.speed = 470;
    S.cars.push(car);
    p.car = car;
    p.onFoot = false;
    p.x = car.x;
    p.y = car.y;
    p.angle = 0;
    // Three cruisers closing in from behind.
    for (let i = 0; i < 3; i++) {
      const cop = makeCar(900 - 180 - i * 110, 860 + (i - 1) * 46, 0, 'cruiser', '#f0f0f0');
      cop.role = 'police';
      cop.speed = 430 + i * 20;
      S.cars.push(cop);
      S.police.cruisers.push(cop);
    }
    // A wrecked taxi on the roadside ahead, still burning.
    const wreck = makeCar(2050, 795, 0.4, 'taxi', '#e8c832');
    wreck.role = 'traffic';
    wreck.hp = 0;
    wreck.dead = true;
    S.cars.push(wreck);
    spawnExplosion(S.particles, 1960, 830, true);
    spawnExplosion(S.particles, 1880, 880, false);
    // A raid cordon is up ahead: the minimap shows the danger zone, and
    // the chase has to punch through it.
    S.events.raid = { x: 1500, y: 860, timer: 999 };
    say(S, 'DISPATCH', 'All units, raid on Vega. Box him in — do not let him through the zone.', 30);
  }

  if (name === 'beach') {
    p.money = 250;
    p.wanted = 0;
    S.missions.index = 0;
    S.missions.step = 0;
    p.x = 1200;
    p.y = 2260;
    p.angle = Math.PI / 2;
    p.onFoot = true;
    const car = makeCar(1290, 2240, Math.PI / 2, 'sport', '#2b6fd8');
    car.role = 'parked';
    S.cars.push(car);
    say(S, 'RICO', 'Ocean Drive at dusk. Somewhere out here is my first set of wheels.', 30);
  }

  if (name === 'plaza') {
    p.money = 1250;
    p.wanted = 1;
    S.missions.index = 3;
    S.missions.step = 1;
    p.x = 1720;
    p.y = 1230;
    p.angle = -Math.PI / 2;
    p.onFoot = true;
    // The Kings in a ring around Rico, leader front and centre, each in
    // his own slot so the health bars and KING tag stay readable.
    S.gang.forEach((g, i) => {
      const slot = -Math.PI / 2 + (i - 2.5) * 0.46;
      g.slotAngle = slot;
      g.x = 1720 + Math.cos(slot) * 130;
      g.y = 1230 + Math.sin(slot) * 130;
      g.angle = Math.atan2(p.y - g.y, p.x - g.x);
      g.state = 'chase';
      if (i === 0) { g.isLeader = true; g.name = 'KING'; }
    });
    // The standoff, mid-sentence: KING's ultimatum is pinned open for
    // the shot, with Rico's answer queued behind it.
    say(S, 'KING', 'Rico. You came to the wrong plaza, wheelman.', 30);
    say(S, 'RICO', 'Wrong plaza? This is the one with your name on it.', 30);
  }

  if (name === 'heist') {
    p.money = 5250;
    p.wanted = 5;
    S.missions.index = 4;
    S.missions.step = 2;
    const car = makeCar(700, 1340, 0, 'sport', '#222226');
    car.role = 'player';
    car.speed = 520;
    S.cars.push(car);
    p.car = car;
    p.onFoot = false;
    p.x = car.x;
    p.y = car.y;
    p.angle = 0;
    for (let i = 0; i < 4; i++) {
      const cop = makeCar(700 - 160 - i * 100, 1340 + (i % 2 === 0 ? -44 : 44), 0, 'cruiser', '#f0f0f0');
      cop.role = 'police';
      cop.speed = 470 + i * 15;
      S.cars.push(cop);
      S.police.cruisers.push(cop);
    }
    spawnExplosion(S.particles, 1680, 1300, true);
    say(S, 'RICO', 'Five thousand in the bag. Now drive like the city is on fire.', 30);
  }

  S.camera.x = p.x;
  S.camera.y = p.y;
}

// Keep a scene alive and dramatic while the screenshot is taken: the
// getaway car keeps driving, explosions keep blooming ahead of it.
export function updateScene(S, dt) {
  if (!S.scene) return;
  const p = S.player;
  // A staged shot keeps its wanted level: the chase car must not pick up
  // a fourth star by clipping a pedestrian on its way through town.
  p.wanted = { chase: 3, beach: 0, plaza: 1, heist: 5 }[S.scene] ?? p.wanted;
  if ((S.scene === 'chase' || S.scene === 'heist') && p.car && !p.car.dead) {
    // Lane-keeping: steer at a look-ahead point on the road centreline,
    // so the getaway car stays on the asphalt instead of drifting into
    // the buildings beside the road.
    const roadY = S.scene === 'chase' ? 860 : 1340;
    const desired = Math.atan2(roadY - p.car.y, 320);
    const steer = Math.max(-1, Math.min(1, angleDiff(p.car.angle, desired) * 2.4));
    driveCar(S, p.car, 1, steer, dt);
    // The hero car of a staged shot does not die mid-shoot.
    p.car.hp = 100;
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    // Cruisers hold formation behind the player: two lanes, staggered,
    // same speed, so the chase reads at a glance.
    S.police.cruisers.forEach((cop, i) => {
      if (cop.dead) return;
      cop.x = p.x - 175 - i * 105;
      cop.y = roadY + (i % 2 === 0 ? -24 : 24);
      cop.angle = p.car.angle;
      cop.speed = Math.max(0, p.car.speed - 12);
    });
    S.boomTimer -= dt;
    if (S.boomTimer <= 0) {
      S.boomTimer = 0.9;
      spawnExplosion(S.particles, p.x + 420 + Math.random() * 120, p.y + (Math.random() - 0.5) * 160, Math.random() < 0.5);
    }
  }
  if (S.scene === 'plaza') {
    // The Kings hold their ring slots around Rico: each one drifts to
    // his own slot, so the crew stays spread out and readable.
    for (const g of S.gang) {
      if (g.hp <= 0) g.hp = g.maxHp;
      const slot = (g.slotAngle ?? -Math.PI / 2) + Math.sin(S.time * 0.3) * 0.06;
      const tx = p.x + Math.cos(slot) * 130;
      const ty = p.y + Math.sin(slot) * 130;
      const d = dist(g.x, g.y, tx, ty);
      if (d > 10) {
        const a = Math.atan2(ty - g.y, tx - g.x);
        g.x += Math.cos(a) * Math.min(90, d) * dt * 2;
        g.y += Math.sin(a) * Math.min(90, d) * dt * 2;
      }
      g.angle = Math.atan2(p.y - g.y, p.x - g.x);
    }
    if (p.hp < 60) p.hp = 100;
  }
}

// --- Autopilot: plays mission 1 (First Wheels) by itself. ---
// Phase 0: walk to the nearest parked car. Phase 1: get in. Phase 2:
// drive to the garage marker. When the mission completes, the game
// writes AUTOPILOT DONE on screen and into the status element.
//
// Both the walk and the drive follow the road grid: waypoints are road
// points and intersections, so the autopilot never has to push through a
// building. A straight line across Solmar Bay would get stuck on a block.

import { V_ROADS, H_ROADS } from './config.js';
import { nearestRoadPoint } from './world.js';

function roadRoute(fromX, fromY, toX, toY) {
  const a = nearestRoadPoint(fromX, fromY);
  const b = nearestRoadPoint(toX, toY);
  const waypoints = [];
  if (a.axis === 'v' && b.axis === 'v') {
    const hy = H_ROADS.reduce((best, y) => (Math.abs(y - (a.y + b.y) / 2) < Math.abs(best - (a.y + b.y) / 2) ? y : best));
    waypoints.push({ x: a.x, y: hy }, { x: b.x, y: hy });
  } else if (a.axis === 'h' && b.axis === 'h') {
    const vx = V_ROADS.reduce((best, x) => (Math.abs(x - (a.x + b.x) / 2) < Math.abs(best - (a.x + b.x) / 2) ? x : best));
    waypoints.push({ x: vx, y: a.y }, { x: vx, y: b.y });
  } else if (a.axis === 'v') {
    waypoints.push({ x: a.x, y: b.y });
  } else {
    waypoints.push({ x: b.x, y: a.y });
  }
  waypoints.push({ x: b.x, y: b.y });
  waypoints.push({ x: toX, y: toY });
  return waypoints;
}

function setPhase(S, phase) {
  const ap = S.autopilot;
  ap.phase = phase;
  const el = document.getElementById('status');
  if (el) el.textContent = `AUTO phase ${phase}`;
  console.log(`autopilot phase ${phase}`);
}

export function createAutopilot() {
  return { active: false, phase: 0, targetCar: null, done: false, waypoints: [], wp: 0 };
}

function walkWaypoints(S, dt, speed) {
  const ap = S.autopilot;
  const p = S.player;
  if (ap.wp >= ap.waypoints.length) return true;
  const target = ap.waypoints[ap.wp];
  const d = dist(p.x, p.y, target.x, target.y);
  if (d < 26) { ap.wp += 1; return ap.wp >= ap.waypoints.length; }
  const a = Math.atan2(target.y - p.y, target.x - p.x);
  p.angle = a;
  p.vx = Math.cos(a) * speed;
  p.vy = Math.sin(a) * speed;
  p.walkPhase += dt * 11;
  const nx = p.x + p.vx * dt;
  const ny = p.y + p.vy * dt;
  if (!isBlocked(S.world, nx, p.y, 4)) p.x = nx;
  if (!isBlocked(S.world, p.x, ny, 4)) p.y = ny;
  return false;
}

export function updateAutopilot(S, dt) {
  const ap = S.autopilot;
  const p = S.player;
  if (!ap.active || ap.done) return;

  if (ap.phase === 0) {
    if (!ap.targetCar) {
      let best = null;
      let bestD = Infinity;
      for (const car of S.cars) {
        if (car.dead || car.role !== 'parked') continue;
        const d = dist(p.x, p.y, car.x, car.y);
        if (d < bestD) { bestD = d; best = car; }
      }
      if (!best) {
        for (const car of S.cars) {
          if (car.dead || car.role === 'police') continue;
          const d = dist(p.x, p.y, car.x, car.y);
          if (d < bestD) { bestD = d; best = car; }
        }
      }
      ap.targetCar = best;
      if (!best) { ap.done = true; return; }
      ap.waypoints = roadRoute(p.x, p.y, best.x, best.y);
      ap.wp = 0;
      setPhase(S, 0);
    }
    if (walkWaypoints(S, dt, 235)) setPhase(S, 1);
    return;
  }

  if (ap.phase === 1) {
    const car = ap.targetCar;
    p.car = car;
    p.onFoot = false;
    car.role = 'player';
    p.carsStolen += 1;
    S.audio.pickup();
    ap.waypoints = roadRoute(car.x, car.y, 940, 380);
    ap.wp = 0;
    setPhase(S, 2);
    return;
  }

  // Phase 2: drive the road route to the garage at (940, 380).
  const car = p.car;
  if (!car || car.dead) {
    ap.phase = 0;
    ap.targetCar = null;
    setPhase(S, 0);
    return;
  }
  const target = ap.waypoints[Math.min(ap.wp, ap.waypoints.length - 1)];
  const d = dist(car.x, car.y, target.x, target.y);
  if (d < 60 && ap.wp < ap.waypoints.length - 1) ap.wp += 1;
  const targetAngle = Math.atan2(target.y - car.y, target.x - car.x);
  const diff = angleDiff(car.angle, targetAngle);
  const steer = Math.max(-1, Math.min(1, diff * 2.4));
  if (ap.recoverTimer > 0) {
    // Back out of whatever wedged the car, then re-aim.
    ap.recoverTimer -= dt;
    driveCar(S, car, -1, -steer, dt);
  } else {
    driveCar(S, car, 1, steer, dt);
    // Stuck against a wall or shoved off the road by a cruiser: if the
    // waypoint is not getting closer, reverse out and try again.
    if (d > (ap.lastD ?? Infinity) - 2) ap.stuckTimer = (ap.stuckTimer ?? 0) + dt;
    else ap.stuckTimer = 0;
    if (ap.stuckTimer > 2) {
      ap.stuckTimer = 0;
      ap.recoverTimer = 1.1;
    }
  }
  ap.lastD = d;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  S.audio.engine(Math.abs(car.speed) / 640, true);

  if (S.missions.index > 0 || S.missions.done) {
    ap.done = true;
    S.autopilotDone = true;
    document.title = 'AUTOPILOT DONE — Solmar Bay';
    const el = document.getElementById('status');
    if (el) el.textContent = 'AUTOPILOT DONE';
    console.log('AUTOPILOT DONE');
  }
}
