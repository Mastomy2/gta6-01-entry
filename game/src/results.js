// Solmar Bay — the results screen.
// One job: when the story ends, say so in gold. The Big Score closes
// with a full accounting — every dollar earned across the five missions
// and the side jobs, the time on the clock, cars stolen, Kings dropped,
// jobs run, roadblocks smashed — and a rank: S for a legend, C for a
// wheelman who only just made it out. It opens by itself the moment
// mission 5 completes, and T opens it again any time after.

import { MISSION_NAMES } from './missions.js';

export function createResults() {
  return {
    open: false,
    shown: false, // auto-opened once, when the story ended
    data: null,
  };
}

function rankFor(earned) {
  if (earned >= 9000) return { rank: 'S', title: 'LEGEND OF SOLMAR BAY' };
  if (earned >= 7000) return { rank: 'A', title: 'TOP WHEELMAN' };
  if (earned >= 5200) return { rank: 'B', title: 'MADE MAN' };
  return { rank: 'C', title: 'GOT AWAY WITH IT' };
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function buildResults(S) {
  const earned = S.stats ? S.stats.earned : 0;
  const r = rankFor(earned);
  return {
    earned,
    time: fmtTime(S.time),
    carsStolen: S.player.carsStolen,
    kills: S.player.kills,
    jobs: S.stats ? S.stats.jobsDone : 0,
    roadblocks: S.stats ? S.stats.roadblocks : 0,
    missions: MISSION_NAMES.length,
    rank: r.rank,
    title: r.title,
  };
}

export function openResults(S) {
  if (!S.results.data) S.results.data = buildResults(S);
  S.results.open = true;
}

export function toggleResults(S) {
  if (!S.results.data) return;
  S.results.open = !S.results.open;
}

// The gold panel: THE BIG SCORE, the ledger, the rank.
export function drawResults(ctx, S) {
  const res = S.results;
  if (!res || !res.open || !res.data) return;
  const d = res.data;
  const W = 640;
  const H = 430;
  const x0 = (1280 - W) / 2;
  const y0 = (720 - H) / 2;

  ctx.fillStyle = 'rgba(6, 8, 14, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);

  ctx.fillStyle = '#101623';
  ctx.fillRect(x0, y0, W, H);
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 1.5, y0 + 1.5, W - 3, H - 3);
  ctx.strokeStyle = 'rgba(255, 210, 61, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 10, y0 + 10, W - 20, H - 20);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('THE BIG SCORE', 640, y0 + 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('All five missions complete — Solmar Bay is yours.', 640, y0 + 90);

  const rows = [
    ['Total earned', `$${d.earned.toLocaleString('en-US')}`],
    ['Time on the job', d.time],
    ['Missions complete', `${d.missions} / 5`],
    ['Cars stolen', String(d.carsStolen)],
    ['Kings dropped', String(d.kills)],
    ['Side jobs run', String(d.jobs)],
    ['Roadblocks smashed', String(d.roadblocks)],
  ];
  ctx.font = '16px sans-serif';
  rows.forEach(([label, value], i) => {
    const y = y0 + 130 + i * 30;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(label, x0 + 48, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(value, x0 + W - 48, y);
    ctx.font = '16px sans-serif';
  });

  // The rank, big and gold.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(`RANK ${d.rank}`, 640, y0 + H - 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(d.title, 640, y0 + H - 34);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px sans-serif';
  ctx.fillText('Press T to close · the city stays open — free roam', 640, y0 + H - 14);
}
