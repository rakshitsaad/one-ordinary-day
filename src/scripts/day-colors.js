import {
  hexToRgb, toCss, toHex, mix, smoothstep, luminance, contrast, withContrast,
} from './color.js';
import { readChapters, hoursAt, sunAt, moonAt } from './day-time.js';

// Contrast floors (WCAG AA). Accent text is only ever used at large sizes (24px+).
const MIN_TEXT = 4.5;
const MIN_LARGE_TEXT = 3;
// Secondary text sits this far toward the background, when contrast allows.
const SOFT_FADE = 0.32;
// Where text flips between dark and light, the background blend is squeezed into
// the middle 40% of the segment so the in-between tones pass quickly, while the
// gap between two sections is at the centre of the screen.
const CROSSOVER_WINDOW = 0.4;

// ---- The sky (drawn by sky.js, coloured here) -------------------------------------
// The page background is the sky. On top of it sky.js draws a glow along the
// horizon, a sun and a moon, all tints of palette colours. Story text can sit on
// any of them, so --soft and --accent-text are held at their contrast floors
// against every sky tone on screen, not just --bg.

// Horizon glow per stop: a palette colour, and how strongly it tints the sky at
// the bottom of the screen (fading to nothing about halfway up).
const HORIZON = {
  dawn: ['dawn-particle', 0.4],
  morning: ['night-particle', 0.35],
  midday: ['night-particle', 0.3],
  afternoon: ['afternoon-particle', 0.4],
  sunset: ['sunset-accent', 0.22],
  dusk: ['dusk-accent', 0.18],
  night: ['night-accent', 0.08],
};
// The sun is cream at noon and warmer near dawn and sunset (0 → 1).
const SUN_WARMTH = { dawn: 0.7, morning: 0.25, midday: 0, afternoon: 0.45, sunset: 1 };
const SUN_STRENGTH = 0.6; // how far the sun's core moves from the sky towards its tone
const MOON_STRENGTH = 0.2; // a faint moon: light text has to stay readable over it
// No sky tone may take the main text below this, which leaves room for --soft
// (4.5:1) and --accent-text (3:1) on top of it. Tones are weakened as needed:
// against the mid-purple 9:30 pm sky the moon and the last light stay faint,
// and only come out properly once the sky is dark.
const SKY_FG_MIN = 6;
// The 4:50 pm light dims a little while the anxious thoughts are on screen:
// the background moves this far towards the text colour.
const DIM = { afternoon: 0.07 };

const ROLES = ['bg', 'fg', 'accent', 'particle'];
const root = document.documentElement;
const themeMeta = document.querySelector('meta[name="theme-color"]');

// Live colours as [r, g, b], for anything drawn outside CSS (e.g. the particle canvas).
export const dayColors = { bg: null, fg: null, accent: null, particle: null };

const lerp = (a, b, t) => a + (b - a) * t;

function readStop(name, token) {
  const stop = {};
  for (const role of ROLES) stop[role] = token(`${name}-${role}`);
  const [horizon, amount] = HORIZON[name] ?? [`${name}-bg`, 0];
  stop.horizon = token(horizon);
  stop.horizonAmount = amount;
  stop.warmth = SUN_WARMTH[name] ?? 0;
  stop.dim = DIM[name] ?? 0;
  return stop;
}

const isLightText = (stop) => luminance(stop.fg) > luminance(stop.bg);

// Moves `bg` towards `tone` by up to `strength`, but only as far as `fg` keeps
// SKY_FG_MIN contrast on the result (or as far as it already has, if less).
function skyTone(bg, tone, strength, fg) {
  const floor = Math.min(SKY_FG_MIN, contrast(fg, bg));
  if (contrast(fg, mix(bg, tone, strength)) >= floor) return mix(bg, tone, strength);
  let lo = 0;
  let hi = strength;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(fg, mix(bg, tone, mid)) >= floor) lo = mid;
    else hi = mid;
  }
  return mix(bg, tone, lo);
}

// `sky` lists which bodies are up ({ sun, moon } as 0–1); leave it out for the
// fixed controls, which sit on their own solid background.
function blend({ from, to, crossover }, t, tones, sky) {
  const e = crossover
    ? smoothstep((t - (1 - CROSSOVER_WINDOW) / 2) / CROSSOVER_WINDOW)
    : smoothstep(t);

  let bg = mix(from.bg, to.bg, e);
  const dim = lerp(from.dim, to.dim, e);
  if (dim > 0) bg = mix(bg, mix(from.fg, to.fg, e), dim);

  // Blended text stays readable between two light (or two dark) stops. Across a
  // light/dark flip it can't: halfway, text and background are the same colour.
  // So we hold whichever stop's text colour reads better and swap at the point
  // where both are equal, keeping the drop in contrast as small as possible.
  let fg = mix(from.fg, to.fg, e);
  if (contrast(fg, bg) < MIN_TEXT) {
    fg = contrast(from.fg, bg) >= contrast(to.fg, bg) ? from.fg : to.fg;
  }

  const skyLow = skyTone(bg, mix(from.horizon, to.horizon, e), lerp(from.horizonAmount, to.horizonAmount, e), fg);
  const sunTone = mix(tones.cream, tones.warm, lerp(from.warmth, to.warmth, e));
  const sunCore = skyTone(bg, sunTone, SUN_STRENGTH, fg);
  const moonCore = skyTone(bg, tones.cream, MOON_STRENGTH, fg);

  const backs = [bg];
  if (sky) {
    backs.push(skyLow);
    if (sky.sun > 0.01) backs.push(sunCore);
    if (sky.moon > 0.01) backs.push(moonCore);
  }

  const accent = mix(from.accent, to.accent, e);
  return {
    bg,
    fg,
    accent,
    accentText: withContrast(accent, backs, fg, MIN_LARGE_TEXT),
    soft: withContrast(mix(fg, bg, SOFT_FADE), backs, fg, MIN_TEXT),
    particle: mix(from.particle, to.particle, e),
    skyLow,
    sunCore,
    moonCore,
  };
}

export function initDayColors(timeline) {
  const styles = getComputedStyle(root);
  const token = (name) => {
    const value = styles.getPropertyValue(`--${name}`);
    if (!value) throw new Error(`Missing --${name} in tokens.css`);
    return hexToRgb(value);
  };
  const stops = timeline.sections.map((section) => readStop(section.dataset.stop, token));
  if (stops.length === 0) return;
  const chapters = readChapters(timeline.sections);
  const tones = { cream: token('night-particle'), warm: token('sunset-particle') };

  const segments = stops.length === 1
    ? [{ from: stops[0], to: stops[0], crossover: false }]
    : stops.slice(0, -1).map((from, i) => {
      const to = stops[i + 1];
      return { from, to, crossover: isLightText(from) !== isLightText(to) };
    });

  const written = {};
  const write = (name, value) => {
    if (written[name] === value) return;
    written[name] = value;
    root.style.setProperty(name, value);
  };

  timeline.subscribe((state) => {
    const { index, t } = state;
    const segment = segments[index];
    const hours = hoursAt(chapters, state);
    const c = blend(segment, t, tones, { sun: sunAt(hours).shown, moon: moonAt(hours).shown });
    // Fixed controls (header: "Talk to someone", the day line, the garden) are
    // on screen at every scroll position, so they can't sit out the crossover
    // dip like story text does. Across a light/dark flip they use the nearest
    // stop's exact colours instead, switching once at the midpoint. They have
    // their own solid background, so the sky doesn't count for them.
    const ui = segment.crossover ? blend(segment, t < 0.5 ? 0 : 1, tones) : blend(segment, t, tones);

    write('--bg', toCss(c.bg));
    write('--fg', toCss(c.fg));
    write('--accent', toCss(c.accent));
    write('--accent-text', toCss(c.accentText));
    write('--soft', toCss(c.soft));
    write('--particle', toCss(c.particle));
    write('--sky-low', toCss(c.skyLow));
    write('--sky-sun', toCss(c.sunCore));
    write('--sky-moon', toCss(c.moonCore));
    write('--ui-bg', toCss(ui.bg));
    write('--ui-fg', toCss(ui.fg));
    write('--ui-accent', toCss(ui.accent));
    write('--ui-accent-text', toCss(ui.accentText));
    write('--ui-soft', toCss(ui.soft));
    write('color-scheme', luminance(c.bg) < 0.18 ? 'dark' : 'light');
    themeMeta?.setAttribute('content', toHex(c.bg));

    dayColors.bg = c.bg;
    dayColors.fg = c.fg;
    dayColors.accent = c.accent;
    dayColors.particle = c.particle;
  });
}
