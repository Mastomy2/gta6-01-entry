// HUD and minimap: money, health, ammo, wanted stars, the mission objective
// with its distance, the story banner, and a live minimap (roads, player,
// mission marker, police, cars) drawn in the corner of the screen.

import { WORLD, PLACES } from './city.js';
import { missionObjective, missionTarget, missionTitle } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

export function drawHud(G, ctx, w, h) {
  const p = G.player;
  // Top-left: cash, health bar, ammo.
  ctx.fillStyle = 'rgba(8, 20, 30, 0.72)';
  ctx.fillRect(12, 12, 250, 92);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(12, 12, 250, 92);
  text(ctx, `$${G.money.toLocaleString('en-US')}`, 24, 42, 26, '#7CFC98', 'left', true);
  text(ctx, `HP ${Math.ceil(p.hp)}`, 24, 68, 16, '#ffffff');
  ctx.fillStyle = '#333';
  ctx.fillRect(90, 56, 150, 12);
  ctx.fillStyle = p.hp > 50 ? '#37d67a' : p.hp > 25 ? '#ffb703' : '#e63946';
  ctx.fillRect(90, 56, 150 * Math.max(0, p.hp / 100), 12);
  text(ctx, `Ammo ${G.ammo}`, 24, 94, 16, '#ffe66d');
  text(ctx, p.onFoot ? 'ON FOOT' : 'DRIVING', 190, 94, 13, '#9ecbff');

  // Top-right: wanted stars.
  ctx.fillStyle = 'rgba(8, 20, 30, 0.72)';
  ctx.fillRect(w - 212, 12, 200, 52);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(w - 212, 12, 200, 52);
  text(ctx, 'WANTED', w - 200, 34, 13, '#ffb3b3', 'left', true);
  for (let i = 0; i < 5; i += 1) {
    text(ctx, '★', w - 200 + i * 34, 58, 26, i < G.wanted ? '#ffd60a' : '#445', 'left');
  }

  // Top-centre: mission title + objective + distance.
  const target = missionTarget(G);
  const distText = target ? `  •  ${Math.round(Math.hypot(p.x - target.x, p.y - target.y))}m` : '';
  const obj = missionObjective(G);
  ctx.font = `700 20px ${FONT}`;
  const objW = Math.max(ctx.measureText(obj).width, ctx.measureText(`MISSION ${G.missionIndex + 1}: ${missionTitle(G)}`).width) + 48;
  const bx = (w - objW) / 2;
  ctx.fillStyle = 'rgba(8, 20, 30, 0.72)';
  ctx.fillRect(bx, 12, objW, 64);
  ctx.strokeStyle = '#ffd60a';
  ctx.strokeRect(bx, 12, objW, 64);
  text(ctx, `MISSION ${Math.min(G.missionIndex + 1, 5)}: ${missionTitle(G)}`, w / 2, 38, 18, '#ffd60a', 'center', true);
  text(ctx, obj + distText, w / 2, 62, 15, '#ffffff', 'center');

  // Mission timer, when one is running.
  if (G.mission && G.mission.timer > 0 && (G.missionIndex === 1 || G.missionIndex === 2)) {
    text(ctx, `${Math.ceil(G.mission.timer)}s`, w / 2, 100, 30, G.mission.timer < 15 ? '#ff5d5d' : '#ffffff', 'center', true);
  }

  // Story banner after a mission starts.
  if (G.storyTimer > 0 && G.storyText) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const lines = wrapText(ctx, G.storyText, 620, 17);
    const bh = 24 + lines.length * 22;
    ctx.fillRect((w - 660) / 2, h - 240, 660, bh);
    lines.forEach((line, i) => text(ctx, line, w / 2, h - 240 + 30 + i * 22, 17, '#ffeec2', 'center'));
  }

  // Context hint at the bottom.
  let hint = '';
  if (p.onFoot) {
    const near = G.nearestCar;
    hint = near ? 'Press E to steal this car' : 'WASD walk • Shift run • F punch • Click / Space shoot • E enter car';
  } else {
    hint = 'W gas • S brake/reverse • A/D steer • E exit car • Click / Space shoot';
  }
  if (G.missionIndex === 4 && !G.mission.grabbed) hint = 'Get inside the BANK and hold position to crack the vault!';
  text(ctx, hint, w / 2, h - 14, 15, 'rgba(255,255,255,0.85)', 'center');

  drawMinimap(G, ctx, w, h);
}

function wrapText(ctx, value, maxWidth, size) {
  ctx.font = `${size}px ${FONT}`;
  const words = value.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawMinimap(G, ctx, w, h) {
  const mw = 230;
  const mh = 173;
  const mx = w - mw - 14;
  const my = h - mh - 14;
  const sx = mw / WORLD.width;
  const sy = mh / WORLD.height;
  ctx.fillStyle = 'rgba(8, 20, 30, 0.78)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
  // Land and sea.
  ctx.fillStyle = '#3f7a52';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#2f6fb2';
  ctx.fillRect(mx + 3000 * sx, my, mw - 3000 * sx, mh);
  ctx.fillStyle = '#e8d9a0';
  ctx.fillRect(mx + 2950 * sx, my, 50 * sx, mh);
  // Roads.
  ctx.fillStyle = '#5a5a66';
  for (const rx of [400, 1000, 1600, 2200, 2800]) ctx.fillRect(mx + (rx - 60) * sx, my, 120 * sx, mh);
  for (const ry of [400, 900, 1400, 1900]) ctx.fillRect(mx, my + (ry - 60) * sy, mw, 120 * sy);
  // Named places.
  ctx.fillStyle = '#ffd60a';
  for (const key of Object.keys(PLACES)) {
    const pl = PLACES[key];
    ctx.fillRect(mx + pl.x * sx - 2, my + pl.y * sy - 2, 4, 4);
  }
  // Mission target: pulsing diamond.
  const target = missionTarget(G);
  if (target) {
    const pulse = 5 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = '#ff2e63';
    ctx.beginPath();
    ctx.arc(mx + target.x * sx, my + target.y * sy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  // Traffic (grey), police (blue), gang (purple), player (green triangle).
  ctx.fillStyle = '#cccccc';
  for (const c of G.traffic) ctx.fillRect(mx + c.x * sx - 1, my + c.y * sy - 1, 3, 3);
  ctx.fillStyle = '#4d9fff';
  for (const c of G.copCars) ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  ctx.fillStyle = '#c77dff';
  for (const g of G.gang) ctx.fillRect(mx + g.x * sx - 2, my + g.y * sy - 2, 4, 4);
  const p = G.player;
  ctx.fillStyle = '#37d67a';
  ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;
  text(ctx, 'SOLMAR BAY', mx + 6, my + 14, 11, '#ffffff', 'left', true);
}
