// Solmar Bay — district standing.
// One job: the city remembers how Rico treats each neighbourhood. Six
// districts cover the map; every district carries a standing from -100
// (hated) to +100 (respected). Standing moves when Rico works a district
// — missions and side jobs lift it, stealing cars and dropping gang
// members drag it down — and it bites back: a respected wheelman cools
// his wanted level faster and the Kings leave him alone on their plaza,
// while a hated one cools slower and pays less for side work.

import { PLAZA, PARK } from './config.js';

export const DISTRICTS = [
  { id: 'plaza', name: 'Kings Plaza', x: PLAZA.x - 40, y: PLAZA.y - 40, w: PLAZA.w + 80, h: PLAZA.h + 80 },
  { id: 'park', name: 'Parkside', x: PARK.x - 40, y: PARK.y - 40, w: PARK.w + 80, h: PARK.h + 80 },
  { id: 'docks', name: 'North Docks', x: 0, y: 0, w: 3600, h: 640 },
  { id: 'beach', name: 'Ocean Drive', x: 0, y: 2200, w: 3600, h: 400 },
  { id: 'downtown', name: 'Downtown', x: 0, y: 640, w: 1460, h: 1180 },
  { id: 'southside', name: 'Southside', x: 1460, y: 640, w: 2140, h: 1560 },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[DISTRICTS.length - 1];
}

export function createStanding() {
  const values = {};
  for (const d of DISTRICTS) values[d.id] = 0;
  return {
    values,
    current: 'downtown',
    flash: 0,
    flashText: '',
  };
}

export function standingOf(S, id) {
  if (!S.standing) return 0;
  return S.standing.values[id] ?? 0;
}

export function standingWord(v) {
  if (v >= 50) return 'RESPECTED';
  if (v >= 15) return 'LIKED';
  if (v <= -50) return 'HATED';
  if (v <= -15) return 'DISLIKED';
  return 'NEUTRAL';
}

// Side-job payout multiplier in a district: respected pays up to +10%,
// hated pays down to -10%.
export function standingMult(S, id) {
  const v = standingOf(S, id);
  return 1 + Math.max(-50, Math.min(50, v)) / 500;
}

// Wanted-decay time multiplier: respected cools up to 40% faster, hated
// up to 50% slower.
export function decayScale(S) {
  const v = standingOf(S, S.standing ? S.standing.current : 'downtown');
  if (v >= 0) return 1 - (v / 100) * 0.4;
  return 1 + (-v / 100) * 0.5;
}

// The Kings stand down on their own plaza once Rico is liked there —
// unless mission 4 (Payback) is live, when the fight is the job.
export function kingsHostile(S) {
  if (S.missions && S.missions.index === 3 && S.missions.step === 1) return true;
  return standingOf(S, 'plaza') < 30;
}

export function changeStanding(S, id, delta, why) {
  if (!S.standing || !S.standing.values.hasOwnProperty(id)) return;
  const before = S.standing.values[id];
  const after = Math.max(-100, Math.min(100, before + delta));
  S.standing.values[id] = after;
  const d = DISTRICTS.find((x) => x.id === id);
  const sign = delta > 0 ? '+' : '';
  S.standing.flash = 2.5;
  S.standing.flashText = `${d.name} ${sign}${delta} (${standingWord(after)} ${after > 0 ? '+' : ''}${after})`;
  // Crossing a reputation threshold is news: pin it on the banner.
  const crossed = (before < 50 && after >= 50) || (before < 15 && after >= 15)
    || (before > -50 && after <= -50) || (before > -15 && after <= -15);
  if (crossed) {
    S.banner = `${d.name}: Rico is ${standingWord(after)} here.`;
    S.bannerTimer = 3;
  }
}

export function currentDistrict(S) {
  if (!S.standing) return DISTRICTS[4];
  return DISTRICTS.find((d) => d.id === S.standing.current) || DISTRICTS[4];
}

// Track which district Rico is standing in; entering a new one is
// announced once, on the banner.
export function updateStanding(S, dt) {
  const st = S.standing;
  if (!st) return;
  if (st.flash > 0) st.flash -= dt;
  const d = districtAt(S.player.x, S.player.y);
  if (d.id !== st.current) {
    st.current = d.id;
    const v = st.values[d.id];
    S.banner = `— ${d.name} — ${standingWord(v)}${v !== 0 ? ` ${v > 0 ? '+' : ''}${v}` : ''}`;
    S.bannerTimer = 2.2;
  }
}

// One line for the HUD panel: "KINGS PLAZA · LIKED +22".
export function districtLabel(S) {
  const d = currentDistrict(S);
  const v = standingOf(S, d.id);
  return `${d.name.toUpperCase()} · ${standingWord(v)}${v !== 0 ? ` ${v > 0 ? '+' : ''}${v}` : ''}`;
}
