// Solmar Bay — the story: five missions in order.
// One job: the mission state machine. Each mission is a small chain of
// steps with a marker on the map, a line of objective text, a timer where
// it matters, and a cash reward at the end.

import { REWARDS, PLAZA } from './config.js';
import { dist } from './world.js';

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

export function createMissions() {
  return {
    index: 0, // 0..4, or 5 when the story is done
    step: 0,
    timer: 0,
    holdTimer: 0,
    packageHeld: false,
    done: false,
    justCompleted: null,
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
          ? `Mission 5 — The Big Score: grab the cash… hold still ${Math.ceil(m.holdTimer)}s`
          : 'Mission 5 — The Big Score: FIVE STARS — reach the getaway boat!';
    default:
      return '';
  }
}

function gangLeft(S) {
  return S.gang.filter((g) => g.hp > 0).length;
}

function completeMission(S) {
  const m = S.missions;
  const reward = REWARDS[m.index];
  S.player.earn(reward);
  m.justCompleted = { name: MISSION_NAMES[m.index], reward };
  S.banner = `${MISSION_NAMES[m.index]} complete — $${reward.toLocaleString('en-US')}`;
  S.bannerTimer = 3.5;
  S.audio.missionDone();
  S.audio.cash();
  m.index += 1;
  m.step = 0;
  m.timer = 0;
  m.holdTimer = 0;
  m.packageHeld = false;
  if (m.index >= MISSION_NAMES.length) {
    m.done = true;
    saveProgress(S);
  } else {
    startMission(S);
  }
}

function startMission(S) {
  const m = S.missions;
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

export function updateMissions(S, dt) {
  const m = S.missions;
  if (m.done) return;
  const p = S.player;

  switch (m.index) {
    case 0: {
      if (m.step === 0 && !p.onFoot) m.step = 1;
      else if (m.step === 1 && dist(p.x, p.y, MARKERS.garage.x, MARKERS.garage.y) < 70) {
        completeMission(S);
      }
      break;
    }
    case 1: {
      m.timer -= dt;
      if (m.timer <= 0) {
        // Out of time: restart the run from the pickup.
        m.step = 0;
        m.timer = 90;
        m.packageHeld = false;
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
        } else {
          completeMission(S);
        }
      }
      break;
    }
    case 2: {
      m.timer -= dt;
      if (p.wanted === 0 && m.timer <= 0) {
        completeMission(S);
      } else if (m.timer <= 0) {
        // Survived the clock but still hot: keep hiding until the heat dies.
        m.timer = 0;
      }
      break;
    }
    case 3: {
      if (m.step === 0 && dist(p.x, p.y, PLAZA.cx, PLAZA.cy) < 260) m.step = 1;
      else if (m.step === 1 && gangLeft(S) === 0) completeMission(S);
      break;
    }
    case 4: {
      if (m.step === 0) {
        if (dist(p.x, p.y, MARKERS.bank.x, MARKERS.bank.y) < 70) {
          m.step = 1;
          m.holdTimer = 3;
          S.banner = 'Cracking the vault — hold still!';
          S.bannerTimer = 2.5;
        }
      } else if (m.step === 1) {
        m.holdTimer -= dt;
        if (dist(p.x, p.y, MARKERS.bank.x, MARKERS.bank.y) > 120) {
          m.holdTimer = 3;
        } else if (m.holdTimer <= 0) {
          m.step = 2;
          p.wanted = 5;
          p.recentCrime = true;
          p.crimeTimer = 10;
          S.banner = 'FIVE STARS — run for the boat!';
          S.bannerTimer = 3;
          S.audio.cash();
        }
      } else if (dist(p.x, p.y, MARKERS.getaway.x, MARKERS.getaway.y) < 80) {
        completeMission(S);
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
