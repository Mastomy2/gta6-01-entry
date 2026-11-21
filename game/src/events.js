// Solmar Bay — random city events.
// One job: the city does things when the player is not looking. Street
// races tear down the avenues, and when the heat is on, the Solmar PD
// runs periodic raids — a surge of cruisers around a marked danger zone
// on the minimap. Events are ambient: they never block a mission, they
// just make Solmar Bay feel like it keeps living without the player.

import { RACE_EVERY_MIN, RACE_EVERY_MAX, RAID_EVERY_MIN, RAID_EVERY_MAX } from './config.js';
import { makeCar } from './vehicles.js';
import { nearestRoadPoint, dist } from './world.js';
import { say } from './dialogue.js';

export function createEvents() {
  return {
    raceTimer: 25 + Math.random() * 20, // first race comes early
    race: null, // { cars: [car, car], timer }
    raidTimer: 50 + Math.random() * 25,
    raid: null, // { x, y, timer } — the danger zone
  };
}

function startRace(S) {
  // Two traffic cars on the same stretch of road become rivals: they get
  // race speed, a checkered flag over the roof, and a 25-second sprint.
  const near = S.cars.filter((c) => c.role === 'traffic' && !c.dead
    && dist(c.x, c.y, S.player.x, S.player.y) < 1100);
  if (near.length < 2) return;
  const a = near[Math.floor(Math.random() * near.length)];
  let b = near[Math.floor(Math.random() * near.length)];
  if (a === b) b = near[(near.indexOf(a) + 1) % near.length];
  for (const car of [a, b]) {
    car.race = true;
    car.oldCruise = car.cruiseSpeed;
    car.cruiseSpeed = 540;
    car.speed = Math.max(car.speed, 420);
  }
  S.events.race = { cars: [a, b], timer: 25 };
  S.banner = 'STREET RACE on the avenue — two rivals, flat out!';
  S.bannerTimer = 3;
  say(S, 'RADIO', 'Street race tearing down the avenue. Stay clear — or join in.');
}

function endRace(S) {
  const race = S.events.race;
  if (!race) return;
  for (const car of race.cars) {
    if (car) {
      car.race = false;
      car.cruiseSpeed = car.oldCruise ?? 150;
    }
  }
  S.events.race = null;
}

function startRaid(S) {
  // A raid only makes sense while the player is wanted: two extra
  // cruisers converge on a danger zone centred on the player, and the
  // minimap draws the zone in red until the raid burns out.
  if (S.player.wanted === 0) return;
  const px = S.player.x;
  const py = S.player.y;
  for (let i = 0; i < 2; i++) {
    const spot = nearestRoadPoint(px + (i === 0 ? -650 : 650), py + (i === 0 ? -420 : 420));
    const car = makeCar(spot.x, spot.y, 0, 'cruiser', '#f0f0f0');
    car.role = 'police';
    car.cruiseSpeed = 560;
    S.cars.push(car);
    S.police.cruisers.push(car);
  }
  S.events.raid = { x: px, y: py, timer: 20 };
  S.banner = 'SP D RAID — roadblock zone ahead. Punch through or go around!';
  S.bannerTimer = 3;
  say(S, 'DISPATCH', 'All units, raid on Vega. Box him in — do not let him through the zone.');
}

export function updateEvents(S, dt) {
  const ev = S.events;
  if (!ev) return;
  // Street race on its own clock, any wanted level, any mission.
  ev.raceTimer -= dt;
  if (ev.raceTimer <= 0) {
    ev.raceTimer = RACE_EVERY_MIN + Math.random() * (RACE_EVERY_MAX - RACE_EVERY_MIN);
    if (!ev.race) startRace(S);
  }
  if (ev.race) {
    ev.race.timer -= dt;
    if (ev.race.timer <= 0) endRace(S);
  }
  // Raids only while wanted, on their own slower clock.
  ev.raidTimer -= dt;
  if (ev.raidTimer <= 0) {
    ev.raidTimer = RAID_EVERY_MIN + Math.random() * (RAID_EVERY_MAX - RAID_EVERY_MIN);
    if (!ev.raid) startRaid(S);
  }
  if (ev.raid) {
    ev.raid.timer -= dt;
    if (ev.raid.timer <= 0) {
      ev.raid = null;
      S.banner = 'Raid over — the cordon pulls back.';
      S.bannerTimer = 2;
    }
  }
}

// The race flag and the raid ring, drawn in world space.
export function drawEventMarkers(ctx, S) {
  const ev = S.events;
  if (!ev) return;
  if (ev.race) {
    for (const car of ev.race.cars) {
      if (!car || car.dead) continue;
      // Checkered flag on a pole over the roof.
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(car.x, car.y - 12);
      ctx.lineTo(car.x, car.y - 34);
      ctx.stroke();
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#111' : '#fff';
          ctx.fillRect(car.x + c * 6, car.y - 34 + r * 6, 6, 6);
        }
      }
    }
  }
  if (ev.raid) {
    const pulse = 1 + Math.sin(S.time * 5) * 0.08;
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.85)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(ev.raid.x, ev.raid.y, 260 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 59, 48, 0.06)';
    ctx.beginPath();
    ctx.arc(ev.raid.x, ev.raid.y, 260 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3b30';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText('RAID ZONE', ev.raid.x, ev.raid.y - 268);
    ctx.fillText('RAID ZONE', ev.raid.x, ev.raid.y - 268);
  }
}
