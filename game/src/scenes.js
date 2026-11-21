// Solmar Bay — scene demo untuk screenshot: 4 momen yang menunjukkan sistem game.
// Setiap scene menyiapkan state deterministik (seed tetap) lalu game berjalan normal.
import { MISSIONS, RACES } from './config.js';
import { createCar } from './vehicles.js';
import { startRace } from './missions.js';
import { addHeat } from './police.js';
import { spawnTrafficCar } from './vehicles.js';

export const SCENES = [
  { id: 'chase', file: '1-chase.jpg', title: '4-star police chase at night' },
  { id: 'race', file: '2-race.jpg', title: 'Beach Sprint street race at dusk' },
  { id: 'heist', file: '3-heist.jpg', title: 'The Bay Job — vault truck heist' },
  { id: 'garage', file: '4-garage.jpg', title: 'Garage: cars, crew and district standing' },
];

function snapCamera(state) {
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
}

function placePlayer(state, x, y, angle) {
  const p = state.player;
  p.mode = 'car';
  p.car.x = x; p.car.y = y; p.car.angle = angle; p.car.speed = 0;
  p.x = x; p.y = y; p.angle = angle; p.speed = 0;
}

function addPoliceNear(state, x, y, angle, count) {
  for (let i = 0; i < count; i++) {
    const car = createCar({ topSpeed: 530, accel: 330, handling: 1.15 }, x - i * 90, y + (i % 2 === 0 ? 40 : -40), angle);
    car.color = '#e8e8e8';
    car.police = true;
    car.bustTimer = 0;
    state.police.push(car);
  }
}

function addTrafficNear(state, x, y, n) {
  for (let i = 0; i < n; i++) {
    const t = spawnTrafficCar(state, state.rng);
    t.x = x + state.rng.range(-320, 320);
    t.y = y + state.rng.range(-220, 220);
    state.traffic.push(t);
  }
}

export function applyScene(state, name) {
  state.scene = name;
  state.mode = 'play';
  state.time = 0;
  // Bersihkan state dinamis.
  state.mission = null;
  state.race = null;
  state.police = [];
  state.roadblocks = [];
  state.spikes = [];
  state.heat = 0;
  state.wanted = 0;
  state.messages = [];
  state.roadblockTimer = 20;
  state.spikeTimer = 15;

  if (name === 'chase') {
    // Kejar-kejaran bintang 4 di malam hari, downtown.
    state.clock = 21.6;
    state.money = 8450;
    state.standing.downtown = 42;
    placePlayer(state, 1560, 1220, 0);
    state.player.car.speed = 380;
    addHeat(state, 85);
    addPoliceNear(state, 1560 - 260, 1220, 0, 2);
    addTrafficNear(state, 1900, 1220, 5);
    state.mission = { def: MISSIONS[4], stageIdx: 0, timer: 30, target: null, stageTime: 2 };
    state.messages.push({ text: 'THE GETAWAY — outrun a 4-star chase!', t: 0, color: '#ffd24a' });
  } else if (name === 'race') {
    // Balapan Beach Sprint saat senja, lap 1, posisi 2.
    state.clock = 20.1;
    state.money = 5200;
    state.standing.beach = 38;
    startRace(state, 'beach-sprint', false);
    const race = state.race;
    const cps = race.def.checkpoints;
    race.cpIdx = 2;
    race.lap = 1;
    race.position = 2;
    placePlayer(state, cps[2].x - 160, cps[2].y + 30, 0);
    state.player.car.speed = 420;
    race.opponents[0].x = cps[2].x - 60; race.opponents[0].y = cps[2].y - 30;
    race.opponents[0].angle = 0; race.opponents[0].cpIdx = 2;
    race.opponents[1].x = cps[2].x - 260; race.opponents[1].y = cps[2].y + 60;
    race.opponents[1].angle = 0; race.opponents[1].cpIdx = 2;
    race.opponents[2].x = cps[2].x - 420; race.opponents[2].y = cps[2].y - 50;
    race.opponents[2].angle = 0; race.opponents[2].cpIdx = 1;
    addTrafficNear(state, 1900, 200, 4);
    state.messages.push({ text: 'BEACH SPRINT — LAP 1/2, P2/4', t: 0, color: '#4ac8ff' });
  } else if (name === 'heist') {
    // The Bay Job: truk vault di plaza saat golden hour, kru ikut.
    state.clock = 18.6;
    state.money = 12800;
    state.standing.marina = 55;
    if (!state.crew.owned.includes('mara')) state.crew.owned.push('mara');
    if (!state.crew.owned.includes('dex')) state.crew.owned.push('dex');
    state.crew.active = ['mara', 'dex'];
    placePlayer(state, 1480, 880, 0);
    state.player.car.speed = 300;
    addHeat(state, 45);
    // Truk vault patroli lurus di jalan y=880; pemain tepat di belakangnya dan merangsek.
    const vault = createCar({ topSpeed: 260, accel: 240, handling: 1 }, 1900, 880, 0);
    vault.color = '#e8e8e8';
    vault.armor = 220; vault.maxArmor = 240;
    vault.kind = 'vault';
    vault.waypoints = [{ x: 3260, y: 880 }, { x: 880, y: 880 }];
    vault.wpIdx = 0; vault.hitCooldown = 0;
    state.mission = { def: MISSIONS[7], stageIdx: 1, timer: 0, target: vault, stageTime: 1 };
    addPoliceNear(state, 1560, 880 - 300, Math.PI / 2, 2);
    addTrafficNear(state, 1900, 880, 6);
    state.messages.push({ text: 'THE BAY JOB — ram the vault truck!', t: 0, color: '#ffd24a' });
  } else if (name === 'garage') {
    // Garasi siang hari: toko terbuka, uang banyak, kru + standing terlihat.
    state.clock = 12.0;
    state.money = 12450;
    state.standing = { marina: 55, downtown: 62, barrio: 48, docks: 35, beach: 41 };
    state.ownedCars = ['comet', 'vulcan', 'sabre'];
    state.player.carId = 'sabre';
    state.crew.owned = ['mara', 'rico'];
    state.crew.active = ['mara', 'rico'];
    state.missionsDone = ['m1', 'm2', 'm3', 'm4'];
    placePlayer(state, 1220, 880, Math.PI / 2);
    state.mode = 'shop';
    state.shop.tab = 0;
    addTrafficNear(state, 1220, 880, 3);
  }
  snapCamera(state);
}
