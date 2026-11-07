// Every sound is synthesised with Web Audio, so there are no audio files to load.
const Sound = (() => {
  let ctx = null;
  let master = null;
  let noise = null;
  let muted = false;

  // Browsers only allow audio after a user gesture, so call this from a click handler.
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // Go silent as soon as the page is hidden or closed. An open AudioContext can otherwise
  // keep its output stream alive, and any scheduled sound would play on with nothing visible.
  function syncToPage() {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  }
  document.addEventListener('visibilitychange', syncToPage);
  window.addEventListener('pagehide', () => { if (ctx) ctx.suspend(); });
  window.addEventListener('pageshow', syncToPage);

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.8;
  }

  function noiseBurst(at, dur, { freq, q = 1, type = 'bandpass', gain = 0.3, attack = 0.005 }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(env).connect(master);
    src.start(at, Math.random());
    src.stop(at + dur + 0.02);
  }

  function tone(at, dur, { freq, to, type = 'sine', gain = 0.2, attack = 0.008 }) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(env).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  // A steam whistle: a detuned chord that slides up as the steam builds, plus breathy noise.
  function whistleBlast(at, dur) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.16, at + 0.07);
    env.gain.setValueAtTime(0.16, at + dur - 0.1);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    filter.connect(env).connect(master);
    [466, 587, 698].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 0.93, at);
      osc.frequency.exponentialRampToValueAtTime(f, at + 0.09);
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + dur + 0.02);
    });
    noiseBurst(at, dur, { freq: 2600, q: 2.5, gain: 0.05, attack: 0.05 });
  }

  const live = (fn) => (...args) => {
    if (!ctx) return;
    fn(ctx.currentTime, ...args);
  };

  return {
    unlock,
    setMuted,
    whistle: live((t) => {
      whistleBlast(t, 0.34);
      whistleBlast(t + 0.46, 0.8);
    }),
    // One "choo" of the engine. `strength` runs from 0 to 1.
    chuff: live((t, strength = 0.6) => {
      noiseBurst(t, 0.16, { freq: 700 + 500 * strength, q: 0.8, gain: 0.08 + 0.2 * strength });
      noiseBurst(t, 0.09, { freq: 160, q: 1, type: 'lowpass', gain: 0.12 + 0.12 * strength });
    }),
    hiss: live((t) => noiseBurst(t, 0.9, { freq: 3800, type: 'highpass', gain: 0.09, attack: 0.04 })),
    bell: live((t) => {
      [0, 0.24].forEach((d) => {
        tone(t + d, 0.5, { freq: 1320, gain: 0.08 });
        tone(t + d, 0.3, { freq: 2640, gain: 0.03 });
      });
    }),
    pick: live((t) => tone(t, 0.07, { freq: 520, to: 700, type: 'triangle', gain: 0.09 })),
    place: live((t) => {
      tone(t, 0.13, { freq: 190, to: 90, gain: 0.3 });
      noiseBurst(t, 0.05, { freq: 1500, gain: 0.1 });
      tone(t + 0.05, 0.22, { freq: 880, gain: 0.08 });
      tone(t + 0.12, 0.26, { freq: 1175, gain: 0.08 });
    }),
    wrong: live((t) => {
      tone(t, 0.2, { freq: 300, to: 150, type: 'triangle', gain: 0.16 });
      tone(t + 0.13, 0.22, { freq: 240, to: 120, type: 'triangle', gain: 0.12 });
    }),
    fanfare: live((t) => {
      [523, 659, 784, 1047].forEach((f, i) => {
        tone(t + i * 0.13, 0.4, { freq: f, type: 'triangle', gain: 0.14 });
      });
    }),
  };
})();
