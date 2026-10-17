import { prefersReducedMotion } from '../scripts/motion.js';
import { setAmbient, setAmbientAudible } from '../scripts/ambient-sound.js';
import { tookCare } from '../scripts/care.js';

// "Take a minute": a soft blob that grows as you breathe in and settles as you
// breathe out, a ring that fills over each round, gentle word cues, and a kind
// note after three rounds. No numbers, no countdowns, and the clock only moves
// while the section is on screen.

const PATTERNS = {
  box: [
    { cue: 'breathe in', seconds: 4, shape: 'in' },
    { cue: 'hold', seconds: 4, shape: 'full' },
    { cue: 'breathe out', seconds: 4, shape: 'out' },
    { cue: 'hold', seconds: 4, shape: 'empty' },
  ],
  478: [
    { cue: 'breathe in', seconds: 4, shape: 'in' },
    { cue: 'hold', seconds: 7, shape: 'full' },
    { cue: 'breathe out', seconds: 8, shape: 'out' },
  ],
};
const ROUNDS = 3;

// Blob geometry in SVG units (viewBox 300 × 300, ring radius 140).
const CENTRE = 150;
const MAX_RADIUS = 118;
const REST = 0.6; // blob size with empty lungs, as a share of MAX_RADIUS
const TAU = Math.PI * 2;

const IDLE_CUE = 'ready when you are';
const AFTER_CUE = 'breathe however feels natural';

const easeInOut = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);

// How full the lungs are (0–1) at progress p through a phase.
const fullness = (shape, p) => ({ in: easeInOut(p), full: 1, out: 1 - easeInOut(p), empty: 0 }[shape]);

// A closed, softly wobbling shape: points on a circle nudged by slow sine
// waves, joined with a smooth Catmull-Rom curve.
function blobPath(radius, time, seed) {
  const n = 9;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const wobble = prefersReducedMotion
      ? 0
      : 0.045 * Math.sin(a * 3 + time * 0.55 + seed)
        + 0.03 * Math.sin(a * 5 - time * 0.35 + seed * 2)
        + 0.02 * Math.sin(a * 2 + time * 0.8 + seed * 3);
    const r = radius * (1 + wobble);
    pts.push([CENTRE + Math.cos(a) * r, CENTRE + Math.sin(a) * r]);
  }
  const at = (i) => pts[(i + n) % n];
  let d = `M ${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

export function initBreathing(root) {
  if (!root) return;

  const app = root.querySelector('.breath__app');
  const blob = root.querySelector('.breath__blob');
  const halo = root.querySelector('.breath__halo');
  const ring = root.querySelector('.breath__progress');
  const marks = root.querySelector('.breath__marks');
  const cue = root.querySelector('.breath__cue');
  const dots = [...root.querySelectorAll('.breath__dot')];
  const roundsLabel = root.querySelector('.breath__rounds-label');
  const go = root.querySelector('.breath__go');
  const rhythm = root.querySelector('.breath__rhythm');
  const done = root.querySelector('.breath__done');

  root.querySelector('.breath__fallback').hidden = true;
  app.hidden = false;

  let pattern = PATTERNS.box;
  let state = 'idle'; // 'idle' | 'running' | 'done'
  let elapsed = 0; // seconds into the exercise (only advances while on screen)
  let level = 0; // lungs, as drawn (eases toward the target when not running)
  let phaseIndex = -1;
  let currentRound = -1;
  let inView = false;

  const roundLength = () => pattern.reduce((sum, p) => sum + p.seconds, 0);

  // Small dots on the ring where each phase begins.
  function drawMarks() {
    marks.replaceChildren();
    let t = 0;
    for (const phase of pattern) {
      const a = (t / roundLength()) * TAU - Math.PI / 2;
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', (CENTRE + Math.cos(a) * 140).toFixed(1));
      dot.setAttribute('cy', (CENTRE + Math.sin(a) * 140).toFixed(1));
      dot.setAttribute('r', '3');
      marks.append(dot);
      t += phase.seconds;
    }
  }

  function setCue(text) {
    if (cue.textContent === text) return;
    cue.textContent = text;
    cue.classList.remove('is-new');
    void cue.offsetWidth; // restart the soft fade-in
    cue.classList.add('is-new');
  }

  function setRounds(completed, current) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-done', i < completed);
      dot.classList.toggle('is-current', i === current);
    });
    roundsLabel.textContent = state === 'running' ? `Round ${current + 1} of ${ROUNDS}` : '';
  }

  function setRing(progress) {
    ring.style.strokeDashoffset = String(Math.round(1000 * (1 - progress)));
  }

  function render(time) {
    const radius = MAX_RADIUS * (REST + (1 - REST) * (prefersReducedMotion ? 0.5 : level));
    blob.setAttribute('d', blobPath(radius, time, 0));
    halo.setAttribute('d', blobPath(radius * 1.13, time * 0.8, 2.4));
  }

  // --- The exercise --------------------------------------------------------

  function tick(dt) {
    elapsed += dt;
    const length = roundLength();
    const round = Math.floor(elapsed / length);
    if (round >= ROUNDS) {
      finish();
      return;
    }
    const within = elapsed - round * length;
    let start = 0;
    let i = 0;
    while (i < pattern.length - 1 && within >= start + pattern[i].seconds) {
      start += pattern[i].seconds;
      i++;
    }
    const phase = pattern[i];
    level = fullness(phase.shape, (within - start) / phase.seconds);
    setRing(within / length);
    if (i !== phaseIndex || round !== currentRound) {
      phaseIndex = i;
      currentRound = round;
      setCue(phase.cue);
      setRounds(round, round);
    }
  }

  function begin() {
    state = 'running';
    elapsed = 0;
    phaseIndex = -1;
    currentRound = -1;
    done.hidden = true;
    rhythm.disabled = true;
    ring.classList.add('is-live');
    go.textContent = 'Stop';
    wake();
  }

  function stop() {
    state = 'idle';
    done.hidden = true;
    rhythm.disabled = false;
    ring.classList.remove('is-live');
    setRing(0);
    setRounds(0, -1);
    setCue(IDLE_CUE);
    go.textContent = 'Begin';
  }

  function finish() {
    state = 'done';
    rhythm.disabled = false;
    ring.classList.remove('is-live');
    setRing(1);
    setRounds(ROUNDS, -1);
    setCue(AFTER_CUE);
    done.hidden = false;
    go.textContent = 'Breathe again';
    tookCare('breathing');
  }

  go.addEventListener('click', () => (state === 'running' ? stop() : begin()));

  rhythm.addEventListener('change', (e) => {
    pattern = PATTERNS[e.target.value] ?? PATTERNS.box;
    drawMarks();
    if (state === 'done') stop();
  });

  root.querySelector('.breath__sound').addEventListener('change', (e) => setAmbient(e.target.value));

  // --- Animation loop: only while on screen and the tab is visible. ----------

  let frame = 0;
  let last = 0;
  function loop(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; // pauses, never jumps ahead
    last = now;
    // With reduced motion the blob stays still, so there is nothing to draw
    // between breaths: draw once and let the loop sleep.
    if (prefersReducedMotion && state !== 'running') {
      render(0);
      sleep();
      return;
    }
    if (state === 'running') tick(dt);
    else level += (0 - level) * Math.min(1, dt * 1.5); // settle back to rest
    render(now / 1000);
    frame = requestAnimationFrame(loop);
  }
  function wake() {
    if (frame || !inView || document.hidden) return;
    last = 0;
    frame = requestAnimationFrame(loop);
  }
  function sleep() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    setAmbientAudible(inView && !document.hidden);
    if (inView) wake();
    else sleep();
  }, { threshold: 0.25 }).observe(root.querySelector('.breath__stage'));

  document.addEventListener('visibilitychange', () => {
    setAmbientAudible(inView && !document.hidden);
    if (document.hidden) sleep();
    else wake();
  });

  drawMarks();
  setRing(0);
  setRounds(0, -1);
  render(0);
}
