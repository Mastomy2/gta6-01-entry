// Solmar Bay — HUD: uang, bintang, minimap, speedometer, misi, kru, menu & garasi.
import { GAME_TITLE, GAME_SUBTITLE, CARS, CREW, UPGRADES, DISTRICTS } from './config.js';
import { formatMoney, formatClock, clamp, dist } from './random.js';
import { wantedStars } from './police.js';
import { activeCrew, districtList, crewDef } from './gang.js';
import { nextMission, availableMissions } from './missions.js';
import { activeCarDef } from './player.js';

function panel(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,22,' + (alpha || 0.72) + ')';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.save();
  ctx.fillStyle = bg || 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y, w * clamp(frac, 0, 1), h, 4); ctx.fill();
  ctx.restore();
}

export function drawHUD(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const p = state.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Kiri atas: uang, bintang, jam + distrik.
  panel(ctx, 14, 12, 250, 92, 0.72);
  ctx.fillStyle = '#7ae86a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatMoney(state.money), 28, 46);
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 20px sans-serif';
  const stars = wantedStars(state);
  let starText = '';
  for (let i = 0; i < 5; i++) starText += i < stars ? '★' : '☆';
  ctx.fillText(starText, 28, 74);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  const d = state.currentDistrict;
  ctx.fillText((d ? d.name : 'Solmar Bay') + '  •  ' + formatClock(state.clock) + (state.clock >= 19 || state.clock < 6 ? '  ☾' : '  ☀'), 28, 96);

  // Minimap kanan atas.
  drawMinimap(ctx, state, W - 214, 12, 200, 148);

  // Tracker misi di tengah atas.
  if (state.mission) {
    const m = state.mission;
    const stage = m.def.stages[m.stageIdx];
    panel(ctx, W / 2 - 260, 12, 520, 58, 0.78);
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.def.title.toUpperCase() + '  •  ' + (m.stageIdx + 1) + '/' + m.def.stages.length, W / 2, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    let label = stage ? stage.label : '';
    if (stage && (stage.type === 'timed' || stage.type === 'escape')) label += '  —  ' + Math.ceil(m.timer) + 's';
    if (stage && (stage.type === 'goto' || stage.type === 'pickup' || stage.type === 'deliver' || stage.type === 'timed')) {
      label += '  •  ' + Math.round(dist(p.x, p.y, stage.x, stage.y)) + 'm';
    }
    ctx.fillText(label, W / 2, 56);
  } else if (state.race) {
    const r = state.race;
    panel(ctx, W / 2 - 190, 12, 380, 58, 0.78);
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(r.def.name.toUpperCase(), W / 2, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText('P' + r.position + '/4   •   LAP ' + Math.min(r.lap, r.def.laps) + '/' + r.def.laps +
      '   •   CP ' + (r.cpIdx + 1) + '/' + r.def.checkpoints.length + '   •   ' + Math.round(r.raceTime) + 's', W / 2, 56);
  } else {
    const nm = nextMission(state);
    panel(ctx, W / 2 - 210, 12, 420, 40, 0.6);
    ctx.fillStyle = '#cfd8e8';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nm ? 'Next job: ' + nm.title + ' — press M to start' : 'All story jobs done — free roam, races (R), garage (G)', W / 2, 37);
  }

  // Kanan bawah: speedometer + nitro + armour.
  const speedMph = Math.round(Math.abs(p.speed || 0) * 0.55);
  panel(ctx, W - 214, H - 118, 200, 104, 0.72);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(String(speedMph), W - 46, H - 66);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#9fb2cc';
  ctx.fillText('MPH', W - 28, H - 66);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '12px sans-serif';
  ctx.fillText('NITRO  [SHIFT]', W - 200, H - 48);
  bar(ctx, W - 200, H - 42, 172, 8, (p.car ? p.car.nitro : 100) / (p.car ? p.car.maxNitro : 100), '#4ac8ff');
  ctx.fillText('ARMOUR', W - 200, H - 24);
  bar(ctx, W - 200, H - 18, 172, 8, (p.car ? p.car.armor : 100) / (p.car ? p.car.maxArmor : 100), '#ff8a5a');

  // Kiri bawah: distrik + standing + kru aktif.
  const dd = state.currentDistrict;
  panel(ctx, 14, H - 118, 250, 104, 0.72);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(dd ? dd.name : 'Solmar Bay', 28, H - 92);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#9fb2cc';
  ctx.fillText('STANDING', 28, H - 72);
  bar(ctx, 28, H - 66, 150, 8, ((dd ? (state.standing[dd.id] || 0) : 0) / 100), dd ? dd.color : '#ffd24a');
  ctx.fillStyle = '#fff';
  ctx.fillText(Math.round(dd ? (state.standing[dd.id] || 0) : 0) + '/100', 186, H - 57);
  const crew = activeCrew(state);
  ctx.fillStyle = '#9fb2cc';
  ctx.fillText('CREW', 28, H - 38);
  ctx.fillStyle = '#ffd24a';
  ctx.font = '13px sans-serif';
  ctx.fillText(crew.length ? crew.map((c) => c.name.split(' ')[0]).join('  •  ') : 'No crew yet — finish jobs to recruit', 28, H - 20);

  // Panah penanda misi di tepi layar.
  drawObjectiveArrow(ctx, state);

  // Toasts.
  drawToasts(ctx, state);

  // Hint kontrol bawah tengah.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD drive  •  SHIFT nitro  •  E enter / steal car  •  M next job  •  R race  •  G garage  •  P pause', W / 2, H - 8);
  ctx.restore();
}

function drawMinimap(ctx, state, x, y, w, h) {
  panel(ctx, x, y, w, h, 0.78);
  const sx = (w - 16) / 3440, sy = (h - 16) / 2720;
  const ox = x + 8, oy = y + 8;
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy, w - 16, h - 16); ctx.clip();
  // Distrik.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color + '44';
    ctx.fillRect(ox + d.rect.x * sx, oy + d.rect.y * sy, d.rect.w * sx, d.rect.h * sy);
  }
  // Jalan.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath(); ctx.moveTo(ox + (200 + i * 340) * sx, oy); ctx.lineTo(ox + (200 + i * 340) * sx, oy + h - 16); ctx.stroke();
  }
  for (let j = 0; j < 8; j++) {
    ctx.beginPath(); ctx.moveTo(ox, oy + (200 + j * 340) * sy); ctx.lineTo(ox + w - 16, oy + (200 + j * 340) * sy); ctx.stroke();
  }
  // Marker misi / balapan.
  if (state.mission) {
    const mk = state.missionMarker;
    if (mk) {
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(ox + mk.x * sx, oy + mk.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (state.race) {
    const r = state.race;
    const cp = r.def.checkpoints[r.cpIdx % r.def.checkpoints.length];
    ctx.fillStyle = '#4ac8ff';
    ctx.beginPath(); ctx.arc(ox + cp.x * sx, oy + cp.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    for (const o of r.opponents) {
      ctx.fillStyle = o.color;
      ctx.fillRect(ox + o.x * sx - 2, oy + o.y * sy - 2, 4, 4);
    }
  }
  // Polisi.
  ctx.fillStyle = '#ff3a3a';
  for (const cop of state.police) {
    ctx.beginPath(); ctx.arc(ox + cop.x * sx, oy + cop.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Pemain.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ox + state.player.x * sx, oy + state.player.y * sy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.beginPath(); ctx.arc(ox + state.player.x * sx, oy + state.player.y * sy, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawObjectiveArrow(ctx, state) {
  const mk = state.missionMarker;
  if (!mk && !state.race) return;
  const tx = state.race ? state.race.def.checkpoints[state.race.cpIdx % state.race.def.checkpoints.length].x : mk.x;
  const ty = state.race ? state.race.def.checkpoints[state.race.cpIdx % state.race.def.checkpoints.length].y : mk.y;
  const cam = state.camera;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const sx = (tx - cam.x) * cam.zoom + W / 2;
  const sy = (ty - cam.y) * cam.zoom + H / 2;
  if (sx > 60 && sx < W - 60 && sy > 60 && sy < H - 60) return; // sudah terlihat
  const cx = W / 2, cy = H / 2;
  const ang = Math.atan2(sy - cy, sx - cx);
  const ex = cx + Math.cos(ang) * (Math.min(W, H) / 2 - 90);
  const ey = cy + Math.sin(ang) * (Math.min(W, H) / 2 - 90);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(ang);
  ctx.fillStyle = state.race ? '#4ac8ff' : '#ffd24a';
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(-10, -11); ctx.lineTo(-4, 0); ctx.lineTo(-10, 11);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(dist(state.player.x, state.player.y, tx, ty)) + 'm', ex, ey + 28);
  ctx.restore();
}

function drawToasts(ctx, state) {
  const W = ctx.canvas.width;
  ctx.save();
  ctx.textAlign = 'center';
  let y = 86;
  for (const m of state.messages.slice(-3)) {
    const alpha = clamp(m.t / 1.2, 0.25, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = m.color || '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(m.text, W / 2, y);
    y += 22;
  }
  ctx.restore();
}

export function drawMenu(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(8,12,24,0.88)');
  grad.addColorStop(1, 'rgba(24,10,28,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(GAME_TITLE, W / 2, H / 2 - 150);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(GAME_SUBTITLE, W / 2, H / 2 - 112);
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '15px sans-serif';
  const lines = [
    'A living bay city: 5 districts, traffic, pedestrians, day & night.',
    'Recruit a crew, build district standing, run 10 story jobs.',
    'Street races, a garage full of cars, and police that escalate 1–5 stars.',
    'Steal cars on foot, outrun roadblocks, spike strips and the helicopter.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 66 + i * 24));
  ctx.fillStyle = '#7ae86a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS ENTER TO PLAY', W / 2, H / 2 + 64);
  ctx.fillStyle = '#cfd8e8';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD drive  •  SHIFT nitro  •  E enter / steal  •  M jobs  •  R race  •  G garage  •  P pause', W / 2, H / 2 + 98);
  const done = state.missionsDone.length;
  if (done > 0) {
    ctx.fillStyle = '#ffd24a';
    ctx.fillText('Progress saved: ' + done + '/10 story jobs done, ' + formatMoney(state.money) + ' in pocket', W / 2, H / 2 + 126);
  }
  ctx.restore();
}

export function drawShop(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,24,0.86)';
  ctx.fillRect(0, 0, W, H);
  const x = W / 2 - 420, y = 60, w = 840, h = H - 140;
  panel(ctx, x, y, w, h, 0.95);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('SOLMAR GARAGE', x + 24, y + 42);
  ctx.fillStyle = '#7ae86a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatMoney(state.money), x + w - 24, y + 42);
  ctx.textAlign = 'left';
  const tabs = ['Cars', 'Upgrades', 'Crew', 'Standing'];
  tabs.forEach((t, i) => {
    const tx = x + 24 + i * 130;
    ctx.fillStyle = state.shop.tab === i ? '#ffd24a' : '#9fb2cc';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText((i + 1) + '. ' + t, tx, y + 78);
  });
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '13px sans-serif';
  ctx.fillText('E: next tab   •   1-4: buy / select   •   G / Esc: close', x + 24, y + 104);

  const itemY = y + 128;
  if (state.shop.tab === 0) {
    CARS.forEach((c, i) => {
      const iy = itemY + i * 84;
      const owned = state.ownedCars.includes(c.id);
      const active = state.player.carId === c.id;
      panel(ctx, x + 24, iy, w - 48, 72, 0.6);
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.roundRect(x + 40, iy + 18, 54, 36, 6); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText((i + 1) + '. ' + c.name + (active ? '  —  DRIVING' : ''), x + 110, iy + 30);
      ctx.fillStyle = '#9fb2cc';
      ctx.font = '13px sans-serif';
      ctx.fillText(c.desc + '  •  Top ' + Math.round(c.topSpeed * 0.55) + ' mph', x + 110, iy + 54);
      ctx.fillStyle = owned ? '#7ae86a' : '#ffd24a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(owned ? (active ? 'ACTIVE' : 'OWNED') : formatMoney(c.price), x + w - 44, iy + 42);
      ctx.textAlign = 'left';
    });
  } else if (state.shop.tab === 1) {
    UPGRADES.forEach((u, i) => {
      const iy = itemY + i * 84;
      const lvl = state.upgrades[u.key] || 0;
      const maxed = lvl >= u.prices.length;
      panel(ctx, x + 24, iy, w - 48, 72, 0.6);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText((i + 1) + '. ' + u.name + '  —  Lv ' + lvl + '/3', x + 40, iy + 30);
      ctx.fillStyle = '#9fb2cc';
      ctx.font = '13px sans-serif';
      ctx.fillText(u.desc, x + 40, iy + 54);
      ctx.fillStyle = maxed ? '#7ae86a' : '#ffd24a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(maxed ? 'MAXED' : formatMoney(u.prices[lvl]), x + w - 44, iy + 42);
      ctx.textAlign = 'left';
    });
  } else if (state.shop.tab === 2) {
    CREW.forEach((c, i) => {
      const iy = itemY + i * 84;
      const owned = state.crew.owned.includes(c.id);
      const unlocked = owned || (function () {
        const u = c.unlock;
        if (u.type === 'mission') return state.missionsDone.includes(u.id);
        return (state.standing[u.district] || 0) >= u.value;
      })();
      panel(ctx, x + 24, iy, w - 48, 72, 0.6);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText((i + 1) + '. ' + c.name + ' — ' + c.role + (owned ? '  •  ON CREW' : ''), x + 40, iy + 30);
      ctx.fillStyle = '#9fb2cc';
      ctx.font = '13px sans-serif';
      ctx.fillText(c.ability, x + 40, iy + 54);
      ctx.fillStyle = owned ? '#7ae86a' : unlocked ? '#ffd24a' : '#ff6a5a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(owned ? 'RECRUITED' : unlocked ? formatMoney(c.cost) : 'LOCKED', x + w - 44, iy + 42);
      ctx.textAlign = 'left';
    });
  } else {
    districtList(state).forEach((d, i) => {
      const iy = itemY + i * 84;
      panel(ctx, x + 24, iy, w - 48, 72, 0.6);
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(x + 56, iy + 36, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(d.name, x + 84, iy + 30);
      ctx.fillStyle = '#9fb2cc';
      ctx.font = '13px sans-serif';
      ctx.fillText(d.desc, x + 84, iy + 54);
      bar(ctx, x + w - 240, iy + 28, 180, 12, d.standing / 100, d.color);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(d.standing) + '/100', x + w - 44, iy + 40);
      ctx.textAlign = 'left';
    });
  }
  ctx.restore();
}

export function drawBusted(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.fillStyle = 'rgba(60,8,10,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('BUSTED!', W / 2, H / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('The Solmar Bay PD took ' + formatMoney(state.bustedLost || 0) + ' in fines. Your ride is back at the plaza.', W / 2, H / 2 + 6);
  ctx.fillStyle = '#7ae86a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS ENTER TO GET BACK OUT THERE', W / 2, H / 2 + 56);
  ctx.restore();
}

export function drawPaused(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,24,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', W / 2, H / 2 - 60);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfd8e8';
  const nm = nextMission(state);
  ctx.fillText('Jobs done: ' + state.missionsDone.length + '/10   •   Races won: ' + state.stats.racesWon +
    '   •   Earned: ' + formatMoney(state.stats.earned), W / 2, H / 2 - 16);
  ctx.fillText(nm ? 'Next job: ' + nm.title + ' (' + nm.district + ', needs ' + nm.standingReq + ' standing)' : 'All story jobs complete!', W / 2, H / 2 + 14);
  ctx.fillStyle = '#7ae86a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('P: resume   •   G: garage   •   M: start next job', W / 2, H / 2 + 52);
  ctx.restore();
}
