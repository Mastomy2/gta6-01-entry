// Solmar Bay — screen shake.
// One job: the camera kick when something violent happens. A crash, a
// ram, or an explosion adds trauma; the frame loop decays it, and the
// renderer reads the current offset. Small file on purpose: shake has no
// opinions about what caused it, so any module can trigger it without
// importing the whole event system.

export function createShake() {
  return { trauma: 0 };
}

// mag is 0..1: 0.25 for a hard bump, 0.6 for a ram, 1 for an explosion.
export function addShake(S, mag) {
  if (!S.shake) return;
  S.shake.trauma = Math.min(1, S.shake.trauma + mag);
}

export function updateShake(S, dt) {
  if (!S.shake) return;
  S.shake.trauma = Math.max(0, S.shake.trauma - dt * 1.6);
}

// Current camera offset in pixels. Trauma squared, so small bumps barely
// register and explosions really throw the frame around.
export function shakeOffset(S) {
  if (!S.shake || S.shake.trauma <= 0) return { x: 0, y: 0 };
  const mag = S.shake.trauma * S.shake.trauma * 14;
  return {
    x: (Math.random() * 2 - 1) * mag,
    y: (Math.random() * 2 - 1) * mag,
  };
}
