// Solmar Bay — renderer: kota, siang/malam, lampu, marker misi, kamera.
import { WORLD, DISTRICTS } from './config.js';
import { clamp, lerp } from './random.js';
import { drawCar } from './vehicles.js';
import { drawPeds, drawPlayerOnFoot } from './pedestrians.js';
import { drawParticles, drawSkids } from './particles.js';
import { drawPoliceProps } from './police.js';

// 0 = tengah malam, 1 = tengah hari. Matahari terbit ~06:00, terbenam ~19:00.
export function daylight(hour) {
  if (hour < 5.5 || hour > 19.5) return 0.16;
  if (hour < 7) return lerp(0.16, 0.9, (hour - 5.5) / 1.5);
  if (hour < 17.5) return 1;
  if (hour < 19.5) return lerp(1, 0.22, (hour - 17.5) / 2);
  return 0.16;
}

export function updateCamera(state, dt) {
  const cam = state.camera;
  const target = { x: state.player.x, y: state.player.y };
  const k = 1 - Math.pow(0.001, dt);
  cam.x += (target.x - cam.x) * k;
  cam.y += (target.y - cam.y) * k;
  cam.zoom = 1;
}

export function render(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const cam = state.camera;
  const light = daylight(state.clock);
  ctx.save();
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const vx0 = cam.x - W / 2 - 80, vy0 = cam.y - H / 2 - 80;
  const vx1 = cam.x + W / 2 + 80, vy1 = cam.y + H / 2 + 80;

  drawGround(ctx, state, vx0, vy0, vx1, vy1);
  drawRoads(ctx, state, vx0, vy0, vx1, vy1);
  drawBuildings(ctx, state, vx0, vy0, vx1, vy1);
  drawCityProps(ctx, state, vx0, vy0, vx1, vy1);
  drawSkids(ctx, state);
  drawMissionMarker(ctx, state);
  drawRaceCheckpoints(ctx, state);

  // Kendaraan parkir.
  for (const c of state.parkedCars) drawCar(ctx, c, {});
  // Lalu lintas.
  for (const t of state.traffic) drawCar(ctx, t, {});
  // Target misi (truk vault / rival).
  if (state.mission && state.mission.target) {
    const t = state.mission.target;
    drawCar(ctx, t, {});
    drawTargetHealth(ctx, t);
  }
  // Lawan balapan.
  if (state.race) for (const o of state.race.opponents) drawCar(ctx, o, {});
  // Polisi + propertinya.
  drawPoliceProps(ctx, state);
  for (const cop of state.police) drawCar(ctx, cop, { police: true });
  // Pemain.
  if (state.player.mode === 'car') drawCar(ctx, state.player.car, {});
  else drawPlayerOnFoot(ctx, state);
  drawPeds(ctx, state);
  drawParticles(ctx, state);

  // Lampu depan di malam hari.
  if (light < 0.5) drawHeadlights(ctx, state);
  ctx.restore();

  // Lapisan malam: gelap biru + lampu jalan menyala.
  const darkness = clamp((0.72 - light) * 0.8, 0, 0.5);
  if (darkness > 0.02) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,12,38,' + darkness.toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    drawStreetGlow(ctx, state, W, H);
  }

  // Vignette lembut.
  ctx.save();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawGround(ctx, state, vx0, vy0, vx1, vy1) {
  // Rumput kota.
  ctx.fillStyle = '#5d8a4a';
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  // Teluk barat (air).
  ctx.fillStyle = '#2a6b9a';
  ctx.fillRect(Math.max(vx0, 0), vy0, 130 - Math.max(vx0, 0) > 0 ? Math.min(130, vx1) - Math.max(vx0, 0) : 0, vy1 - vy0);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let y = 300; y < WORLD.height; y += 180) {
    ctx.fillRect(20, y, 90, 3);
  }
  // Pantai utara (pasir).
  ctx.fillStyle = '#e8cf8a';
  ctx.fillRect(vx0, vy0, vx1 - vx0, 460 - vy0 > 0 ? Math.min(460, vy1) - vy0 : 0);
  // Trotoar distrik: warna lembut per distrik.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color + '22';
    ctx.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
  }
}

function drawRoads(ctx, state, vx0, vy0, vx1, vy1) {
  const half = WORLD.roadWidth / 2;
  ctx.fillStyle = '#3a3f46';
  for (let i = 0; i < WORLD.roadCountX; i++) {
    const x = WORLD.roadFirstX + i * WORLD.roadGapX;
    if (x + half < vx0 || x - half > vx1) continue;
    ctx.fillRect(x - half, vy0, WORLD.roadWidth, vy1 - vy0);
  }
  for (let j = 0; j < WORLD.roadCountY; j++) {
    const y = WORLD.roadFirstY + j * WORLD.roadGapY;
    if (y + half < vy0 || y - half > vy1) continue;
    ctx.fillRect(vx0, y - half, vx1 - vx0, WORLD.roadWidth);
  }
  // Garis tengah putus-putus.
  ctx.strokeStyle = 'rgba(255,220,120,0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  for (let i = 0; i < WORLD.roadCountX; i++) {
    const x = WORLD.roadFirstX + i * WORLD.roadGapX;
    if (x < vx0 || x > vx1) continue;
    ctx.beginPath(); ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); ctx.stroke();
  }
  for (let j = 0; j < WORLD.roadCountY; j++) {
    const y = WORLD.roadFirstY + j * WORLD.roadGapY;
    if (y < vy0 || y > vy1) continue;
    ctx.beginPath(); ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Zebra cross di persimpangan yang terlihat.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const c of state.world.crossings) {
    if (c.x < vx0 || c.x > vx1 || c.y < vy0 || c.y > vy1) continue;
    for (let k = -2; k <= 2; k++) {
      ctx.fillRect(c.x - half - 2, c.y + k * 11 - 3, 10, 6);
      ctx.fillRect(c.x + half - 8, c.y + k * 11 - 3, 10, 6);
      ctx.fillRect(c.x + k * 11 - 3, c.y - half - 2, 6, 10);
      ctx.fillRect(c.x + k * 11 - 3, c.y + half - 8, 6, 10);
    }
  }
}

function drawBuildings(ctx, state, vx0, vy0, vx1, vy1) {
  for (const b of state.world.buildings) {
    if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
    // Bayangan gedung (menara lebih tinggi = bayangan lebih jauh).
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fillRect(b.x + 6 + b.height * 2, b.y + 8 + b.height * 2, b.w, b.h);
    // Dinding.
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Atap.
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    // Jendela atap.
    ctx.fillStyle = 'rgba(40,60,80,0.5)';
    const cols = Math.max(1, Math.floor(b.w / 46));
    const rows = Math.max(1, Math.floor(b.h / 46));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillRect(b.x + 12 + i * 44, b.y + 12 + j * 44, 22, 16);
      }
    }
    if (b.roofProp === 'pool') {
      ctx.fillStyle = '#3a9ad8';
      ctx.fillRect(b.x + b.w / 2 - 26, b.y + b.h / 2 - 14, 52, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(b.x + b.w / 2 - 22, b.y + b.h / 2 - 10, 44, 4);
    } else if (b.roofProp === 'helipad') {
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) / 2 - 12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e8e8e8';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('H', b.x + b.w / 2, b.y + b.h / 2 + 8);
    }
    if (b.kiosk) {
      ctx.fillStyle = '#e86a6a';
      ctx.fillRect(b.x, b.y - 6, b.w, 8);
    }
  }
}

function drawCityProps(ctx, state, vx0, vy0, vx1, vy1) {
  // Palem.
  for (const p of state.world.palms) {
    if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) continue;
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 3, p.y - 12); ctx.stroke();
    ctx.fillStyle = '#3f8a3f';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(p.x + 3 + Math.cos(a) * 9, p.y - 12 + Math.sin(a) * 6, 9, 3.5, a, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Kontainer docks.
  for (const c of state.world.containers) {
    if (c.x < vx0 || c.x > vx1 || c.y < vy0 || c.y > vy1) continue;
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }
  // Yacht di teluk.
  for (const y of state.world.yachts) {
    if (y.x < vx0 || y.x > vx1 || y.y < vy0 || y.y > vy1) continue;
    ctx.save();
    ctx.translate(y.x, y.y);
    ctx.rotate(y.angle);
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(-6, -14, 14, 10);
    ctx.restore();
  }
}

function drawMissionMarker(ctx, state) {
  const mk = state.missionMarker;
  if (!mk) return;
  const pulse = 1 + Math.sin(state.time * 4) * 0.12;
  ctx.save();
  ctx.translate(mk.x, mk.y);
  // Kolom cahaya.
  const grad = ctx.createLinearGradient(0, -120, 0, 0);
  grad.addColorStop(0, 'rgba(255,210,74,0)');
  grad.addColorStop(1, 'rgba(255,210,74,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(-14, -120, 28, 120);
  // Cincin di tanah.
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRaceCheckpoints(ctx, state) {
  if (!state.race) return;
  const r = state.race;
  r.def.checkpoints.forEach((cp, i) => {
    const isNext = i === r.cpIdx;
    ctx.save();
    ctx.translate(cp.x, cp.y);
    ctx.strokeStyle = isNext ? '#4ac8ff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = isNext ? 4 : 2;
    ctx.beginPath(); ctx.arc(0, 0, isNext ? 30 : 20, 0, Math.PI * 2); ctx.stroke();
    if (isNext) {
      ctx.fillStyle = '#4ac8ff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CP ' + (i + 1), 0, -34);
    }
    ctx.restore();
  });
}

function drawTargetHealth(ctx, t) {
  ctx.save();
  ctx.translate(t.x, t.y - 40);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-30, -6, 60, 10);
  ctx.fillStyle = '#ff5a4a';
  ctx.fillRect(-28, -4, 56 * clamp(t.armor / t.maxArmor, 0, 1), 6);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.kind === 'vault' ? 'VAULT TRUCK' : 'RIVAL', 0, -10);
  ctx.restore();
}

function drawHeadlights(ctx, state) {
  const cars = [];
  if (state.player.mode === 'car') cars.push(state.player.car);
  for (const t of state.traffic) cars.push(t);
  for (const c of state.police) cars.push(c);
  for (const car of cars) {
    const fx = car.x + Math.cos(car.angle) * 22;
    const fy = car.y + Math.sin(car.angle) * 22;
    const grad = ctx.createRadialGradient(fx, fy, 4, fx + Math.cos(car.angle) * 90, fy + Math.sin(car.angle) * 90, 130);
    grad.addColorStop(0, 'rgba(255,240,170,0.30)');
    grad.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx + Math.cos(car.angle) * 60, fy + Math.sin(car.angle) * 60, 110, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStreetGlow(ctx, state, W, H) {
  // Lampu jalan menyala di persimpangan yang terlihat.
  const cam = state.camera;
  ctx.save();
  ctx.fillStyle = 'rgba(255,220,130,0.5)';
  for (const c of state.world.crossings) {
    const sx = (c.x - cam.x) * cam.zoom + W / 2;
    const sy = (c.y - cam.y) * cam.zoom + H / 2;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
