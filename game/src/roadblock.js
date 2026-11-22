// Solmar Bay — police roadblocks.
// One job: at three stars and up, the Solmar PD stops chasing and starts
// waiting. A roadblock is two cruisers parked across the road ahead of
// Rico, striped barrier between them, ROADBLOCK painted on the asphalt
// and on the minimap. Ram through it — the bump physics and car damage
// already know how — or swing around it; either way it burns out after
// twenty-five seconds or when the heat drops. A driver tuned to PD SCAN
// hears it forming four seconds before the cruisers park.

import { makeCar } from './vehicles.js';
import { nearestRoadPoint, dist } from './world.js';
import { say } from './dialogue.js';
import { isScanner } from './radio.js';

export function createRoadblock() {
  return {
    active: null, // { x, y, axis, timer, age, cars: [car, car] }
    timer: 18 + Math.random() * 12, // seconds until the next one can form
    pending: null, // { x, y, axis, timer } — scanner warning window
    warned: false,
  };
}

function placeBlock(S, spot) {
  const cars = [];
  if (spot.axis === 'h') {
    // Horizontal road: cruisers stand across it, nose to nose.
    for (const dy of [-26, 26]) {
      const car = makeCar(spot.x, spot.y + dy, Math.PI / 2, 'cruiser', '#f0f0f0');
      car.role = 'police';
      cars.push(car);
    }
  } else {
    for (const dx of [-26, 26]) {
      const car = makeCar(spot.x + dx, spot.y, 0, 'cruiser', '#f0f0f0');
      car.role = 'police';
      cars.push(car);
    }
  }
  for (const car of cars) S.cars.push(car);
  S.roadblock.active = { x: spot.x, y: spot.y, axis: spot.axis, timer: 25, age: 0, cars };
  S.banner = 'ROADBLOCK ahead — punch through or go around!';
  S.bannerTimer = 3;
  say(S, 'DISPATCH', 'Roadblock set. Box him in — do not let him through.', 4);
  S.audio.crash();
}

// Stage one by hand (screenshot scenes): no timer, no warning, just the wall.
export function stageRoadblock(S, x, y, axis) {
  const spot = { x, y, axis };
  placeBlock(S, spot);
  if (S.roadblock.active) S.roadblock.active.timer = 999;
}

function clearBlock(S, why) {
  const block = S.roadblock.active;
  if (!block) return;
  S.roadblock.active = null;
  S.cars = S.cars.filter((c) => !block.cars.includes(c));
  if (why === 'rammed') {
    if (S.stats) S.stats.roadblocks += 1;
    S.banner = 'Roadblock smashed through!';
    S.bannerTimer = 2.5;
  }
}

export function updateRoadblock(S, dt) {
  const rb = S.roadblock;
  if (!rb) return;

  if (rb.active) {
    const block = rb.active;
    block.age += dt;
    if (!S.sceneMode) block.timer -= dt;
    const bothDead = block.cars.every((c) => c.dead);
    const farAway = block.age > 5 && dist(S.player.x, S.player.y, block.x, block.y) > 420;
    if (bothDead) clearBlock(S, 'rammed');
    else if (block.timer <= 0) clearBlock(S, 'expired');
    else if (!S.sceneMode && S.player.wanted < 3) clearBlock(S, 'cooled');
    else if (!S.sceneMode && farAway) clearBlock(S, 'passed');
    return;
  }

  if (rb.pending) {
    rb.pending.timer -= dt;
    if (rb.pending.timer <= 0) {
      const spot = rb.pending;
      rb.pending = null;
      placeBlock(S, spot);
    }
    return;
  }

  // Live game only: staged scenes place their own block.
  if (S.sceneMode) return;
  if (S.player.wanted < 3) {
    rb.timer = Math.min(rb.timer, 6);
    return;
  }
  rb.timer -= dt;
  if (rb.timer > 0) return;
  rb.timer = 26 + Math.random() * 14;
  // Ahead of Rico, on the nearest road: that is where a block belongs.
  const ahead = nearestRoadPoint(
    S.player.x + Math.cos(S.player.angle) * 520,
    S.player.y + Math.sin(S.player.angle) * 520,
  );
  if (!ahead) return;
  if (isScanner(S) && !rb.warned) {
    rb.warned = true;
    rb.pending = { x: ahead.x, y: ahead.y, axis: ahead.axis, timer: 4 };
    S.banner = 'SCANNER: roadblock forming ahead — four seconds!';
    S.bannerTimer = 3;
    say(S, 'DISPATCH', 'Units, set the block. Vega is coming down your road.', 4);
  } else {
    rb.warned = false;
    placeBlock(S, ahead);
  }
}

// Striped barrier and ROADBLOCK paint, in world space.
export function drawRoadblock(ctx, S) {
  const rb = S.roadblock;
  if (!rb) return;
  if (rb.pending) {
    const p = rb.pending;
    ctx.strokeStyle = 'rgba(255, 176, 46, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb02e';
    ctx.fillText('BLOCK FORMING', p.x, p.y - 78);
    return;
  }
  const block = rb.active;
  if (!block) return;
  // Barrier stripes between the two cruisers.
  const [a, b] = block.cars;
  if (a && b && !a.dead && !b.dead) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y) + 30;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ff3b30' : '#ffffff';
      ctx.fillRect(i * 10 - 5, -7, 10, 14);
    }
    ctx.restore();
  }
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3b30';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 4;
  ctx.strokeText('ROADBLOCK', block.x, block.y - 52);
  ctx.fillText('ROADBLOCK', block.x, block.y - 52);
}
