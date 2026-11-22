// Solmar Bay — the police helicopter.
// One job: five stars brings the sky down. A PD heli lifts off, circles
// Rico at two hundred and thirty metres, and pins him in a searchlight
// cone that reads even through the night tint. While the heli is over
// him the heat does not cool — the wanted level cannot decay until the
// bird is gone, which means dropping to two stars first. The heli is a
// presence, not a bullet: it watches, it lights, it waits.

import { dist } from './world.js';

export function createHeli() {
  return {
    active: null, // { x, y, angle, orbit }
    spawnTimer: 6, // seconds at five stars before the bird lifts off
  };
}

export function updateHeli(S, dt) {
  const heli = S.heli;
  if (!heli) return;
  const p = S.player;

  if (heli.active) {
    const h = heli.active;
    h.orbit += dt * 0.45;
    const R = 230;
    h.x = p.x + Math.cos(h.orbit) * R;
    h.y = p.y + Math.sin(h.orbit) * R;
    h.angle = Math.atan2(p.y - h.y, p.x - h.x);
    if (S.sceneMode) return; // staged scenes keep their bird
    if (p.wanted <= 2) {
      heli.active = null;
      heli.spawnTimer = 6;
      S.banner = 'Heli pulls off — the sky is yours again.';
      S.bannerTimer = 2.5;
    }
    return;
  }

  if (S.sceneMode) return;
  if (p.wanted >= 5) {
    heli.spawnTimer -= dt;
    if (heli.spawnTimer <= 0) {
      heli.active = { x: p.x + 300, y: p.y - 300, angle: 0, orbit: 0.6 };
      S.banner = 'PD HELI overhead — the spotlight is on you. Lose it below two stars.';
      S.bannerTimer = 3.5;
    }
  } else {
    heli.spawnTimer = 6;
  }
}

// Stage one by hand (screenshot scenes): it circles Rico from the start.
export function stageHeli(S, orbit = 0.6) {
  S.heli.active = {
    x: S.player.x + Math.cos(orbit) * 230,
    y: S.player.y + Math.sin(orbit) * 230,
    angle: 0,
    orbit,
  };
}

// The bird, its rotor blur, and the searchlight cone down to Rico.
export function drawHeli(ctx, S) {
  const heli = S.heli;
  if (!heli || !heli.active) return;
  const h = heli.active;
  const p = S.player;

  // Searchlight cone: heli to player, brightest at Rico's feet.
  const grad = ctx.createLinearGradient(h.x, h.y, p.x, p.y);
  grad.addColorStop(0, 'rgba(255, 240, 170, 0.20)');
  grad.addColorStop(1, 'rgba(255, 240, 170, 0.38)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  const a = Math.atan2(p.y - h.y, p.x - h.x);
  const spread = 0.22;
  ctx.moveTo(h.x, h.y);
  ctx.lineTo(p.x + Math.cos(a + Math.PI / 2 + spread) * 55, p.y + Math.sin(a + Math.PI / 2 + spread) * 55);
  ctx.lineTo(p.x + Math.cos(a - Math.PI / 2 - spread) * 55, p.y + Math.sin(a - Math.PI / 2 - spread) * 55);
  ctx.closePath();
  ctx.fill();
  // Lit pool around Rico.
  ctx.fillStyle = 'rgba(255, 240, 170, 0.28)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 60, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow on the ground, offset from the bird.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(h.x + 26, h.y + 30, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body + tail, nose at the player.
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.angle);
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-44, -4, 26, 8);
  ctx.fillStyle = '#2b4fd8';
  ctx.fillRect(-46, -7, 8, 14);
  ctx.fillStyle = '#cfe3ff';
  ctx.beginPath();
  ctx.ellipse(12, 0, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Rotor blur.
  ctx.strokeStyle = 'rgba(220, 230, 240, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(h.x, h.y, 44, 12, Math.sin(S.time * 9) * 0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Tag.
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 4;
  ctx.strokeText('PD HELI', h.x, h.y - 52);
  ctx.fillText('PD HELI', h.x, h.y - 52);
}

// Distance helper kept for the minimap blip math (unused elsewhere).
export function heliDist(S) {
  if (!S.heli || !S.heli.active) return Infinity;
  return dist(S.heli.active.x, S.heli.active.y, S.player.x, S.player.y);
}
