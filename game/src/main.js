// Solmar Bay — the game loop.
// One job: boot the world, wire every module together, run the frame:
// input, player, traffic, police, pedestrians, gang, missions, particles,
// audio, camera, render, HUD. Nothing else lives here.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, PLAYER_START } from './config.js';
import { buildWorld } from './world.js';
import { createInput, wasPressed, endFrame } from './input.js';
import { createAudio } from './audio.js';
import { createParticles, updateParticles } from './particles.js';
import { spawnTraffic, spawnParked, updateTraffic, resolveCarBumps, updateCarDamage } from './vehicles.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { createPolice, updatePolice } from './police.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnGang, updateGang } from './gang.js';
import { createMissions, updateMissions } from './missions.js';
import { drawWorld } from './render.js';
import { drawHud } from './hud.js';
import { saveGame, loadGame, applySave } from './save.js';
import { setupScene, sceneSeed, updateScene, createAutopilot, updateAutopilot } from './scenes.js';
import { createWeather, updateWeather } from './weather.js';
import { createEvents, updateEvents } from './events.js';
import { createDialogue, updateDialogue } from './dialogue.js';
import { createShake, updateShake } from './shake.js';
// Round 9 systems: the city remembers, the crew rides, the radio talks,
// side work pays, the PD blocks roads and brings the sky, and the story
// ends in gold.
import { createStanding, updateStanding, changeStanding, currentDistrict } from './standing.js';
import { createCrew, updateCrew } from './crew.js';
import { createRadio, updateRadio, cycleStation } from './radio.js';
import { createSideJobs, updateSideJobs } from './sidejobs.js';
import { createRoadblock, updateRoadblock } from './roadblock.js';
import { createHeli, updateHeli } from './heli.js';
import { createResults, buildResults, openResults, toggleResults } from './results.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function buildState(seed) {
  const world = buildWorld(seed);
  const S = {
    seed,
    time: 0,
    mode: 'title', // title | play | paused
    world,
    input: createInput(),
    audio: createAudio(),
    particles: createParticles(),
    player: createPlayer(),
    police: createPolice(),
    missions: createMissions(),
    gang: spawnGang(seed),
    peds: spawnPedestrians(seed),
    cars: [],
    camera: { x: PLAYER_START.x, y: PLAYER_START.y },
    view: { w: VIEW_W, h: VIEW_H },
    banner: '',
    bannerTimer: 0,
    scene: null,
    sceneMode: false,
    autopilot: createAutopilot(),
    autopilotDone: false,
    saveData: loadGame(),
    saveTimer: 0,
    // Round 8 systems: the sky, the city's own life, the story's voice,
    // and the camera's flinch.
    weather: createWeather(),
    events: createEvents(),
    dialogue: createDialogue(),
    shake: createShake(),
    // Round 9 state: standing, crew, radio, side jobs, roadblock, heli,
    // results, and the run ledger the results screen reads.
    standing: createStanding(),
    crew: createCrew(),
    radio: createRadio(),
    sidejobs: createSideJobs(),
    roadblock: createRoadblock(),
    heli: createHeli(),
    results: createResults(),
    stats: { earned: 0, jobsDone: 0, roadblocks: 0 },
  };
  S.cars = [...spawnTraffic(seed), ...spawnParked(seed)];
  S.player.x = PLAYER_START.x;
  S.player.y = PLAYER_START.y;
  return S;
}

const params = new URLSearchParams(location.search);
const sceneName = params.get('scene');
const autoMode = params.get('auto') === '1';
const S = buildState(sceneName ? sceneSeed(sceneName) : 20261120);

if (S.saveData && !sceneName && !autoMode) applySave(S, S.saveData);
if (sceneName) setupScene(S, sceneName);
if (autoMode) {
  S.mode = 'play';
  S.autopilot.active = true;
}

window.addEventListener('error', (e) => {
  const el = document.getElementById('status');
  if (el) el.textContent = `ERROR: ${e.message}`;
});

let last = performance.now();
let frames = 0;
window.__S = S;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) return;
  frames += 1;
  S.time += dt;
  S.bannerTimer -= dt;
  if (S.bannerTimer <= 0) S.banner = '';

  const input = S.input;

  // Title screen: ENTER starts, and starts the audio on the gesture.
  if (S.mode === 'title') {
    if (wasPressed(input, 'Enter')) {
      S.audio.ensure();
      S.mode = 'play';
      if (S.saveData) S.banner = 'Welcome back to Solmar Bay.';
      S.bannerTimer = 2.5;
    }
    drawWorld(ctx, S);
    drawHud(ctx, S);
    endFrame(input);
    return;
  }

  // Pause toggle.
  if (wasPressed(input, 'KeyP')) {
    S.mode = S.mode === 'paused' ? 'play' : 'paused';
  }
  if (wasPressed(input, 'KeyM')) {
    S.audio.ensure();
    const muted = S.audio.toggleMute();
    S.banner = muted ? 'Sound muted.' : 'Sound on.';
    S.bannerTimer = 1.5;
  }
  // Round 9 keys: R switches radio station, T toggles the results screen.
  if (wasPressed(input, 'KeyR')) {
    S.audio.ensure();
    cycleStation(S);
  }
  if (wasPressed(input, 'KeyT')) toggleResults(S);

  if (S.mode === 'paused') {
    drawWorld(ctx, S);
    drawHud(ctx, S);
    endFrame(input);
    return;
  }

  // First interaction anywhere starts audio (browser autoplay policy).
  if (input.anyKey) S.audio.ensure();

  if (S.autopilot.active && !S.autopilot.done) updateAutopilot(S, dt);
  else updatePlayer(S, dt);
  if (S.scene) updateScene(S, dt);

  updateTraffic(S, dt);
  updateHeli(S, dt);
  updatePolice(S, dt);
  updatePedestrians(S, dt);
  updateGang(S, dt);
  updateMissions(S, dt);
  // Round 9: the city reacts to the mission that just closed — the
  // ledger grows, the district remembers, and the story's end opens
  // the results screen in gold.
  if (S.missions.justCompleted) {
    const done = S.missions.justCompleted;
    S.stats.earned += done.reward;
    changeStanding(S, currentDistrict(S).id, 15, 'mission complete');
    S.missions.justCompleted = null;
  }
  if (S.missions.done && !S.results.shown) {
    S.results.data = buildResults(S);
    S.results.shown = true;
    openResults(S);
  }
  updateStanding(S, dt);
  updateCrew(S, dt);
  updateRadio(S, dt);
  updateSideJobs(S, dt);
  updateRoadblock(S, dt);
  resolveCarBumps(S);
  updateCarDamage(S, dt);
  updateParticles(S.particles, dt);
  // Round 8 ambience: the sky turns, the city stages its own events,
  // dialogue subtitles advance, and camera trauma decays.
  updateWeather(S, dt);
  updateEvents(S, dt);
  updateDialogue(S, dt);
  updateShake(S, dt);

  // Camera: follow the player, clamped to the map. In a staged scene the
  // camera locks to the player so the hero car stays centred at speed.
  const tx = Math.max(VIEW_W / 2, Math.min(WORLD_W - VIEW_W / 2, S.player.x));
  const ty = Math.max(VIEW_H / 2, Math.min(WORLD_H - VIEW_H / 2, S.player.y));
  if (S.sceneMode) {
    S.camera.x = tx;
    S.camera.y = ty;
  } else {
    S.camera.x += (tx - S.camera.x) * Math.min(1, 6 * dt);
    S.camera.y += (ty - S.camera.y) * Math.min(1, 6 * dt);
  }

  // Siren when a cruiser is close.
  S.audio.siren(dt, S.police.sirenNear);

  // Autosave every 20 seconds of play.
  S.saveTimer += dt;
  if (S.saveTimer > 20) {
    S.saveTimer = 0;
    saveGame(S);
  }

  // Render.
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawWorld(ctx, S);
  drawHud(ctx, S);
  if (autoMode && frames % 30 === 0) {
    const el = document.getElementById('status');
    if (el && !S.autopilotDone) {
      el.textContent = `AUTO t=${S.time.toFixed(1)} f=${frames} phase=${S.autopilot.phase} wp=${S.autopilot.wp}/${S.autopilot.waypoints.length} x=${Math.round(S.player.x)} y=${Math.round(S.player.y)} mission=${S.missions.index}`;
    }
  }
  endFrame(input);
}

requestAnimationFrame(frame);
