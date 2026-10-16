// Hand-drawn SVG strokes for <span class="mark"> and <span class="circle">.
// Paths are built in real pixels for each word (and rebuilt when it resizes),
// so the stroke never gets stretched thicker on one side.

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

// Path length in dash units. stroke-dashoffset INK_LENGTH = undrawn, 0 = drawn.
export const INK_LENGTH = 1000;

// Small, stable per-word variation so no two strokes look stamped.
const seedFrom = (text) => [...text].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 997, 7) / 997;

const f = (n) => n.toFixed(1);

function underlinePath(w, h, seed) {
  const lift = (seed - 0.5) * h * 0.3;
  return `M ${f(w * 0.01)} ${f(h * 0.7)} `
    + `C ${f(w * 0.28)} ${f(h * 0.2 + lift)}, ${f(w * 0.58)} ${f(h * 0.95 - lift)}, ${f(w * 0.99)} ${f(h * 0.35)}`;
}

// A loose loop that runs a little past where it started, like a pen circling a word.
function circlePath(w, h, seed) {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 2;
  const ry = h / 2 - 2;
  const start = -Math.PI * (0.55 + seed * 0.15);
  const steps = 56;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const a = start + p * 1.12 * TAU;
    const wobble = 1 + 0.035 * Math.sin(a * 3 + seed * 9);
    const inward = 1 - 0.07 * p; // the overshoot tucks inside the start
    d += `${i ? 'L' : 'M'} ${f(cx + Math.cos(a) * rx * wobble * inward)} ${f(cy + Math.sin(a) * ry * wobble * inward)} `;
  }
  return d.trim();
}

// Adds the SVG stroke to a .mark or .circle and returns its <path>.
export function addInk(el) {
  const kind = el.classList.contains('circle') ? 'circle' : 'mark';
  const seed = seedFrom(el.textContent);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `ink ink--${kind}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(NS, 'path');
  // GSAP tweens stroke-dashoffset in whole pixels, so measure the path in
  // thousandths rather than 0–1 (which would jump from undrawn to drawn).
  path.setAttribute('pathLength', String(INK_LENGTH));
  svg.append(path);
  el.append(svg);
  el.classList.add('has-ink');

  new ResizeObserver(([entry]) => {
    const { width: w, height: h } = entry.contentRect;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${f(w)} ${f(h)}`);
    path.setAttribute('d', kind === 'circle' ? circlePath(w, h, seed) : underlinePath(w, h, seed));
  }).observe(svg);

  return path;
}
