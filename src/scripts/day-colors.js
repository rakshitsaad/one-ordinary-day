import {
  hexToRgb, toCss, toHex, mix, smoothstep, luminance, contrast, withContrast,
} from './color.js';

// Contrast floors (WCAG AA). Accent text is only ever used at large sizes (24px+).
const MIN_TEXT = 4.5;
const MIN_LARGE_TEXT = 3;
// Secondary text sits this far toward the background, when contrast allows.
const SOFT_FADE = 0.32;
// Where text flips between dark and light, the background blend is squeezed into
// the middle 40% of the segment so the in-between tones pass quickly, while the
// gap between two sections is at the centre of the screen.
const CROSSOVER_WINDOW = 0.4;

const ROLES = ['bg', 'fg', 'accent', 'particle'];
const root = document.documentElement;
const themeMeta = document.querySelector('meta[name="theme-color"]');

// Live colours as [r, g, b], for anything drawn outside CSS (e.g. the particle canvas).
export const dayColors = { bg: null, fg: null, accent: null, particle: null };

function readStop(name, styles) {
  const stop = {};
  for (const role of ROLES) {
    const value = styles.getPropertyValue(`--${name}-${role}`);
    if (!value) throw new Error(`Missing --${name}-${role} in tokens.css`);
    stop[role] = hexToRgb(value);
  }
  return stop;
}

const isLightText = (stop) => luminance(stop.fg) > luminance(stop.bg);

function blend({ from, to, crossover }, t) {
  const e = crossover
    ? smoothstep((t - (1 - CROSSOVER_WINDOW) / 2) / CROSSOVER_WINDOW)
    : smoothstep(t);

  const bg = mix(from.bg, to.bg, e);

  // Blended text stays readable between two light (or two dark) stops. Across a
  // light/dark flip it can't: halfway, text and background are the same colour.
  // So we hold whichever stop's text colour reads better and swap at the point
  // where both are equal, keeping the drop in contrast as small as possible.
  let fg = mix(from.fg, to.fg, e);
  if (contrast(fg, bg) < MIN_TEXT) {
    fg = contrast(from.fg, bg) >= contrast(to.fg, bg) ? from.fg : to.fg;
  }

  const accent = mix(from.accent, to.accent, e);
  return {
    bg,
    fg,
    accent,
    accentText: withContrast(accent, bg, fg, MIN_LARGE_TEXT),
    soft: withContrast(mix(fg, bg, SOFT_FADE), bg, fg, MIN_TEXT),
    particle: mix(from.particle, to.particle, e),
  };
}

export function initDayColors(timeline) {
  const styles = getComputedStyle(root);
  const stops = timeline.sections.map((section) => readStop(section.dataset.stop, styles));
  if (stops.length === 0) return;

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

  timeline.subscribe(({ index, t }) => {
    const segment = segments[index];
    const c = blend(segment, t);
    // Fixed controls (header: "Talk to someone", the dial, the garden) are on
    // screen at every scroll position, so they can't sit out the crossover dip
    // like story text does. Across a light/dark flip they use the nearest
    // stop's exact colours instead, switching once at the midpoint.
    const ui = segment.crossover ? blend(segment, t < 0.5 ? 0 : 1) : c;

    write('--bg', toCss(c.bg));
    write('--fg', toCss(c.fg));
    write('--accent', toCss(c.accent));
    write('--accent-text', toCss(c.accentText));
    write('--soft', toCss(c.soft));
    write('--particle', toCss(c.particle));
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
