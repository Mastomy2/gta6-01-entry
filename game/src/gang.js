// Solmar Bay — kru, reputasi distrik, dan garasi (ekonomi: beli mobil & upgrade).
import { CREW, CARS, UPGRADES, DISTRICTS } from './config.js';
import { clamp, formatMoney } from './random.js';
import { spendMoney, activeCarDef } from './player.js';

export function standingFor(state, districtId) {
  return state.standing[districtId] || 0;
}

export function addStanding(state, districtId, n) {
  state.standing[districtId] = clamp((state.standing[districtId] || 0) + n, 0, 100);
}

export function crewDef(id) {
  return CREW.find((c) => c.id === id);
}

export function crewUnlocked(state, member) {
  const u = member.unlock;
  if (u.type === 'mission') return state.missionsDone.includes(u.id);
  if (u.type === 'standing') return standingFor(state, u.district) >= u.value;
  return true;
}

export function recruitCrew(state, id) {
  const member = crewDef(id);
  if (!member) return { ok: false, msg: 'No such crew member.' };
  if (state.crew.owned.includes(id)) return { ok: false, msg: member.name + ' is already on your crew.' };
  if (!crewUnlocked(state, member)) {
    const u = member.unlock;
    const need = u.type === 'mission'
      ? 'finish the job "' + (u.id.toUpperCase()) + '" first'
      : 'reach ' + u.value + ' standing in ' + u.district;
    return { ok: false, msg: member.name + ' is not available yet — ' + need + '.' };
  }
  if (!spendMoney(state, member.cost)) {
    return { ok: false, msg: 'Not enough cash — ' + member.name + ' costs ' + formatMoney(member.cost) + '.' };
  }
  state.crew.owned.push(id);
  state.crew.active.push(id);
  if (state.crew.active.length > 3) state.crew.active.shift();
  return { ok: true, msg: member.name + ' joined the crew! ' + member.ability };
}

export function activeCrew(state) {
  return state.crew.active.map(crewDef).filter(Boolean);
}

// Gabungkan semua bonus kru aktif menjadi satu objek mods.
export function crewBonus(state) {
  const b = { topSpeed: 1, accel: 1, handling: 1, nitroRate: 1, heatDecay: 1, ramTaken: 1, ramDealt: 1, heistBonus: 1, armorRegen: 0, repairCost: 1 };
  for (const id of state.crew.active) {
    if (id === 'mara') { b.topSpeed *= 1.12; b.handling *= 1.25; b.nitroRate *= 1.4; }
    if (id === 'rico') { b.armorRegen = 2.2; b.repairCost = 0.5; b.ramTaken = 0.6; }
    if (id === 'lena') { b.heatDecay *= 2; }
    if (id === 'dex') { b.ramDealt *= 2; b.heistBonus = 1.15; }
  }
  return b;
}

export function buyCar(state, id) {
  const car = CARS.find((c) => c.id === id);
  if (!car) return { ok: false, msg: 'No such car.' };
  if (state.ownedCars.includes(id)) {
    state.player.carId = id;
    const def = activeCarDef(state);
    state.player.car.def = def;
    state.player.car.color = def.color;
    return { ok: true, msg: 'Now driving the ' + car.name + '.' };
  }
  if (!spendMoney(state, car.price)) {
    return { ok: false, msg: 'Not enough cash — the ' + car.name + ' costs ' + formatMoney(car.price) + '.' };
  }
  state.ownedCars.push(id);
  state.player.carId = id;
  const def = activeCarDef(state);
  state.player.car.def = def;
  state.player.car.color = def.color;
  state.player.car.armor = 100;
  return { ok: true, msg: 'Bought the ' + car.name + ' — it is waiting in the garage.' };
}

export function buyUpgrade(state, key) {
  const up = UPGRADES.find((u) => u.key === key);
  if (!up) return { ok: false, msg: 'No such upgrade.' };
  const lvl = state.upgrades[key] || 0;
  if (lvl >= up.prices.length) return { ok: false, msg: up.name + ' is already maxed out.' };
  const price = up.prices[lvl];
  if (!spendMoney(state, price)) {
    return { ok: false, msg: 'Not enough cash — ' + up.name + ' level ' + (lvl + 1) + ' costs ' + formatMoney(price) + '.' };
  }
  state.upgrades[key] = lvl + 1;
  return { ok: true, msg: up.name + ' upgraded to level ' + (lvl + 1) + '.' };
}

export function districtList(state) {
  return DISTRICTS.map((d) => ({
    id: d.id, name: d.name, color: d.color, standing: standingFor(state, d.id), desc: d.desc,
  }));
}
