// Small colour helpers. Colours are [r, g, b] arrays with 0–255 channels.

export const hexToRgb = (hex) => {
  const h = hex.trim().replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

export const toCss = ([r, g, b]) => `rgb(${r} ${g} ${b})`;

export const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');

export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

export const clamp01 = (t) => Math.min(1, Math.max(0, t));

export const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

// WCAG 2 relative luminance and contrast ratio.
const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// Pull `color` toward `anchor` only as far as needed to reach `min` contrast on `bg`.
export function withContrast(color, bg, anchor, min) {
  if (contrast(color, bg) >= min) return color;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(mix(color, anchor, mid), bg) >= min) hi = mid;
    else lo = mid;
  }
  return mix(color, anchor, hi);
}
