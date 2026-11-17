// Wanted level and the police: stars 0-5, patrol cars that spawn and chase
// the player when wanted, and foot officers who try to arrest Rico on touch
// (busted = game over). Wanted decays after ~20 s without a new crime, and
// the heat rises with the star count.

import { WORLD, dist, hitsBuilding, moveWithCollision } from './city.js';
import { damagePlayer } from './player.js';

export const MAX_WANTED = 5;
export const WANTED_DECAY_SECONDS = 20;

export function addCrime(G, stars, label) {
  if (G.missionLockWanted) {
    // During the "Heat" mission the wanted level is pinned by the mission.
    G.wanted = Math.max(G.wanted, 3);
  } else {
    G.wanted = Math.min(MAX_WANTED, G.wanted + stars);
  }
  G.crimeTimer = 0;
  G.lastCrime = label;
  G.audio.sirenBlip();
  if (G.wanted >= 1) G.audio.setSiren(true);
}

export function updateWanted(G, dt) {
  if (G.wanted <= 0) {
    G.audio.setSiren(false);
    return;
  }
  if (G.missionLockWanted) {
    // The Heat mission holds the heat until its timer runs out.
    G.audio.setSiren(true);
    return;
  }
  G.crimeTimer += dt;
  if (G.crimeTimer >= WANTED_DECAY_SECONDS) {
    G.wanted -= 1;
    G.crimeTimer = 0;
    G.announce(`Heat cooling off... wanted ${G.wanted} star${G.wanted === 1 ? '' : 's'}.`);
    if (G.wanted === 0) {
      G.audio.setSiren(false);
      G.announce('You lost the cops. Wanted clear.');
    }
  }
  G.audio.setSiren(G.wanted >= 1);
}

function spawnCopCar(G) {
  const p = G.player;
  // Appear on a road a little way off, so the chase is visible, not instant.
  const angle = Math.random() * Math.PI * 2;
  const x = Math.max(80, Math.min(WORLD.width - 80, p.x + Math.cos(angle) * 700));
  const y = Math.max(80, Math.min(WORLD.height - 80, p.y + Math.sin(angle) * 700));
  const car = {
    x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 0,
    color: '#1b2a4a', police: true, stolen: false, parked: false, traffic: false,
    roadAxis: 'x', roadValue: 0, dir: 1, turnCooldown: 0, driver: false, hp: 100,
  };
  G.copCars.push(car);
  return car;
}

function spawnFootCop(G) {
  const p = G.player;
  const angle = Math.random() * Math.PI * 2;
  G.footCops.push({
    x: Math.max(40, Math.min(WORLD.width - 40, p.x + Math.cos(angle) * 420)),
    y: Math.max(40, Math.min(WORLD.height - 40, p.y + Math.sin(angle) * 420)),
    angle, speed: 215, hp: 30, punchCooldown: 0,
  });
}

export function updatePolice(G, dt) {
  const p = G.player;
  const wantCars = G.wanted === 0 ? 0 : Math.min(1 + G.wanted, 6);
  while (G.copCars.length < wantCars) spawnCopCar(G);
  while (G.copCars.length > wantCars) G.copCars.pop();
  const wantFoot = G.wanted >= 2 ? Math.min(G.wanted - 1, 3) : 0;
  while (G.footCops.length < wantFoot) spawnFootCop(G);
  while (G.footCops.length > wantFoot) G.footCops.pop();

  // Cop cars chase the player and ram: their speed grows with the wanted level.
  for (const car of G.copCars) {
    const target = Math.atan2(p.y - car.y, p.x - car.x);
    let diff = target - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    const maxSpeed = 300 + G.wanted * 45;
    car.speed += (maxSpeed - car.speed) * dt * 0.7;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (nx > 40 && nx < WORLD.width - 40 && ny > 40 && ny < WORLD.height - 40) {
      if (hitsBuilding(G.city, nx, ny, 24)) {
        // A building is in the way: swing around it instead of driving through.
        car.angle += Math.PI / 2;
        car.speed *= 0.6;
      } else {
        car.x = nx;
        car.y = ny;
      }
    } else {
      car.angle += Math.PI / 2;
    }
    // Ram the player's car: damage + shake, and slow the player down.
    if (G.playerCar && dist(car, G.playerCar) < 46) {
      G.playerCar.speed *= 0.82;
      car.speed *= 0.9;
      G.particles.sparks(car.x, car.y);
      G.particles.addShake(7);
      G.audio.crash();
      if (G.playerCar) G.playerCar.hp -= 2;
    }
    // Ram the player on foot: heavy damage.
    if (p.onFoot && dist(car, p) < 34) {
      damagePlayer(G, 18, 'wasted');
      car.speed *= 0.4;
    }
  }

  // Foot cops chase on foot and arrest on touch.
  for (const cop of G.footCops) {
    const target = Math.atan2(p.y - cop.y, p.x - cop.x);
    cop.angle = target;
    const speed = p.onFoot ? cop.speed : cop.speed * 0.7;
    const next = moveWithCollision(G.city, cop.x, cop.y, Math.cos(target) * speed * dt, Math.sin(target) * speed * dt, 12);
    cop.x = next.x;
    cop.y = next.y;
    if (dist(cop, p) < 30) {
      if (p.onFoot) {
        G.overReason = 'busted';
        G.screen = 'over';
        G.audio.fail();
        G.announce('BUSTED! The police caught Rico.');
      } else {
        // They yank at the door: slow the car, shake the screen.
        if (G.playerCar) G.playerCar.speed *= 0.92;
        G.particles.addShake(3);
      }
    }
  }
}

export function clearPolice(G) {
  G.copCars = [];
  G.footCops = [];
  G.wanted = 0;
  G.crimeTimer = 0;
  G.audio.setSiren(false);
}
