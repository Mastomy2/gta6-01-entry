// Solmar Bay — mesin misi cerita 10 babak + balapan jalanan.
import { MISSIONS, RACES } from './config.js';
import { clamp, dist, angleDiff } from './random.js';
import { createCar, driveCar } from './vehicles.js';
import { addMoney, damagePlayerCar } from './player.js';
import { addStanding, crewBonus } from './gang.js';
import { spawnParticles } from './particles.js';
import { addHeat } from './police.js';

export function availableMissions(state) {
  return MISSIONS.filter((m, i) => {
    if (state.missionsDone.includes(m.id)) return false;
    if (i > 0 && !state.missionsDone.includes(MISSIONS[i - 1].id)) return false;
    return (state.standing[m.district] || 0) >= m.standingReq;
  });
}

export function nextMission(state) {
  const list = availableMissions(state);
  return list.length ? list[0] : null;
}

export function missionMarker(state) {
  if (!state.mission) return null;
  const m = state.mission;
  const stage = m.def.stages[m.stageIdx];
  if (!stage) return null;
  if (stage.type === 'ram' && m.target) return { x: m.target.x, y: m.target.y, label: stage.label };
  if (stage.type === 'race') return null;
  if (stage.type === 'escape') return null;
  return { x: stage.x, y: stage.y, label: stage.label };
}

export function startMission(state, id) {
  const def = MISSIONS.find((m) => m.id === id);
  if (!def) return false;
  if (state.mission || state.race) return false;
  state.mission = { def, stageIdx: 0, timer: 0, target: null, stageTime: 0 };
  state.mode = 'play';
  setupStage(state);
  state.messages.push({ text: def.title + ' — ' + def.briefing, t: 0, color: '#ffd24a' });
  return true;
}

function setupStage(state) {
  const m = state.mission;
  const stage = m.def.stages[m.stageIdx];
  m.stageTime = 0;
  if (stage.type === 'timed') m.timer = stage.seconds;
  if (stage.type === 'escape') {
    m.timer = stage.seconds;
    if (stage.stars) addHeat(state, stage.stars * 20 - state.heat);
  }
  if (stage.type === 'ram') {
    const pp = state.player;
    const isVault = stage.target === 'vault';
    const car = createCar({ topSpeed: isVault ? 300 : 460, accel: 240, handling: 1 }, pp.x + 320, pp.y - 120, 0);
    car.color = isVault ? '#e8e8e8' : '#8a2a8a';
    car.armor = isVault ? 130 : 90;
    car.maxArmor = car.armor;
    car.kind = stage.target;
    car.waypoints = loopWaypoints(car.x, car.y);
    car.wpIdx = 0;
    car.hitCooldown = 0;
    m.target = car;
  }
  if (stage.type === 'race') {
    startRace(state, stage.raceId, true);
  }
}

function loopWaypoints(x, y) {
  return [
    { x: x + 420, y }, { x: x + 420, y: y + 420 },
    { x, y: y + 420 }, { x, y },
  ];
}

function completeStage(state) {
  const m = state.mission;
  m.stageIdx++;
  if (m.stageIdx >= m.def.stages.length) {
    completeMission(state);
    return;
  }
  setupStage(state);
  const stage = m.def.stages[m.stageIdx];
  state.messages.push({ text: 'Objective complete — ' + stage.label, t: 0, color: '#7ae86a' });
}

function failMission(state, reason) {
  state.messages.push({ text: 'Job failed: ' + reason, t: 0, color: '#ff6a5a' });
  state.mission = null;
  state.race = null;
}

function completeMission(state) {
  const m = state.mission;
  const def = m.def;
  const bonus = crewBonus(state);
  const isHeist = def.id === 'm8' || def.id === 'm10';
  const payout = Math.round(def.reward * (isHeist ? bonus.heistBonus : 1));
  addMoney(state, payout);
  if (def.id === 'm10') {
    for (const d of ['marina', 'downtown', 'barrio', 'docks', 'beach']) addStanding(state, d, 10);
  } else {
    addStanding(state, def.district, 12);
  }
  state.missionsDone.push(def.id);
  if (def.crewUnlock && !state.crew.owned.includes(def.crewUnlock)) {
    state.crew.owned.push(def.crewUnlock);
    state.crew.active.push(def.crewUnlock);
    if (state.crew.active.length > 3) state.crew.active.shift();
    state.messages.push({ text: 'New crew member joined! Check the garage (G).', t: 0, color: '#7ae86a' });
  }
  state.messages.push({ text: def.title + ' complete — earned $' + payout.toLocaleString('en-US') + ', standing up in ' + def.district + '.', t: 0, color: '#7ae86a' });
  state.mission = null;
}

export function updateMission(state, dt) {
  const m = state.mission;
  if (!m) return;
  const stage = m.def.stages[m.stageIdx];
  if (!stage) return;
  m.stageTime += dt;
  const pp = state.player;

  if (stage.type === 'goto' || stage.type === 'pickup' || stage.type === 'deliver') {
    if (dist(pp.x, pp.y, stage.x, stage.y) < 78) {
      if (stage.type === 'pickup') spawnParticles(state, stage.x, stage.y, { count: 14, color: '#7ae86a', speed: 120, life: 0.7 });
      completeStage(state);
    }
    return;
  }
  if (stage.type === 'timed') {
    m.timer -= dt;
    if (dist(pp.x, pp.y, stage.x, stage.y) < 78) { completeStage(state); return; }
    if (m.timer <= 0) { failMission(state, 'out of time'); return; }
    return;
  }
  if (stage.type === 'escape') {
    m.timer -= dt;
    if ((state.wanted === 0 && m.stageTime > 3) || m.timer <= 0) { completeStage(state); return; }
    return;
  }
  if (stage.type === 'ram' && m.target) {
    const t = m.target;
    updateTargetCar(state, t, dt);
    const d = dist(pp.x, pp.y, t.x, t.y);
    if (pp.mode === 'car' && d < 58 && t.hitCooldown <= 0 && Math.abs(pp.speed) > 90) {
      t.hitCooldown = 0.6;
      const dmg = Math.round(14 * (crewBonus(state).ramDealt || 1) + Math.abs(pp.speed) * 0.03);
      t.armor -= dmg;
      damagePlayerCar(state, 4, 'ram');
      spawnParticles(state, t.x, t.y, { count: 12, color: '#ffd24a', speed: 200, life: 0.5 });
      if (t.armor <= 0) {
        spawnParticles(state, t.x, t.y, { count: 24, color: '#ff7a2a', speed: 260, life: 0.9 });
        m.target = null;
        completeStage(state);
      }
    }
    if (t.hitCooldown > 0) t.hitCooldown -= dt;
    return;
  }
  if (stage.type === 'race') {
    if (state.race && state.race.finished) {
      const won = state.race.position === 1;
      state.race = null;
      if (won) completeStage(state);
      else failMission(state, 'you lost the race');
    }
  }
}

// Mobil target misi: ikut loop waypoint, kabur pelan dari pemain bila rival.
function updateTargetCar(state, t, dt) {
  const wp = t.waypoints[t.wpIdx];
  const d = dist(t.x, t.y, wp.x, wp.y);
  if (d < 60) t.wpIdx = (t.wpIdx + 1) % t.waypoints.length;
  const targetAngle = Math.atan2(wp.y - t.y, wp.x - t.x);
  const diff = angleDiff(t.angle, targetAngle);
  driveCar(t, { up: true, down: false, left: diff < -0.05, right: diff > 0.05, nitro: false },
    dt, { topSpeed: 1, accel: 1, handling: 1, nitroRate: 1 });
}

// ---------- Balapan jalanan ----------

export function raceDef(id) {
  return RACES.find((r) => r.id === id);
}

export function startRace(state, raceId, fromMission) {
  const def = raceDef(raceId);
  if (!def || state.race) return false;
  const cps = def.checkpoints;
  const dir = Math.atan2(cps[1].y - cps[0].y, cps[1].x - cps[0].x);
  const backX = Math.cos(dir), backY = Math.sin(dir);
  const place = (i, lane) => ({
    x: cps[0].x - backX * (140 + i * 55) - backY * lane,
    y: cps[0].y - backY * (140 + i * 55) + backX * lane,
  });
  const p0 = place(0, 0);
  state.player.car.x = p0.x; state.player.car.y = p0.y;
  state.player.car.angle = dir; state.player.car.speed = 0;
  state.player.mode = 'car';
  const oppColors = ['#2e6fd8', '#e8a13a', '#8a2a8a'];
  const opponents = oppColors.map((color, i) => {
    const p = place(i + 1, i % 2 === 0 ? 34 : -34);
    const car = createCar({ topSpeed: 400 + i * 18, accel: 300, handling: 1.05 }, p.x, p.y, dir);
    car.color = color;
    car.cpIdx = 0; car.lap = 1; car.baseSpeed = 330 + i * 14;
    return car;
  });
  state.race = {
    def, lap: 1, cpIdx: 0, opponents, startTime: state.time,
    finished: false, position: 1, fromMission: !!fromMission, raceTime: 0,
  };
  state.messages.push({ text: def.name + ' — ' + def.laps + ' laps, ' + cps.length + ' checkpoints. Go!', t: 0, color: '#ffd24a' });
  return true;
}

export function startNearestRace(state) {
  if (state.race || state.mission) return false;
  const d = state.currentDistrict || 'downtown';
  const def = RACES.find((r) => r.district === d) || RACES[0];
  return startRace(state, def.id, false);
}

function raceProgressOf(car, race) {
  const cps = race.def.checkpoints;
  const next = cps[car.cpIdx % cps.length];
  return { lap: car.lap, cp: car.cpIdx, dist: dist(car.x, car.y, next.x, next.y) };
}

export function updateRace(state, dt) {
  const race = state.race;
  if (!race || race.finished) return;
  race.raceTime += dt;
  const cps = race.def.checkpoints;
  const pp = state.player;

  // Checkpoint pemain.
  const nextCp = cps[race.cpIdx];
  if (pp.mode === 'car' && dist(pp.x, pp.y, nextCp.x, nextCp.y) < 85) {
    race.cpIdx++;
    if (race.cpIdx >= cps.length) { race.cpIdx = 0; race.lap++; }
    if (race.lap > race.def.laps) {
      finishRace(state);
      return;
    }
  }

  // Lawan: kejar checkpoint berikutnya, rubber-band ke pemain.
  for (const o of race.opponents) {
    const target = cps[o.cpIdx % cps.length];
    const d = dist(o.x, o.y, target.x, target.y);
    if (d < 85) {
      o.cpIdx++;
      if (o.cpIdx >= cps.length) { o.cpIdx = 0; o.lap++; }
    }
    const ahead = o.lap > race.lap || (o.lap === race.lap && o.cpIdx > race.cpIdx);
    const speed = clamp(o.baseSpeed + (ahead ? -46 : 42), 280, 470);
    const targetAngle = Math.atan2(target.y - o.y, target.x - o.x);
    const diff = angleDiff(o.angle, targetAngle);
    o.def.topSpeed = speed;
    driveCar(o, { up: true, down: false, left: diff < -0.05, right: diff > 0.05, nitro: false },
      dt, { topSpeed: 1, accel: 1, handling: 1, nitroRate: 1 });
  }

  // Posisi: lap, lalu checkpoint, lalu jarak ke checkpoint berikut.
  const entries = [{ lap: race.lap, cp: race.cpIdx, dist: dist(pp.x, pp.y, nextCp.x, nextCp.y), me: true }];
  for (const o of race.opponents) {
    const next = cps[o.cpIdx % cps.length];
    entries.push({ lap: o.lap, cp: o.cpIdx, dist: dist(o.x, o.y, next.x, next.y), me: false });
  }
  entries.sort((a, b) => (b.lap - a.lap) || (b.cp - a.cp) || (a.dist - b.dist));
  race.position = entries.findIndex((e) => e.me) + 1;
}

function finishRace(state) {
  const race = state.race;
  race.finished = true;
  const won = race.position === 1;
  const secs = Math.round(race.raceTime);
  if (won && !race.fromMission) {
    addMoney(state, race.def.reward);
    addStanding(state, race.def.district, 10);
    state.stats.racesWon++;
    state.messages.push({ text: race.def.name + ' WON in ' + secs + 's — $' + race.def.reward.toLocaleString('en-US') + ' and standing up!', t: 0, color: '#7ae86a' });
    setTimeout(() => { if (state.race === race) state.race = null; }, 4000);
  } else if (!won && !race.fromMission) {
    state.messages.push({ text: race.def.name + ' lost — you finished P' + race.position + '. Try again (R).', t: 0, color: '#ff6a5a' });
    setTimeout(() => { if (state.race === race) state.race = null; }, 4000);
  }
}
