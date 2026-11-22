// Solmar Bay — world rendering.
// One job: paint the city under the camera — ground, beach and water,
// roads and markings, buildings with pools and helipad, props, mission
// markers — then every entity on top of it.

import {
  WORLD_W, WORLD_H, ROAD_W, V_ROADS, H_ROADS, BEACH_Y, WATER_Y, PLAZA, PARK, PALETTE,
} from './config.js';
import { drawCar } from './vehicles.js';
import { drawPedestrians } from './pedestrians.js';
import { drawPolice } from './police.js';
import { drawGang } from './gang.js';
import { drawPlayer } from './player.js';
import { drawParticles } from './particles.js';
import { currentMarker } from './missions.js';
import { nightFactor, drawWeatherOverlay } from './weather.js';
import { drawEventMarkers } from './events.js';
import { shakeOffset } from './shake.js';

export function drawWorld(ctx, S) {
  const cam = S.camera;
  const vw = S.view.w;
  const vh = S.view.h;
  const shake = shakeOffset(S);
  ctx.save();
  ctx.translate(-cam.x + vw / 2 + shake.x, -cam.y + vh / 2 + shake.y);

  drawGround(ctx, S);
  drawRoads(ctx);
  drawWetRoads(ctx, S);
  drawBuildings(ctx, S.world);
  drawProps(ctx, S);
  drawMarker(ctx, S);
  drawBeachExtras(ctx, S.world, S.time);

  for (const car of S.cars) drawCar(ctx, car);
  drawPedestrians(ctx, S.peds);
  drawGang(ctx, S.gang);
  drawPolice(ctx, S.police);
  drawPlayer(ctx, S);
  drawParticles(ctx, S.particles);
  drawEventMarkers(ctx, S);

  ctx.restore();
  // Night tint, dusk warmth and rain streaks sit above the world, below the HUD.
  drawWeatherOverlay(ctx, S);
}

// Rain soaks the asphalt until it shines: a pale sheen over the roads
// plus headlights' worth of glint on the centre dashes.
function drawWetRoads(ctx, S) {
  const rain = S.weather ? S.weather.rain : 0;
  if (rain < 0.15) return;
  const sheen = Math.min(0.22, rain * 0.2);
  ctx.fillStyle = `rgba(168, 198, 232, ${sheen.toFixed(3)})`;
  for (const x of V_ROADS) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const y of H_ROADS) ctx.fillRect(0, y - ROAD_W / 2, WORLD_W, ROAD_W);
}

function drawGround(ctx, S) {
  // Grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Mow stripes for texture.
  ctx.fillStyle = PALETTE.grassDark;
  for (let y = 0; y < WORLD_H; y += 160) {
    ctx.fillRect(0, y, WORLD_W, 80);
  }
  // Plaza paving.
  ctx.fillStyle = PALETTE.plaza;
  ctx.fillRect(PLAZA.x, PLAZA.y, PLAZA.w, PLAZA.h);
  ctx.strokeStyle = '#8a7a5c';
  ctx.lineWidth = 3;
  ctx.strokeRect(PLAZA.x + 6, PLAZA.y + 6, PLAZA.w - 12, PLAZA.h - 12);
  // Plaza fountain.
  ctx.fillStyle = PALETTE.fountain;
  ctx.beginPath();
  ctx.arc(PLAZA.cx, PLAZA.cy, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8ecf5';
  ctx.beginPath();
  ctx.arc(PLAZA.cx, PLAZA.cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.fountain;
  ctx.beginPath();
  ctx.arc(PLAZA.cx, PLAZA.cy, 18 + Math.sin(S.time * 2) * 2, 0, Math.PI * 2);
  ctx.fill();

  // Park lawn.
  ctx.fillStyle = '#5d9e4e';
  ctx.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
  ctx.strokeStyle = '#cbb98f';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(PARK.x, PARK.y + PARK.h / 2);
  ctx.lineTo(PARK.x + PARK.w, PARK.y + PARK.h / 2);
  ctx.moveTo(PARK.x + PARK.w / 2, PARK.y);
  ctx.lineTo(PARK.x + PARK.w / 2, PARK.y + PARK.h);
  ctx.stroke();

  // Beach sand and water.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, BEACH_Y, WORLD_W, WATER_Y - BEACH_Y);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, WATER_Y, WORLD_W, WORLD_H - WATER_Y);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let x = 0; x < WORLD_W; x += 90) {
    ctx.fillRect(x + ((S.time * 18) % 90), WATER_Y + 26, 46, 5);
    ctx.fillRect(x + 40 - ((S.time * 12) % 90), WATER_Y + 60, 40, 4);
  }
  // Foam at the waterline.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(0, WATER_Y - 4 + Math.sin(S.time * 1.4) * 2, WORLD_W, 6);
}

function drawRoads(ctx) {
  // Sidewalks first, then asphalt on top.
  for (const x of V_ROADS) {
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(x - ROAD_W / 2 - 16, 0, ROAD_W + 32, WORLD_H);
    ctx.fillStyle = PALETTE.asphalt;
    ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  }
  for (const y of H_ROADS) {
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(0, y - ROAD_W / 2 - 16, WORLD_W, ROAD_W + 32);
    ctx.fillStyle = PALETTE.asphalt;
    ctx.fillRect(0, y - ROAD_W / 2, WORLD_W, ROAD_W);
  }
  // Centre dashes.
  ctx.fillStyle = PALETTE.asphaltLine;
  for (const x of V_ROADS) {
    for (let y = 20; y < WORLD_H; y += 64) ctx.fillRect(x - 3, y, 6, 32);
  }
  for (const y of H_ROADS) {
    for (let x = 20; x < WORLD_W; x += 64) ctx.fillRect(x, y - 3, 32, 6);
  }
}

function drawBuildings(ctx, world) {
  for (const b of world.buildings) {
    // Drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    // Roof.
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = PALETTE.buildingEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Roof details: vents and skylights.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + 12, b.y + 12, 26, 18);
    ctx.fillRect(b.x + b.w - 40, b.y + b.h - 30, 26, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.55, b.w * 0.2, b.h * 0.2);
  }
  // Rooftop pools.
  for (const p of world.pools) {
    ctx.fillStyle = PALETTE.pool;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
  // Helipad.
  if (world.helipad) {
    const h = world.helipad;
    ctx.fillStyle = PALETTE.helipad;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.font = `bold ${Math.floor(h.r * 0.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', h.x, h.y + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawProps(ctx, S) {
  const world = S.world;
  const time = S.time;
  const night = S.weather ? nightFactor(S) : 0;
  // Zebra crossings.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const z of world.zebras) {
    for (let i = -3; i <= 3; i++) {
      ctx.fillRect(z.x - 40 + i * 12, z.y - ROAD_W / 2 - 14, 6, 20);
      ctx.fillRect(z.x - 40 + i * 12, z.y + ROAD_W / 2 - 6, 6, 20);
    }
  }
  // Hydrants.
  for (const h of world.hydrants) {
    ctx.fillStyle = PALETTE.hydrant;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(h.x - 2, h.y - 8, 4, 4);
  }
  // Palms.
  for (const p of world.palms) {
    const sway = Math.sin(time * 1.2 + p.x * 0.01) * 2;
    ctx.strokeStyle = PALETTE.palmTrunk;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + sway, p.y - 26);
    ctx.stroke();
    ctx.fillStyle = PALETTE.palmLeaf;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.ellipse(p.x + sway + Math.cos(a) * 13, p.y - 26 + Math.sin(a) * 8, 13, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#6a4a28';
    ctx.beginPath();
    ctx.arc(p.x + sway, p.y - 24, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Street lamps: a dot by day, a pool of light after dark. Only lamps
  // inside the camera view get a glow, so night stays cheap.
  const viewL = S.camera.x - S.view.w / 2 - 60;
  const viewR = S.camera.x + S.view.w / 2 + 60;
  const viewT = S.camera.y - S.view.h / 2 - 60;
  const viewB = S.camera.y + S.view.h / 2 + 60;
  for (const l of world.lamps) {
    if (l.x < viewL || l.x > viewR || l.y < viewT || l.y > viewB) continue;
    if (night > 0.25) {
      ctx.fillStyle = `rgba(255, 205, 110, ${(night * 0.10).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 224, 138, ${(night * 0.30).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.lamp;
    ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMarker(ctx, S) {
  const m = currentMarker(S);
  if (!m) return;
  const pulse = 1 + Math.sin(S.time * 4) * 0.12;
  // Beacon column.
  ctx.fillStyle = 'rgba(255,210,61,0.16)';
  ctx.fillRect(m.x - 34, m.y - 190, 68, 190);
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(m.x, m.y, 34 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,61,0.85)';
  ctx.beginPath();
  ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
  ctx.fill();
  // Label.
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 4;
  ctx.strokeText(m.label, m.x, m.y - 46);
  ctx.fillText(m.label, m.x, m.y - 46);
  // Off-screen arrow handled by the HUD minimap; the beacon is tall enough
  // to spot from a distance.
}

function drawBeachExtras(ctx, world, time) {
  // Beach umbrellas.
  const spots = [
    { x: 500, y: BEACH_Y + 60, c: '#e2483d' },
    { x: 1500, y: BEACH_Y + 90, c: '#2b6fd8' },
    { x: 2600, y: BEACH_Y + 55, c: '#e8a13d' },
  ];
  for (const u of spots) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 8, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = u.c;
    ctx.beginPath();
    ctx.arc(u.x, u.y, 20, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(u.x, u.y + 12);
    ctx.stroke();
  }
}
