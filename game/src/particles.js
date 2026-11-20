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
  const n = big ? 46 : 26;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * (big ? 340 : 220);
    add(particles, {
      kind: 'fire',
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      size: 6 + Math.random() * (big ? 16 : 10),
      color: Math.random() < 0.5 ? PALETTE.explosionOrange : PALETTE.explosionYellow,
    });
  }
  for (let i = 0; i < (big ? 18 : 10); i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 90;
    add(particles, {
      kind: 'smoke',
      x: x + Math.cos(a) * 12,
      y: y + Math.sin(a) * 12,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 30,
      life: 1.2 + Math.random() * 0.8,
      maxLife: 2,
      size: 12 + Math.random() * 14,
      color: PALETTE.smoke,
    });
  }
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
    ctx.globalAlpha = p.kind === 'smoke' ? alpha * 0.45 : alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, p.size * (p.kind === 'fire' ? alpha : 1)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
