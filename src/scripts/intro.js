import { prefersReducedMotion } from './motion.js';
import { scrollToY } from './smooth-scroll.js';

// The intro (#about), above the 6:40 am opening: what this is, who it's for and
// what's inside. Whether it shows is decided by a small script in index.html's
// <head>, before the first paint (first visit in this browser session, or a
// link to #about; never for a link to anywhere else). This adds the behaviour:
//
// - "Begin the day": the words fade, the pre-dawn sky clears into dawn
//   (intro.css), then the intro is tucked away, the opening fades in at the
//   top and focus moves to its heading. With reduced motion it just switches.
// - "Skip to the exercises": tucks the intro away at once, then the usual
//   in-page link (in-page-links.js) takes the reader to Take a minute.
// - "About this site" (footer): brings it back, and in-page-links scrolls up
//   to it and focuses its heading.
// - html.at-intro while it fills the top half of the screen: the day line and
//   garden step aside (intro.css) and the opening clock waits (opening.js).
//
// No history entries are added, so the Back button works as it always does.

const LEAVE_MS = 1450; // the sky takes about this long to clear (intro.css)
const ARRIVE_MS = 1300;

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export function initIntro(section) {
  if (!section) return;
  const root = document.documentElement;
  const opening = document.getElementById('dawn');
  let leaving = false;

  const isShown = () => !root.classList.contains('no-intro');

  new IntersectionObserver(([entry]) => {
    root.classList.toggle('at-intro', entry.isIntersecting && isShown());
  }, { rootMargin: '0px 0px -50% 0px' }).observe(section);

  // A plain address (no #about, or a section they've since left), so a
  // refresh goes straight to the story.
  const plainAddress = () => {
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  };

  const hide = () => {
    root.classList.add('no-intro');
    root.classList.remove('at-intro');
    section.classList.remove('is-leaving');
  };

  const show = () => {
    leaving = false;
    section.classList.remove('is-leaving');
    root.classList.remove('no-intro');
  };

  async function begin() {
    if (leaving) return;
    leaving = true;
    const motion = !prefersReducedMotion;

    if (motion) {
      section.classList.add('is-leaving');
      await wait(LEAVE_MS);
      if (!leaving) return; // brought back meanwhile
    }

    hide();
    plainAddress();
    scrollToY(0, { immediate: true });
    if (motion && opening) {
      opening.classList.add('is-arriving');
      setTimeout(() => opening.classList.remove('is-arriving'), ARRIVE_MS);
    }
    const heading = opening?.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    leaving = false;
  }

  // Capture phase, so this runs before in-page-links.js handles the same click.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link) return;

    if (link.classList.contains('intro__begin')) {
      event.preventDefault();
      begin();
    } else if (link.classList.contains('intro__skip')) {
      hide();
      if (location.hash === '#about') plainAddress();
    } else if (link.getAttribute('href') === '#about' && !isShown()) {
      show();
    }
  }, true);
}
