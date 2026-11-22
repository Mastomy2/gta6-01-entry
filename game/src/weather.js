// Solmar Bay — weather and the day/night cycle.
// One job: the sky over the city. A 4-minute day rolls from dawn to noon
// to dusk to deep night; rain blows in as short showers, soaks the roads
// until they shine, and makes the street lamps matter. Staged scenes can
// lock the weather (locked = true) so a screenshot keeps the sky it was
// framed under instead of drifting into a different hour mid-shoot.

import { DAY_LENGTH_SECONDS } from './config.js';

export function createWeather() {
  return {
    timeOfDay: 0.3, // 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight
    rain: 0, // 0 = dry, 1 = downpour
    rainTarget: 0,
    rainTimer: 55, // seconds until the next shower decision
    drops: [], // screen-space rain streaks {x, y, len, speed}
    locked: false,
  };
}

// 0 in full daylight, 1 in the dead of night.
export function nightFactor(S) {
  const t = S.weather.timeOfDay;
  const daylight = Math.cos((t - 0.25) * Math.PI * 2) * 0.5 + 0.5;
  return Math.max(0, Math.min(1, 1 - daylight));
}

export function weatherLabel(S) {
  const t = S.weather.timeOfDay;
  const hours = Math.floor(t * 24);
  const minutes = Math.floor((t * 24 - hours) * 60);
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const phase = nightFactor(S) > 0.75 ? 'NIGHT' : nightFactor(S) > 0.35 ? 'DUSK' : 'DAY';
  return S.weather.rain > 0.25 ? `${clock} · ${phase} · RAIN` : `${clock} · ${phase}`;
}

export function updateWeather(S, dt) {
  const w = S.weather;
  if (!w.locked) {
    w.timeOfDay = (w.timeOfDay + dt / DAY_LENGTH_SECONDS) % 1;
    // Showers arrive and leave on their own schedule.
    w.rainTimer -= dt;
    if (w.rainTimer <= 0) {
      if (w.rainTarget > 0) {
        w.rainTarget = 0;
        w.rainTimer = 45 + Math.random() * 50;
      } else {
        w.rainTarget = 0.45 + Math.random() * 0.55;
        w.rainTimer = 18 + Math.random() * 22;
      }
    }
  }
  // Ease the rain in and out instead of snapping it on.
  const dir = w.rainTarget > w.rain ? 1 : -1;
  w.rain = Math.max(0, Math.min(1, w.rain + dir * dt * 0.25));
  if (w.rainTarget === 0 && w.rain === 0) {
    w.drops.length = 0;
    return;
  }
  // Keep the streak field full while it rains; drops fall in screen
  // space so they read the same at any camera position. A real downpour
  // is dense: 220 streaks at full rain.
  const want = Math.floor(w.rain * 220);
  while (w.drops.length < want) {
    w.drops.push({
      x: Math.random() * 1360 - 40,
      y: Math.random() * 760 - 40,
      len: 12 + Math.random() * 14,
      speed: 620 + Math.random() * 320,
    });
  }
  if (w.drops.length > want) w.drops.length = want;
  for (const d of w.drops) {
    d.y += d.speed * dt;
    d.x -= d.speed * dt * 0.18; // wind slants the rain
    if (d.y > 760) {
      d.y = -20;
      d.x = Math.random() * 1360 - 40;
    }
  }
}

// Night tint + rain streaks, drawn in screen space after the world.
export function drawWeatherOverlay(ctx, S) {
  const night = nightFactor(S);
  if (night > 0.02) {
    ctx.fillStyle = `rgba(10, 16, 48, ${(night * 0.42).toFixed(3)})`;
    ctx.fillRect(0, 0, S.view.w, S.view.h);
  }
  // Dusk warms the light for a few minutes on either side of sunset.
  const t = S.weather.timeOfDay;
  const dusk = Math.max(0, 1 - Math.abs(t - 0.5) / 0.06);
  if (dusk > 0.02) {
    ctx.fillStyle = `rgba(255, 122, 26, ${(dusk * 0.10).toFixed(3)})`;
    ctx.fillRect(0, 0, S.view.w, S.view.h);
  }
  if (S.weather.rain > 0.05) {
    ctx.strokeStyle = `rgba(174, 194, 224, ${(S.weather.rain * 0.5).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const d of S.weather.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.len * 0.18, d.y + d.len);
    }
    ctx.stroke();
  }
}
