// Combat: fists (F) and the pistol (click / Space), with limited ammo and
// ammo pickups. Gang members and foot cops fight back. Bullets are a small
// pool; hits spark, kills pay out, and killing a cop is a big crime.

import { dist, moveWithCollision } from './city.js';
import { damagePlayer } from './player.js';

export const BULLET_SPEED = 900;
export const PUNCH_RANGE = 46;
export const PUNCH_DAMAGE = 1;
export const GUN_DAMAGE = 1;

export function shootAt(G, fromX, fromY, angle) {
  if (G.ammo <= 0) {
    G.announce('Out of ammo! Find an ammo pickup (green crate).');
    return false;
  }
  G.ammo -= 1;
  G.playerShooting = true;
  G.playerShootTimer = 0.4;
  const b = {
    x: fromX + Math.cos(angle) * 24,
    y: fromY + Math.sin(angle) * 24,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    life: 0.9,
    friendly: true,
  };
  G.bullets.push(b);
  G.particles.muzzle(b.x, b.y, angle);
  G.audio.shoot();
  return true;
}

export function punch(G) {
  const p = G.player;
  if (p.punchCooldown > 0 || !p.onFoot) return;
  p.punchCooldown = 0.45;
  G.audio.punch();
  const reach = { x: p.x + Math.cos(p.angle) * 30, y: p.y + Math.sin(p.angle) * 30 };
  let hitSomething = false;
  for (const g of G.gang) {
    if (!g.dead && dist(reach, g) < PUNCH_RANGE) {
      g.hp -= PUNCH_DAMAGE;
      hitSomething = true;
      G.particles.hitPuff(g.x, g.y);
      if (g.hp <= 0) killGang(G, g);
    }
  }
  for (const cop of G.footCops) {
    if (dist(reach, cop) < PUNCH_RANGE) {
      cop.hp -= PUNCH_DAMAGE;
      hitSomething = true;
      G.particles.hitPuff(cop.x, cop.y);
      if (cop.hp <= 0) killCop(G, cop);
    }
  }
  if (hitSomething) G.particles.addShake(2);
}

function killGang(G, g) {
  g.dead = true;
  G.mission.kills += 1;
  G.money += 150;
  G.particles.burst(g.x, g.y, 16, '#c77dff', 200, 0.6, 4);
  G.audio.hit();
  G.announce(`Coral King down! ${G.mission.kills}/4. +$150.`);
}

function killCop(G, cop) {
  cop.dead = true;
  G.footCops = G.footCops.filter((c) => c !== cop);
  G.addCrime(2, 'took down a cop');
  G.particles.burst(cop.x, cop.y, 16, '#1b2a4a', 200, 0.6, 4);
  G.announce('You took down a cop! Wanted +2.');
}

export function updateBullets(G, dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    // Hit a building: spark and die.
    if (G.city.buildings.some((bd) => b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h)) {
      b.life = 0;
      G.particles.sparks(b.x, b.y);
      continue;
    }
    if (b.friendly) {
      for (const g of G.gang) {
        if (!g.dead && dist(b, g) < 22) {
          b.life = 0;
          g.hp -= GUN_DAMAGE;
          G.particles.hitPuff(g.x, g.y);
          if (g.hp <= 0) killGang(G, g);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const cop of G.footCops) {
        if (dist(b, cop) < 22) {
          b.life = 0;
          cop.hp -= GUN_DAMAGE;
          G.particles.hitPuff(cop.x, cop.y);
          if (cop.hp <= 0) killCop(G, cop);
          break;
        }
      }
    } else {
      const p = G.player;
      if (p.onFoot && dist(b, p) < 18) {
        b.life = 0;
        damagePlayer(G, 8, 'wasted');
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  if (G.playerShootTimer > 0) {
    G.playerShootTimer -= dt;
    if (G.playerShootTimer <= 0) G.playerShooting = false;
  }
}

export function updateGang(G, dt) {
  const p = G.player;
  for (const g of G.gang) {
    if (g.dead) continue;
    if (g.punchCooldown > 0) g.punchCooldown -= dt;
    if (g.shootCooldown > 0) g.shootCooldown -= dt;
    const d = dist(g, p);
    const target = Math.atan2(p.y - g.y, p.x - g.x);
    g.angle = target;
    if (d > 60) {
      // Chase Rico, or the car he is in, sliding around buildings.
      const next = moveWithCollision(G.city, g.x, g.y, Math.cos(target) * g.speed * dt, Math.sin(target) * g.speed * dt, 12);
      g.x = next.x;
      g.y = next.y;
    } else if (g.punchCooldown <= 0) {
      // In range: punch.
      g.punchCooldown = 0.8;
      if (p.onFoot) damagePlayer(G, 7, 'wasted');
      else if (G.playerCar) G.playerCar.hp -= 3;
      G.audio.punch();
    }
    // Occasionally take a wild shot from range.
    if (d > 120 && d < 420 && g.shootCooldown <= 0) {
      g.shootCooldown = 2.5 + Math.random() * 2;
      G.bullets.push({
        x: g.x, y: g.y,
        vx: Math.cos(target) * BULLET_SPEED * 0.7,
        vy: Math.sin(target) * BULLET_SPEED * 0.7,
        life: 1.1, friendly: false,
      });
      G.particles.muzzle(g.x, g.y, target);
      G.audio.shoot();
    }
  }
  G.gang = G.gang.filter((g) => !g.dead);
}

export function spawnPickups(G) {
  // Ammo crates and health kits scattered near landmarks.
  const spots = [
    { x: 1060, y: 960, kind: 'ammo' }, { x: 1660, y: 1460, kind: 'ammo' },
    { x: 2260, y: 1960, kind: 'health' }, { x: 460, y: 460, kind: 'ammo' },
    { x: 2860, y: 1460, kind: 'health' }, { x: 1660, y: 460, kind: 'ammo' },
    { x: 2260, y: 960, kind: 'health' }, { x: 460, y: 1960, kind: 'ammo' },
  ];
  for (const s of spots) G.pickups.push({ ...s, taken: false });
}

export function updatePickups(G) {
  const p = G.player;
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    if (dist(p, pk) < 34) {
      pk.taken = true;
      if (pk.kind === 'ammo') {
        G.ammo += 24;
        G.announce('Ammo pickup! +24 bullets.');
      } else {
        G.player.hp = Math.min(100, G.player.hp + 40);
        G.announce('Health kit! +40 HP.');
      }
      G.audio.pickup();
      G.particles.burst(pk.x, pk.y, 10, '#06d6a0', 140, 0.5, 3);
    }
  }
}
