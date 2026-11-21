// Solmar Bay — the Kings, the plaza gang.
// One job: gang members who hang around the plaza, chase and punch the
// player when he gets close, and carry the health bars and KING tag the
// plaza scene shows.

import { GANG_COUNT, GANG_HP, GANG_SPEED, GANG_DAMAGE, GANG_AGGRO_RANGE, PLAZA } from './config.js';
import { makeRng, range, chance } from './random.js';
import { dist, clampToWorld } from './world.js';

export function spawnGang(seed) {
  const rng = makeRng(seed + 404);
  const gang = [];
  for (let i = 0; i < GANG_COUNT; i++) {
    gang.push({
      x: PLAZA.cx + range(rng, -160, 160),
      y: PLAZA.cy + range(rng, -130, 130),
      angle: range(rng, 0, Math.PI * 2),
      hp: GANG_HP,
      maxHp: GANG_HP,
      isLeader: i === 0,
      name: i === 0 ? 'KING' : 'Kings',
      state: 'idle', // idle | chase | attack
      punchTimer: 0,
      wanderTimer: range(rng, 1, 4),
      walkPhase: range(rng, 0, Math.PI * 2),
    });
  }
  return gang;
}

export function updateGang(S, dt) {
  // Staged scenes place the gang themselves (plaza ring); the live AI
  // would pile every member onto the player.
  if (S.sceneMode) return;
  const p = S.player;
  const missionActive = S.missions.index === 3 && S.missions.step === 1;
  for (const g of S.gang) {
    if (g.hp <= 0) continue;
    g.punchTimer -= dt;
    g.walkPhase += dt * 8;
    const d = dist(g.x, g.y, p.x, p.y);
    // The Kings fight on foot: a player inside a car is out of reach.
    const aggro = p.onFoot && (missionActive || d < GANG_AGGRO_RANGE);
    if (aggro && !p.dead) {
      g.state = d < 34 ? 'attack' : 'chase';
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      g.angle = a;
      if (g.state === 'chase') {
        g.x += Math.cos(a) * GANG_SPEED * dt;
        g.y += Math.sin(a) * GANG_SPEED * dt;
      } else if (g.punchTimer <= 0) {
        g.punchTimer = 0.85;
        p.damage(GANG_DAMAGE, 'jumped by the Kings');
        S.audio.punch();
      }
    } else {
      g.state = 'idle';
      g.wanderTimer -= dt;
      if (g.wanderTimer <= 0) {
        g.wanderTimer = range(Math.random, 2, 6);
        g.angle = Math.random() * Math.PI * 2;
      }
      g.x += Math.cos(g.angle) * 42 * dt;
      g.y += Math.sin(g.angle) * 42 * dt;
      // Stay inside the plaza.
      g.x = Math.max(PLAZA.x + 16, Math.min(PLAZA.x + PLAZA.w - 16, g.x));
      g.y = Math.max(PLAZA.y + 16, Math.min(PLAZA.y + PLAZA.h - 16, g.y));
    }
    const c = clampToWorld(g.x, g.y, 26);
    g.x = c.x;
    g.y = c.y;
  }
}

export function drawGang(ctx, gang) {
  for (const g of gang) {
    if (g.hp <= 0) {
      // Knocked out: lying flat.
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(1.5);
      ctx.fillStyle = '#7a2ea8';
      ctx.fillRect(-11, -6, 22, 12);
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a2ea8';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(0, -2, 6, 0, Math.PI * 2);
    ctx.fill();
    // Bandana.
    ctx.fillStyle = g.isLeader ? '#ffd23d' : '#e2483d';
    ctx.fillRect(-6, -8, 12, 4);
    ctx.restore();

    // Health bar above the head.
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(g.x - 20, g.y - 30, 40, 6);
    ctx.fillStyle = g.hp > 50 ? '#57d957' : g.hp > 25 ? '#ffb02e' : '#ff3b30';
    ctx.fillRect(g.x - 19, g.y - 29, 38 * (g.hp / g.maxHp), 4);
    // Name tag: the leader is KING.
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = g.isLeader ? '#ffd23d' : '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(g.name, g.x, g.y - 36);
    ctx.fillText(g.name, g.x, g.y - 36);
  }
}
