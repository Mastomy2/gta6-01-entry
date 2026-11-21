// Solmar Bay — keyboard: state tombol + deteksi sekali tekan.
export function createInput() {
  const down = new Set();
  const pressed = new Set();
  const input = {
    isDown(code) { return down.has(code); },
    wasPressed(code) { return pressed.has(code); },
    consume(code) { pressed.delete(code); },
    clearPressed() { pressed.clear(); },
  };
  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) pressed.add(e.code);
    down.add(e.code);
  }
  function onKeyUp(e) { down.delete(e.code); }
  function onBlur() { down.clear(); pressed.clear(); }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  input.dispose = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
  return input;
}

// Peta kontrol untuk layar menu & bantuan.
export const CONTROL_HELP = [
  ['W A S D / Arrows', 'Drive / walk'],
  ['Shift', 'Nitro boost'],
  ['E', 'Enter car / steal nearest car'],
  ['M', 'Start the next story job'],
  ['R', 'Start a street race here'],
  ['G', 'Open the garage (cars, upgrades, crew)'],
  ['P', 'Pause'],
  ['Enter', 'Confirm / continue'],
];
