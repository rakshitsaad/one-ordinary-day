import { prefersReducedMotion } from '../scripts/smooth-scroll.js';
import { tookCare } from '../scripts/care.js';

// 5-4-3-2-1 grounding as a notebook. Pages turn around the left edge like a
// bound notebook: forward lifts the current page away to reveal the next,
// back lays the previous page down again.
//
// Privacy: nothing typed is stored or sent. There's no form, no storage, no
// network call; autocomplete and spellcheck are off (some browsers send
// spellcheck text to a server), and every box is cleared when the page is
// left or the exercise restarts.

const TURN_MS = 1000;
const EASE = 'cubic-bezier(0.32, 0.72, 0.24, 1)';
const LIFTED = 'rotateY(-94deg)'; // just past edge-on, so the page vanishes

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function initGrounding(root) {
  if (!root) return;

  const pages = [...root.querySelectorAll('.page')];
  const inputs = [...root.querySelectorAll('input')];
  let current = 0;
  let turning = false;
  let finished = false; // reached the last page in this run (counts once)

  root.classList.add('is-live');
  root.querySelectorAll('.page__nav').forEach((nav) => { nav.hidden = false; });
  // Measure doodle strokes in thousandths so they can draw themselves in.
  root.querySelectorAll('.page__doodle path').forEach((path) => path.setAttribute('pathLength', '1000'));
  pages.forEach((page, i) => {
    page.querySelector('h3')?.setAttribute('tabindex', '-1');
    setCurrent(page, i === 0);
  });

  function setCurrent(page, isCurrent) {
    page.classList.toggle('is-current', isCurrent);
    page.inert = !isCurrent; // off-screen pages can't be tabbed to or read out
  }

  // Animate, but never let a stalled animation (e.g. a hidden tab) leave the
  // notebook stuck mid-turn.
  async function play(page, keyframes) {
    const animation = page.animate(keyframes, { duration: TURN_MS, easing: EASE });
    await Promise.race([animation.finished, wait(TURN_MS + 400)]);
    animation.cancel();
  }

  async function turnTo(index) {
    if (turning || index === current || index < 0 || index >= pages.length) return;
    turning = true;
    const from = pages[current];
    const to = pages[index];
    const forward = index > current;

    to.classList.add('is-revealed');
    if (!prefersReducedMotion) {
      if (forward) {
        // Lift the current page away; the next one is already underneath.
        from.classList.add('is-on-top');
        await play(from, [
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
          { transform: LIFTED, filter: 'brightness(0.82)' },
        ]);
      } else {
        // Lay the earlier page back down over this one.
        to.classList.add('is-on-top');
        await play(to, [
          { transform: LIFTED, filter: 'brightness(0.82)' },
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
        ]);
      }
    }

    setCurrent(from, false);
    setCurrent(to, true);
    from.classList.remove('is-on-top', 'is-revealed');
    to.classList.remove('is-on-top', 'is-revealed');
    current = index;
    turning = false;
    to.querySelector('h3')?.focus({ preventScroll: true });

    if (index === pages.length - 1 && !finished) {
      finished = true;
      tookCare('grounding');
    }
  }

  const clearAll = () => inputs.forEach((input) => { input.value = ''; });

  root.addEventListener('click', (event) => {
    const button = event.target.closest('.page__btn');
    if (!button) return;
    if (button.classList.contains('page__btn--next')) turnTo(current + 1);
    else if (button.classList.contains('page__btn--back')) turnTo(current - 1);
    else if (button.classList.contains('page__btn--again')) {
      clearAll();
      finished = false;
      turnTo(1);
    }
  });

  // Enter moves down the lines, then to the page's Next button. It never
  // submits or turns the page by surprise.
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT') return;
    event.preventDefault();
    const page = event.target.closest('.page');
    const own = [...page.querySelectorAll('input')];
    const next = own[own.indexOf(event.target) + 1] ?? page.querySelector('.page__btn--next');
    next?.focus();
  });

  // Leaving the page (or it going into the back/forward cache) wipes everything.
  window.addEventListener('pagehide', clearAll);
}
