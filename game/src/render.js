// Rendering only: the camera follows Rico, the world is drawn (living
// ground, sea and beach, roads, buildings, palms, cars, people, cops,
// markers, particles), then the HUD and the screen panels (title, pause,
// busted/wasted, win). No rules live here; it only paints the state it is
// given. The city is sun-soaked: two-tone grass, zebra crossings, long
// building shadows, roof details, an animated sea, beach umbrellas and
// palms, and a golden-hour grade over everything.

import { WORLD, ROADS_X, ROADS_Y, PLACES } from './city.js';
import { missionTarget } from './missions.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Deterministic 0..1 hash of a grid cell, so speckles and patches are the
// same every frame and every run without storing them.
function hash2(ix, iy) {
  let h = (ix * 73856093) ^ (iy * 19349663);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

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

  // A label with a drop shadow, so it stays readable over bright roofs.
  function label(value, x, y, size, color) {
    text(value, x + 2, y + 3, size, 'rgba(0,0,0,0.55)', 'center', true);
    text(value, x, y, size, color, 'center', true);
  }

  function drawPalm(x, y, lean, size, time) {
    // Ground shadow, stretched away from the low sun.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 9 * size, y + 6 * size, 16 * size, 7 * size, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trunk, leaning with a gentle curve.
    const topX = x + lean * 22 * size;
    const topY = y - 34 * size;
    ctx.strokeStyle = '#8a6a45';
    ctx.lineWidth = 5 * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 8 * size, y - 18 * size, topX, topY);
    ctx.stroke();
    // Six fronds, swaying a little with the sea breeze.
    ctx.strokeStyle = '#2e8b57';
    ctx.lineWidth = 3 * size;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const sway = Math.sin(time * 1.2 + x * 0.01 + i) * 0.06;
      const fx = topX + Math.cos(a + sway) * 20 * size;
      const fy = topY + Math.sin(a + sway) * 12 * size - 4 * size;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(a + sway) * 12 * size, topY - 8 * size, fx, fy);
      ctx.stroke();
    }
    // Coconuts under the crown.
    ctx.fillStyle = '#6e5233';
    ctx.beginPath();
    ctx.arc(topX - 3 * size, topY + 3 * size, 2.5 * size, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(topX + 3 * size, topY + 3 * size, 2.5 * size, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawUmbrella(u) {
    // Beach towel beside it.
    ctx.fillStyle = u.towel;
    ctx.fillRect(u.x + 26, u.y + 12, 30, 14);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(u.x + 26, u.y + 12, 30, 14);
    // Pole.
    ctx.strokeStyle = '#7a5a38';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y + 16);
    ctx.lineTo(u.x, u.y - 14);
    ctx.stroke();
    // Canopy: alternating coloured and white wedges.
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? u.color : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(u.x, u.y - 14);
      ctx.arc(u.x, u.y - 14, 22, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCarShape(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    // Police halo: a pulsing red/blue glow around the cruiser.
    if (car.police) {
      const phase = Math.floor(performance.now() / 350) % 2 === 0;
      const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 58);
      halo.addColorStop(0, phase ? 'rgba(255,46,46,0.38)' : 'rgba(46,123,255,0.38)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.rotate(car.angle);
    // Soft ground shadow, offset with the low sun.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(3, 7, 26, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-24, -13, 48, 26, 7);
    ctx.fill();
    // Windshield, rear window, and a pale roof strip.
    ctx.fillStyle = 'rgba(20,30,45,0.85)';
    ctx.fillRect(-4, -10, 14, 20);
    ctx.fillRect(-21, -9, 7, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-13, -10, 5, 20);
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
    // Brake lights flare while the car brakes.
    if (car.braking) {
      ctx.fillStyle = '#ff2e2e';
      ctx.fillRect(-27, -11, 4, 6);
      ctx.fillRect(-27, 5, 4, 6);
      ctx.fillStyle = 'rgba(255,46,46,0.35)';
      ctx.fillRect(-30, -13, 4, 10);
      ctx.fillRect(-30, 3, 4, 10);
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
    // Visible world rect (with a margin) for the speckles and patches.
    const vx0 = camX - viewW / 2 - 60;
    const vx1 = camX + viewW / 2 + 60;
    const vy0 = camY - viewH / 2 - 60;
    const vy1 = camY + viewH / 2 + 60;
    ctx.save();
    ctx.translate(viewW / 2 - camX, viewH / 2 - camY);

    // Ground: two-tone grass, one shade per city block.
    ctx.fillStyle = '#4a8f5d';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    const xs = [0, ...ROADS_X, WORLD.width];
    const ys = [0, ...ROADS_Y, WORLD.height];
    for (let bx = 0; bx < xs.length - 1; bx += 1) {
      for (let by = 0; by < ys.length - 1; by += 1) {
        if ((bx + by) % 2 !== 0) continue;
        const x0 = xs[bx] + (bx === 0 ? 0 : 60);
        const x1 = Math.min(xs[bx + 1] - (bx === xs.length - 2 ? 0 : 60), 2920);
        const y0 = ys[by] + (by === 0 ? 0 : 60);
        const y1 = ys[by + 1] - (by === ys.length - 2 ? 0 : 60);
        if (x1 <= x0 || y1 <= y0) continue;
        ctx.fillStyle = '#438554';
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    // Deterministic grass speckle inside the view.
    for (let gx = Math.floor(vx0 / 42); gx <= vx1 / 42; gx += 1) {
      for (let gy = Math.floor(vy0 / 42); gy <= vy1 / 42; gy += 1) {
        const r = hash2(gx, gy);
        if (r > 0.14) continue;
        const sx = gx * 42 + hash2(gy, gx) * 30;
        const sy = gy * 42 + hash2(gx + 7, gy) * 30;
        if (sx > 2920) continue;
        ctx.fillStyle = r < 0.07 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(sx, sy, 3, 3);
      }
    }

    // Sea: deep blue out east, turquoise at the shore.
    const seaGrad = ctx.createLinearGradient(3000, 0, WORLD.width, 0);
    seaGrad.addColorStop(0, '#37b6a6');
    seaGrad.addColorStop(0.45, '#2f8fb2');
    seaGrad.addColorStop(1, '#1b5b9e');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(3000, 0, WORLD.width - 3000, WORLD.height);
    // Animated white wave lines rolling in.
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k += 1) {
      const wx = 3045 + k * 48;
      ctx.beginPath();
      for (let wy = Math.max(0, vy0); wy <= Math.min(WORLD.height, vy1); wy += 24) {
        const ox = Math.sin(wy * 0.02 + G.time * 1.6 + k * 2) * 10;
        if (wy === Math.max(0, vy0)) ctx.moveTo(wx + ox, wy);
        else ctx.lineTo(wx + ox, wy);
      }
      ctx.stroke();
    }
    // Foam kissing the shoreline.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let fy = Math.floor(vy0 / 46); fy <= vy1 / 46; fy += 1) {
      const y = fy * 46;
      ctx.beginPath();
      ctx.arc(2998 + Math.sin(y * 0.05 + G.time * 2.2) * 6, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sand with speckle.
    ctx.fillStyle = '#ecd9a0';
    ctx.fillRect(2920, 0, 80, WORLD.height);
    for (let gx = Math.floor(vx0 / 26); gx <= vx1 / 26; gx += 1) {
      for (let gy = Math.floor(vy0 / 26); gy <= vy1 / 26; gy += 1) {
        const r = hash2(gx + 31, gy + 17);
        if (r > 0.12) continue;
        const sx = gx * 26 + hash2(gy, gx + 3) * 20;
        const sy = gy * 26 + hash2(gx, gy + 11) * 20;
        if (sx < 2920 || sx > 3000) continue;
        ctx.fillStyle = 'rgba(120,90,40,0.16)';
        ctx.fillRect(sx, sy, 2, 2);
      }
    }
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
    // Zebra crossings at every intersection.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const rx of ROADS_X) {
      for (const ry of ROADS_Y) {
        for (let i = 0; i < 5; i += 1) ctx.fillRect(rx - 48 + i * 20, ry - 84, 10, 40);
        for (let i = 0; i < 5; i += 1) ctx.fillRect(rx - 84, ry - 48 + i * 20, 40, 10);
      }
    }
    // Worn asphalt patches, seeded per road segment.
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (const rx of ROADS_X) {
      for (let y = Math.floor(vy0 / 240); y <= vy1 / 240; y += 1) {
        if (hash2(rx, y) > 0.3) continue;
        ctx.fillRect(rx - 40 + hash2(y, rx) * 40, y * 240, 50, 34);
      }
    }
    for (const ry of ROADS_Y) {
      for (let x = Math.floor(vx0 / 240); x <= vx1 / 240; x += 1) {
        if (hash2(x, ry) > 0.3) continue;
        ctx.fillRect(x * 240, ry - 40 + hash2(ry, x) * 40, 34, 50);
      }
    }

    // Buildings: a long shadow for the low sun, a parapet, a lighter roof,
    // and a roof detail (pool, helipad or AC boxes) where the city gave one.
    for (const b of G.city.buildings) {
      const shX = b.height * 0.28;
      const shY = b.height * 0.42;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(b.x + shX, b.y + shY, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h * 0.3);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Parapet: an inner rim around the roof.
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      ctx.lineWidth = 1;
      if (b.roof === 'pool' && b.w > 70 && b.h > 60) {
        ctx.fillStyle = '#3fa7c8';
        ctx.beginPath();
        ctx.roundRect(b.x + b.w * 0.2, b.y + b.h * 0.3, b.w * 0.6, b.h * 0.42, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.stroke();
      } else if (b.roof === 'helipad' && b.w > 70 && b.h > 60) {
        ctx.fillStyle = 'rgba(20,30,45,0.75)';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd60a';
        ctx.lineWidth = 2;
        ctx.stroke();
        text('H', b.x + b.w / 2, b.y + b.h / 2 + 7, 20, '#ffffff', 'center', true);
        ctx.lineWidth = 1;
      } else if (b.roof === 'ac') {
        ctx.fillStyle = '#9aa5ad';
        const n = 2 + Math.floor(hash2(b.x, b.y) * 2);
        for (let i = 0; i < n; i += 1) {
          const ax = b.x + 10 + hash2(b.x + i * 13, b.y) * (b.w - 26);
          const ay = b.y + 10 + hash2(b.x, b.y + i * 17) * (b.h - 26);
          ctx.fillRect(ax, ay, 12, 10);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.strokeRect(ax, ay, 12, 10);
        }
      }
      if (b.landmark) label(b.landmark, b.x + b.w / 2, b.y + b.h / 2, 20, 'rgba(255,255,255,0.9)');
    }

    // Beach umbrellas with towels, then the palms.
    for (const u of G.city.umbrellas) drawUmbrella(u);
    for (const palm of G.city.palms) drawPalm(palm.x, palm.y, palm.lean, palm.size, G.time);

    // Named place labels.
    label('MARINA PIER', PLACES.pier.x - 60, PLACES.pier.y - 60, 18, '#ffffff');
    label('BAY TRUST BANK', PLACES.bank.x, PLACES.bank.y - 130, 18, '#ffffff');
    label("RICO'S GARAGE", PLACES.garage.x, PLACES.garage.y - 80, 16, '#ffffff');
    label('SAFEHOUSE', PLACES.safehouse.x, PLACES.safehouse.y - 70, 16, '#ffffff');

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

    // Skid marks left by hard cornering, fading as they age.
    if (G.skids) {
      ctx.lineCap = 'round';
      for (const s of G.skids) {
        ctx.strokeStyle = `rgba(12,12,12,${0.42 * s.life})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
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

    // Golden-hour grade and a vignette over the whole view.
    ctx.fillStyle = 'rgba(255,166,66,0.07)';
    ctx.fillRect(0, 0, viewW, viewH);
    const vig = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.42, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.75);
    vig.addColorStop(0, 'rgba(10,10,30,0)');
    vig.addColorStop(1, 'rgba(10,10,30,0.26)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, viewW, viewH);
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
