// Soft ambient rain or waves, generated with the Web Audio API (no audio files).
// Nothing is created until someone picks a sound, so there's never autoplay.

const VOLUME = 0.2; // master level: quiet, under everything
const FADE_IN = 2.5; // seconds
const FADE_OUT = 1.5;

let ctx = null;
let master = null;
let current = null; // { kind, gain, stop() }
let audible = true; // false while the section is off screen or the tab is hidden

function noiseBuffer(kind, seconds = 6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (kind === 'brown') {
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    // Pink noise (Paul Kellet's filter): softer than white noise, like rain.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buffer;
}

const loop = (buffer) => Object.assign(ctx.createBufferSource(), { buffer, loop: true });
const filter = (type, frequency, Q = 0.7) => {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
};
const gainOf = (value) => {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
};
// A slow sine that nudges an AudioParam up and down by `depth`.
const lfo = (hz, depth, param) => {
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;
  const amount = gainOf(depth);
  osc.connect(amount).connect(param);
  return osc;
};

function rain(out) {
  const hiss = loop(noiseBuffer('pink'));
  const hissGain = gainOf(0.55);
  hiss.connect(filter('highpass', 900)).connect(filter('lowpass', 7500)).connect(hissGain).connect(out);

  const rumble = loop(noiseBuffer('brown'));
  rumble.connect(filter('lowpass', 450)).connect(gainOf(0.35)).connect(out);

  const flutter = lfo(0.23, 0.1, hissGain.gain); // rain is never perfectly steady
  return [hiss, rumble, flutter];
}

function waves(out) {
  const swell = loop(noiseBuffer('brown'));
  const low = filter('lowpass', 650);
  const body = gainOf(0.5);
  swell.connect(low).connect(body).connect(out);

  const foam = loop(noiseBuffer('pink'));
  const foamGain = gainOf(0.07);
  foam.connect(filter('bandpass', 2400, 0.5)).connect(foamGain).connect(out);

  // One wave roughly every 11 seconds: louder, brighter, then drawing back.
  const hz = 0.09;
  return [swell, foam, lfo(hz, 0.42, body.gain), lfo(hz, 480, low.frequency), lfo(hz, 0.06, foamGain.gain)];
}

function startLayer(kind) {
  const gain = gainOf(0);
  gain.connect(master);
  const nodes = kind === 'rain' ? rain(gain) : waves(gain);
  const now = ctx.currentTime;
  nodes.forEach((n) => n.start(now));
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + FADE_IN);
  return {
    kind,
    stop() {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + FADE_OUT);
      nodes.forEach((n) => n.stop(t + FADE_OUT + 0.1));
      setTimeout(() => gain.disconnect(), (FADE_OUT + 0.3) * 1000);
    },
  };
}

let suspendTimer = 0;

function applyAudible() {
  if (!ctx) return;
  clearTimeout(suspendTimer);
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  if (audible && current) {
    ctx.resume();
    master.gain.linearRampToValueAtTime(VOLUME, t + 1);
  } else {
    master.gain.linearRampToValueAtTime(0, t + 1);
    // Once it's silent, pause the audio engine entirely (saves battery).
    suspendTimer = setTimeout(() => ctx.suspend(), (FADE_OUT + 0.5) * 1000);
  }
}

// kind: 'off' | 'rain' | 'waves'. Must first be called from a user action.
export function setAmbient(kind) {
  if (kind === (current?.kind ?? 'off')) return;
  if (kind !== 'off' && !ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = gainOf(0);
    master.connect(ctx.destination);
  }
  if (!ctx) return;

  current?.stop();
  current = kind === 'off' ? null : startLayer(kind);
  applyAudible();
}

// Fade out (and back in) when the section leaves the screen or the tab hides.
export function setAmbientAudible(value) {
  audible = value;
  applyAudible();
}

export const ambientState = () => ({
  kind: current?.kind ?? 'off',
  contextState: ctx?.state ?? 'none',
  audible,
});
