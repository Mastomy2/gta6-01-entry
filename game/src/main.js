// Solmar Bay — bootstrap: state, loop utama, mode, input, kamera, simpan otomatis.
import { WORLD, START_MONEY, DAY_LENGTH_SECONDS, CARS } from './config.js';
import { makeRng, clamp, angleDiff } from './random.js';
import { createWorld, districtAt } from './world.js';
import { createPlayer, updatePlayer, interactKey, playerPos } from './player.js';
import { spawnTrafficCar, updateTraffic } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, wantedStars } from './police.js';
import { updateMission, updateRace, nextMission, startMission, startNearestRace, missionMarker } from './missions.js';
import { updateParticles } from './particles.js';
import { render, updateCamera } from './render.js';
import { drawHUD, drawMenu, drawShop, drawBusted, drawPaused } from './hud.js';
import { createInput } from './input.js';
import { initAudio, resumeAudio, engineSound, policeSiren, sfx } from './audio.js';
import { saveGame, loadGame, applySave } from './save.js';
import { crewBonus, recruitCrew, buyCar, buyUpgrade } from './gang.js';
import { applyScene } from './scenes.js';

function createState() {
  const world = createWorld(20261121);
  const state = {
    mode: 'menu',
    time: 0,
    clock: 9.5,
    money: START_MONEY,
    heat: 0,
    wanted: 0,
    world,
    player: null,
    carId: 'comet',
    traffic: [],
    peds: [],
    police: [],
    roadblocks: [],
    spikes: [],
    particles: [],
    skids: [],
    parkedCars: [],
    crew: { owned: [], active: [] },
    standing: { marina: 10, downtown: 20, barrio: 5, docks: 5, beach: 12 },
    ownedCars: ['comet'],
    upgrades: { engine: 0, armor: 0, nitro: 0 },
    missionsDone: [],
    mission: null,
    race: null,
    shop: { tab: 0 },
    camera: { x: world.spawn.x, y: world.spawn.y, zoom: 1 },
    messages: [],
    stats: { earned: 0, racesWon: 0 },
    rng: makeRng(987654321),
    scene: null,
    currentDistrict: null,
    missionMarker: null,
    roadblockTimer: 20,
    spikeTimer: 15,
    heli: { x: world.spawn.x, y: world.spawn.y, angle: 0 },
    bustedLost: 0,
    crewBonus: null,
    saveTimer: 0,
  };
  state.player = createPlayer(state);
  state.crewBonus = crewBonus(state);
  // Mobil parkir di sekitar plaza (bisa dicuri jalan kaki).
  const parkedDefs = [
    { x: 1300, y: 960, angle: 0, color: '#7a8a99' },
    { x: 1140, y: 800, angle: Math.PI / 2, color: '#c9a13a' },
    { x: 1560, y: 960, angle: Math.PI, color: '#5a7a4a' },
  ];
  for (const pd of parkedDefs) {
    const car = createPlayerCar(state, pd);
    state.parkedCars.push(car);
  }
  // Lalu lintas + pejalan kaki awal.
  for (let i = 0; i < 14; i++) state.traffic.push(spawnTrafficCar(state, state.rng));
  spawnPeds(state, 26);
  return state;
}

function createPlayerCar(state, pd) {
  const car = {
    x: pd.x, y: pd.y, angle: pd.angle, speed: 0,
    def: { topSpeed: 400, accel: 250, handling: 1 },
    color: pd.color, width: 44, length: 24,
    armor: 100, maxArmor: 100, nitro: 0, maxNitro: 0,
    steering: 0, boosting: false, skidTimer: 0, hitCooldown: 0,
  };
  return car;
}

function handleShopKeys(state, input) {
  if (input.wasPressed('KeyE')) {
    state.shop.tab = (state.shop.tab + 1) % 4;
    input.consume('KeyE');
  }
  const digits = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
  for (let i = 0; i < 4; i++) {
    if (!input.wasPressed(digits[i])) continue;
    input.consume(digits[i]);
    let result = null;
    if (state.shop.tab === 0) {
      const cars = ['comet', 'vulcan', 'sabre', 'phantom'];
      if (cars[i]) result = buyCar(state, cars[i]);
    } else if (state.shop.tab === 1) {
      const ups = ['engine', 'armor', 'nitro'];
      if (ups[i]) result = buyUpgrade(state, ups[i]);
    } else if (state.shop.tab === 2) {
      const crew = ['mara', 'rico', 'lena', 'dex'];
      if (crew[i]) result = recruitCrew(state, crew[i]);
    }
    if (result) {
      state.messages.push({ text: result.msg, t: 0, color: result.ok ? '#7ae86a' : '#ff6a5a' });
      sfx(result.ok ? 'buy' : 'deny');
      if (result.ok) saveGame(state);
    }
  }
}

function handleModeKeys(state, input) {
  if (state.mode === 'menu') {
    if (input.wasPressed('Enter')) {
      input.consume('Enter');
      state.mode = 'play';
      initAudio(); resumeAudio();
      state.messages.push({ text: 'Welcome to Solmar Bay — press M for your first job.', t: 0, color: '#ffd24a' });
    }
    return;
  }
  if (state.mode === 'busted') {
    if (input.wasPressed('Enter')) {
      input.consume('Enter');
      state.mode = 'play';
      sfx('success');
    }
    return;
  }
  if (input.wasPressed('KeyP')) {
    input.consume('KeyP');
    state.mode = state.mode === 'paused' ? 'play' : 'paused';
    return;
  }
  if (state.mode === 'paused') return;
  if (input.wasPressed('KeyG')) {
    input.consume('KeyG');
    state.mode = state.mode === 'shop' ? 'play' : 'shop';
    return;
  }
  if (state.mode === 'shop') {
    if (input.wasPressed('Escape')) { input.consume('Escape'); state.mode = 'play'; return; }
    handleShopKeys(state, input);
    return;
  }
  // Mode play.
  if (input.wasPressed('KeyE')) { input.consume('KeyE'); interactKey(state); }
  if (input.wasPressed('KeyM')) {
    input.consume('KeyM');
    const nm = nextMission(state);
    if (nm) { startMission(state, nm.id); sfx('pickup'); }
    else state.messages.push({ text: 'No jobs available — build standing in a district first.', t: 0, color: '#ff6a5a' });
  }
  if (input.wasPressed('KeyR')) {
    input.consume('KeyR');
    if (startNearestRace(state)) sfx('pickup');
  }
  if (input.wasPressed('KeyH')) {
    input.consume('KeyH');
    state.messages.push({ text: 'WASD drive, SHIFT nitro, E enter/steal, M jobs, R race, G garage, P pause', t: 0, color: '#fff' });
  }
}

function updatePlaying(state, dt, input) {
  state.time += dt;
  state.clock += (dt * 24) / DAY_LENGTH_SECONDS;
  if (state.clock >= 24) state.clock -= 24;
  state.crewBonus = crewBonus(state);
  // Autopilot demo (scene screenshot): gas terus, belok ke arah objektif.
  let driveInput = input;
  if (state.scene) {
    const pp = state.player;
    let tx = pp.x + Math.cos(pp.angle) * 500;
    let ty = pp.y + Math.sin(pp.angle) * 500;
    const mk = state.missionMarker;
    if (mk) { tx = mk.x; ty = mk.y; }
    else if (state.race) {
      const cp = state.race.def.checkpoints[state.race.cpIdx % state.race.def.checkpoints.length];
      tx = cp.x; ty = cp.y;
    }
    const diff = angleDiff(pp.angle, Math.atan2(ty - pp.y, tx - pp.x));
    driveInput = {
      isDown(code) {
        // Rem saat harus belok tajam: putaran lebih rapat, tidak menabrak tembok.
        if ((code === 'KeyW' || code === 'ArrowUp')) return Math.abs(diff) < 1.05;
        if (code === 'KeyA' || code === 'ArrowLeft') return diff < -0.08;
        if (code === 'KeyD' || code === 'ArrowRight') return diff > 0.08;
        if (code === 'ShiftLeft' || code === 'ShiftRight') return Math.abs(diff) < 0.25;
        return false;
      },
      wasPressed() { return false; },
      consume() {},
    };
  }
  updatePlayer(state, dt, driveInput);
  updateTraffic(state, dt);
  updatePeds(state, dt);
  updatePolice(state, dt);
  updateMission(state, dt);
  updateRace(state, dt);
  updateParticles(state, dt);
  updateCamera(state, dt);
  const pos = playerPos(state);
  state.currentDistrict = districtAt(pos.x, pos.y);
  state.missionMarker = missionMarker(state);
  for (const m of state.messages) m.t += dt;
  state.messages = state.messages.filter((m) => m.t < 5.5);
  // Suara.
  const speedFrac = clamp(Math.abs(state.player.speed || 0) / 700, 0, 1);
  engineSound(speedFrac, state.player.mode === 'car' && Math.abs(state.player.speed || 0) > 5);
  policeSiren(state.wanted > 0);
  // Simpan otomatis tiap 20 detik.
  state.saveTimer += dt;
  if (state.saveTimer > 20) { state.saveTimer = 0; saveGame(state); }
}

export function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const input = createInput();
  const state = createState();

  // Muat progres tersimpan.
  const saved = loadGame();
  if (saved) {
    applySave(state, saved);
    const def = state.player.car;
    const carDef = CARS.find((c) => c.id === state.player.carId) || CARS[0];
    def.def = carDef;
    def.color = carDef.color;
    def.maxArmor = 100 + (state.upgrades.armor || 0) * 50;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  window.addEventListener('pointerdown', () => { initAudio(); resumeAudio(); }, { once: true });
  window.addEventListener('keydown', () => { initAudio(); resumeAudio(); }, { once: true });

  // Scene demo via ?scene=chase|race|heist|garage (untuk screenshot).
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene');
  if (scene) {
    applyScene(state, scene);
  }

  window.SOLMAR = { state, version: 'round7' };

  let last = performance.now();
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    handleModeKeys(state, input);
    if (state.mode === 'play') updatePlaying(state, dt, input);
    else if (state.mode === 'menu') {
      // Kamera menu: pelan mengelilingi plaza.
      state.camera.x = 1560 + Math.cos(state.time * 0.05) * 300;
      state.camera.y = 1220 + Math.sin(state.time * 0.05) * 200;
      state.time += dt;
      state.currentDistrict = districtAt(state.camera.x, state.camera.y);
    }
    render(ctx, state);
    if (state.mode === 'menu') drawMenu(ctx, state);
    else if (state.mode === 'shop') drawShop(ctx, state);
    else if (state.mode === 'busted') drawBusted(ctx, state);
    else if (state.mode === 'paused') drawPaused(ctx, state);
    else drawHUD(ctx, state);
    input.clearPressed();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
