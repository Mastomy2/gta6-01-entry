// Solmar Bay — partikel (asap, percikan, api) dan jejak ban.
import { clamp } from './random.js';

export function spawnParticles(state, x, y, opts) {
  const o = opts || {};
  const count = o.count || 10;
  const color = o.color || '#ffd24a';
  const speed = o.speed || 160;
  const life = o.life || 0.6;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.6 + Math.random() * 0.7), maxLife: life,
      size: 2 + Math.random() * 4, color,
    });
  }
}

export function addSkid(state, x1, y1, x2, y2) {
  state.skids.push({ x1, y1, x2, y2, life: 1 });
  if (state.skids.length > 260) state.skids.splice(0, state.skids.length - 260);
}

export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= (1 - 2.4 * dt);
    p.vy *= (1 - 2.4 * dt);
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const s of state.skids) s.life -= dt * 0.12;
  state.skids = state.skids.filter((s) => s.life > 0);
}

export function drawSkids(ctx, state) {
  ctx.save();
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const s of state.skids) {
    ctx.strokeStyle = 'rgba(20,20,24,' + clamp(s.life * 0.5, 0, 0.5) + ')';
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParticles(ctx, state) {
  ctx.save();
  for (const p of state.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Ledakan kecil di titik tertentu (dipakai saat mobil target hancur).
export function spawnExplosion(state, x, y) {
  spawnParticles(state, x, y, { count: 30, color: '#ff7a2a', speed: 300, life: 0.9 });
  spawnParticles(state, x, y, { count: 20, color: '#3a3a3a', speed: 140, life: 1.5 });
  spawnParticles(state, x, y, { count: 12, color: '#ffd24a', speed: 380, life: 0.4 });
}
