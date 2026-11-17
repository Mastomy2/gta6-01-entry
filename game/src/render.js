// Rendering only: the camera follows Rico, the world is drawn (ground, sea
// and beach, roads, buildings, cars, people, cops, markers, particles), then
// the HUD and the screen panels (title, pause, busted/wasted, win). No rules
// live here; it only paints the state it is given.

import { WORLD, ROADS_X, ROADS_Y, PLACES } from './city.js';
import { missionTarget } from './missions.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = 1280;
  let viewH = 720;

  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = viewW;
    canvas.height = viewH;
  }
  resize();
  window.addEventListener('resize', resize);

  function text(value, x, y, size, color, align, bold) {
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawCarShape(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-22, -10, 46, 26);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-24, -13, 48, 26, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,45,0.85)';
    ctx.fillRect(-4, -10, 14, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-20, -10, 6, 20);
    if (car.police) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -13, 8, 26);
      text('POLICE', 0, 4, 9, '#1b2a4a', 'center', true);
      ctx.fillStyle = (Math.floor(performance.now() / 250) % 2 === 0) ? '#ff2e2e' : '#2e7bff';
      ctx.beginPath();
      ctx.arc(8, -8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = (Math.floor(performance.now() / 250) % 2 === 0) ? '#2e7bff' : '#ff2e2e';
      ctx.beginPath();
      ctx.arc(8, 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Headlights in the driving direction.
    ctx.fillStyle = '#fff6b0';
    ctx.fillRect(22, -10, 3, 5);
    ctx.fillRect(22, 5, 3, 5);
    ctx.restore();
  }

  function drawPersonShape(x, y, angle, color, walkPhase, gun) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const bob = Math.sin(walkPhase || 0) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    if (gun) {
      ctx.fillStyle = '#222';
      ctx.fillRect(8, -2 + bob, 12, 3);
    }
    ctx.restore();
  }

  function drawWorld(G) {
    const p = G.player;
    const shake = G.particles.shakeOffset();
    const camX = Math.max(viewW / 2, Math.min(WORLD.width - viewW / 2, p.x)) + shake.x;
    const camY = Math.max(viewH / 2, Math.min(WORLD.height - viewH / 2, p.y)) + shake.y;
    ctx.save();
    ctx.translate(viewW / 2 - camX, viewH / 2 - camY);

    // Ground: grass blocks, sea + sand on the east edge.
    ctx.fillStyle = '#4a8f5d';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = '#2f6fb2';
    ctx.fillRect(3000, 0, WORLD.width - 3000, WORLD.height);
    ctx.fillStyle = '#ecd9a0';
    ctx.fillRect(2920, 0, 80, WORLD.height);
    // Pier planks out into the sea.
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(3000, 1360, 190, 80);
    ctx.strokeStyle = '#6e5233';
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(3020 + i * 22, 1360);
      ctx.lineTo(3020 + i * 22, 1440);
      ctx.stroke();
    }

    // Roads + centre dashes + sidewalks.
    ctx.fillStyle = '#3c3c46';
    for (const rx of ROADS_X) ctx.fillRect(rx - 60, 0, 120, WORLD.height);
    for (const ry of ROADS_Y) ctx.fillRect(0, ry - 60, WORLD.width, 120);
    ctx.fillStyle = '#b9b9c4';
    for (const rx of ROADS_X) { ctx.fillRect(rx - 78, 0, 8, WORLD.height); ctx.fillRect(rx + 70, 0, 8, WORLD.height); }
    for (const ry of ROADS_Y) { ctx.fillRect(0, ry - 78, WORLD.width, 8); ctx.fillRect(0, ry + 70, WORLD.width, 8); }
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    for (const rx of ROADS_X) {
      ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD.height); ctx.stroke();
    }
    for (const ry of ROADS_Y) {
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(WORLD.width, ry); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Buildings with a lighter roof and a darker edge.
    for (const b of G.city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h * 0.3);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      if (b.landmark) text(b.landmark, b.x + b.w / 2, b.y + b.h / 2, 20, 'rgba(255,255,255,0.9)', 'center', true);
    }

    // Named place labels.
    text('MARINA PIER', PLACES.pier.x - 60, PLACES.pier.y - 60, 18, '#ffffff', 'center', true);
    text('BAY TRUST BANK', PLACES.bank.x, PLACES.bank.y - 130, 18, '#ffffff', 'center', true);
    text("RICO'S GARAGE", PLACES.garage.x, PLACES.garage.y - 80, 16, '#ffffff', 'center', true);
    text('SAFEHOUSE', PLACES.safehouse.x, PLACES.safehouse.y - 70, 16, '#ffffff', 'center', true);

    // Mission marker: pulsing ring + beam at the target.
    const target = missionTarget(G);
    if (target && G.screen === 'play') {
      const pulse = 46 + Math.sin(G.time * 4) * 10;
      ctx.strokeStyle = '#ff2e63';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,46,99,0.25)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff2e63';
      ctx.beginPath();
      ctx.moveTo(target.x, target.y - 56);
      ctx.lineTo(target.x - 12, target.y - 30);
      ctx.lineTo(target.x + 12, target.y - 30);
      ctx.closePath();
      ctx.fill();
    }

    // Pickups.
    for (const pk of G.pickups) {
      if (pk.taken) continue;
      const bob = Math.sin(G.time * 3 + pk.x) * 3;
      ctx.fillStyle = pk.kind === 'ammo' ? '#06d6a0' : '#ff5d8f';
      ctx.fillRect(pk.x - 12, pk.y - 12 + bob, 24, 24);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(pk.x - 12, pk.y - 12 + bob, 24, 24);
      text(pk.kind === 'ammo' ? 'AMMO' : 'HP', pk.x, pk.y + 5 + bob, 10, '#ffffff', 'center', true);
    }

    // Parked cars, traffic, cop cars.
    for (const car of G.parked) drawCarShape(car);
    for (const car of G.traffic) drawCarShape(car);
    for (const car of G.copCars) drawCarShape(car);
    if (G.playerCar) drawCarShape(G.playerCar);

    // Pedestrians, gang, foot cops.
    for (const ped of G.peds) drawPersonShape(ped.x, ped.y, ped.angle, ped.color, ped.walkPhase, false);
    for (const g of G.gang) {
      drawPersonShape(g.x, g.y, g.angle, g.color, G.time * 8, true);
      // Gang health bar.
      ctx.fillStyle = '#333';
      ctx.fillRect(g.x - 16, g.y - 28, 32, 6);
      ctx.fillStyle = '#c77dff';
      ctx.fillRect(g.x - 16, g.y - 28, 32 * (g.hp / g.maxHp), 6);
    }
    for (const cop of G.footCops) drawPersonShape(cop.x, cop.y, cop.angle, '#1b2a4a', G.time * 10, false);

    // Player on foot (with a gun drawn while aiming).
    if (p.onFoot) {
      drawPersonShape(p.x, p.y, p.angle, '#e63946', p.moving ? G.time * 12 : 0, true);
      // Aim line.
      const m = G.aimWorld;
      if (m) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#ff2e63';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Bullets.
    ctx.fillStyle = '#ffe66d';
    for (const b of G.bullets) {
      ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
    }

    // Particles.
    for (const pt of G.particles.pool) {
      if (!pt.active) continue;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife) * 0.85;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(5, 12, 20, 0.72)';
    ctx.fillRect(0, 0, viewW, viewH);
    const pw = 680;
    const ph = 150 + lines.length * 30;
    const px = (viewW - pw) / 2;
    const py = (viewH - ph) / 2;
    ctx.fillStyle = 'rgba(10, 24, 38, 0.95)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = accent || '#ffd60a';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);
    text(title, viewW / 2, py + 64, 46, '#ffffff', 'center', true);
    lines.forEach((line, i) => text(line, viewW / 2, py + 110 + i * 30, 19, '#d8e2ec', 'center'));
    text(prompt, viewW / 2, py + ph - 28, 20, '#ffd60a', 'center', true);
  }

  function draw(G) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1c2c';
    ctx.fillRect(0, 0, viewW, viewH);
    if (G.screen === 'title') {
      // A living backdrop: the city with traffic rolling behind the title.
      drawWorld(G);
      drawPanel('SOLMAR BAY', [
        'An open-world crime story. Rico Vega, wheelman, is back in town —',
        'broke, wanted, and one big score away from freedom.',
        '',
        'WASD / arrows walk  •  Shift run  •  E steal & drive a car',
        'W gas  •  S brake  •  A/D steer  •  F punch  •  Click / Space shoot',
        'Esc pause  •  S save  •  5 story missions, wanted stars, police chases',
      ], G.hasSave ? 'Press Enter to START  •  C to CONTINUE your save' : 'Press Enter or click to START', '#ffd60a');
      text('SOLMAR BAY — an original game. No connection to any existing game series.', viewW / 2, viewH - 24, 13, 'rgba(255,255,255,0.6)', 'center');
      return;
    }
    drawWorld(G);
    if (G.screen === 'play') {
      drawHud(G, ctx, viewW, viewH);
    } else if (G.screen === 'paused') {
      drawHud(G, ctx, viewW, viewH);
      drawPanel('PAUSED', ['Take a breath, Rico. The city waits.'], 'Press P or Esc to resume  •  S to save', '#9ecbff');
    } else if (G.screen === 'over') {
      drawPanel(G.overReason === 'busted' ? 'BUSTED!' : 'WASTED!', [
        G.overReason === 'busted' ? 'The Solmar Bay police caught Rico Vega.' : 'Rico Vega went down in the streets of Solmar Bay.',
        `You reached mission ${Math.min(G.missionIndex + 1, 5)} of 5 with $${G.money.toLocaleString('en-US')}.`,
        'The city is not done with you yet.',
      ], 'Press Enter to try again', '#e63946');
    } else if (G.screen === 'win') {
      drawPanel('THE BIG SCORE!', [
        'Rico Vega cracked the Bay Trust vault, outran every cruiser in',
        'Solmar Bay, and made it to the safehouse with the cash.',
        `Final take: $${G.money.toLocaleString('en-US')}  •  All 5 missions complete.`,
        'Solmar Bay is yours, kid.',
      ], 'Press Enter to play again in free roam', '#37d67a');
    }
  }

  return { draw, viewSize() { return { w: viewW, h: viewH }; } };
}
