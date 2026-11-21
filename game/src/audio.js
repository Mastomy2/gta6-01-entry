// Solmar Bay — suara synth WebAudio: mesin, sirene, tabrakan, pickup.
// Tidak ada file audio: semua dibuat dengan oscillator. Diam sampai ada gestur pengguna.
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;
let sirenHigh = false;
let muted = false;

export function initAudio() {
  if (audioCtx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  } catch (err) { audioCtx = null; }
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}

export function setMuted(m) { muted = m; if (engineGain) engineGain.gain.value = 0; }

// Dengung mesin mengikuti kecepatan (0..1).
export function engineSound(speedFrac, active) {
  if (!audioCtx || !engineOsc || muted) return;
  const target = active ? 0.028 + speedFrac * 0.05 : 0;
  engineGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.12);
  engineOsc.frequency.setTargetAtTime(52 + speedFrac * 130, audioCtx.currentTime, 0.1);
}

// Sirene polisi dua nada; panggil tiap frame dengan on/off.
export function policeSiren(on) {
  if (!audioCtx || muted) return;
  if (on && !sirenTimer) {
    sirenTimer = setInterval(() => {
      if (!audioCtx || muted) return;
      sirenHigh = !sirenHigh;
      blip(sirenHigh ? 880 : 660, 0.16, 'sine', 0.05);
    }, 320);
  } else if (!on && sirenTimer) {
    clearInterval(sirenTimer);
    sirenTimer = null;
  }
}

function blip(freq, dur, type, vol) {
  if (!audioCtx || muted) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (err) { /* abaikan */ }
}

export function sfx(name) {
  if (!audioCtx || muted) return;
  if (name === 'pickup') { blip(660, 0.12, 'sine', 0.09); setTimeout(() => blip(990, 0.14, 'sine', 0.09), 90); }
  if (name === 'crash') {
    try {
      const len = audioCtx.sampleRate * 0.18;
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.value = 0.22;
      src.connect(gain); gain.connect(audioCtx.destination);
      src.start();
    } catch (err) { /* abaikan */ }
  }
  if (name === 'success') {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.09), i * 110));
  }
  if (name === 'busted') {
    [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'sawtooth', 0.07), i * 160));
  }
  if (name === 'buy') { blip(880, 0.1, 'triangle', 0.09); setTimeout(() => blip(1174, 0.14, 'triangle', 0.09), 80); }
  if (name === 'deny') { blip(180, 0.16, 'square', 0.05); }
}
