import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './smooth-scroll.js';
import { addInk, INK_LENGTH } from './ink.js';

// Everything here starts from content that is already fully visible in the HTML.
// A hidden "before" state is only applied by JS, only to things not yet seen,
// and every one of them is registered so it can be revealed instantly if needed.

const START = 'top 85%'; // reveal when the top of the element passes 85% down the screen
const EASE = 'power2.out';
const LINE_STAGGER = 0.18;

// --- Bookkeeping: anything hidden must be able to finish instantly. ---------

// Elements that are hidden or mid-animation. They leave the set once finished.
const pending = new Set();

// hide(): apply the "before" state. play(done): animate, call done() at the end.
// finish(): jump straight to the final state, from waiting or mid-animation.
function onFirstSight(el, { hide, play, finish }) {
  const { top, bottom } = el.getBoundingClientRect();
  if (bottom <= 0) return; // already scrolled past: leave it exactly as the HTML has it

  let playing = false;
  const done = () => pending.delete(entry);
  const entry = {
    run(instant) {
      if (instant) {
        done();
        finish();
      } else if (!playing) {
        playing = true;
        play(done);
      }
    },
  };

  try {
    hide();
  } catch (error) {
    finish();
    throw error;
  }
  pending.add(entry);

  if (top < window.innerHeight * 0.85) {
    entry.run(false);
  } else {
    ScrollTrigger.create({
      trigger: el,
      start: START,
      once: true,
      onEnter: () => entry.run(false),
    });
  }
}

const revealAll = () => [...pending].forEach((entry) => entry.run(true));

// --- Headlines: come into focus line by line. -------------------------------

// Wraps each word in a temporary <span class="word">, inside whatever inline
// elements it already sits in (<em>, .mark …). Ink SVGs are left alone.
function splitWords(heading) {
  const texts = [];
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement.closest('svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  while (walker.nextNode()) texts.push(walker.currentNode);

  const words = [];
  for (const node of texts) {
    if (!node.textContent.trim()) continue;
    const fragment = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (!part.trim()) {
        fragment.append(part);
      } else {
        const word = document.createElement('span');
        word.className = 'word';
        word.textContent = part;
        fragment.append(word);
        words.push(word);
      }
    }
    node.replaceWith(fragment);
  }
  return words;
}

// Puts the heading's DOM back exactly as it was.
function unsplit(heading, words) {
  for (const word of words) word.replaceWith(...word.childNodes);
  heading.normalize();
}

// Groups words by the line they sit on right now (fonts are loaded by the time
// anything below the fold is revealed, so this matches what the reader sees).
function linesOf(words, heading) {
  const tolerance = parseFloat(getComputedStyle(heading).fontSize) * 0.4;
  const lines = [];
  let lineTop = null;
  for (const word of words) {
    const top = word.getBoundingClientRect().top;
    if (lineTop === null || Math.abs(top - lineTop) > tolerance) {
      lines.push([]);
      lineTop = top;
    }
    lines.at(-1).push(word);
  }
  return lines;
}

function revealHeadline(heading) {
  let words = [];
  let tl = null;
  onFirstSight(heading, {
    hide() {
      words = splitWords(heading);
      gsap.set(words, { opacity: 0.2, filter: 'blur(7px)' });
    },
    play(done) {
      tl = gsap.timeline({
        onComplete: () => {
          unsplit(heading, words);
          done();
        },
      });
      linesOf(words, heading).forEach((line, i) => {
        tl.to(line, { opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: EASE }, i * LINE_STAGGER);
      });
    },
    finish() {
      tl?.kill();
      unsplit(heading, words);
    },
  });
}

// --- Ink: underlines and circles draw themselves. ---------------------------

function revealInk(el) {
  const path = addInk(el);
  if (prefersReducedMotion) return; // stays drawn

  const duration = el.classList.contains('circle') ? 1.4 : 1.1;
  onFirstSight(el, {
    hide: () => gsap.set(path, { strokeDashoffset: INK_LENGTH }),
    // Starts a beat after its line has come into focus.
    play: (done) => gsap.to(path, { strokeDashoffset: 0, duration, ease: EASE, delay: 0.6, onComplete: done }),
    finish: () => gsap.set(path, { strokeDashoffset: 0, overwrite: true }),
  });
}

// --- Margin notes: fade in, settling from a slightly bigger tilt. -----------

function revealNote(note) {
  onFirstSight(note, {
    hide: () => gsap.set(note, { opacity: 0, rotation: -5, y: 8 }),
    play: (done) => gsap.to(note, {
      opacity: 1, rotation: 0, y: 0, duration: 1.3, ease: 'power3.out', delay: 0.4, clearProps: 'opacity,transform', onComplete: done,
    }),
    finish: () => gsap.set(note, { clearProps: 'opacity,transform', overwrite: true }),
  });
}

// --- Paragraphs: ease in softly as they arrive, a beat after the heading. ---

function revealText(el) {
  onFirstSight(el, {
    hide: () => gsap.set(el, { opacity: 0.25, y: 12 }),
    play: (done) => gsap.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: EASE, delay: 0.2, clearProps: 'opacity,transform', onComplete: done,
    }),
    finish: () => gsap.set(el, { clearProps: 'opacity,transform', overwrite: true }),
  });
}

// ---------------------------------------------------------------------------

export function initTextReveal(root = document.querySelector('main')) {
  if (!root) return;

  // Sections marked data-no-reveal (the opening screen) stay exactly as
  // authored: readable the moment the page loads.
  const find = (selector) => [...root.querySelectorAll(selector)].filter((el) => !el.closest('[data-no-reveal]'));

  try {
    find('.mark, .circle').forEach(revealInk);
    if (prefersReducedMotion) return;
    find('h1, h2').forEach(revealHeadline);
    find('.chapter__inner > p, .fact > p').forEach(revealText);
    find('.note').forEach(revealNote);
  } catch (error) {
    revealAll();
    console.error(error);
  }

  // Printing shouldn't capture anything mid-animation or still waiting.
  window.addEventListener('beforeprint', revealAll);
}
