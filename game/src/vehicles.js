// Solmar Bay — fisika mobil arcade, lalu lintas, dan gambar mobil.
import { WORLD } from './config.js';
import { roadXs, roadYs, resolveBuildingCollision } from './world.js';
import { clamp, angleDiff, dist, makeRng } from './random.js';

const TRAFFIC_COLORS = ['#e8e8e8', '#c0c8d0', '#7a8a99', '#d8b13a', '#5a7a4a', '#8a5a7a', '#3a6a8a', '#c96a3a'];

export function createCar(def, x, y, angle) {
  return {
    x, y, angle, speed: 0,
    def, color: def.color || '#d8d8d8',
    width: 46, length: 26,
    armor: 100, maxArmor: 100,
    nitro: 100, maxNitro: 100,
    steering: 0, boosting: false,
    skidTimer: 0, hitCooldown: 0,
  };
}

// Kontrol: { up, down, left, right, nitro }. mods: { topSpeed, accel, handling, nitroRate }.
export function driveCar(car, controls, dt, mods) {
  const m = mods || { topSpeed: 1, accel: 1, handling: 1, nitroRate: 1 };
  const def = car.def;
  const top = def.topSpeed * m.topSpeed;
  const accel = def.accel * m.accel;
  if (controls.up) car.speed += accel * dt;
  if (controls.down) {
    if (car.speed > 20) car.speed -= accel * 1.4 * dt;
    else car.speed -= accel * 0.55 * dt; // mundur
  }
  if (!controls.up && !controls.down) {
    car.speed -= car.speed * 0.9 * dt; // hambatan gelinding
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = clamp(car.speed, -170, top);
  // Nitro: dorongan ekstra selagi ada isi.
  car.boosting = false;
  if (controls.nitro && car.nitro > 1 && car.speed > 40) {
    car.speed = Math.min(car.speed + 320 * dt, top * 1.32);
    car.nitro = Math.max(0, car.nitro - 34 * dt);
    car.boosting = true;
  } else {
    car.nitro = Math.min(car.maxNitro, car.nitro + 7 * m.nitroRate * dt);
  }
  // Belok: makin cepat makin lebar, tapi tetap responsif.
  const steerPower = 2.5 * m.handling * clamp(Math.abs(car.speed) / 190, 0.25, 1);
  const dir = car.speed >= 0 ? 1 : -1;
  if (controls.left) car.angle -= steerPower * dir * dt;
  if (controls.right) car.angle += steerPower * dir * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 60, WORLD.width - 60);
  car.y = clamp(car.y, 60, WORLD.height - 60);
  if (car.hitCooldown > 0) car.hitCooldown -= dt;
  return car;
}

// Tabrakan dengan bangunan + trotoar: pantul, rusak, keluarkan percikan.
export function carHitWorld(state, car, dt) {
  const hit = resolveBuildingCollision(state.world, car, 24);
  if (hit && Math.abs(car.speed) > 60 && car.hitCooldown <= 0) {
    car.hitCooldown = 0.5;
    const impact = Math.min(24, Math.abs(car.speed) * 0.055);
    car.speed *= -0.32;
    return impact;
  }
  return 0;
}

export function spawnTrafficCar(state, rng) {
  const xs = roadXs(), ys = roadYs();
  const vertical = rng.chance(0.5);
  let x, y, angle;
  if (vertical) {
    x = rng.pick(xs) + (rng.chance(0.5) ? 16 : -16);
    y = rng.range(160, WORLD.height - 160);
    angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = rng.range(160, WORLD.width - 160);
    y = rng.pick(ys) + (rng.chance(0.5) ? 16 : -16);
    angle = rng.chance(0.5) ? 0 : Math.PI;
  }
  return {
    x, y, angle, speed: rng.range(120, 210),
    def: { topSpeed: 220, accel: 120, handling: 1 },
    color: rng.pick(TRAFFIC_COLORS),
    width: 44, length: 24, armor: 100, maxArmor: 100,
    nitro: 0, maxNitro: 0, traffic: true,
    turnAt: null, waitTimer: 0,
  };
}

// Mobil lalu lintas: ikut jalur jalan, belok di persimpangan, mengerem bila ada mobil di depan.
export function updateTraffic(state, dt) {
  const rng = state.rng;
  const xs = roadXs(), ys = roadYs();
  for (const t of state.traffic) {
    // Cari mobil di depan (lambat bila terlalu dekat).
    let blocked = false;
    for (const o of state.traffic) {
      if (o === t) continue;
      const dx = o.x - t.x, dy = o.y - t.y;
      const ahead = dx * Math.cos(t.angle) + dy * Math.sin(t.angle);
      const side = Math.abs(-dx * Math.sin(t.angle) + dy * Math.cos(t.angle));
      if (ahead > 0 && ahead < 74 && side < 26) { blocked = true; break; }
    }
    const pdx = state.player.x - t.x, pdy = state.player.y - t.y;
    const pAhead = pdx * Math.cos(t.angle) + pdy * Math.sin(t.angle);
    const pSide = Math.abs(-pdx * Math.sin(t.angle) + pdy * Math.cos(t.angle));
    if (pAhead > 0 && pAhead < 70 && pSide < 28 && state.player.mode === 'car') blocked = true;
    const target = blocked ? 0 : t.cruise || 165;
    t.speed += clamp(target - t.speed, -260 * dt, 130 * dt);
    t.x += Math.cos(t.angle) * t.speed * dt;
    t.y += Math.sin(t.angle) * t.speed * dt;
    // Belok di persimpangan terdekat.
    const nearX = xs.find((rx) => Math.abs(t.x - rx) < 26);
    const nearY = ys.find((ry) => Math.abs(t.y - ry) < 26);
    if (nearX !== undefined && nearY !== undefined && t.turnAt !== nearX + ':' + nearY) {
      t.turnAt = nearX + ':' + nearY;
      if (rng.chance(0.34)) {
        t.angle += rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        // Snap ke lajur jalan yang baru.
        if (Math.abs(Math.sin(t.angle)) > 0.5) t.x = nearX + (rng.chance(0.5) ? 16 : -16);
        else t.y = nearY + (rng.chance(0.5) ? 16 : -16);
      }
    }
    // Keluar batas kota: respawn di sisi lain.
    if (t.x < 80 || t.x > WORLD.width - 80 || t.y < 80 || t.y > WORLD.height - 80) {
      const fresh = spawnTrafficCar(state, rng);
      Object.assign(t, fresh);
    }
  }
}

// Gambar mobil top-down: bodi, kaca, lampu, dan (polisi) lightbar.
export function drawCar(ctx, car, opts) {
  const o = opts || {};
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const L = car.length || 26, W = car.width || 46;
  // Bayangan.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-W / 2 + 3, -L / 2 + 4, W, L);
  // Bodi.
  ctx.fillStyle = car.color;
  roundRect(ctx, -W / 2, -L / 2, W, L, 7);
  ctx.fill();
  // Kap + atap.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(W * 0.18, -L / 2 + 3, W * 0.2, L - 6);
  ctx.fillStyle = '#1c2733';
  roundRect(ctx, -W * 0.08, -L / 2 + 4, W * 0.3, L - 8, 4);
  ctx.fill();
  // Kaca depan & belakang.
  ctx.fillStyle = '#9fc4d8';
  ctx.fillRect(W * 0.24, -L / 2 + 5, 4, L - 10);
  ctx.fillRect(-W * 0.26, -L / 2 + 5, 4, L - 10);
  // Lampu depan (arah jalan = +x).
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(W / 2 - 3, -L / 2 + 3, 3, 6);
  ctx.fillRect(W / 2 - 3, L / 2 - 9, 3, 6);
  // Lampu rem.
  ctx.fillStyle = '#ff4a3a';
  ctx.fillRect(-W / 2, -L / 2 + 3, 3, 6);
  ctx.fillRect(-W / 2, L / 2 - 9, 3, 6);
  if (o.police) {
    // Lightbar merah-biru berkedip.
    const phase = Math.floor(performance.now() / 180) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2a2a' : '#2a6aff';
    ctx.fillRect(-6, -L / 2 + 2, 12, 7);
    ctx.fillStyle = phase ? '#2a6aff' : '#ff2a2a';
    ctx.fillRect(-6, L / 2 - 9, 12, 7);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S.B.P.D', 0, 3);
  }
  if (o.taxi) {
    ctx.fillStyle = '#f5d90a';
    ctx.fillRect(-W * 0.08, -L / 2 + 2, W * 0.16, 5);
  }
  if (car.boosting) {
    ctx.fillStyle = '#4ac8ff';
    ctx.beginPath();
    ctx.moveTo(-W / 2, -8); ctx.lineTo(-W / 2 - 16 - Math.random() * 10, 0); ctx.lineTo(-W / 2, 8);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
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

export function nearestTrafficCar(state, x, y, maxD) {
  let best = null, bestD = maxD;
  for (const t of state.traffic) {
    const d = dist(x, y, t.x, t.y);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

export function makeRngFor(state) { return state.rng; }
