// Rico Vega on foot: WASD / arrows to walk, Shift to sprint, collision with
// buildings, and health. The player object lives on G.player; this module
// only moves it and applies damage.

import { moveWithCollision } from './city.js';

export const PLAYER_RADIUS = 14;
export const WALK_SPEED = 170;
export const RUN_SPEED = 290;
export const MAX_HP = 100;

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    hp: MAX_HP,
    onFoot: true,
    car: null,
    invulnerable: 0,
    punchCooldown: 0,
    shootCooldown: 0,
    moving: false,
  };
}

export function updatePlayerOnFoot(G, dt, move, running) {
  const p = G.player;
  const speed = running ? RUN_SPEED : WALK_SPEED;
  p.moving = move.x !== 0 || move.y !== 0;
  if (p.moving) {
    p.angle = Math.atan2(move.y, move.x);
    const next = moveWithCollision(G.city, p.x, p.y, move.x * speed * dt, move.y * speed * dt, PLAYER_RADIUS);
    p.x = next.x;
    p.y = next.y;
  }
  if (p.invulnerable > 0) p.invulnerable -= dt;
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
}

export function damagePlayer(G, amount, cause) {
  const p = G.player;
  // No damage after the run is already over (round 3: a late bullet used to
  // re-trigger the game-over screen and its sound).
  if (G.screen === 'over' || p.invulnerable > 0 || p.hp <= 0) return false;
  p.hp = Math.max(0, p.hp - amount);
  p.invulnerable = 0.6;
  G.particles.addShake(6);
  G.audio.hit();
  if (p.hp <= 0) {
    G.overReason = cause || 'wasted';
    G.screen = 'over';
    G.audio.fail();
  }
  return true;
}

export function healPlayer(G, amount) {
  G.player.hp = Math.min(MAX_HP, G.player.hp + amount);
}
