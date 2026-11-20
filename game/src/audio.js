// Web Audio synth: every sound is generated, no audio files. Engine hum,
// police siren, gunshots, punches, pickups, mission jingles and a simple
// bass groove. Everything is guarded so a missing AudioContext never breaks
// the game, and nothing starts until the player first interacts.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;
  let unlocked = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function unlock() {
    if (unlocked) return;
    if (!ensure()) return;
    unlocked = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    startEngine();
    startMusic();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || !unlocked) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* sound is polish, never fatal */ }
  }

  function noise(dur, vol, lowpass) {
    if (!ctx || !unlocked) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.3;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 3000;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch { /* sound is polish, never fatal */ }
  }

  function startEngine() {
    try {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch { /* ignore */ }
  }

  function setEngine(speed01) {
    if (!engineOsc || !engineGain || !ctx) return;
    // Clamp: callers pass a ratio, but a stray value must never push the
    // oscillator or gain out of range (round 3 robustness).
    const s = Math.max(0, Math.min(1, speed01));
    try {
      engineOsc.frequency.setTargetAtTime(50 + s * 160, ctx.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(s > 0.02 ? 0.05 + s * 0.05 : 0, ctx.currentTime, 0.1);
    } catch { /* ignore */ }
  }

  function setSiren(on) {
    if (!ctx || !unlocked) return;
    try {
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0.045;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.9;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        lfo.start();
        sirenOsc._lfo = lfo;
      } else if (!on && sirenOsc) {
        sirenOsc.stop();
        if (sirenOsc._lfo) sirenOsc._lfo.stop();
        sirenOsc = null;
        sirenGain = null;
      }
    } catch { /* ignore */ }
  }

  // A lazy bass groove: root notes of a minor progression, one per beat.
  const BASS_LINE = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (!unlocked || !ctx) return;
      const note = BASS_LINE[musicStep % BASS_LINE.length];
      musicStep += 1;
      tone(note, 0.42, 'triangle', 0.12);
      if (musicStep % 4 === 0) tone(note * 2, 0.18, 'sine', 0.05);
    }, 430);
  }

  return {
    unlock,
    setEngine,
    setSiren,
    shoot() { noise(0.12, 0.4, 2500); tone(180, 0.08, 'square', 0.15, 60); },
    punch() { noise(0.08, 0.3, 900); },
    hit() { tone(120, 0.15, 'sawtooth', 0.2, 70); },
    pickup() { tone(660, 0.09, 'sine', 0.2); tone(990, 0.14, 'sine', 0.2); },
    crash() { noise(0.25, 0.5, 1200); tone(90, 0.2, 'sawtooth', 0.25, 40); },
    sirenBlip() { tone(880, 0.12, 'sine', 0.18, 660); },
    mission() { tone(523, 0.12, 'triangle', 0.22); setTimeout(() => tone(659, 0.12, 'triangle', 0.22), 110); setTimeout(() => tone(784, 0.22, 'triangle', 0.25), 220); },
    fail() { tone(330, 0.2, 'sawtooth', 0.2, 220); setTimeout(() => tone(220, 0.35, 'sawtooth', 0.2, 150), 180); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.25), i * 140)); },
    steal() { tone(440, 0.1, 'square', 0.15, 880); },
  };
}
