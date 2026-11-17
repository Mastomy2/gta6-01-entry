// Boot and the one loop: Solmar Bay, an open-world crime game. Input is read
// every frame, the world advances in fixed 1/60 s steps, and the renderer
// paints what is there. Screens: title, play, paused, game over, win.
//
// ?demo=drive|wanted|mission|win stages a live scene for screenshots (the
// real game, running, with its own systems) and sets window.__shotReady.
// ?auto=1 runs a scripted autopilot (walk to a car, steal it, drive to the
// mission marker, trigger the police) and logs each step to the console and
// to #autolog, ending with window.__autoDone = true.

import { createCity, WORLD, dist, angleTo } from './city.js';
import { createPlayer, updatePlayerOnFoot, damagePlayer } from './player.js';
import { spawnTraffic, spawnParkedCars, nearestEnterableCar, enterCar, exitCar, updatePlayerCar, updateTraffic } from './vehicles.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { addCrime, updateWanted, updatePolice, clearPolice } from './police.js';
import { MISSION_DEFS, startMission, updateMissions, completeMission } from './missions.js';
import { shootAt, punch, updateBullets, updateGang, spawnPickups, updatePickups } from './combat.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { saveGame, loadSave, hasSave } from './save.js';
import { ACTION_ENTER, ACTION_PUNCH, ACTION_SHOOT, ACTION_PAUSE, ACTION_START, ACTION_SAVE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_WIN } from './render.js';

const MAX_FRAME = 0.25;
/** The simulation's fixed step, in seconds: 60 updates a second. */
const STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const demo = params.get('demo');
const autoMode = params.get('auto') === '1';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const autoLogEl = document.getElementById('autolog');
const audio = createAudio();
const particles = createParticles();
const renderer = createRenderer(canvas);

function createGameState() {
  const G = {
    city: createCity(),
    player: createPlayer(1000, 900),
    parked: [],
    traffic: [],
    peds: [],
    copCars: [],
    footCops: [],
    gang: [],
    bullets: [],
    pickups: [],
    particles,
    audio,
    money: 250,
    ammo: 36,
    wanted: 0,
    crimeTimer: 0,
    missionLockWanted: false,
    lastCrime: '',
    missionIndex: 0,
    mission: { stolen: false, pickedUp: false, kills: 0, grabbed: false, timer: 0, grabTimer: 0 },
    screen: SCREEN_TITLE,
    overReason: '',
    time: 0,
    storyText: '',
    storyTimer: 0,
    playerCar: null,
    playerShooting: false,
    playerShootTimer: 0,
    nearestCar: null,
    aimWorld: null,
    hasSave: hasSave(),
    announce(message) { statusEl.textContent = message; G.lastAnnounce = message; },
    lastAnnounce: '',
    addCrime(stars, label) { addCrime(G, stars, label); },
    save() { const ok = saveGame(G); G.announce(ok ? 'Game saved.' : 'Save failed (storage off).'); return ok; },
  };
  spawnParkedCars(G);
  spawnTraffic(G, 14);
  spawnPedestrians(G, 26);
  spawnPickups(G);
  startMission(G, 0);
  return G;
}

let G = createGameState();

function resetGame(freeRoam) {
  G = createGameState();
  window.__game = G;
  if (freeRoam) {
    G.missionIndex = MISSION_DEFS.length;
    G.mission = { stolen: false, pickedUp: false, kills: 0, grabbed: false, timer: 0, grabTimer: 0 };
    G.money = 6420;
  }
  G.screen = SCREEN_PLAY;
  G.announce(freeRoam ? 'Free roam — Solmar Bay is yours.' : 'Mission 1: First Wheels. Steal any car.');
}

// Camera centre, shared by the aim conversion and the renderer.
function cameraCenter() {
  const { w, h } = renderer.viewSize();
  const p = G.player;
  return {
    x: Math.max(w / 2, Math.min(WORLD.width - w / 2, p.x)),
    y: Math.max(h / 2, Math.min(WORLD.height - h / 2, p.y)),
    w, h,
  };
}

function updateAim(input) {
  const m = input.mouse();
  const cam = cameraCenter();
  G.aimWorld = { x: m.x - cam.w / 2 + cam.x, y: m.y - cam.h / 2 + cam.y };
  if (G.player.onFoot) G.player.angle = Math.atan2(G.aimWorld.y - G.player.y, G.aimWorld.x - G.player.x);
}

function stepWorld(dt, input, actions) {
  G.time += dt;
  updateAim(input);
  G.nearestCar = G.player.onFoot ? nearestEnterableCar(G) : null;

  const move = input.moveVector();
  if (G.player.onFoot) {
    updatePlayerOnFoot(G, dt, move, input.running());
  } else if (G.playerCar) {
    updatePlayerCar(G, dt, move);
  }

  if (actions & ACTION_ENTER) {
    if (G.player.onFoot) {
      const car = nearestEnterableCar(G);
      if (car) enterCar(G, car);
      else G.announce('No car close enough — walk up to one and press E.');
    } else {
      exitCar(G);
    }
  }
  if (actions & ACTION_PUNCH) punch(G);
  if ((actions & ACTION_SHOOT) || (input.mouse().down && G.player.shootCooldown <= 0)) {
    if (G.player.shootCooldown <= 0) {
      const p = G.player;
      const angle = G.aimWorld ? Math.atan2(G.aimWorld.y - p.y, G.aimWorld.x - p.x) : p.angle;
      if (shootAt(G, p.x, p.y, angle)) {
        p.shootCooldown = 0.28;
        if (G.wanted === 0 && !G.missionLockWanted) G.addCrime(1, 'fired a shot');
      } else {
        p.shootCooldown = 0.3;
      }
    }
  }
  if (actions & ACTION_SAVE) G.save();

  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updateWanted(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateGang(G, dt);
  updatePickups(G);
  updateMissions(G, dt);
  particles.update(dt);
  if (G.playerCar && G.playerCar.hp <= 0) {
    G.playerCar.hp = 100;
    G.playerCar.speed = 0;
    G.announce('Your car is wrecked! It still runs — barely.');
  }
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function startNewGame() {
    audio.unlock();
    resetGame(false);
    accumulator = 0;
  }

  function continueSave() {
    const data = loadSave();
    if (!data) return;
    audio.unlock();
    resetGame(false);
    G.money = data.money;
    G.player.x = data.x;
    G.player.y = data.y;
    G.player.hp = data.hp;
    G.ammo = data.ammo;
    startMission(G, Math.min(data.missionIndex, MISSION_DEFS.length - 1));
    G.announce(`Save loaded — mission ${G.missionIndex + 1}, $${G.money}.`);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' && G.screen === SCREEN_TITLE && hasSave()) continueSave();
  });

  function handleActions() {
    const actions = input.takeActions();
    if (G.screen === SCREEN_TITLE) {
      if (actions & (ACTION_START | ACTION_SHOOT)) startNewGame();
      return;
    }
    if (G.screen === SCREEN_OVER || G.screen === SCREEN_WIN) {
      if (actions & ACTION_START) {
        if (G.screen === SCREEN_WIN) resetGame(true);
        else startNewGame();
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (G.screen === SCREEN_PLAY) {
        G.screen = SCREEN_PAUSED;
        G.announce('Paused.');
      } else if (G.screen === SCREEN_PAUSED) {
        G.screen = SCREEN_PLAY;
        G.announce('Playing.');
      }
      return;
    }
    if (G.screen === SCREEN_PAUSED) return;
    stepWorld._actions = actions;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (G.screen === SCREEN_TITLE) {
      // Living backdrop: traffic and pedestrians move behind the title.
      while (accumulator >= STEP) {
        G.time += STEP;
        updateTraffic(G, STEP);
        updatePedestrians(G, STEP);
        particles.update(STEP);
        accumulator -= STEP;
      }
    } else if (G.screen === SCREEN_PLAY) {
      while (accumulator >= STEP && G.screen === SCREEN_PLAY) {
        const actions = stepWorld._actions || 0;
        stepWorld._actions = 0;
        stepWorld(STEP, input, actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      stepWorld._actions = 0;
    }
    renderer.draw(G);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) {
      G.screen = SCREEN_PAUSED;
      G.announce('Paused.');
    }
  });

  G.announce('Solmar Bay. Press Enter or click to start.');
  window.__game = G;
  setupDemoAndAuto(input);
  requestAnimationFrame(frame);
}

// ---------- demo scenes + autopilot (screenshots and self-test) ----------

function autoLog(message) {
  console.log(`[AUTO] ${message}`);
  if (autoLogEl) {
    autoLogEl.style.display = 'block';
    autoLogEl.textContent += `${message}\n`;
  }
}

function placePlayerInCar(G, nearX, nearY) {
  // Put Rico next to a parked car, then steal it through the real path.
  let car = null;
  let bestD = Infinity;
  for (const c of G.parked) {
    const d = dist({ x: nearX, y: nearY }, c);
    if (d < bestD) { bestD = d; car = c; }
  }
  if (!car) return false;
  G.player.x = car.x - 40;
  G.player.y = car.y;
  enterCar(G, car);
  return true;
}

function setupDemoAndAuto(input) {
  if (demo === 'drive') {
    audio.unlock();
    resetGame(false);
    placePlayerInCar(G, 1000, 900);
    G.playerCar.x = 1000;
    G.playerCar.y = 900;
    G.playerCar.angle = 0;
    G.playerCar.speed = 260;
    window.setTimeout(() => { window.__shotReady = true; }, 1800);
  } else if (demo === 'wanted') {
    audio.unlock();
    resetGame(false);
    placePlayerInCar(G, 1600, 900);
    G.playerCar.x = 1600;
    G.playerCar.y = 900;
    G.playerCar.angle = Math.PI / 2;
    G.playerCar.speed = 300;
    startMission(G, 2);
    G.wanted = 3;
    G.missionLockWanted = true;
    window.setTimeout(() => { window.__shotReady = true; }, 2500);
  } else if (demo === 'mission') {
    audio.unlock();
    resetGame(false);
    startMission(G, 1);
    placePlayerInCar(G, 1000, 1400);
    G.playerCar.x = 1000;
    G.playerCar.y = 1400;
    G.playerCar.angle = Math.PI / 2;
    G.playerCar.speed = 220;
    window.setTimeout(() => { window.__shotReady = true; }, 1800);
  } else if (demo === 'win') {
    G.screen = SCREEN_WIN;
    G.money = 12750;
    G.missionIndex = MISSION_DEFS.length;
    window.setTimeout(() => { window.__shotReady = true; }, 600);
  }

  if (autoMode) {
    audio.unlock();
    resetGame(false);
    const log = [];
    let phase = 'toCar';
    let phaseTime = 0;
    let stuckTime = 0;
    let reverseTime = 0;
    let policeChecked = false;
    autoLog('AUTOPILOT START: mission 1, player on foot at spawn');
    // Walk Rico to the nearest parked car, then steal it.
    const car = G.parked[0];
    G.player.x = car.x - 60;
    G.player.y = car.y;
    G.auto = {
      step(dt) {
        phaseTime += dt;
        if (phase === 'toCar') {
          if (enterCar(G, car)) {
            autoLog(`ENTERED CAR: stole parked car, wanted=${G.wanted}`);
            log.push('enter');
            phase = 'drive';
            phaseTime = 0;
          }
          return { x: 0, y: 0 };
        }
        if (phase === 'drive') {
          // Follow the road grid to the garage: along y=900 to x=400, then
          // down x=400 to the garage, so the car never ploughs through blocks.
          const waypoints = [{ x: 400, y: 900 }, { x: 400, y: 1900 }];
          const wp = waypoints[Math.min(G.auto.wp || 0, waypoints.length - 1)];
          if (dist(G.player, wp) < 60 && (G.auto.wp || 0) < waypoints.length - 1) G.auto.wp = (G.auto.wp || 0) + 1;
          const target = waypoints[Math.min(G.auto.wp || 0, waypoints.length - 1)];
          const d = dist(G.player, { x: 400, y: 1900 });
          if (G.missionIndex > 0) {
            autoLog(`MISSION 1 COMPLETE: money=$${G.money}, missionIndex=${G.missionIndex}`);
            log.push('mission1');
            phase = 'wanted';
            phaseTime = 0;
            G.addCrime(2, 'autopilot test crime');
            autoLog(`CRIME COMMITTED: wanted=${G.wanted}`);
            return { x: 0, y: 0 };
          }
          if (phaseTime > 40) {
            autoLog(`DRIVE TIMEOUT: still ${Math.round(d)}m from garage`);
            phase = 'done';
            return { x: 0, y: 0 };
          }
          // Steer the car toward the target with the real car physics.
          const wantAngle = angleTo(G.player, target);
          let diff = wantAngle - G.player.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const speed = Math.abs(G.playerCar.speed);
          if (speed < 20 && phaseTime > 1) stuckTime += dt; else stuckTime = 0;
          if (stuckTime > 1.2) { reverseTime = 0.9; stuckTime = 0; }
          if (reverseTime > 0) {
            reverseTime -= dt;
            return { x: -Math.sign(diff || 1), y: 1 }; // reverse + steer out
          }
          return { x: Math.max(-1, Math.min(1, diff * 2.2)), y: Math.abs(diff) > 1.2 ? 0 : -1 };
        }
        if (phase === 'wanted') {
          if (phaseTime > 3 && !policeChecked) {
            policeChecked = true;
            const nearest = G.copCars.length ? Math.round(Math.min(...G.copCars.map((c) => dist(c, G.player)))) : -1;
            autoLog(`POLICE: copCars=${G.copCars.length}, footCops=${G.footCops.length}, nearestCop=${nearest}m, wanted=${G.wanted}`);
            log.push('police');
            phase = 'done';
            window.__autoDone = true;
            window.__autoLog = log;
            autoLog('AUTOPILOT DONE');
          }
          return { x: 0, y: 0 };
        }
        return { x: 0, y: 0 };
      },
    };
    // Patch the input's move vector while the autopilot drives.
    const realMove = input.moveVector.bind(input);
    input.moveVector = () => {
      if (G.auto && G.screen === SCREEN_PLAY) return G.auto.step(1 / 60);
      return realMove();
    };
  }
}

runGame();
