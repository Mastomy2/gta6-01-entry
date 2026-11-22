// Solmar Bay — side jobs.
// One job: work between missions. Two boards stay open in the city — a
// TAXI stand on the avenue and a COURIER depot by the north docks. Walk
// or drive into the ring and the job starts: a fare to run across town
// against the clock. Finish it and the pay lands with a standing bonus
// in the pickup district (a respected driver earns up to +10%); run out
// the clock and the job walks away. The board, the target beacon and the
// countdown all read on the map and the HUD, so a side job is never a
// guessing game.

import { dist } from './world.js';
import { say } from './dialogue.js';
import { districtAt, changeStanding, standingMult } from './standing.js';

export const JOB_SPOTS = [
  { id: 'taxi', kind: 'TAXI', name: 'Taxi stand', x: 1460, y: 860, pay: 120, time: 75 },
  { id: 'courier', kind: 'COURIER', name: 'Courier depot', x: 2500, y: 380, pay: 180, time: 90 },
];

const TARGETS = [
  { x: 420, y: 2200, label: 'South Pier' },
  { x: 3020, y: 1820, label: 'East Gate' },
  { x: 940, y: 2200, label: 'Beach Motel' },
  { x: 1980, y: 1340, label: 'Midtown' },
  { x: 420, y: 380, label: 'North Gate' },
];

export function createSideJobs() {
  return {
    active: null, // { spot, target, timer, pay }
    cooldown: 0,
    done: 0,
    earned: 0,
  };
}

function pickTarget(spot) {
  let best = TARGETS[0];
  let bestD = -1;
  for (const t of TARGETS) {
    const d = dist(spot.x, spot.y, t.x, t.y);
    if (d > bestD && Math.random() < 0.8) { bestD = d; best = t; }
  }
  return best;
}

function startJob(S, spot) {
  const target = pickTarget(spot);
  S.sidejobs.active = { spot, target, timer: spot.time, pay: spot.pay };
  S.banner = `${spot.kind} job — deliver to ${target.label} in ${spot.time}s ($${spot.pay}).`;
  S.bannerTimer = 3;
  say(S, 'RADIO', `${spot.kind} job on the board. ${target.label}, ${spot.time} seconds, $${spot.pay} if you are fast.`, 4);
  S.audio.pickup();
}

function completeJob(S) {
  const job = S.sidejobs.active;
  const p = S.player;
  const d = districtAt(job.spot.x, job.spot.y);
  const pay = Math.round(job.pay * standingMult(S, d.id));
  p.earn(pay);
  S.sidejobs.done += 1;
  S.sidejobs.earned += pay;
  S.sidejobs.cooldown = 20;
  S.sidejobs.active = null;
  if (S.stats) { S.stats.jobsDone += 1; S.stats.earned += pay; }
  changeStanding(S, d.id, 10, 'side job done');
  S.banner = `${job.spot.kind} done — $${pay} at ${job.target.label}.`;
  S.bannerTimer = 3;
  S.audio.cash();
  say(S, 'MARLA', 'Clean run. That is how you build a name in this town.', 4);
}

export function updateSideJobs(S, dt) {
  const jobs = S.sidejobs;
  if (!jobs) return;
  if (jobs.cooldown > 0) jobs.cooldown -= dt;
  if (jobs.active) {
    const job = jobs.active;
    job.timer -= dt;
    if (job.timer <= 0) {
      jobs.active = null;
      jobs.cooldown = 15;
      S.banner = `${job.spot.kind} job expired — the fare walked away.`;
      S.bannerTimer = 2.5;
      return;
    }
    if (dist(S.player.x, S.player.y, job.target.x, job.target.y) < 80) {
      completeJob(S);
    }
    return;
  }
  if (jobs.cooldown > 0 || S.sceneMode) return;
  for (const spot of JOB_SPOTS) {
    if (dist(S.player.x, S.player.y, spot.x, spot.y) < 90) {
      startJob(S, spot);
      return;
    }
  }
}

// One line for the HUD, under the objective bar, while a job is live.
export function jobLine(S) {
  const job = S.sidejobs ? S.sidejobs.active : null;
  if (!job) return '';
  return `${job.spot.kind} → ${job.target.label}: $${job.pay} · ${Math.ceil(job.timer)}s left`;
}

// The board rings in world space; the live target gets a cyan beacon.
export function drawSideJobs(ctx, S) {
  const jobs = S.sidejobs;
  if (!jobs) return;
  if (!jobs.active && !S.sceneMode) {
    for (const spot of JOB_SPOTS) {
      const pulse = 1 + Math.sin(S.time * 4) * 0.12;
      ctx.strokeStyle = '#37d3d3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, 34 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#37d3d3';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(`${spot.kind} · $${spot.pay}`, spot.x, spot.y - 44);
      ctx.fillText(`${spot.kind} · $${spot.pay}`, spot.x, spot.y - 44);
    }
  }
  if (jobs.active) {
    const job = jobs.active;
    const t = job.target;
    const pulse = 1 + Math.sin(S.time * 4) * 0.12;
    ctx.fillStyle = 'rgba(55, 211, 211, 0.16)';
    ctx.fillRect(t.x - 34, t.y - 190, 68, 190);
    ctx.strokeStyle = '#37d3d3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#37d3d3';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText(`${job.spot.kind} → ${t.label}`, t.x, t.y - 46);
    ctx.fillText(`${job.spot.kind} → ${t.label}`, t.x, t.y - 46);
  }
}
