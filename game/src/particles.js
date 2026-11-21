// Solmar Bay — particles.
// One job: short-lived visual effects: explosions, smoke from damaged
// cars, sparks from collisions, and the dust kicked up by a getaway.

import { PALETTE } from './config.js';

export function createParticles() {
  return { list: [] };
}

function add(particles, p) {
  particles.list.push(p);
  if (particles.list.length > 420) particles.list.splice(0, particles.list.length - 420);
}

export function spawnExplosion(particles, x, y, big) {
  // Big explosions are the money shot: a wide fireball, a tall smoke
  // column, flying debris, and a shockwave ring that punches the camera.
  const n = big ? 85 : 40;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * (big ? 460 : 280);
    add(particles, {
      kind: 'fire',
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.7,
      maxLife: 1.2,
      size: 7 + Math.random() * (big ? 22 : 12),
      color: Math.random() < 0.5 ? PALETTE.explosionOrange : PALETTE.explosionYellow,
    });
  }
  for (let i = 0; i < (big ? 26 : 12); i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 110;
    add(particles, {
      kind: 'smoke',
      x: x + Math.cos(a) * 12,
      y: y + Math.sin(a) * 12,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 30,
      life: 1.4 + Math.random() * 1,
      maxLife: 2.4,
      size: 14 + Math.random() * 18,
      color: PALETTE.smoke,
    });
  }
  // Debris: hot chunks that fly out and fade fast.
  for (let i = 0; i < (big ? 14 : 6); i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 260 + Math.random() * 260;
    add(particles, {
      kind: 'debris',
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      size: 3 + Math.random() * 4,
      color: '#2b2b2b',
    });
  }
  // Shockwave ring: grows fast, fades faster.
  add(particles, {
    kind: 'ring',
    x, y,
    vx: 0, vy: 0,
    life: 0.55,
    maxLife: 0.55,
    size: big ? 150 : 90,
    color: '#ffd23d',
  });
}

export function spawnSmoke(particles, x, y) {
  add(particles, {
    kind: 'smoke',
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 20,
    vy: -34 - Math.random() * 22,
    life: 0.9 + Math.random() * 0.5,
    maxLife: 1.4,
    size: 9 + Math.random() * 9,
    color: PALETTE.smoke,
  });
}

export function spawnSparks(particles, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random() * 180;
    add(particles, {
      kind: 'spark',
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.25 + Math.random() * 0.2,
      maxLife: 0.45,
      size: 2.5,
      color: '#ffe9a8',
    });
  }
}

export function spawnDust(particles, x, y) {
  add(particles, {
    kind: 'smoke',
    x, y,
    vx: (Math.random() - 0.5) * 30,
    vy: (Math.random() - 0.5) * 30,
    life: 0.5,
    maxLife: 0.5,
    size: 6 + Math.random() * 6,
    color: '#cbb98f',
  });
}

export function updateParticles(particles, dt) {
  const list = particles.list;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'fire') { p.vx *= 0.94; p.vy *= 0.94; }
    if (p.kind === 'smoke') { p.size += 14 * dt; p.vx *= 0.98; p.vy *= 0.98; }
  }
}

export function drawParticles(ctx, particles) {
  for (const p of particles.list) {
    const alpha = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'ring') {
      // Shockwave: an expanding stroked ring, brightest at birth.
      const frac = 1 - alpha;
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 5 * alpha + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size * frac), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    ctx.globalAlpha = p.kind === 'smoke' ? alpha * 0.45 : alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, p.size * (p.kind === 'fire' ? alpha : 1)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
