import { prefersReducedMotion } from '../scripts/smooth-scroll.js';

// 4:50 pm: anxious thoughts crowd a box one by one. Tapping one softly pops it
// into a calmer reframe; "Breathe with me" guides one slow breath and clears
// them all. Without JS the markup is a plain list of worries and reframes.

// Where each thought sits in the box (centre, as % of width / height). Close
// enough that neighbours overlap and it feels crowded, spread enough that
// every thought keeps a visible, tappable part.
const SPOTS = [
  [34, 11], [64, 17], [44, 28], [29, 40], [67, 36], [51, 47],
  [35, 58], [68, 57], [46, 69], [32, 82], [62, 87],
];
// On a phone each thought is most of the box wide, so side-by-side pairs would
// collide head-on. Instead: one thought per band, alternating left and right,
// each overlapping its neighbours a little.
const NARROW_BOX = 480; // px
const NARROW_SPOTS = SPOTS.map((_, i) => [i % 2 ? 66 : 34, 8 + i * 8.4]);

// Appearance order: alternate sides and heights so the box fills evenly.
const ORDER = [0, 5, 9, 2, 7, 4, 10, 1, 6, 3, 8];

const APPEAR_MIN = 900; // ms between thoughts appearing
const APPEAR_MAX = 1500;
const INHALE = 4000;
const EXHALE = 6000;
const FADE = 1400; // matches the "gone" transition in thoughts.css

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (min, value, max) => Math.min(Math.max(value, min), Math.max(min, max));
// Stable pseudo-random per thought, so tilts and drifts don't change on reload.
const jitter = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function initThoughts(root) {
  if (!root) return;

  const list = root.querySelector('.thoughts__box');
  const message = root.querySelector('.thoughts__message');
  const status = root.querySelector('[data-thoughts-status]');
  const hint = root.querySelector('.thoughts__hint');
  const breathe = root.querySelector('.breathe');
  const breatheLabel = breathe.querySelector('.breathe__label');

  // --- Turn each list item into a tappable thought. ---------------------------
  const thoughts = [...list.children].map((li, i) => {
    const worry = li.querySelector('.thought__worry');
    const calm = li.querySelector('.thought__calm');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thought__btn';
    button.append(worry, calm);
    li.replaceChildren(button);
    calm.setAttribute('aria-hidden', 'true');

    li.style.setProperty('--tilt', `${(jitter(i, 1) * 8 - 4).toFixed(1)}deg`);
    li.style.setProperty('--drift-x', `${(jitter(i, 2) * 10 - 5).toFixed(1)}px`);
    li.style.setProperty('--drift-y', `${(jitter(i, 3) * -8 - 3).toFixed(1)}px`);
    li.style.setProperty('--drift-delay', `${(-jitter(i, 4) * 7).toFixed(2)}s`);

    const thought = { li, button, worry, calm, index: i, state: 'waiting' };
    li.dataset.state = 'waiting';
    button.addEventListener('click', () => soften(thought));
    return thought;
  });

  const order = ORDER.filter((i) => i < thoughts.length).map((i) => thoughts[i]);
  const setState = (thought, state) => {
    thought.state = state;
    thought.li.dataset.state = state;
  };

  root.classList.add('is-live');
  hint.hidden = false;
  breathe.hidden = false;

  // Clear, then set after a beat, so screen readers announce repeated text too.
  // (A timer, not requestAnimationFrame, so it still fires in throttled tabs.)
  let announceTimer = 0;
  const announce = (text) => {
    clearTimeout(announceTimer);
    status.textContent = '';
    announceTimer = setTimeout(() => { status.textContent = text; }, 60);
  };

  const showMessage = (text) => {
    message.textContent = text;
    message.hidden = false;
    void message.offsetWidth; // apply the hidden-state styles first so the fade runs
    message.classList.add('is-shown');
  };
  const hideMessage = () => {
    message.classList.remove('is-shown');
    message.hidden = true;
  };

  // --- Layout: keep every thought fully inside the box. -----------------------
  function place() {
    const W = list.clientWidth;
    const H = list.clientHeight;
    const pad = 6;
    const spots = W < NARROW_BOX ? NARROW_SPOTS : SPOTS;
    for (const t of thoughts) {
      const w = t.li.offsetWidth;
      const h = t.li.offsetHeight;
      const [x, y] = spots[t.index % spots.length];
      t.li.style.left = `${clamp(pad, (x / 100) * W - w / 2, W - w - pad)}px`;
      t.li.style.top = `${clamp(pad, (y / 100) * H - h / 2, H - h - pad)}px`;
    }
  }
  new ResizeObserver(place).observe(list);
  document.fonts?.ready.then(place);

  // --- Thoughts appear one by one, but only while the box is on screen. -------
  let mode = 'crowding'; // 'crowding' | 'breathing' | 'cleared'
  let inView = false;
  let timer = 0;

  const nextWaiting = () => order.find((t) => t.state === 'waiting');

  function scheduleNext(delay) {
    clearTimeout(timer);
    if (!inView || mode !== 'crowding' || !nextWaiting()) return;
    timer = setTimeout(() => {
      const t = nextWaiting();
      if (t) setState(t, 'anxious');
      scheduleNext(APPEAR_MIN + Math.random() * (APPEAR_MAX - APPEAR_MIN));
    }, delay);
  }

  function showAllWaiting() {
    thoughts.forEach((t) => t.state === 'waiting' && setState(t, 'anxious'));
  }

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) clearTimeout(timer);
    else if (prefersReducedMotion) mode === 'crowding' && showAllWaiting();
    else scheduleNext(600);
  }, { threshold: 0.35 }).observe(list);

  // --- Tap a thought: it pops softly into its reframe. ------------------------
  function soften(t) {
    if (t.state !== 'anxious' || mode === 'breathing') return;
    setState(t, 'calm');
    t.worry.setAttribute('aria-hidden', 'true');
    t.calm.removeAttribute('aria-hidden');
    t.button.setAttribute('aria-disabled', 'true');
    if (!prefersReducedMotion) {
      t.li.classList.add('is-popping');
      setTimeout(() => t.li.classList.remove('is-popping'), 1000);
    }
    announce(t.calm.textContent);
  }

  // --- "Breathe with me": one slow breath clears everything. ------------------
  async function breatheOut() {
    mode = 'breathing';
    clearTimeout(timer);
    breathe.setAttribute('aria-disabled', 'true');
    thoughts.forEach((t) => t.state === 'waiting' && setState(t, 'gone'));
    const visible = thoughts.filter((t) => t.state !== 'gone');

    if (prefersReducedMotion) {
      visible.forEach((t) => setState(t, 'gone'));
    } else {
      breathe.classList.add('is-guiding');
      showMessage('breathe in…');
      announce('Breathe in…');
      await wait(INHALE);

      showMessage('and out…');
      announce('and out.');
      // Let them go one at a time across the out-breath.
      const step = visible.length > 1 ? (EXHALE - FADE) / (visible.length - 1) : 0;
      [...visible].reverse().forEach((t, i) => {
        t.li.style.setProperty('--fade-delay', `${Math.round(i * step)}ms`);
        setState(t, 'gone');
      });
      await wait(EXHALE);
      breathe.classList.remove('is-guiding');
    }

    showMessage('one breath at a time.');
    announce('One breath at a time.');
    breatheLabel.textContent = 'Start over';
    breathe.removeAttribute('aria-disabled');
    mode = 'cleared';
  }

  function startOver() {
    hideMessage();
    for (const t of thoughts) {
      t.li.style.removeProperty('--fade-delay');
      t.worry.removeAttribute('aria-hidden');
      t.calm.setAttribute('aria-hidden', 'true');
      t.button.removeAttribute('aria-disabled');
      setState(t, 'waiting');
    }
    breatheLabel.textContent = 'Breathe with me';
    mode = 'crowding';
    if (prefersReducedMotion) inView && showAllWaiting();
    else scheduleNext(500);
  }

  breathe.addEventListener('click', () => {
    if (mode === 'breathing') return;
    if (mode === 'cleared') startOver();
    else breatheOut();
  });

  // Printing shouldn't capture an empty box.
  window.addEventListener('beforeprint', () => mode === 'crowding' && showAllWaiting());
}
