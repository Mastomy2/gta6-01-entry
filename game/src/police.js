// Solmar Bay — polisi: wanted level, kejar-kejaran, roadblock, spike strip, helikopter.
import { POLICE_LEVELS, HEAT_PER_STAR, WORLD } from './config.js';
import { clamp, dist, angleDiff } from './random.js';
import { createCar, driveCar } from './vehicles.js';
import { spawnParticles } from './particles.js';
import { damagePlayerCar } from './player.js';

export function wantedStars(state) {
  return clamp(Math.floor(state.heat / HEAT_PER_STAR), 0, 5);
}

export function addHeat(state, n) {
  state.heat = clamp(state.heat + n, 0, 100);
  state.wanted = wantedStars(state);
}

export function policeLevel(state) {
  return POLICE_LEVELS[state.wanted] || POLICE_LEVELS[0];
}

// Spawn mobil polisi di jalan dekat pemain.
function spawnPoliceCar(state, rng) {
  const pp = state.player;
  const angle = rng.range(0, Math.PI * 2);
  const d = rng.range(520, 780);
  const x = clamp(pp.x + Math.cos(angle) * d, 120, WORLD.width - 120);
  const y = clamp(pp.y + Math.sin(angle) * d, 120, WORLD.height - 120);
  const car = createCar({ topSpeed: 560, accel: 330, handling: 1.15 }, x, y, 0);
  car.color = '#e8e8e8';
  car.police = true;
  car.bustTimer = 0;
  return car;
}

export function updatePolice(state, dt) {
  const rng = state.rng;
  const bonus = state.crewBonus || { heatDecay: 1 };
  // Heat memudar; kru hacker mempercepat.
  const decayRate = state.wanted === 0 ? 2.2 : 1.1;
  state.heat = Math.max(0, state.heat - decayRate * (bonus.heatDecay || 1) * dt);
  state.wanted = wantedStars(state);
  const level = policeLevel(state);

  // Jaga jumlah mobil polisi sesuai bintang.
  while (state.police.length < level.maxCars) state.police.push(spawnPoliceCar(state, rng));
  while (state.police.length > level.maxCars) state.police.pop();

  const pp = state.player;
  const ppPos = { x: pp.x, y: pp.y };
  for (const cop of state.police) {
    // Kejar pemain dengan sedikit prediksi arah.
    const px = ppPos.x + Math.cos(pp.angle || 0) * (pp.speed || 0) * 0.35;
    const py = ppPos.y + Math.sin(pp.angle || 0) * (pp.speed || 0) * 0.35;
    const targetAngle = Math.atan2(py - cop.y, px - cop.x);
    const diff = angleDiff(cop.angle, targetAngle);
    const controls = {
      up: true, down: false, nitro: false,
      left: diff < -0.06, right: diff > 0.06,
    };
    // Kecepatan polisi mengikuti level eskalasi.
    cop.def.topSpeed = level.speed;
    driveCar(cop, controls, dt, { topSpeed: 1, accel: 1, handling: 1.1, nitroRate: 1 });
    // Tabrakan dengan pemain: dorong + rusak.
    const d = dist(cop.x, cop.y, ppPos.x, ppPos.y);
    if (pp.mode === 'car' && d < 52) {
      const push = 52 - d;
      const nx = (ppPos.x - cop.x) / (d || 1), ny = (ppPos.y - cop.y) / (d || 1);
      pp.car.x += nx * push * 0.6; pp.car.y += ny * push * 0.6;
      if (cop.hitCooldown <= 0) {
        cop.hitCooldown = 0.7;
        damagePlayerCar(state, 7, 'ram');
        spawnParticles(state, pp.car.x, pp.car.y, { count: 8, color: '#ffd24a', speed: 150, life: 0.4 });
      }
    }
    // Bust: polisi menempel lama saat pemain nyaris diam.
    if (pp.mode === 'car' && d < 62 && Math.abs(pp.speed) < 32) {
      cop.bustTimer += dt;
      if (cop.bustTimer > 2.2) bustPlayer(state);
    } else {
      cop.bustTimer = Math.max(0, cop.bustTimer - dt * 2);
    }
    // Polisi yang tertinggal jauh: teleport mendekat.
    if (d > 1400) {
      const a = rng.range(0, Math.PI * 2);
      cop.x = clamp(ppPos.x + Math.cos(a) * 700, 120, WORLD.width - 120);
      cop.y = clamp(ppPos.y + Math.sin(a) * 700, 120, WORLD.height - 120);
    }
    if (cop.hitCooldown > 0) cop.hitCooldown -= dt;
  }

  // Roadblock di bintang >= 3: dua mobil melintang di jalan depan pemain.
  state.roadblockTimer -= dt;
  if (state.wanted >= 3 && state.roadblockTimer <= 0) {
    state.roadblockTimer = 24;
    const ahead = 420;
    const bx = ppPos.x + Math.cos(pp.angle || 0) * ahead;
    const by = ppPos.y + Math.sin(pp.angle || 0) * ahead;
    state.roadblocks = [
      { x: bx, y: by, angle: (pp.angle || 0), life: 40 },
      { x: bx + 60, y: by + 60, angle: (pp.angle || 0), life: 40 },
    ];
    state.messages.push({ text: 'Roadblock ahead — go around or through!', t: 0, color: '#ff6a5a' });
  }
  for (const rb of state.roadblocks) rb.life -= dt;
  state.roadblocks = state.roadblocks.filter((r) => r.life > 0);

  // Spike strip di bintang >= 4: bila dilindas, kecepatan jatuh.
  state.spikeTimer -= dt;
  if (state.wanted >= 4 && state.spikeTimer <= 0) {
    state.spikeTimer = 18;
    const ahead = 300;
    state.spikes.push({
      x: ppPos.x + Math.cos(pp.angle || 0) * ahead,
      y: ppPos.y + Math.sin(pp.angle || 0) * ahead,
      life: 25,
    });
  }
  for (const sp of state.spikes) {
    sp.life -= dt;
    if (pp.mode === 'car' && dist(pp.car.x, pp.car.y, sp.x, sp.y) < 46) {
      pp.car.speed *= 0.35;
      damagePlayerCar(state, 12, 'spikes');
      spawnParticles(state, pp.car.x, pp.car.y, { count: 12, color: '#c9c9c9', speed: 200, life: 0.5 });
      sp.life = 0;
      state.messages.push({ text: 'Spike strip! Tyres shredded.', t: 0, color: '#ff6a5a' });
    }
  }
  state.spikes = state.spikes.filter((s) => s.life > 0);

  // Helikopter di bintang 5: mengikuti dari atas.
  if (state.wanted >= 5) {
    state.heli.x += (ppPos.x - state.heli.x) * 0.6 * dt;
    state.heli.y += (ppPos.y - state.heli.y) * 0.6 * dt;
    state.heli.angle += dt * 1.4;
  }
}

export function bustPlayer(state) {
  const lost = Math.floor(state.money * 0.15);
  state.money -= lost;
  state.heat = 0;
  state.wanted = 0;
  state.police = [];
  state.roadblocks = [];
  state.spikes = [];
  state.mode = 'busted';
  state.bustedLost = lost;
  state.mission = null;
  state.race = null;
  const s = state.world.spawn;
  state.player.mode = 'car';
  state.player.car.x = s.x; state.player.car.y = s.y;
  state.player.car.angle = s.angle; state.player.car.speed = 0;
  state.player.car.armor = Math.max(30, state.player.car.armor);
}

// Gambar roadblock, spike strip, dan helikopter.
export function drawPoliceProps(ctx, state) {
  for (const rb of state.roadblocks) {
    ctx.save();
    ctx.translate(rb.x, rb.y);
    ctx.rotate(rb.angle);
    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(-8, -34, 16, 68);
    ctx.fillStyle = '#ffd24a';
    for (let i = -30; i < 30; i += 12) ctx.fillRect(-8, i, 16, 6);
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath(); ctx.arc(0, -38, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const sp of state.spikes) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-22, -4, 44, 8);
    ctx.fillStyle = '#d8d8d8';
    for (let i = -18; i <= 18; i += 9) {
      ctx.beginPath(); ctx.moveTo(i, -6); ctx.lineTo(i + 4, 0); ctx.lineTo(i, 6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (state.wanted >= 5) {
    const h = state.heli;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = 'rgba(255, 240, 160, 0.10)';
    ctx.beginPath(); ctx.arc(0, 0, 190, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(h.angle);
    ctx.fillStyle = '#22242e';
    ctx.fillRect(-16, -5, 32, 10);
    ctx.strokeStyle = '#22242e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.restore();
  }
}
