// Solmar Bay — keyboard input.
// One job: track which keys are held and which were just pressed this frame.

export function createInput() {
  const input = {
    held: new Set(),
    pressed: new Set(),
    anyKey: false,
  };
  const code = (e) => e.code;

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!input.held.has(code(e))) input.pressed.add(code(e));
    input.held.add(code(e));
    input.anyKey = true;
  });
  window.addEventListener('keyup', (e) => {
    input.held.delete(code(e));
  });
  window.addEventListener('blur', () => {
    input.held.clear();
  });
  return input;
}

export function isDown(input, ...codes) {
  return codes.some((c) => input.held.has(c));
}

// Movement vector from WASD / arrows, normalised.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (isDown(input, 'KeyA', 'ArrowLeft')) x -= 1;
  if (isDown(input, 'KeyD', 'ArrowRight')) x += 1;
  if (isDown(input, 'KeyW', 'ArrowUp')) y -= 1;
  if (isDown(input, 'KeyS', 'ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function wasPressed(input, ...codes) {
  return codes.some((c) => input.pressed.has(c));
}

export function endFrame(input) {
  input.pressed.clear();
  input.anyKey = false;
}
