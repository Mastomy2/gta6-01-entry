// Particles and screen shake: exhaust smoke, crash sparks, muzzle flashes,
// skid marks and blood-free hit puffs. A fixed pool, no allocation per frame
// after boot; the renderer reads the live list.

export function createParticles() {
  const pool = [];
  for (let i = 0; i < 240; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff', gravity: 0 });
  }
  let shake = 0;

  function spawn(x, y, vx, vy, life, size, color, gravity) {
    for (const p of pool) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.gravity = gravity || 0;
      return;
    }
  }

  function burst(x, y, count, color, speed, life, size) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.5), size, color, 0);
    }
  }

  function update(dt) {
    for (const p of pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 30);
  }

  return {
    pool,
    burst,
    smoke(x, y, angle) {
      const bx = x - Math.cos(angle) * 22;
      const by = y - Math.sin(angle) * 22;
      spawn(bx, by, -Math.cos(angle) * 30 + (Math.random() - 0.5) * 20, -Math.sin(angle) * 30 + (Math.random() - 0.5) * 20, 0.7, 5 + Math.random() * 4, '#9aa5ad', -20);
    },
    sparks(x, y) { burst(x, y, 14, '#ffd166', 220, 0.5, 3); burst(x, y, 6, '#ff6b35', 140, 0.4, 4); },
    muzzle(x, y, angle) {
      burst(x, y, 5, '#ffe66d', 300, 0.12, 3);
      spawn(x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, 0, 0, 0.08, 10, '#fff3b0', 0);
    },
    hitPuff(x, y) { burst(x, y, 8, '#e0e0e0', 120, 0.35, 3); },
    addShake(amount) { shake = Math.min(18, shake + amount); },
    shakeOffset() {
      if (shake <= 0) return { x: 0, y: 0 };
      return { x: (Math.random() - 0.5) * shake, y: (Math.random() - 0.5) * shake };
    },
    update,
  };
}
