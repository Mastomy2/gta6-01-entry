// Solmar Bay — the HUD.
// One job: everything drawn in screen space — live minimap, wanted stars,
// money, health bars, speedometer, current objective, the control hint
// pill, banners, and the title / pause / death screens.

import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, V_ROADS, H_ROADS, PLAZA, PARK, BEACH_Y, WATER_Y } from './config.js';
import { currentObjective, currentSecondary, currentMarker, MISSION_NAMES } from './missions.js';
import { weatherLabel } from './weather.js';
import { drawDialogue } from './dialogue.js';
// Round 9 HUD: district standing, crew roster, radio dial, side-job line,
// and the gold results screen.
import { districtLabel, standingOf } from './standing.js';
import { radioLabel } from './radio.js';
import { jobLine } from './sidejobs.js';
import { drawResults } from './results.js';

const MINIMAP_W = 210;
const MINIMAP_H = 152;

export function drawHud(ctx, S) {
  if (S.mode === 'title') { drawTitle(ctx, S); return; }
  drawMinimap(ctx, S);
  drawTopRight(ctx, S);
  drawStandingPanel(ctx, S);
  drawCrewPanel(ctx, S);
  drawObjective(ctx, S);
  drawHealth(ctx, S);
  drawSpeedometer(ctx, S);
  drawHintPill(ctx, S);
  drawBanner(ctx, S);
  drawDialogue(ctx, S);
  if (S.mode === 'paused') drawPaused(ctx, S);
  if (S.player.dead) drawDeath(ctx, S);
  if (S.autopilotDone) drawAutopilotDone(ctx, S);
  drawResults(ctx, S);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,14,20,0.62)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawMinimap(ctx, S) {
  const x0 = 14;
  const y0 = 14;
  panel(ctx, x0, y0, MINIMAP_W, MINIMAP_H);
  const sx = MINIMAP_W / WORLD_W;
  const sy = MINIMAP_H / WORLD_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, MINIMAP_W, MINIMAP_H);
  ctx.clip();
  // Land, beach, water.
  ctx.fillStyle = '#4d8a4a';
  ctx.fillRect(x0, y0, MINIMAP_W, MINIMAP_H);
  ctx.fillStyle = '#e3cd8f';
  ctx.fillRect(x0, y0 + BEACH_Y * sy, MINIMAP_W, (WATER_Y - BEACH_Y) * sy);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(x0, y0 + WATER_Y * sy, MINIMAP_W, MINIMAP_H - WATER_Y * sy);
  // Roads.
  ctx.fillStyle = '#3a3a40';
  for (const rx of V_ROADS) ctx.fillRect(x0 + rx * sx - 2, y0, 4, MINIMAP_H);
  for (const ry of H_ROADS) ctx.fillRect(x0, y0 + ry * sy - 2, MINIMAP_W, 4);
  // Plaza and park.
  ctx.fillStyle = '#b8a888';
  ctx.fillRect(x0 + PLAZA.x * sx, y0 + PLAZA.y * sy, PLAZA.w * sx, PLAZA.h * sy);
  ctx.fillStyle = '#5d9e4e';
  ctx.fillRect(x0 + PARK.x * sx, y0 + PARK.y * sy, PARK.w * sx, PARK.h * sy);
  // Raid danger zone: a red dashed circle so the cordon reads at a glance.
  if (S.events && S.events.raid) {
    const raid = S.events.raid;
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x0 + raid.x * sx, y0 + raid.y * sy, 260 * sx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 59, 48, 0.25)';
    ctx.beginPath();
    ctx.arc(x0 + raid.x * sx, y0 + raid.y * sy, 260 * sx, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission marker: a pulsing gold diamond, not a dot — it has to win
  // against every other blip on the map.
  const m = currentMarker(S);
  if (m) {
    const pulse = 3 + Math.sin(S.time * 5) * 1.5;
    const mx = x0 + m.x * sx;
    const my = y0 + m.y * sy;
    ctx.strokeStyle = 'rgba(255, 210, 61, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx, my, pulse + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.moveTo(mx, my - pulse - 2);
    ctx.lineTo(mx + pulse + 2, my);
    ctx.lineTo(mx, my + pulse + 2);
    ctx.lineTo(mx - pulse - 2, my);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Police blips: blue squares with a white edge, so a cruiser never
  // hides inside the road colour.
  for (const car of S.police.cruisers) {
    ctx.fillStyle = '#5b8cff';
    ctx.fillRect(x0 + car.x * sx - 2.5, y0 + car.y * sy - 2.5, 5, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + car.x * sx - 2.5, y0 + car.y * sy - 2.5, 5, 5);
  }
  // Street-race rivals: tiny checkered squares.
  if (S.events && S.events.race) {
    for (const car of S.events.race.cars) {
      if (!car || car.dead) continue;
      const cx = x0 + car.x * sx;
      const cy = y0 + car.y * sy;
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
      ctx.fillStyle = '#111';
      ctx.fillRect(cx - 3, cy - 3, 3, 3);
      ctx.fillRect(cx, cy, 3, 3);
    }
  }
  // Round 9 blips: side-job boards (cyan squares), the live job target
  // (cyan diamond), the roadblock (red bar), the heli (white H), the crew
  // (gold dots) — the new systems have to read on the map too.
  if (S.sidejobs) {
    for (const spot of [{ x: 1460, y: 860 }, { x: 2500, y: 380 }]) {
      if (S.sidejobs.active) continue;
      ctx.fillStyle = '#37d3d3';
      ctx.fillRect(x0 + spot.x * sx - 3, y0 + spot.y * sy - 3, 6, 6);
    }
    if (S.sidejobs.active) {
      const t = S.sidejobs.active.target;
      ctx.fillStyle = '#37d3d3';
      ctx.beginPath();
      ctx.moveTo(x0 + t.x * sx, y0 + t.y * sy - 5);
      ctx.lineTo(x0 + t.x * sx + 5, y0 + t.y * sy);
      ctx.lineTo(x0 + t.x * sx, y0 + t.y * sy + 5);
      ctx.lineTo(x0 + t.x * sx - 5, y0 + t.y * sy);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (S.roadblock && S.roadblock.active) {
    const b = S.roadblock.active;
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(x0 + b.x * sx - 6, y0 + b.y * sy - 2, 12, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + b.x * sx - 6, y0 + b.y * sy - 2, 12, 4);
  }
  if (S.heli && S.heli.active) {
    const h = S.heli.active;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x0 + h.x * sx, y0 + h.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('H', x0 + h.x * sx, y0 + h.y * sy + 2);
  }
  if (S.crew) {
    for (const m of S.crew.members) {
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath();
      ctx.arc(x0 + m.x * sx, y0 + m.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Player arrow.
  ctx.save();
  ctx.translate(x0 + S.player.x * sx, y0 + S.player.y * sy);
  ctx.rotate(S.player.angle + Math.PI / 2);
  ctx.fillStyle = '#ffcf3d';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // View frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  const cam = S.camera;
  ctx.strokeRect(
    x0 + (cam.x - VIEW_W / 2) * sx,
    y0 + (cam.y - VIEW_H / 2) * sy,
    VIEW_W * sx, VIEW_H * sy,
  );
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BAY', x0 + 6, y0 + MINIMAP_H - 7);
  // Legend: what every blip means, so the map reads without a manual.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '10px sans-serif';
  ctx.fillText('◆ mission   ■ police   ▨ race   ○ raid   ■ job   ▬ block   H heli', x0 + 2, y0 + MINIMAP_H + 13);
}

function drawTopRight(ctx, S) {
  const p = S.player;
  const w = 230;
  const x0 = VIEW_W - w - 14;
  const raid = S.events && S.events.raid;
  panel(ctx, x0, 14, w, 86);
  // Clock: time of day, phase, and rain — the weather at a glance.
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(weatherLabel(S), x0 + w - 12, 30);
  ctx.fillStyle = '#7CFC66';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`$${p.money.toLocaleString('en-US')}`, x0 + w - 12, 56);
  // Wanted stars.
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < p.wanted ? '#ffd23d' : 'rgba(255,255,255,0.28)';
    drawStar(ctx, x0 + 16 + i * 26, 76, 10, i < p.wanted);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(p.wanted === 0 ? 'CLEAN' : `WANTED ${p.wanted}★`, x0 + 16, 20);
  // Flashing RAID alert while a cordon is up.
  if (raid && Math.sin(S.time * 6) > -0.2) {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`RAID ${Math.ceil(raid.timer)}s`, x0 + w - 12, 96);
    ctx.textAlign = 'left';
  }
}

// Round 9: district standing + radio dial, under the money panel.
function drawStandingPanel(ctx, S) {
  const w = 230;
  const x0 = VIEW_W - w - 14;
  const y0 = 104;
  panel(ctx, x0, y0, w, 74);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(districtLabel(S), x0 + 12, y0 + 18);
  // Standing bar: -100 left, +100 right, centre tick at zero.
  const v = S.standing ? standingOf(S, S.standing.current) : 0;
  const bx = x0 + 12;
  const by = y0 + 26;
  const bw = w - 24;
  const bh = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, by, bw, bh);
  const mid = bx + bw / 2;
  ctx.fillStyle = v >= 0 ? '#57d957' : '#ff3b30';
  if (v >= 0) ctx.fillRect(mid, by + 1, (bw / 2) * (v / 100), bh - 2);
  else ctx.fillRect(mid + (bw / 2) * (v / 100), by + 1, (bw / 2) * (-v / 100), bh - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(mid - 1, by, 2, bh);
  // Standing change flash, then the radio dial line.
  if (S.standing && S.standing.flash > 0) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '11px sans-serif';
    ctx.fillText(S.standing.flashText, x0 + 12, y0 + 52);
  }
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '11px sans-serif';
  ctx.fillText(radioLabel(S), x0 + 12, y0 + 66);
}

// Round 9: the crew roster, under the minimap.
function drawCrewPanel(ctx, S) {
  const members = S.crew ? S.crew.members : [];
  const lines = members.length === 0 ? 2 : members.length;
  const h = 30 + lines * 18;
  panel(ctx, 14, 190, 210, h);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CREW', 26, 190 + 18);
  ctx.font = '11px sans-serif';
  if (members.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('None yet — MARLA waits', 26, 190 + 36);
    ctx.fillText('at the garage.', 26, 190 + 54);
  } else {
    members.forEach((m, i) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${m.name} · ${m.role} (${m.bonus})`, 26, 190 + 36 + i * 18);
    });
  }
}

function drawStar(ctx, cx, cy, r, lit) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  if (lit) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawObjective(ctx, S) {
  const text = currentObjective(S);
  ctx.font = 'bold 15px sans-serif';
  const w = Math.min(720, ctx.measureText(text).width + 28);
  panel(ctx, (VIEW_W - w) / 2, 14, w, 30);
  ctx.fillStyle = '#ffd23d';
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, 34);
  // Secondary objective: the bonus line, smaller and gold, under the bar.
  const side = currentSecondary(S);
  if (side) {
    ctx.font = '12px sans-serif';
    const sw = Math.min(720, ctx.measureText(side).width + 24);
    panel(ctx, (VIEW_W - sw) / 2, 48, sw, 22);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(side, VIEW_W / 2, 63);
  }
  // Round 9: the live side-job line, cyan, under the bonus line.
  const job = jobLine(S);
  if (job) {
    ctx.font = '12px sans-serif';
    const jw = Math.min(720, ctx.measureText(job).width + 24);
    panel(ctx, (VIEW_W - jw) / 2, 74, jw, 22);
    ctx.fillStyle = '#37d3d3';
    ctx.fillText(job, VIEW_W / 2, 89);
  }
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, frac)), h - 2);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6, y + h - 4);
}

function drawHealth(ctx, S) {
  const p = S.player;
  panel(ctx, 14, VIEW_H - 66, 220, 52);
  bar(ctx, 22, VIEW_H - 58, 204, 16, p.hp / 100, p.hp > 50 ? '#57d957' : p.hp > 25 ? '#ffb02e' : '#ff3b30', `RICO  ${Math.ceil(p.hp)}`);
  if (!p.onFoot && p.car) {
    bar(ctx, 22, VIEW_H - 36, 204, 16, p.car.hp / 100, p.car.hp > 50 ? '#57b5d9' : p.car.hp > 25 ? '#ffb02e' : '#ff3b30', `CAR  ${Math.ceil(p.car.hp)}`);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText('On foot — press E near a car to steal it', 22, VIEW_H - 24);
  }
}

function drawSpeedometer(ctx, S) {
  const p = S.player;
  if (p.onFoot || !p.car) return;
  const speedKmh = Math.round(Math.abs(p.car.speed) * 0.32);
  const x0 = VIEW_W - 150;
  const y0 = VIEW_H - 118;
  panel(ctx, x0, y0, 136, 104);
  // Dial.
  ctx.save();
  ctx.translate(x0 + 68, y0 + 62);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 42, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 5;
  const frac = Math.min(1, speedKmh / 200);
  ctx.beginPath();
  ctx.arc(0, 0, 42, Math.PI * 0.75, Math.PI * 0.75 + frac * Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(speedKmh), 0, 8);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('KM/H', 0, 24);
  ctx.restore();
}

function drawHintPill(ctx, S) {
  const p = S.player;
  let hint;
  if (S.mode === 'title') return;
  if (p.onFoot) hint = 'WASD walk   •   E steal car   •   SPACE punch   •   M mute   •   P pause';
  else hint = 'WASD drive   •   E get out   •   M mute   •   P pause';
  ctx.font = '13px sans-serif';
  const w = ctx.measureText(hint).width + 30;
  const x0 = (VIEW_W - w) / 2;
  const y0 = VIEW_H - 34;
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(hint, VIEW_W / 2, y0 + 16);
}

function drawBanner(ctx, S) {
  if (!S.banner || S.bannerTimer <= 0) return;
  ctx.font = 'bold 22px sans-serif';
  const w = ctx.measureText(S.banner).width + 36;
  panel(ctx, (VIEW_W - w) / 2, 92, w, 40);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(S.banner, VIEW_W / 2, 119);
}

function drawTitle(ctx, S) {
  ctx.fillStyle = 'rgba(8,12,24,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('SOLMAR BAY', VIEW_W / 2, 170);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('An open-world crime story in the sun', VIEW_W / 2, 212);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfe3ff';
  const lines = [
    'Rico Vega, wheelman. Steal cars, outrun the Solmar PD,',
    'run packages, settle the score with the Kings, and pull',
    'the Big Score — $5,250 on the line, five stars on your tail.',
    '',
    'WASD — walk / drive      E — steal or leave a car      SPACE — punch',
    'R — radio      T — results      M — mute      P — pause      Progress saves automatically',
    'Districts remember you · crew, side jobs, roadblocks, PD heli — free roam after the story',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 268 + i * 26));
  if (S.saveData) {
    ctx.fillStyle = '#7CFC66';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Save found: $${S.saveData.money.toLocaleString('en-US')} — mission ${Math.min(S.saveData.missionIndex + 1, 5)} of 5`, VIEW_W / 2, 268 + lines.length * 26 + 8);
  }
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 24px sans-serif';
  const blink = Math.sin(S.time * 3) > -0.2;
  if (blink) ctx.fillText('PRESS ENTER TO START', VIEW_W / 2, 268 + lines.length * 26 + 52);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px sans-serif';
  ctx.fillText('A fan-made original. Not affiliated with Rockstar Games.', VIEW_W / 2, VIEW_H - 24);
}

function drawPaused(ctx, S) {
  ctx.fillStyle = 'rgba(8,12,24,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press P to keep playing', VIEW_W / 2, VIEW_H / 2 + 26);
}

function drawDeath(ctx, S) {
  ctx.fillStyle = 'rgba(20,4,4,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ff5b4d';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(S.player.bustedFlag ? 'BUSTED' : 'WASTED', VIEW_W / 2, VIEW_H / 2 - 8);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Back on the street in a moment…', VIEW_W / 2, VIEW_H / 2 + 28);
}

function drawAutopilotDone(ctx, S) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, VIEW_H / 2 - 52, VIEW_W, 104);
  ctx.fillStyle = '#7CFC66';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AUTOPILOT DONE', VIEW_W / 2, VIEW_H / 2 + 6);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Mission 1 complete — First Wheels', VIEW_W / 2, VIEW_H / 2 + 34);
}
