// Solmar Bay — synthesized sound.
// One job: every sound is made with WebAudio oscillators and noise, no
// audio files. Engine hum, police siren, explosions, punches, pickups.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenPhase: 0,
    muted: false,
    started: false,
  };

  function ensure() {
    if (audio.started) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.35;
      audio.master.connect(audio.ctx.destination);

      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();

      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'triangle';
      audio.sirenOsc.frequency.value = 720;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();

      audio.started = true;
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol) {
    if (!audio.started || audio.muted) return;
    try {
      const o = audio.ctx.createOscillator();
      const g = audio.ctx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.18, audio.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
      o.connect(g);
      g.connect(audio.master);
      o.start();
      o.stop(audio.ctx.currentTime + dur);
    } catch { /* sound is decoration; never break the game */ }
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!audio.started || audio.muted) return;
    try {
      const len = Math.floor(audio.ctx.sampleRate * dur);
      const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buf;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 900;
      const g = audio.ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(audio.master);
      src.start();
    } catch { /* ignore */ }
  }

  return {
    ensure,
    get muted() { return audio.muted; },
    toggleMute() {
      audio.muted = !audio.muted;
      if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.35;
      return audio.muted;
    },
    // speed01: 0 idle .. 1 flat out. Called every frame while driving.
    engine(speed01, driving) {
      if (!audio.started || audio.muted) return;
      try {
        const target = driving ? 0.05 + speed01 * 0.11 : 0;
        audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.08);
        audio.engineOsc.frequency.setTargetAtTime(52 + speed01 * 165, audio.ctx.currentTime, 0.08);
      } catch { /* ignore */ }
    },
    // dt: frame time. on: any cruiser is close enough to hear.
    siren(dt, on) {
      if (!audio.started || audio.muted) return;
      try {
        audio.sirenPhase += dt;
        const twoTone = Math.floor(audio.sirenPhase * 1.6) % 2 === 0 ? 720 : 960;
        audio.sirenOsc.frequency.setTargetAtTime(twoTone, audio.ctx.currentTime, 0.05);
        audio.sirenGain.gain.setTargetAtTime(on ? 0.05 : 0, audio.ctx.currentTime, 0.2);
      } catch { /* ignore */ }
    },
    explosion() { noiseBurst(0.9, 0.5, 700); },
    crash() { noiseBurst(0.25, 0.3, 1200); },
    punch() { noiseBurst(0.08, 0.22, 500); blip(140, 0.07, 'sine', 0.2); },
    pickup() { blip(880, 0.09, 'square', 0.16); blip(1320, 0.14, 'square', 0.16); },
    cash() { blip(990, 0.08, 'square', 0.16); blip(1240, 0.08, 'square', 0.16); blip(1560, 0.2, 'square', 0.18); },
    missionDone() { blip(660, 0.12, 'square', 0.18); blip(880, 0.12, 'square', 0.18); blip(1100, 0.25, 'square', 0.2); },
    busted() { blip(220, 0.5, 'sawtooth', 0.25); },
  };
}
