// Solmar Bay — pejalan kaki: jalan di trotoar, lari bila mobil ngebut mendekat.
import { WORLD } from './config.js';
import { roadXs, roadYs } from './world.js';
import { clamp, dist } from './random.js';

const SHIRT_COLORS = ['#e86a6a', '#6aa8e8', '#e8c96a', '#7ae86a', '#c96ae8', '#e8e8e8', '#e89a6a', '#6ad8c9'];

export function spawnPed(state, rng) {
  const xs = roadXs(), ys = roadYs();
  const vertical = rng.chance(0.5);
  let x, y, angle;
  if (vertical) {
    x = rng.pick(xs) + rng.pick([-46, 46]);
    y = rng.range(160, WORLD.height - 160);
    angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = rng.range(160, WORLD.width - 160);
    y = rng.pick(ys) + rng.pick([-46, 46]);
    angle = rng.chance(0.5) ? 0 : Math.PI;
  }
  return {
    x, y, angle,
    speed: rng.range(28, 62),
    color: rng.pick(SHIRT_COLORS),
    state: 'walk', // 'walk' | 'flee'
    fleeTimer: 0,
    turnAt: null,
    bob: rng.range(0, Math.PI * 2),
  };
}

export function spawnPeds(state, n) {
  for (let i = 0; i < n; i++) state.peds.push(spawnPed(state, state.rng));
}

export function updatePeds(state, dt) {
  const rng = state.rng;
  const xs = roadXs(), ys = roadYs();
  const pp = state.player;
  for (const ped of state.peds) {
    // Lari bila mobil pemain mendekat dengan cepat.
    const d = dist(ped.x, ped.y, pp.x, pp.y);
    if (pp.mode === 'car' && d < 130 && Math.abs(pp.speed) > 180) {
      ped.state = 'flee';
      ped.fleeTimer = 1.6;
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      const away = Math.atan2(ped.y - pp.y, ped.x - pp.x);
      ped.angle = away;
      ped.x += Math.cos(away) * 190 * dt;
      ped.y += Math.sin(away) * 190 * dt;
      if (ped.fleeTimer <= 0) ped.state = 'walk';
    } else {
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      const nearX = xs.find((rx) => Math.abs(ped.x - rx) < 30);
      const nearY = ys.find((ry) => Math.abs(ped.y - ry) < 30);
      if (nearX !== undefined && nearY !== undefined && ped.turnAt !== nearX + ':' + nearY) {
        ped.turnAt = nearX + ':' + nearY;
        if (rng.chance(0.4)) ped.angle += rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    ped.bob += dt * 9;
    ped.x = clamp(ped.x, 90, WORLD.width - 90);
    ped.y = clamp(ped.y, 90, WORLD.height - 90);
    // Pejalan kaki yang keluar jauh: respawn di dekat kamera.
    if (dist(ped.x, ped.y, pp.x, pp.y) > 1500) {
      const fresh = spawnPed(state, rng);
      fresh.x = clamp(pp.x + rng.range(-700, 700), 120, WORLD.width - 120);
      fresh.y = clamp(pp.y + rng.range(-500, 500), 120, WORLD.height - 120);
      Object.assign(ped, fresh);
    }
  }
}

// Gambar pejalan kaki: titik kecil dengan bayangan dan ayunan langkah.
export function drawPeds(ctx, state) {
  for (const ped of state.peds) {
    const bob = Math.sin(ped.bob) * 1.5;
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(1, 2, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2018';
    ctx.beginPath(); ctx.arc(3.5, 0, 3, 0, Math.PI * 2); ctx.fill();
    // Kaki saat berjalan.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -3); ctx.lineTo(-3 - bob, 4);
    ctx.moveTo(-3, 3); ctx.lineTo(-3 + bob, -4);
    ctx.stroke();
    ctx.restore();
  }
}

// Gambar pemain jalan kaki: figur lebih besar + cincin penanda.
export function drawPlayerOnFoot(ctx, state) {
  const p = state.player;
  ctx.save();
  ctx.translate(p.footX, p.footY);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(1, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(p.footAngle);
  ctx.fillStyle = '#d83a2e';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2018';
  ctx.beginPath(); ctx.arc(5, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
