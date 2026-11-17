// WebAudio synth for Prism Drift. Every effect is generated in code, so the game ships no audio file
// and works fully offline. The context is created lazily on the first user gesture, since browsers
// block audio until then.
export function createAudio() {
  let context = null;
  let master = null;
  let enabled = true;

  // Create the context and a quiet master gain once, then reuse it.
  function ensure() {
    if (context !== null) return context;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) { enabled = false; return null; }
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.25;
    master.connect(context.destination);
    return context;
  }

  // A short pitched tone: sweeps from `frequency` to `slideTo` over `duration`.
  function blip({ frequency = 440, slideTo = frequency, duration = 0.12, type = 'sine', gain = 0.5 }) {
    if (!enabled) return;
    const ctx = ensure();
    if (ctx === null) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // A decaying noise burst through a lowpass, for impacts.
  function noise({ duration = 0.2, gain = 0.4, cutoff = 1200 }) {
    if (!enabled) return;
    const ctx = ensure();
    if (ctx === null) return;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(filter).connect(amp).connect(master);
    source.start();
  }

  return {
    fire: () => blip({ frequency: 880, slideTo: 320, duration: 0.09, type: 'square', gain: 0.16 }),
    dash: () => blip({ frequency: 260, slideTo: 700, duration: 0.16, type: 'triangle', gain: 0.22 }),
    prism: () => blip({ frequency: 660, slideTo: 1320, duration: 0.16, type: 'sine', gain: 0.3 }),
    hit: () => noise({ duration: 0.22, gain: 0.35, cutoff: 900 }),
    kill: () => blip({ frequency: 180, slideTo: 60, duration: 0.26, type: 'sawtooth', gain: 0.25 }),
    wave: () => blip({ frequency: 300, slideTo: 900, duration: 0.4, type: 'triangle', gain: 0.3 }),
    win: () => { blip({ frequency: 523, duration: 0.16, gain: 0.3 }); setTimeout(() => blip({ frequency: 784, duration: 0.24, gain: 0.3 }), 150); },
    lose: () => blip({ frequency: 220, slideTo: 70, duration: 0.7, type: 'sawtooth', gain: 0.3 }),
    // Called on a gesture so a suspended context unlocks.
    resume: () => { const ctx = ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
  };
}
