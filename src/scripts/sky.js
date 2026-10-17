import { readChapters, hoursAt, sunAt, moonAt } from './day-time.js';
import { openingClock } from './opening.js';

// One sky behind the whole page. The background colour itself is the sky
// (day-colors.js); this adds a glow along the horizon, a sun that rises after
// the opening, crosses the sky and sets just after 7:10 pm, and a faint moon
// from about 9 pm. Stars and fireflies come from particles.js.
//
// Everything follows the reader's own scroll (and the opening clock while they
// linger on the first screen), so there's no animation loop, and it behaves the
// same with reduced motion. Only transform and opacity change.
// Colours (--sky-low, --sky-sun, --sky-moon) come from the colour engine, which
// keeps text readable over every one of them.

export function initSky(timeline) {
  const chapters = readChapters(timeline.sections);
  if (chapters.length === 0) return;

  const sky = document.createElement('div');
  sky.className = 'sky';
  sky.setAttribute('aria-hidden', 'true');
  sky.innerHTML = '<div class="sky__glow"></div><div class="sky__sun"></div><div class="sky__moon"></div>';
  document.body.prepend(sky);

  const sun = sky.querySelector('.sky__sun');
  const moon = sky.querySelector('.sky__moon');
  let position = { index: 0, t: 0 };

  const place = (el, { x, y, shown }) => {
    el.style.transform = `translate3d(${(x * window.innerWidth).toFixed(1)}px, ${(y * window.innerHeight).toFixed(1)}px, 0)`;
    el.style.opacity = shown.toFixed(3);
  };

  const update = () => {
    const hours = Math.max(hoursAt(chapters, position), openingClock.hours);
    place(sun, sunAt(hours));
    place(moon, moonAt(hours));
  };

  timeline.subscribe((state) => {
    position = state;
    update();
  });
  openingClock.subscribe(update);
  window.addEventListener('resize', update);
}
