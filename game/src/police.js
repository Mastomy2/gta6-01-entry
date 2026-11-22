// Solmar Bay — the police.
// One job: wanted-level response. Cruisers spawn at the map edge and ram
// the player; foot cops chase on foot and punch. Wanted decays when the
// player stays clean and out of sight.

import {
  MAX_WANTED, COP_MAX_SPEED, COP_RAM_DAMAGE, COP_FOOT_SPEED,
  COP_PUNCH_DAMAGE, WANTED_DECAY_SECONDS,
} from './config.js';
import { decayScale } from './standing.js';
import { makeCar, driveCar } from './vehicles.js';
import { nearestRoadPoint, angleDiff, dist, clampToWorld } from './world.js';
import { spawnSparks } from './particles.js';

export function createPolice() {
  return {
    cruisers: [],
    footCops: [],
    spawnTimer: 0,
    decayTimer: 0,
    sirenNear: false,
  };
}

export function updatePolice(S, dt) {
  // Staged scenes script their own police (formation chase, plaza cop);
  // the live AI would fight the staging.
  if (S.sceneMode) return;
  const police = S.police;
  const wanted = S.player.wanted;
  const px = S.player.x;
  const py = S.player.y;
  police.sirenNear = false;

  // --- Spawn cruisers up to the wanted level. ---
  const wantCruisers = Math.min(wanted, 4);
  police.spawnTimer -= dt;
  if (police.cruisers.length < wantCruisers && police.spawnTimer <= 0) {
    police.spawnTimer = 1.6;
    const spot = nearestRoadPoint(px + (Math.random() < 0.5 ? -700 : 700), py + (Math.random() < 0.5 ? -500 : 500));
    const car = makeCar(spot.x, spot.y, 0, 'cruiser', '#f0f0f0');
    car.role = 'police';
    car.cruiseSpeed = COP_MAX_SPEED;
    police.cruisers.push(car);
    S.cars.push(car);
  }

  // --- Spawn foot cops when the player is on foot and wanted. ---
  const wantFoot = S.player.onFoot ? Math.min(wanted, 3) : 0;
  if (police.footCops.length < wantFoot && police.spawnTimer <= 0) {
    police.spawnTimer = 2.2;
    const spot = nearestRoadPoint(px + (Math.random() < 0.5 ? -260 : 260), py + (Math.random() < 0.5 ? -200 : 200));
    police.footCops.push({
      x: spot.x, y: spot.y, angle: 0, hp: 60,
      punchTimer: 0, speed: COP_FOOT_SPEED,
    });
  }

  // --- Cruiser chase AI: steer at the player, ram, back off and re-aim. ---
  for (const car of police.cruisers) {
    if (car.dead) continue;
    const target = S.player.car || { x: px, y: py };
    const want = Math.atan2(target.y - car.y, target.x - car.x);
    const diff = angleDiff(car.angle, want);
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    const d = dist(car.x, car.y, target.x, target.y);
    const throttle = d > 60 ? 1 : 0.4;
    driveCar(S, car, throttle, steer, dt);
    // Hard cap so the player can still outrun them in a sport car.
    if (car.speed > COP_MAX_SPEED) car.speed = COP_MAX_SPEED;
    if (d < 900) police.sirenNear = true;
    // Ram damage on contact with the player's car (not in staged scenes:
    // the screenshot car must survive the shoot). One hit per cruiser
    // per half second, so a chase wears the car down instead of
    // deleting it on first contact.
    if (!S.sceneMode && S.player.car && !S.player.car.dead && dist(car.x, car.y, S.player.car.x, S.player.car.y) < 48) {
      const pc = S.player.car;
      car.ramTimer = (car.ramTimer || 0) - dt;
      if (car.ramTimer <= 0 && (Math.abs(car.speed) > 140 || Math.abs(pc.speed) > 140)) {
        car.ramTimer = 0.6;
        pc.hp -= 8;
        spawnSparks(S.particles, (car.x + pc.x) / 2, (car.y + pc.y) / 2);
        S.audio.crash();
      }
    }
    // A cruiser that flips onto the player on foot busts him.
    if (S.player.onFoot && d < 30 && Math.abs(car.speed) > 60) {
      S.player.busted();
    }
  }
  police.cruisers = police.cruisers.filter((c) => !c.dead);

  // --- Foot cop chase AI. ---
  for (const cop of police.footCops) {
    cop.punchTimer -= dt;
    const d = dist(cop.x, cop.y, px, py);
    if (S.player.onFoot && d < 34 && cop.punchTimer <= 0) {
      cop.punchTimer = 0.9;
      S.player.damage(COP_PUNCH_DAMAGE, 'beaten by a cop');
      S.audio.punch();
    }
    if (S.player.onFoot) {
      const a = Math.atan2(py - cop.y, px - cop.x);
      cop.angle = a;
      const sp = d > 60 ? COP_FOOT_SPEED : COP_FOOT_SPEED * 0.4;
      const nx = cop.x + Math.cos(a) * sp * dt;
      const ny = cop.y + Math.sin(a) * sp * dt;
      const c = clampToWorld(nx, ny, 30);
      cop.x = c.x;
      cop.y = c.y;
      if (d < 900) police.sirenNear = true;
    }
  }

  // --- Wanted decay: clean play slowly cools the heat. A respected
  // wheelman cools faster; a hated one slower; and while the heli is
  // overhead the heat does not cool at all.
  const heliOverhead = !!(S.heli && S.heli.active);
  const decaySeconds = WANTED_DECAY_SECONDS * decayScale(S);
  if (wanted > 0 && !S.player.recentCrime && !heliOverhead) {
    police.decayTimer += dt;
    if (police.decayTimer >= decaySeconds) {
      police.decayTimer = 0;
      S.player.wanted = Math.max(0, wanted - 1);
      if (S.player.wanted === 0) {
        police.cruisers = [];
        police.footCops = [];
        S.cars = S.cars.filter((c) => c.role !== 'police');
      }
    }
  } else {
    police.decayTimer = 0;
  }
}

export function drawPolice(ctx, police) {
  for (const cop of police.footCops) {
    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.rotate(cop.angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b4fd8';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2f7a';
    ctx.beginPath();
    ctx.arc(0, -2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(-7, -11, 14, 4);
    ctx.restore();
  }
}
