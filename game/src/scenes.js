// Solmar Bay — demo scenes and the autopilot.
// One job: deterministic staged setups for the four screenshots
// (?scene=chase|beach|plaza|heist) and the self-driving autopilot
// (?auto=1) that plays mission 1 to completion and reports AUTOPILOT DONE.
//
// Round 11 staging: every shot is bright noon — timeOfDay 0.25, no rain,
// weather locked — so the city reads sun-soaked instead of dark and wet.
// The cover chase runs four stars with four cruisers, seven traffic cars
// and ten pedestrians fleeing the cordon, a raid zone ahead and the
// helipad in frame; the heist runs the amber getaway car under its own
// big banner. The game keeps running (traffic, particles, police), so
// each shot is a real frame of play, not a painting.

import { makeCar } from './vehicles.js';
import { dist, angleDiff, isBlocked } from './world.js';
import { spawnExplosion } from './particles.js';
import { driveCar } from './vehicles.js';
import { say } from './dialogue.js';

const SCENE_SEEDS = { chase: 7, beach: 8, plaza: 9, heist: 10 };

export function sceneSeed(name) {
  return SCENE_SEEDS[name] || 42;
}

// Big on-screen banner, shown as a DOM overlay above the canvas. The
// in-canvas banner draws at 22px — too small for a headline at
// 1280x720 — so the staged chase and heist carry their headline here,
// in 34px bold, and the overlay stays hidden everywhere else.
const SCENE_BANNERS = {
  chase: 'HEAT — FOUR STARS. THE WHOLE CITY IS WATCHING.',
  heist: 'THE BIG SCORE — FIVE STARS, $5,250 ON THE LINE.',
};

function setSceneBanner(name) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('scene-banner');
  if (!el) return;
  const text = SCENE_BANNERS[name] || '';
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}

// Round 11: one sky for every staged shot. Noon, dry, locked — the
// frame the screenshot catches is the frame that was staged.
function lockNoon(S) {
  const w = S.weather;
  w.timeOfDay = 0.25; // noon, sun overhead
  w.rain = 0; w.rainTarget = 0; w.locked = true;
}

// Put the world in a fixed, dramatic state for a screenshot.
export function setupScene(S, name) {
  S.scene = name;
  S.sceneMode = true;
  S.mode = 'play';
  S.boomTimer = 0;
  S.scenePeds = [];
  const p = S.player;

  lockNoon(S);
  setSceneBanner(name);

  if (name === 'chase') {
    p.money = 1250;
    p.wanted = 4;
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
    // Four cruisers in formation behind Rico, two lanes, staggered.
    for (let i = 0; i < 4; i++) {
      const cop = makeCar(900 - 180 - i * 110, 860 + (i % 2 === 0 ? -46 : 46), 0, 'cruiser', '#f0f0f0');
      cop.role = 'police';
      cop.speed = 430 + i * 20;
      S.cars.push(cop);
      S.police.cruisers.push(cop);
    }
    // Seven traffic cars on the chase road, mixed with the flow and
    // against it, so the avenue reads busy at noon: four running the
    // same way Rico is going, three coming the other way. Their start
    // spots put them inside the camera frame once Rico has run east
    // far enough to bring the helipad into view.
    const trafficSpots = [
      { x: 1700, y: 840, dir: 1, kind: 'sedan', color: '#3d9e57' },
      { x: 2000, y: 880, dir: 1, kind: 'van', color: '#e8e8e8' },
      { x: 2300, y: 840, dir: 1, kind: 'taxi', color: '#e8c832' },
      { x: 2600, y: 880, dir: 1, kind: 'sedan', color: '#7a2ea8' },
      { x: 3000, y: 880, dir: -1, kind: 'sedan', color: '#2b6fd8' },
      { x: 3250, y: 840, dir: -1, kind: 'sport', color: '#4a7a8c' },
      { x: 3450, y: 880, dir: -1, kind: 'sedan', color: '#b8b03a' },
    ];
    for (const spot of trafficSpots) {
      const t = makeCar(spot.x, spot.y, spot.dir > 0 ? 0 : Math.PI, spot.kind, spot.color);
      t.role = 'traffic';
      t.axis = 'h';
      t.dir = spot.dir;
      t.lane = spot.y < 860 ? -20 : 20;
      t.speed = 150 + (spot.x % 3) * 10;
      t.cruiseSpeed = t.speed;
      S.cars.push(t);
    }
    // Ten pedestrians on the sidewalks along the chase road, already
    // running from the cordon when the shot is taken.
    for (let i = 0; i < 10; i++) {
      const ped = S.peds[i];
      ped.x = 1500 + i * 200;
      ped.y = i % 2 === 0 ? 786 : 934;
      ped.state = 'flee';
      ped.stateTimer = 2;
      ped.angle = Math.atan2(ped.y - 860, ped.x - 900);
      S.scenePeds.push(ped);
    }
    // A wrecked taxi on the roadside ahead, still burning.
    const wreck = makeCar(2050, 795, 0.4, 'taxi', '#e8c832');
    wreck.role = 'traffic';
    wreck.hp = 0;
    wreck.dead = true;
    S.cars.push(wreck);
    spawnExplosion(S.particles, 1960, 830, true);
    spawnExplosion(S.particles, 1880, 880, false);
    // The raid cordon sits ahead on the chase road, east of the 2500
    // avenue: when Rico reaches it the ring, the RAID ZONE label and
    // the north-east helipad are all inside the same frame.
    S.events.raid = { x: 2350, y: 860, timer: 999 };
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
    say(S, 'RICO', 'Ocean Drive at noon. Somewhere out here is my first set of wheels.', 30);
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
    // Amber getaway car: the Big Score car is impossible to miss at noon.
    const car = makeCar(700, 1340, 0, 'sport', '#e8a13d');
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
  // a fifth star by clipping a pedestrian on its way through town.
  p.wanted = { chase: 4, beach: 0, plaza: 1, heist: 5 }[S.scene] ?? p.wanted;
  if (S.scene === 'chase') {
    // The ten staged pedestrians keep running for the whole shot. Any
    // one who falls behind the camera gets moved back up the road ahead
    // of Rico, still on a sidewalk, still fleeing — so the frame always
    // holds a crowd on the run instead of an empty street.
    for (let i = 0; i < S.scenePeds.length; i++) {
      const ped = S.scenePeds[i];
      ped.state = 'flee';
      ped.stateTimer = 2;
      if (ped.x < p.x - 620) {
        ped.x = p.x + 320 + (i % 5) * 70;
        ped.y = i % 2 === 0 ? 786 : 934;
      }
      // And any who have run too far ahead get pulled back into the
      // frame, still ahead of Rico on a sidewalk, still fleeing.
      if (ped.x > p.x + 560) {
        ped.x = p.x + 300 + (i % 5) * 50;
        ped.y = i % 2 === 0 ? 786 : 934;
      }
    }
  }
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

// Route from a stolen car to the garage at (940, 380). The direct road
// route can start with a U-turn — a parked car faces along the road it
// sits beside, and the garage may lie behind it — and a U-turn at any
// speed carries the car off the 96-wide road into the buildings. When
// the car faces away from the direct route, go forward instead: drive
// along its own road to the next cross street, then across to the
// garage road and up to the garage. Every turn is 90 degrees, all of
// it on asphalt. Falls back to the direct route when the car is not a
// roadside parked car facing north/south, or there is no cross street
// ahead of it.
function garageRoute(car) {
  const direct = roadRoute(car.x, car.y, 940, 380);
  const first = direct[0];
  const toFirst = Math.atan2(first.y - car.y, first.x - car.x);
  if (Math.abs(angleDiff(car.angle, toFirst)) < 2.0) return direct;
  const rx = V_ROADS.reduce((best, x) => (Math.abs(car.x - x) < Math.abs(car.x - best) ? x : best));
  if (Math.abs(car.x - rx) > 40 || Math.abs(Math.sin(car.angle)) < 0.9) return direct;
  const south = Math.sin(car.angle) > 0;
  const cross = south
    ? H_ROADS.find((y) => y > car.y + 30)
    : [...H_ROADS].reverse().find((y) => y < car.y - 30);
  if (cross === undefined) return direct;
  return [{ x: rx, y: cross }, { x: 940, y: cross }, { x: 940, y: 380 }, { x: 940, y: 380 }];
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
    ap.waypoints = garageRoute(car);
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
  // Round 11: the old code floored it through every turn, and a fast
  // 90-degree turn has a radius of 100+ units — wide enough to leave
  // the 96-wide road and wedge the car against the buildings beside
  // it, where the stuck/reverse loop never gets it out (two headless
  // runs both wedged, hp bleeding). So: slow down for turns — at 150
  // or less the turning radius stays under ~58, inside the 74-unit
  // clearance to the nearest building — and when the car faces away
  // from the next waypoint, reverse-turn the nose around instead of
  // carving a wide forward U-turn off the road.
  if (!ap.turnaround && Math.abs(diff) > 2.0 && Math.abs(car.speed) < 60) {
    ap.turnaround = true;
    ap.recoverTimer = 0;
    ap.stuckTimer = 0;
  }
  if (ap.turnaround) {
    if (Math.abs(diff) < 0.4) {
      ap.turnaround = false;
    } else {
      // Back up while swinging the nose toward the waypoint: reversing
      // flips the steering, so -sign(diff) rotates the nose the same
      // way a forward turn would.
      driveCar(S, car, -1, -Math.sign(diff), dt);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      ap.lastD = d;
      return;
    }
  }
  let throttle = 1;
  const ad = Math.abs(diff);
  if (ad > 1.2) throttle = car.speed > 100 ? -1 : 0.3;
  else if (ad > 0.5) throttle = car.speed > 150 ? 0 : 0.6;
  else {
    // Slow for the corner ahead: the next waypoint's direction from
    // here shows a turn coming before this waypoint is reached, and
    // braking only after the waypoint advances is too late — at full
    // speed the car is 200 units past the intersection before it has
    // slowed enough to turn.
    let corner = 0;
    if (ap.wp < ap.waypoints.length - 1) {
      const nx = ap.waypoints[ap.wp + 1];
      corner = Math.abs(angleDiff(
        Math.atan2(target.y - car.y, target.x - car.x),
        Math.atan2(nx.y - car.y, nx.x - car.x)));
    }
    if (corner > 0.5 && d < 300) throttle = car.speed > 150 ? (car.speed > 260 ? -1 : 0) : 0.6;
  }
  if (ap.recoverTimer > 0) {
    // Back out of whatever wedged the car, then re-aim.
    ap.recoverTimer -= dt;
    driveCar(S, car, -1, -steer, dt);
  } else {
    driveCar(S, car, throttle, steer, dt);
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
