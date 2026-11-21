// Solmar Bay — the story: five missions in order.
// One job: the mission state machine. Each mission is a small chain of
// steps with a marker on the map, a line of objective text, a timer where
// it matters, and a cash reward at the end.
//
// Round 8 depth: every mission now carries a secondary objective — an
// optional bonus that pays extra for doing the job with style (a sports
// car, a fast delivery, a cool head, a clean finish, a clean getaway).
// Missions can also fail in more ways than the clock: total the getaway
// car and the job restarts, trip the bank alarm and the vault resets,
// lose the heat too slowly and the bonus is gone. Briefings and outros
// play as dialogue subtitles, so the story is heard, not just read.

import {
  REWARDS, PLAZA, BONUS_SPORT_CAR, BONUS_FAST_DELIVERY, BONUS_COOL_HEAD,
  BONUS_CLEAN_FINISH, BONUS_CLEAN_GETAWAY,
} from './config.js';
import { dist } from './world.js';
import { say, MISSION_BRIEFINGS, MISSION_OUTROS } from './dialogue.js';

export const MISSION_NAMES = [
  'First Wheels',
  'Package Run',
  'Heat',
  'Payback',
  'The Big Score',
];

const MARKERS = {
  garage: { x: 940, y: 380, label: 'Garage' },
  pickup: { x: 2500, y: 860, label: 'Pickup' },
  dropoff: { x: 420, y: 1820, label: 'Drop-off' },
  hideout: { x: 3020, y: 2200, label: 'Hideout' },
  bank: { x: 1980, y: 380, label: 'Solmar Bank' },
  getaway: { x: 420, y: 2200, label: 'Getaway boat' },
};

const SIDE_DESCS = [
  `Bonus: deliver a sports car (+$${BONUS_SPORT_CAR})`,
  `Bonus: deliver with 30s+ left (+$${BONUS_FAST_DELIVERY})`,
  `Bonus: lose the heat with 15s+ to spare (+$${BONUS_COOL_HEAD})`,
  `Bonus: leave KING standing last (+$${BONUS_CLEAN_FINISH})`,
  `Bonus: escape with the car over 50 HP (+$${BONUS_CLEAN_GETAWAY})`,
];

export function createMissions() {
  return {
    index: 0, // 0..4, or 5 when the story is done
    step: 0,
    timer: 0,
    holdTimer: 0,
    packageHeld: false,
    done: false,
    justCompleted: null,
    // Round 8: secondary-objective and failure tracking.
    carId: null, // the getaway car this mission depends on
    heatLostAt: null, // M3: timer value when wanted first hit 0
    kingLast: false, // M4: KING is the last gang member standing
    vaultTimer: 0, // M5: seconds before the bank alarm trips
    sideDone: false, // the current mission's bonus was earned
  };
}

function marker(S) {
  const m = S.missions;
  switch (m.index) {
    case 0: return m.step === 0 ? null : MARKERS.garage;
    case 1: return m.step === 0 ? MARKERS.pickup : MARKERS.dropoff;
    case 2: return null;
    case 3: return { x: PLAZA.cx, y: PLAZA.cy, label: 'Kings plaza' };
    case 4: return m.step === 0 ? MARKERS.bank : MARKERS.getaway;
    default: return null;
  }
}

export function currentObjective(S) {
  const m = S.missions;
  if (m.done) return 'Story complete — Solmar Bay is yours. Free roam!';
  switch (m.index) {
    case 0:
      return m.step === 0
        ? 'Mission 1 — First Wheels: steal a car (walk up to one, press E)'
        : 'Mission 1 — First Wheels: drive to the garage';
    case 1:
      return m.step === 0
        ? 'Mission 2 — Package Run: pick up the package at the marker'
        : `Mission 2 — Package Run: deliver it before the timer runs out (${Math.ceil(m.timer)}s)`;
    case 2:
      return `Mission 3 — Heat: the cops are on you. Survive ${Math.ceil(m.timer)}s and lose the heat`;
    case 3:
      return m.step === 0
        ? 'Mission 4 — Payback: get to the Kings plaza'
        : `Mission 4 — Payback: take down the Kings (${gangLeft(S)} left)`;
    case 4:
      return m.step === 0
        ? 'Mission 5 — The Big Score: reach Solmar Bank'
        : m.step === 1
          ? `Mission 5 — The Big Score: crack the vault… hold still ${Math.ceil(m.holdTimer)}s (${Math.ceil(m.vaultTimer)}s to alarm)`
          : 'Mission 5 — The Big Score: FIVE STARS — reach the getaway boat!';
    default:
      return '';
  }
}

// The secondary objective line under the objective bar. Empty when there
// is no bonus left to chase (story done, or bonus already earned).
export function currentSecondary(S) {
  const m = S.missions;
  if (m.done) return '';
  if (m.sideDone) return 'Bonus earned — nice driving.';
  return SIDE_DESCS[m.index] || '';
}

function gangLeft(S) {
  return S.gang.filter((g) => g.hp > 0).length;
}

// The bonus for the mission just finished, from the state the player
// actually reached — not from the objective text.
function sideBonus(S) {
  const m = S.missions;
  const p = S.player;
  switch (m.index) {
    case 0: return p.car && p.car.kind === 'sport' ? BONUS_SPORT_CAR : 0;
    case 1: return m.timer >= 30 ? BONUS_FAST_DELIVERY : 0;
    case 2: return m.heatLostAt !== null && m.heatLostAt >= 15 ? BONUS_COOL_HEAD : 0;
    case 3: return m.kingLast ? BONUS_CLEAN_FINISH : 0;
    case 4: return p.car && p.car.hp > 50 ? BONUS_CLEAN_GETAWAY : 0;
    default: return 0;
  }
}

function completeMission(S) {
  const m = S.missions;
  const reward = REWARDS[m.index];
  const bonus = sideBonus(S);
  m.sideDone = bonus > 0;
  S.player.earn(reward + bonus);
  m.justCompleted = { name: MISSION_NAMES[m.index], reward: reward + bonus };
  S.banner = bonus > 0
    ? `${MISSION_NAMES[m.index]} complete — $${(reward + bonus).toLocaleString('en-US')} (incl. $${bonus} bonus)`
    : `${MISSION_NAMES[m.index]} complete — $${reward.toLocaleString('en-US')}`;
  S.bannerTimer = 3.5;
  S.audio.missionDone();
  S.audio.cash();
  const outro = MISSION_OUTROS[m.index];
  if (outro) say(S, outro[0], outro[1], 5);
  m.index += 1;
  m.step = 0;
  m.timer = 0;
  m.holdTimer = 0;
  m.packageHeld = false;
  m.carId = null;
  m.heatLostAt = null;
  m.kingLast = false;
  m.vaultTimer = 0;
  m.sideDone = false;
  if (m.index >= MISSION_NAMES.length) {
    m.done = true;
    saveProgress(S);
  } else {
    startMission(S);
  }
}

function startMission(S) {
  const m = S.missions;
  m.carId = null;
  m.heatLostAt = null;
  m.kingLast = false;
  m.vaultTimer = 0;
  m.sideDone = false;
  const briefing = MISSION_BRIEFINGS[m.index];
  if (briefing) {
    for (const [speaker, text] of briefing) say(S, speaker, text, 4.5);
  }
  if (m.index === 1) {
    m.timer = 90;
  } else if (m.index === 2) {
    m.timer = 45;
    S.player.wanted = 3;
    S.player.recentCrime = true;
    S.player.crimeTimer = 6;
    S.banner = 'HEAT — three stars. Lay low and lose them.';
    S.bannerTimer = 3;
  } else if (m.index === 4) {
    S.banner = 'THE BIG SCORE — hit Solmar Bank.';
    S.bannerTimer = 3;
  }
}

// The getaway car this mission depends on was totaled: the job restarts
// instead of pretending the player can finish on foot.
function carTotaled(S) {
  const m = S.missions;
  if (m.carId === null) return false;
  const wreck = S.cars.find((c) => c.id === m.carId);
  return !!wreck && wreck.dead;
}

function failRide(S, message) {
  const m = S.missions;
  m.step = 0;
  m.timer = m.index === 1 ? 90 : 0;
  m.packageHeld = false;
  m.carId = null;
  S.banner = message;
  S.bannerTimer = 3;
  say(S, 'MARLA', 'Ride is scrap. Get another set of wheels and we go again.', 4);
}

export function updateMissions(S, dt) {
  const m = S.missions;
  if (m.done) return;
  const p = S.player;

  switch (m.index) {
    case 0: {
      if (m.step === 0 && !p.onFoot) {
        m.step = 1;
        m.carId = p.car ? p.car.id : null;
        if (p.car && p.car.kind === 'sport') {
          S.banner = 'Sports car — the garage will pay extra for this one.';
          S.bannerTimer = 2.5;
        }
      } else if (m.step === 1) {
        if (p.car) m.carId = p.car.id;
        else if (carTotaled(S)) {
          failRide(S, 'Car totaled — steal another one.');
          break;
        }
        if (dist(p.x, p.y, MARKERS.garage.x, MARKERS.garage.y) < 70) {
          completeMission(S);
        }
      }
      break;
    }
    case 1: {
      m.timer -= dt;
      if (m.carId === null && p.car) m.carId = p.car.id;
      if (m.carId !== null && !p.car && carTotaled(S)) {
        failRide(S, 'Ride totaled — the package run restarts.');
        break;
      }
      if (m.timer <= 0) {
        // Out of time: restart the run from the pickup.
        m.step = 0;
        m.timer = 90;
        m.packageHeld = false;
        m.carId = null;
        S.banner = 'Too slow — the package run restarts.';
        S.bannerTimer = 2.5;
        break;
      }
      const target = m.step === 0 ? MARKERS.pickup : MARKERS.dropoff;
      if (dist(p.x, p.y, target.x, target.y) < 70) {
        if (m.step === 0) {
          m.step = 1;
          m.packageHeld = true;
          S.audio.pickup();
          S.banner = 'Package picked up — deliver it fast!';
          S.bannerTimer = 2.5;
          say(S, 'RICO', 'Package in hand. Ninety seconds was generous — watch me.', 3.5);
        } else {
          completeMission(S);
        }
      }
      break;
    }
    case 2: {
      m.timer -= dt;
      // Remember the moment the heat first died: the bonus is for losing
      // the cops early, not for waiting the clock out.
      if (p.wanted === 0 && m.heatLostAt === null) m.heatLostAt = Math.max(0, m.timer);
      if (p.wanted === 0 && m.timer <= 0) {
        completeMission(S);
      } else if (m.timer <= 0) {
        // Survived the clock but still hot: keep hiding until the heat dies.
        m.timer = 0;
      }
      break;
    }
    case 3: {
      if (m.step === 0 && dist(p.x, p.y, PLAZA.cx, PLAZA.cy) < 260) {
        m.step = 1;
        say(S, 'KING', 'Boys! The wheelman wants the plaza. Give it to him.', 4);
      } else if (m.step === 1) {
        const left = S.gang.filter((g) => g.hp > 0);
        if (left.length === 1 && left[0].isLeader) m.kingLast = true;
        if (left.length === 0) completeMission(S);
      }
      break;
    }
    case 4: {
      if (m.step === 0) {
        if (dist(p.x, p.y, MARKERS.bank.x, MARKERS.bank.y) < 70) {
          m.step = 1;
          m.holdTimer = 3;
          m.vaultTimer = 25;
          S.banner = 'Cracking the vault — hold still!';
          S.bannerTimer = 2.5;
          say(S, 'MARLA', 'Vault drill is in. Twenty-five seconds before the alarm wakes up.', 4);
        }
      } else if (m.step === 1) {
        m.holdTimer -= dt;
        m.vaultTimer -= dt;
        if (m.vaultTimer <= 0) {
          // Alarm trips: the vault resets, and the heat goes up a star.
          m.holdTimer = 3;
          m.vaultTimer = 25;
          p.addWanted(1, 'bank alarm');
          S.banner = 'ALARM — the vault resets. Crack it again, faster!';
          S.bannerTimer = 3;
          say(S, 'DISPATCH', 'Alarm at Solmar Bank. All units converge.', 3.5);
        } else if (dist(p.x, p.y, MARKERS.bank.x, MARKERS.bank.y) > 120) {
          m.holdTimer = 3;
        } else if (m.holdTimer <= 0) {
          m.step = 2;
          m.carId = p.car ? p.car.id : null;
          p.wanted = 5;
          p.recentCrime = true;
          p.crimeTimer = 10;
          S.banner = 'FIVE STARS — run for the boat!';
          S.bannerTimer = 3;
          S.audio.cash();
          say(S, 'RICO', 'Five thousand in the bag. Now drive like the city is on fire.', 4);
        }
      } else if (m.step === 2) {
        if (p.car) m.carId = p.car.id;
        else if (carTotaled(S)) {
          // Getaway car lost: back to the bank, heat still at five stars.
          m.step = 0;
          m.carId = null;
          S.banner = 'Getaway car lost — back to the bank, five stars and all.';
          S.bannerTimer = 3;
          say(S, 'MARLA', 'Car is gone, money is not. Steal another one and finish it.', 4);
          break;
        }
        if (dist(p.x, p.y, MARKERS.getaway.x, MARKERS.getaway.y) < 80) {
          completeMission(S);
        }
      }
      break;
    }
    default:
      break;
  }
}

export function currentMarker(S) {
  return marker(S);
}

export function saveProgress(S) {
  try {
    const data = {
      money: S.player.money,
      missionIndex: S.missions.index,
      carsStolen: S.player.carsStolen,
      kills: S.player.kills,
    };
    localStorage.setItem('solmar-bay-save-v1', JSON.stringify(data));
  } catch { /* storage may be unavailable */ }
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem('solmar-bay-save-v1');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}
