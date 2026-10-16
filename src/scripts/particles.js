import { dayColors } from './day-colors.js';
import { prefersReducedMotion } from './smooth-scroll.js';
import { hexToRgb, smoothstep } from './color.js';

// How star-like the dust is, and how many fireflies are out, at each stop.
// Anything not listed is 0. Values blend between neighbouring stops as you scroll.
const NIGHT = { dusk: 0.3, night: 1 };
const FIREFLIES = { dusk: 1 };

const SMALL = { areaPerMote: 16000, maxMotes: 40, fireflies: 4, maxDpr: 1.5 };
const LARGE = { areaPerMote: 12000, maxMotes: 110, fireflies: 9, maxDpr: 2 };

const REPEL_RADIUS = 140; // px around the cursor
const REPEL_STRENGTH = 130; // px/s² right at the cursor, fading to 0 at the radius
const PUSH_DAMPING = 2.4; // how quickly a push wears off, per second
const BREATH = (Math.PI * 2) / 7; // dust shimmer: one slow breath every 7s

const TAU = Math.PI * 2;
const smallScreen = matchMedia('(pointer: coarse), (max-width: 47.99rem)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

const lerp = (a, b, t) => a + (b - a) * t;
const angleBetween = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function makeMote(w, h) {
  const z = 0.35 + Math.random() * 0.65; // depth: nearer motes are bigger, brighter, faster
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    z,
    r: 0.7 + z * 1.8,
    vx: (Math.random() - 0.5) * 6,
    vy: -(3 + Math.random() * 9) * z,
    px: 0,
    py: 0,
    phase: Math.random() * TAU,
    twinkle: TAU / (3 + Math.random() * 4), // stars twinkle once every 3–7s
  };
}

function makeFirefly(w, h) {
  return {
    x: Math.random() * w,
    y: h * (0.35 + Math.random() * 0.6), // they keep low
    heading: Math.random() * TAU,
    speed: 10 + Math.random() * 10,
    seed: Math.random() * 100,
    period: 4 + Math.random() * 3,
    phase: Math.random() * TAU,
    px: 0,
    py: 0,
  };
}

// Soft round sprites, redrawn whenever the colour changes. Drawing a small
// pre-rendered image is much cheaper than a gradient per particle per frame.
function paintSprite(sprite, [r, g, b], stops) {
  const ctx = sprite.getContext('2d');
  const half = sprite.width / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [at, alpha] of stops) gradient.addColorStop(at, `rgba(${r},${g},${b},${alpha})`);
  ctx.clearRect(0, 0, sprite.width, sprite.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, sprite.width, sprite.height);
}

const sprite = (size) => Object.assign(document.createElement('canvas'), { width: size, height: size });
const DUST = [[0, 1], [0.3, 0.85], [0.6, 0.3], [1, 0]];
const STAR = [[0, 1], [0.2, 0.9], [0.4, 0.15], [1, 0]];
const FIREFLY = [[0, 1], [0.08, 0.9], [0.2, 0.3], [0.5, 0.06], [1, 0]];

export function initParticles(timeline) {
  const canvas = document.createElement('canvas');
  canvas.className = 'particles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  const dustSprite = sprite(32);
  const starSprite = sprite(32);
  const fireflySprite = sprite(64);
  paintSprite(fireflySprite, hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--night-accent')), FIREFLY);

  const stops = timeline.sections.map((s) => s.dataset.stop);
  const motes = [];
  const fireflies = [];
  let w = 0;
  let h = 0;
  let night = 0;
  let glow = 0; // how visible the fireflies are
  let colour = '';
  let pointer = null;

  // Size the canvas and top up / trim the particles to suit the screen.
  function resize() {
    const settings = smallScreen.matches ? SMALL : LARGE;
    const dpr = Math.min(window.devicePixelRatio || 1, settings.maxDpr);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(settings.maxMotes, Math.round((w * h) / settings.areaPerMote));
    while (motes.length < target) motes.push(makeMote(w, h));
    motes.length = target;
    while (fireflies.length < settings.fireflies) fireflies.push(makeFirefly(w, h));
    fireflies.length = settings.fireflies;
  }

  function moveMote(m, time, dt) {
    const drift = 1 - 0.95 * night; // stars barely move
    const repel = pointer ? 1 - 0.7 * night : 0;

    if (repel) {
      const dx = m.x - pointer.x;
      const dy = m.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / REPEL_RADIUS) ** 2 * REPEL_STRENGTH * repel * dt;
        m.px += (dx / d) * f;
        m.py += (dy / d) * f;
      }
    }
    const damping = Math.exp(-PUSH_DAMPING * dt);
    m.px *= damping;
    m.py *= damping;

    const sway = Math.sin(time * 0.3 + m.phase) * 3;
    m.x += ((m.vx + sway) * drift + m.px) * dt;
    m.y += (m.vy * drift + m.py) * dt;

    // Drift off the top, come back in at the bottom.
    const pad = 10;
    if (m.y < -pad) { m.y = h + pad; m.x = Math.random() * w; }
    else if (m.y > h + pad) m.y = -pad;
    if (m.x < -pad) m.x = w + pad;
    else if (m.x > w + pad) m.x = -pad;
  }

  function moveFirefly(f, time, dt) {
    // Wander on a smooth, never-repeating curve.
    f.heading += (Math.sin(time * 0.7 + f.seed) + Math.sin(time * 0.31 + f.seed * 2.3)) * 0.6 * dt;
    // Near an edge, turn back toward the lower middle of the screen.
    const edge = 40;
    if (f.x < edge || f.x > w - edge || f.y < h * 0.25 || f.y > h - edge) {
      const home = Math.atan2(h * 0.65 - f.y, w / 2 - f.x);
      f.heading += angleBetween(home, f.heading) * 1.5 * dt;
    }
    if (pointer) {
      const dx = f.x - pointer.x;
      const dy = f.y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (d < REPEL_RADIUS && d > 0.1) {
        const push = (1 - d / REPEL_RADIUS) ** 2 * REPEL_STRENGTH * dt;
        f.px += (dx / d) * push;
        f.py += (dy / d) * push;
      }
    }
    const damping = Math.exp(-PUSH_DAMPING * dt);
    f.px *= damping;
    f.py *= damping;
    f.x += (Math.cos(f.heading) * f.speed + f.px) * dt;
    f.y += (Math.sin(f.heading) * f.speed + f.py) * dt;
  }

  function draw(time, dt) {
    ctx.clearRect(0, 0, w, h);

    for (const m of motes) {
      if (dt) moveMote(m, time, dt);

      const breathe = 0.75 + 0.25 * Math.sin(time * BREATH + m.phase);
      const twinkle = 0.55 + 0.45 * Math.sin(time * m.twinkle + m.phase);
      const alpha = (0.3 + 0.45 * m.z) * lerp(breathe, twinkle, night);

      if (night < 0.99) {
        const s = m.r * 4;
        ctx.globalAlpha = alpha * (1 - night);
        ctx.drawImage(dustSprite, m.x - s / 2, m.y - s / 2, s, s);
      }
      if (night > 0.01) {
        const s = m.r * 3.5;
        ctx.globalAlpha = Math.min(1, alpha * 1.4) * night;
        ctx.drawImage(starSprite, m.x - s / 2, m.y - s / 2, s, s);
      }
    }

    if (glow > 0.01) {
      for (const f of fireflies) {
        if (dt) moveFirefly(f, time, dt);
        // Mostly dim, slowly brightening once every 4–7s. Never a flash.
        const pulse = prefersReducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin((time * TAU) / f.period + f.phase);
        ctx.globalAlpha = (0.2 + 0.8 * pulse ** 3) * glow;
        ctx.drawImage(fireflySprite, f.x - 16, f.y - 16, 32, 32);
      }
    }

    ctx.globalAlpha = 1;
  }

  // Animation loop: runs only while the tab is visible and motion is allowed.
  let frame = 0;
  let last = 0;
  const loop = (now) => {
    const time = now / 1000;
    const dt = last ? Math.min(0.05, time - last) : 0;
    last = time;
    draw(time, dt);
    frame = requestAnimationFrame(loop);
  };
  const start = () => {
    if (frame || prefersReducedMotion || document.hidden) return;
    last = 0;
    frame = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  // With reduced motion there's no loop: one still frame whenever something changes.
  let pending = 0;
  const redrawStill = () => {
    if (!prefersReducedMotion || pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      draw(0, 0);
    });
  };

  resize();

  timeline.subscribe(({ index, t }) => {
    const a = stops[index];
    const b = stops[Math.min(index + 1, stops.length - 1)];
    const e = smoothstep(t);
    night = lerp(NIGHT[a] ?? 0, NIGHT[b] ?? 0, e);
    glow = lerp(FIREFLIES[a] ?? 0, FIREFLIES[b] ?? 0, e);

    // day-colors subscribes first, so dayColors is already up to date here.
    const next = dayColors.particle?.join(',');
    if (next && next !== colour) {
      colour = next;
      paintSprite(dustSprite, dayColors.particle, DUST);
      paintSprite(starSprite, dayColors.particle, STAR);
    }
    redrawStill();
  });

  let resizeFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resize();
      redrawStill();
    });
  };
  window.addEventListener('resize', onResize);

  // Moving to a screen with a different pixel density doesn't always fire resize.
  const watchDpr = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
      onResize();
      watchDpr();
    }, { once: true });
  };
  watchDpr();

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  if (finePointer.matches && !prefersReducedMotion) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') pointer = { x: e.clientX, y: e.clientY };
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      if (!e.relatedTarget) pointer = null; // left the window
    });
    window.addEventListener('blur', () => { pointer = null; });
  }

  start();
  redrawStill();
}
