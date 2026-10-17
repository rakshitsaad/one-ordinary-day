import { prefersReducedMotion } from './motion.js';

// The opening screen (6:40 am).
//
// The clock: while the reader stays on the first screen, Aarav's morning keeps
// going, one minute every 4 seconds, from 6:40 up to 6:59. The day line reads
// `openingClock` and shows whichever is later, this or the scroll time, so the
// clock and the marker never disagree and time only ever moves forward. The sky
// uses it too (the sun stays below the horizon until 7:00, after the opening).
// With reduced motion the clock stays at 6:40.
//
// The cue: "Scroll through his day" fades out once the reader starts scrolling.
// The sunlight fades as they scroll on, and comes back at the top.
//
// The scene's slow loops pause while the opening is off screen.

const FIRST = 6 * 60 + 40; // minutes after midnight
const LAST = 6 * 60 + 59;
const TICK_MS = 4000;
// Progress through the day (timeline index + t). Below AT_TOP the reader is
// still on the opening; past SCROLLED they've started scrolling (~30px).
const AT_TOP = 0.02;
const SCROLLED = 0.04;
// Past this the sunlight fades (it would be darker than the greener 8:15 wall).
// The colours have barely moved by then: smoothstep(0.12) is about 4%.
const LEAVING = 0.12;

let minutes = FIRST;
const listeners = new Set();

export const openingClock = {
  get hours() {
    return minutes / 60;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

const pad = (n) => String(n).padStart(2, '0');
const label = (m) => `${Math.floor(m / 60) % 12 || 12}:${pad(m % 60)} am`;

export function initOpening(timeline, section) {
  if (!section) return;
  const time = section.querySelector('.opening__time');
  let atTop = true;

  timeline.subscribe(({ index, t }) => {
    const progress = index + t;
    atTop = progress < AT_TOP;
    if (progress > SCROLLED) section.classList.add('is-scrolled');
    section.classList.toggle('is-leaving', progress > LEAVING);
  });

  new IntersectionObserver(([entry]) => {
    section.classList.toggle('is-away', !entry.isIntersecting);
  }).observe(section);

  if (prefersReducedMotion || !time) return;

  const timer = setInterval(() => {
    // The morning only moves while someone's watching, and not before the
    // day has begun (the intro above it is on screen: src/scripts/intro.js).
    if (!atTop || document.hidden || document.documentElement.classList.contains('at-intro')) return;
    minutes += 1;
    // Chapter times are read once at start-up (day-time.js), so updating it is safe.
    time.dateTime = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    time.textContent = label(minutes);
    time.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 1200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    listeners.forEach((fn) => fn());
    if (minutes >= LAST) clearInterval(timer);
  }, TICK_MS);
}
