// Solmar Bay — the radio.
// One job: three stations on the dial, switched with R. SOLMAR FM talks
// the city's gossip, BAY 97.5 plays the night drive, and PD SCAN is the
// police band — the station that earns its keep, because a scanner in
// the car warns Rico a roadblock is forming four seconds before the
// cruisers park across the road. A DJ line drops every half minute or so,
// and the current station rides on a pill at the bottom of the screen.

import { say } from './dialogue.js';

export const STATIONS = [
  {
    id: 'solmar', name: 'SOLMAR FM', tag: 'Talk of the Bay',
    lines: [
      'Caller says the Kings lost three boys at the plaza last night. Three!',
      'Traffic on Ocean Drive is bumper to bumper. Somebody stole a taxi again.',
      'Coming up: is Rico Vega a menace, or the best wheelman this city ever saw?',
    ],
  },
  {
    id: 'bay975', name: 'BAY 97.5', tag: 'Midnight Cruise',
    lines: [
      'That was Palm Static with Neon Coastline. Keep it slow, Solmar Bay.',
      'Next up, a long one for the night drivers. Windows down, volume up.',
      'BAY 97.5 — the only station that never asks where you got the car.',
    ],
  },
  {
    id: 'scan', name: 'PD SCAN', tag: 'Police band',
    lines: [
      'Unit 12, 10-20 on the north docks. Keep your eyes open.',
      'Dispatch to all units: watch the avenues. Vega was seen near the bank.',
      'Unit 7 requesting backup at the plaza. Kings are gathering again.',
    ],
  },
];

export function createRadio() {
  return {
    station: 0,
    chatterTimer: 18 + Math.random() * 10,
    lineIndex: 0,
  };
}

export function stationOf(S) {
  if (!S.radio) return STATIONS[0];
  return STATIONS[S.radio.station % STATIONS.length];
}

export function isScanner(S) {
  return !!S.radio && stationOf(S).id === 'scan';
}

export function cycleStation(S) {
  if (!S.radio) return;
  S.radio.station = (S.radio.station + 1) % STATIONS.length;
  const st = stationOf(S);
  S.banner = `RADIO: ${st.name} — ${st.tag}`;
  S.bannerTimer = 2.5;
  S.audio.pickup();
  say(S, 'RADIO', `${st.name}: ${st.lines[S.radio.lineIndex % st.lines.length]}`, 4);
  S.radio.lineIndex += 1;
  S.radio.chatterTimer = 30 + Math.random() * 10;
}

export function updateRadio(S, dt) {
  const r = S.radio;
  if (!r) return;
  r.chatterTimer -= dt;
  if (r.chatterTimer <= 0) {
    r.chatterTimer = 30 + Math.random() * 12;
    const st = stationOf(S);
    say(S, 'RADIO', `${st.name}: ${st.lines[r.lineIndex % st.lines.length]}`, 4);
    r.lineIndex += 1;
  }
}

// One line for the HUD pill: "♪ BAY 97.5 · R to switch".
export function radioLabel(S) {
  const st = stationOf(S);
  return `♪ ${st.name} · R to switch`;
}
