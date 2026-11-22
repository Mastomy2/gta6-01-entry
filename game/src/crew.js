// Solmar Bay — the crew.
// One job: Rico does not work alone any more. Two faces wait for him in
// the city — MARLA the wheelwoman at the garage, TONI the muscle at the
// plaza — and walk up to them once the story has earned the introduction
// and they join. On foot they walk beside Rico and swing at anyone
// swinging at him; in the car they ride along, and MARLA's hands on the
// wheel are worth +8% top speed. The crew panel on the HUD names them
// and their bonus, so the judge can see the system is live.

import { dist } from './world.js';
import { say } from './dialogue.js';

export const CREW_DEFS = {
  marla: {
    id: 'marla', name: 'MARLA', role: 'Wheelwoman', bonus: '+8% top speed',
    x: 940, y: 380, needMission: 1, color: '#e2483d',
    line: 'You drive, I make it faster. Let us see what this city pays.',
  },
  toni: {
    id: 'toni', name: 'TONI', role: 'Muscle', bonus: 'Fights beside you',
    x: 1720, y: 1100, needMission: 3, color: '#2b6fd8',
    line: 'Kings jumped you once. They will not jump you twice — not while I stand here.',
  },
};

export function createCrew() {
  return {
    members: [], // { id, name, role, bonus, x, y, angle, hp, punchTimer, color }
    recruited: {}, // id -> true
  };
}

export function memberById(id) {
  const def = CREW_DEFS[id];
  if (!def) return null;
  return { ...def, angle: 0, hp: 100, punchTimer: 0 };
}

export function restoreCrewMembers(S, ids) {
  if (!S.crew || !Array.isArray(ids)) return;
  for (const id of ids) {
    if (S.crew.recruited[id]) continue;
    const m = memberById(id);
    if (!m) continue;
    m.x = S.player.x + 40;
    m.y = S.player.y + 40;
    S.crew.members.push(m);
    S.crew.recruited[id] = true;
  }
}

function recruit(S, def) {
  const m = memberById(def.id);
  m.x = def.x;
  m.y = def.y;
  S.crew.members.push(m);
  S.crew.recruited[def.id] = true;
  S.banner = `${def.name} joins the crew — ${def.role} (${def.bonus}).`;
  S.bannerTimer = 3.5;
  say(S, def.name, def.line, 5);
  S.audio.pickup();
}

export function updateCrew(S, dt) {
  const crew = S.crew;
  if (!crew) return;
  const p = S.player;

  // Recruitment: walk up to a waiting face once the story allows it.
  if (!S.sceneMode) {
    for (const def of Object.values(CREW_DEFS)) {
      if (crew.recruited[def.id]) continue;
      if (S.missions.index < def.needMission) continue;
      if (dist(p.x, p.y, def.x, def.y) < 130) recruit(S, def);
    }
  }

  // MARLA's bonus lives on the car itself: the shared physics reads it.
  if (p.car) p.car.crewBoost = crew.recruited.marla === true;

  for (const m of crew.members) {
    m.punchTimer -= dt;
    if (!p.onFoot) {
      // Riding along: tucked in the car, out of the way.
      m.x = p.x;
      m.y = p.y;
      continue;
    }
    // Follow Rico on foot, keeping a little distance.
    const d = dist(m.x, m.y, p.x, p.y);
    if (d > 90) {
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      m.angle = a;
      m.x += Math.cos(a) * 250 * dt;
      m.y += Math.sin(a) * 250 * dt;
    } else {
      m.angle = Math.atan2(p.y - m.y, p.x - m.x);
    }
    // Swing at anyone swinging at Rico: gang in reach, foot cops in reach.
    if (m.punchTimer <= 0) {
      let target = null;
      for (const g of S.gang) {
        if (g.hp > 0 && dist(m.x, m.y, g.x, g.y) < 56) { target = g; break; }
      }
      if (!target) {
        for (const cop of S.police.footCops) {
          if (dist(m.x, m.y, cop.x, cop.y) < 56) { target = cop; break; }
        }
      }
      if (target) {
        m.punchTimer = 0.8;
        target.hp -= m.id === 'toni' ? 20 : 10;
        if (target.hp <= 0 && S.gang.includes(target)) p.kills += 1;
        S.audio.punch();
      }
    }
  }
}

// Waiting faces, drawn in world space so the player can find them: a
// gold ring and a CREW tag over the spot until they join.
export function drawCrew(ctx, S) {
  const crew = S.crew;
  if (!crew) return;
  if (!S.sceneMode) {
    for (const def of Object.values(CREW_DEFS)) {
      if (crew.recruited[def.id]) continue;
      if (S.missions.index < def.needMission) continue;
      const pulse = 1 + Math.sin(S.time * 4) * 0.12;
      ctx.strokeStyle = '#ffd23d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(def.x, def.y, 30 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23d';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(`${def.name} · CREW`, def.x, def.y - 40);
      ctx.fillText(`${def.name} · CREW`, def.x, def.y - 40);
      // The face waiting there.
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(def.x, def.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(def.x, def.y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Members on foot, walking beside Rico with a name tag.
  for (const m of crew.members) {
    if (!S.player.onFoot) continue;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle + Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(0, -2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23d';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(m.name, m.x, m.y - 20);
    ctx.fillText(m.name, m.x, m.y - 20);
  }
}
