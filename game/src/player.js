// Solmar Bay — pemain: mengemudi, jalan kaki, mencuri mobil, uang, kerusakan.
import { CARS, START_MONEY } from './config.js';
import { createCar, driveCar, carHitWorld, nearestTrafficCar } from './vehicles.js';
import { clamp, dist } from './random.js';
import { spawnParticles } from './particles.js';
import { addHeat } from './police.js';

export function activeCarDef(state) {
  return CARS.find((c) => c.id === state.player.carId) || CARS[0];
}

export function maxArmor(state) {
  return 100 + (state.upgrades.armor || 0) * 50;
}

export function createPlayer(state) {
  const s = state.world.spawn;
  const def = CARS.find((c) => c.id === (state.carId || 'comet')) || CARS[0];
  const car = createCar(def, s.x, s.y, s.angle);
  return {
    mode: 'car', // 'car' | 'foot'
    x: s.x, y: s.y, angle: s.angle, speed: 0,
    carId: def.id, car,
    footX: s.x, footY: s.y, footAngle: 0, footSpeed: 0,
    armor: 100, nitro: 100,
    stealCooldown: 0,
  };
}

export function playerPos(state) {
  const p = state.player;
  return p.mode === 'car' ? { x: p.car.x, y: p.car.y } : { x: p.footX, y: p.footY };
}

export function addMoney(state, n) {
  state.money += n;
  state.stats.earned += Math.max(0, n);
}

export function spendMoney(state, n) {
  if (state.money < n) return false;
  state.money -= n;
  return true;
}

export function damagePlayerCar(state, amount, cause) {
  const p = state.player;
  if (p.mode !== 'car') return;
  const bonus = state.crewBonus || { ramTaken: 1 };
  const taken = amount * (bonus.ramTaken || 1);
  p.car.armor = Math.max(0, p.car.armor - taken);
  if (p.car.armor <= 0) {
    // Mobil hancur: keluar jalan kaki, heat naik.
    spawnParticles(state, p.car.x, p.car.y, { count: 26, color: '#ff7a2a', speed: 260, life: 0.9 });
    spawnParticles(state, p.car.x, p.car.y, { count: 18, color: '#3a3a3a', speed: 120, life: 1.4 });
    p.mode = 'foot';
    p.footX = p.car.x + 40; p.footY = p.car.y + 40;
    p.car.armor = 1;
    addHeat(state, 10);
    state.messages.push({ text: 'Your ride is wrecked — get moving on foot!', t: 0, color: '#ff6a5a' });
  }
}

export function repairPlayerCar(state, full) {
  const p = state.player;
  const missing = maxArmor(state) - p.car.armor;
  if (missing <= 0) return 0;
  const cost = Math.ceil(missing * (full ? 1.2 : 0.8));
  if (!spendMoney(state, cost)) return -1;
  p.car.armor = maxArmor(state);
  return cost;
}

// E: keluar/masuk mobil, atau curi mobil lalu lintas terdekat.
export function interactKey(state) {
  const p = state.player;
  if (p.stealCooldown > 0) return;
  if (p.mode === 'car') {
    p.mode = 'foot';
    p.footX = p.car.x + 46; p.footY = p.car.y + 30;
    p.footAngle = p.car.angle;
    p.stealCooldown = 0.4;
    return;
  }
  // Jalan kaki: cari mobil terdekat (lalu lintas / parkir / polisi).
  const near = nearestTrafficCar(state, p.footX, p.footY, 70);
  const parked = state.parkedCars.find((c) => dist(p.footX, p.footY, c.x, c.y) < 70);
  if (parked) {
    p.mode = 'car';
    p.car = parked;
    state.parkedCars = state.parkedCars.filter((c) => c !== parked);
    p.stealCooldown = 0.4;
    return;
  }
  if (near) {
    state.traffic = state.traffic.filter((t) => t !== near);
    const stolen = createCar({ topSpeed: 420, accel: 260, handling: 1 }, near.x, near.y, near.angle);
    stolen.color = near.color;
    stolen.armor = 90;
    p.mode = 'car';
    p.car = stolen;
    p.carId = 'comet';
    p.stealCooldown = 0.4;
    addHeat(state, 12);
    state.messages.push({ text: 'Car stolen — the law noticed (+1 star soon)', t: 0, color: '#ffd24a' });
  }
}

export function updatePlayer(state, dt, input) {
  const p = state.player;
  if (p.stealCooldown > 0) p.stealCooldown -= dt;
  if (state.mode !== 'play') return;

  if (p.mode === 'car') {
    const controls = {
      up: input.isDown('KeyW') || input.isDown('ArrowUp'),
      down: input.isDown('KeyS') || input.isDown('ArrowDown'),
      left: input.isDown('KeyA') || input.isDown('ArrowLeft'),
      right: input.isDown('KeyD') || input.isDown('ArrowRight'),
      nitro: input.isDown('ShiftLeft') || input.isDown('ShiftRight') || input.isDown('Space'),
    };
    const bonus = state.crewBonus || { topSpeed: 1, accel: 1, handling: 1, nitroRate: 1 };
    const engineLvl = state.upgrades.engine || 0;
    const nitroLvl = state.upgrades.nitro || 0;
    const mods = {
      topSpeed: bonus.topSpeed * (1 + engineLvl * 0.08),
      accel: bonus.accel,
      handling: bonus.handling,
      nitroRate: bonus.nitroRate * (1 + nitroLvl * 0.25),
    };
    const before = p.car.speed;
    driveCar(p.car, controls, dt, mods);
    p.car.maxNitro = 100 + nitroLvl * 40;
    p.car.maxArmor = maxArmor(state);
    // Tabrakan dunia: percikan + kerusakan bila keras.
    const impact = carHitWorld(state, p.car, dt);
    if (impact > 0) {
      damagePlayerCar(state, impact, 'wall');
      spawnParticles(state, p.car.x, p.car.y, { count: 10, color: '#ffd24a', speed: 180, life: 0.5 });
      if (Math.abs(before) > 240) addHeat(state, 2);
    }
    // Tabrakan dengan lalu lintas: dorong berpisah, jangan tembus.
    for (const t of state.traffic) {
      const d = dist(p.car.x, p.car.y, t.x, t.y);
      if (d < 52 && d > 0.01) {
        const nx = (p.car.x - t.x) / d, ny = (p.car.y - t.y) / d;
        const push = (52 - d) / 2;
        p.car.x += nx * push; p.car.y += ny * push;
        t.x -= nx * push * 0.6; t.y -= ny * push * 0.6;
        if (Math.abs(p.car.speed) > 200 && p.car.hitCooldown <= 0) {
          p.car.hitCooldown = 0.5;
          damagePlayerCar(state, 5, 'traffic');
          spawnParticles(state, p.car.x, p.car.y, { count: 8, color: '#ffd24a', speed: 150, life: 0.4 });
        }
        p.car.speed *= (1 - 0.6 * dt);
      }
    }
    // Roadblock: barikade keras, jangan tembus.
    for (const rb of state.roadblocks) {
      const d = dist(p.car.x, p.car.y, rb.x, rb.y);
      if (d < 46 && d > 0.01) {
        const nx = (p.car.x - rb.x) / d, ny = (p.car.y - rb.y) / d;
        p.car.x += nx * (46 - d);
        p.car.y += ny * (46 - d);
        if (p.car.hitCooldown <= 0) {
          p.car.hitCooldown = 0.6;
          p.car.speed *= -0.3;
          damagePlayerCar(state, 8, 'roadblock');
          spawnParticles(state, p.car.x, p.car.y, { count: 12, color: '#ffd24a', speed: 200, life: 0.5 });
        }
      }
    }
    // Jejak ban saat belok keras di kecepatan tinggi.
    if (Math.abs(p.car.speed) > 260 && (controls.left || controls.right)) {
      p.car.skidTimer -= dt;
      if (p.car.skidTimer <= 0) {
        p.car.skidTimer = 0.06;
        const bx = p.car.x - Math.cos(p.car.angle) * 20;
        const by = p.car.y - Math.sin(p.car.angle) * 20;
        state.skids.push({ x1: bx, y1: by, x2: bx + Math.cos(p.car.angle) * 8, y2: by + Math.sin(p.car.angle) * 8, life: 1 });
      }
    }
    // Regen armour dari kru mekanik.
    if (bonus.armorRegen && p.car.armor < p.car.maxArmor) {
      p.car.armor = Math.min(p.car.maxArmor, p.car.armor + bonus.armorRegen * dt);
    }
    p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle; p.speed = p.car.speed;
    p.nitro = p.car.nitro;
  } else {
    // Jalan kaki: WASD, lari dengan Shift.
    const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const sp = run ? 260 : 150;
    let mx = 0, my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      p.footX += (mx / len) * sp * dt;
      p.footY += (my / len) * sp * dt;
      p.footAngle = Math.atan2(my, mx);
      p.footSpeed = sp;
    } else p.footSpeed = 0;
    p.footX = clamp(p.footX, 60, 3380);
    p.footY = clamp(p.footY, 60, 2660);
    p.x = p.footX; p.y = p.footY; p.speed = p.footSpeed;
  }
}
