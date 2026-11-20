// Keyboard + mouse input: tracks held keys, edge-triggered actions, and the
// mouse aim point in screen space. No network, no storage, pure DOM events.

export const ACTION_ENTER = 1 << 0; // E: enter / exit a car
export const ACTION_PUNCH = 1 << 1; // F: punch
export const ACTION_SHOOT = 1 << 2; // mouse click or Space: shoot
export const ACTION_PAUSE = 1 << 3; // Esc or P: pause / resume
export const ACTION_START = 1 << 4; // Enter or Space on a menu screen
export const ACTION_SAVE = 1 << 5; // S: save the game

const KEY_ACTIONS = {
  KeyE: ACTION_ENTER,
  KeyF: ACTION_PUNCH,
  KeyS: ACTION_SAVE,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
  Enter: ACTION_START,
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  window.addEventListener('keydown', (e) => {
    const code = e.code || e.key;
    if (code === 'Space') {
      if (!e.repeat) queued |= ACTION_SHOOT | ACTION_START;
      e.preventDefault();
    }
    const action = KEY_ACTIONS[code];
    if (action && !e.repeat) queued |= action;
    held.add(code);
    if (code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    held.delete(e.code || e.key);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    queued |= ACTION_SHOOT;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    e.preventDefault();
  });

  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });

  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });

  function moveVector() {
    let x = 0;
    let y = 0;
    if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
    if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  return {
    held,
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    moveVector,
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    mouse() {
      // Clamp to the viewport: a mouse outside the window used to hand the
      // aim code a point far off-screen (round 3 robustness).
      return {
        x: Math.max(0, Math.min(window.innerWidth, mouseX)),
        y: Math.max(0, Math.min(window.innerHeight, mouseY)),
        down: mouseDown,
      };
    },
  };
}
