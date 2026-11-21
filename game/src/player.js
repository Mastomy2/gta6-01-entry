// Solmar Bay — Rico Vega, the player.
// One job: the player on foot and behind the wheel — movement, stealing
// cars, punching, health, money, wanted level, and getting busted.

import {
  WALK_SPEED, WALK_ACCEL, PLAYER_RADIUS, PLAYER_MAX_HP, PUNCH_RANGE,
  PUNCH_DAMAGE, PUNCH_COOLDOWN, MAX_WANTED, PLAYER_START,
} from './config.js';
import { moveVector, wasPressed, isDown } from './input.js';
import { isBlocked, dist, clampToWorld, angleDiff } from './world.js';
import { driveCar } from './vehicles.js';
import { spawnDust } from './particles.js';

export function createPlayer() {
  const player = {
    x: 700, y: 620,
    vx: 0, vy: 0,
    angle: -Math.PI / 2,
    hp: PLAYER_MAX_HP,
    money: 0,
    wanted: 0,
    onFoot: true,
    car: null,
    punchTimer: 0,
    punchAnim: 0,
    recentCrime: false,
    crimeTimer: 0,
    walkPhase: 0,
    dead: false,
    deadTimer: 0,
    bustedFlag: false,
    kills: 0,
    carsStolen: 0,
  };

  player.addWanted = function (n, why) {
    if (player.wanted >= MAX_WANTED) return;
    player.wanted = Math.min(MAX_WANTED, player.wanted + n);
    player.recentCrime = true;
    player.crimeTimer = 6;
  };

  player.damage = function (n, why) {
    if (player.dead) return;
    player.hp -= n;
    if (player.hp <= 0) {
      player.hp = 0;
      player.dead = true;
      player.deadTimer = 2.5;
    }
  };

  player.busted = function () {
    if (player.dead || player.bustedFlag) return;
    player.bustedFlag = true;
    player.dead = true;
    player.deadTimer = 2.5;
  };

  player.earn = function (n) {
    player.money += n;
  };

  return player;
}

function nearestCar(S, maxD) {
  let best = null;
  let bestD = maxD;
  for (const car of S.cars) {
    if (car.dead || car.role === 'police') continue;
    const d = dist(S.player.x, S.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function updatePlayer(S, dt) {
  const p = S.player;
  const input = S.input;

  if (p.dead) {
    p.deadTimer -= dt;
    if (p.deadTimer <= 0) respawn(S);
    return;
  }

  p.crimeTimer -= dt;
  if (p.crimeTimer <= 0) p.recentCrime = false;
  p.punchTimer -= dt;
  p.punchAnim -= dt;

  // Slow health regen when calm.
  if (p.wanted === 0 && p.hp > 0 && p.hp < PLAYER_MAX_HP) p.hp = Math.min(PLAYER_MAX_HP, p.hp + 2.2 * dt);

  if (p.onFoot) {
    updateOnFoot(S, dt);
  } else if (p.car) {
    updateDriving(S, dt);
  }

  // Punch: Space, on foot only.
  if (p.onFoot && wasPressed(input, 'Space') && p.punchTimer <= 0) {
    p.punchTimer = PUNCH_COOLDOWN;
    p.punchAnim = 0.22;
    S.audio.punch();
    punch(S);
  }

  // Enter / exit a car with E.
  if (wasPressed(input, 'KeyE')) {
    if (p.onFoot) {
      const car = nearestCar(S, 64);
      if (car) enterCar(S, car);
    } else {
      exitCar(S);
    }
  }
}

function updateOnFoot(S, dt) {
  const p = S.player;
  const mv = moveVector(S.input);
  p.vx += mv.x * WALK_ACCEL * dt;
  p.vy += mv.y * WALK_ACCEL * dt;
  const drag = Math.exp(-6 * dt);
  p.vx *= drag;
  p.vy *= drag;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > WALK_SPEED) {
    p.vx = (p.vx / sp) * WALK_SPEED;
    p.vy = (p.vy / sp) * WALK_SPEED;
  }
  if (sp > 20) {
    p.angle = Math.atan2(p.vy, p.vx);
    p.walkPhase += dt * 11;
    if (Math.random() < dt * 2) spawnDust(S.particles, p.x, p.y + 8);
  }
  const nx = p.x + p.vx * dt;
  const ny = p.y + p.vy * dt;
  if (!isBlocked(S.world, nx, p.y, 4)) p.x = nx;
  if (!isBlocked(S.world, p.x, ny, 4)) p.y = ny;
  const c = clampToWorld(p.x, p.y, 26);
  p.x = c.x;
  p.y = c.y;
}

function updateDriving(S, dt) {
  const p = S.player;
  const car = p.car;
  if (!car || car.dead) {
    p.onFoot = true;
    p.car = null;
    return;
  }
  const input = S.input;
  const throttle = isDown(input, 'KeyW', 'ArrowUp') ? 1 : isDown(input, 'KeyS', 'ArrowDown') ? -1 : 0;
  const steer = isDown(input, 'KeyA', 'ArrowLeft') ? -1 : isDown(input, 'KeyD', 'ArrowRight') ? 1 : 0;
  driveCar(S, car, throttle, steer, dt);
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  // Speed lines of dust when drifting hard.
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 300 && Math.random() < dt * 14) {
    spawnDust(S.particles, car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20);
  }
  // Wrecked car: bail out.
  if (car.hp <= 0) {
    p.onFoot = true;
    p.car = null;
    p.x = car.x + 40;
    p.y = car.y + 30;
    p.damage(12, 'car exploded');
  }
  S.audio.engine(Math.abs(car.speed) / 640, true);
}

function enterCar(S, car) {
  const p = S.player;
  const stolen = car.role !== 'player';
  p.car = car;
  p.onFoot = false;
  car.role = 'player';
  if (stolen) {
    p.carsStolen += 1;
    p.addWanted(1, 'stole a car');
    S.banner = 'Car stolen — the cops noticed.';
    S.bannerTimer = 2.5;
  }
  S.audio.pickup();
}

function exitCar(S) {
  const p = S.player;
  const car = p.car;
  p.car = null;
  p.onFoot = true;
  if (car) {
    car.role = 'parked';
    p.x = car.x - Math.sin(car.angle) * 34;
    p.y = car.y + Math.cos(car.angle) * 34;
    const c = clampToWorld(p.x, p.y, 26);
    p.x = c.x;
    p.y = c.y;
  }
  S.audio.engine(0, false);
}

// Melee: hit the closest gang member or foot cop in range and in front.
function punch(S) {
  const p = S.player;
  let best = null;
  let bestD = PUNCH_RANGE;
  for (const g of S.gang) {
    if (g.hp <= 0) continue;
    const d = dist(p.x, p.y, g.x, g.y);
    if (d < bestD && Math.abs(angleDiff(p.angle, Math.atan2(g.y - p.y, g.x - p.x))) < 1.4) {
      bestD = d; best = g;
    }
  }
  for (const cop of S.police.footCops) {
    const d = dist(p.x, p.y, cop.x, cop.y);
    if (d < bestD && Math.abs(angleDiff(p.angle, Math.atan2(cop.y - p.y, cop.x - p.x))) < 1.4) {
      bestD = d; best = cop;
    }
  }
  if (best) {
    best.hp -= PUNCH_DAMAGE;
    if (best.hp <= 0) {
      p.kills += 1;
      if (S.gang.includes(best)) p.addWanted(1, 'gang fight');
    }
    S.audio.punch();
  }
}

function respawn(S) {
  const p = S.player;
  const wasBusted = p.bustedFlag;
  p.dead = false;
  p.bustedFlag = false;
  p.hp = PLAYER_MAX_HP;
  p.wanted = 0;
  p.onFoot = true;
  p.car = null;
  p.x = PLAYER_START.x;
  p.y = PLAYER_START.y;
  p.money = Math.max(0, p.money - 100);
  S.police.cruisers = [];
  S.police.footCops = [];
  S.cars = S.cars.filter((c) => c.role !== 'police');
  S.banner = wasBusted ? 'BUSTED — $100 bail, back on the street.' : 'WASTED — patched up at the clinic, $100 gone.';
  S.bannerTimer = 3;
}

export function drawPlayer(ctx, S) {
  const p = S.player;
  if (!p.onFoot || p.dead) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle + Math.PI / 2);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: Rico in a red shirt, blonde hair.
  ctx.fillStyle = '#e2483d';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcf3d';
  ctx.beginPath();
  ctx.arc(0, -3, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // Punch arm.
  if (p.punchAnim > 0) {
    ctx.fillStyle = '#e8b98a';
    ctx.fillRect(-3, -24, 6, 14);
  }
  // Direction tick.
  ctx.fillStyle = '#222';
  ctx.fillRect(-2, -13, 4, 5);
  ctx.restore();
}
