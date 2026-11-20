// Solmar Bay — pedestrians.
// One job: the 32 people walking Solmar Bay's sidewalks, strolling,
// crossing at zebras, and running away from a speeding car.

import { PED_COUNT, PLAYER_RADIUS } from './config.js';
import { makeRng, range, pick, chance } from './random.js';
import { randomSidewalkPoint, isBlocked, dist, clampToWorld } from './world.js';

const SHIRTS = ['#e2483d', '#3d7de2', '#57b25a', '#e8a13d', '#9b59d0', '#e86a92', '#3db5b5', '#f0f0f0'];

export function spawnPedestrians(seed) {
  const rng = makeRng(seed + 303);
  const peds = [];
  for (let i = 0; i < PED_COUNT; i++) {
    const p = randomSidewalkPoint(rng);
    peds.push({
      x: p.x, y: p.y,
      vx: 0, vy: 0,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 34, 62),
      shirt: pick(rng, SHIRTS),
      skin: pick(rng, ['#e8b98a', '#c98d5f', '#8a5a3b', '#f0c8a0']),
      state: 'walk', // walk | flee | down
      stateTimer: range(rng, 2, 8),
      downTimer: 0,
      walkPhase: range(rng, 0, Math.PI * 2),
    });
  }
  return peds;
}

export function updatePedestrians(S, dt) {
  const px = S.player.x;
  const py = S.player.y;
  const playerCar = S.player.car;
  for (const ped of S.peds) {
    ped.walkPhase += dt * (ped.state === 'flee' ? 14 : 7);
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        ped.state = 'walk';
        ped.stateTimer = 2;
      }
      continue;
    }
    // Flee a fast car or a nearby threat.
    let threatX = null;
    let threatY = null;
    let threatR = 0;
    if (playerCar && Math.abs(playerCar.speed) > 120) {
      threatX = playerCar.x; threatY = playerCar.y; threatR = 150;
    } else if (S.player.onFoot) {
      threatX = px; threatY = py; threatR = 60;
      // Only flee the player when he is sprinting into them or punching.
      if (S.player.punchTimer > 0.2) threatR = 90;
      else threatX = null;
    }
    if (threatX !== null && dist(ped.x, ped.y, threatX, threatY) < threatR) {
      ped.state = 'flee';
      ped.stateTimer = 1.2;
    }
    if (ped.state === 'flee') {
      ped.stateTimer -= dt;
      const a = Math.atan2(ped.y - (threatY ?? py), ped.x - (threatX ?? px));
      ped.angle = a;
      ped.vx = Math.cos(a) * 150;
      ped.vy = Math.sin(a) * 150;
      if (ped.stateTimer <= 0) ped.state = 'walk';
    } else {
      ped.stateTimer -= dt;
      if (ped.stateTimer <= 0) {
        ped.stateTimer = range(Math.random, 3, 9);
        ped.angle = Math.random() * Math.PI * 2;
      }
      ped.vx = Math.cos(ped.angle) * ped.speed;
      ped.vy = Math.sin(ped.angle) * ped.speed;
    }
    const nx = ped.x + ped.vx * dt;
    const ny = ped.y + ped.vy * dt;
    if (!isBlocked(S.world, nx, ny, 4)) {
      const c = clampToWorld(nx, ny, 30);
      ped.x = c.x;
      ped.y = c.y;
    } else {
      ped.angle += Math.PI / 2;
    }
  }

  // A speeding car knocks a pedestrian down: a crime, wanted goes up.
  if (playerCar && Math.abs(playerCar.speed) > 90) {
    for (const ped of S.peds) {
      if (ped.state === 'down') continue;
      if (dist(ped.x, ped.y, playerCar.x, playerCar.y) < 30) {
        ped.state = 'down';
        ped.downTimer = 4;
        S.player.addWanted(1, 'pedestrian hit');
        S.audio.crash();
      }
    }
  }
}

export function drawPedestrians(ctx, peds) {
  for (const ped of peds) {
    const bob = ped.state === 'down' ? 0 : Math.sin(ped.walkPhase) * 1.5;
    ctx.save();
    ctx.translate(ped.x, ped.y);
    if (ped.state === 'down') {
      ctx.rotate(1.4);
      ctx.fillStyle = ped.shirt;
      ctx.fillRect(-11, -6, 22, 12);
      ctx.fillStyle = ped.skin;
      ctx.beginPath();
      ctx.arc(13, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(ped.angle + Math.PI / 2);
      // Shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(1, 2, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body.
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      // Head.
      ctx.fillStyle = ped.skin;
      ctx.beginPath();
      ctx.arc(0, -bob * 0.4, 6, 0, Math.PI * 2);
      ctx.fill();
      // Walking feet.
      ctx.fillStyle = '#222';
      ctx.fillRect(-6, 6 + bob, 4, 5);
      ctx.fillRect(2, 6 - bob, 4, 5);
    }
    ctx.restore();
  }
}
