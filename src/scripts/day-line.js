import { smoothstep } from './color.js';
import { readChapters, hoursAt, formatTime } from './day-time.js';
import { openingClock } from './opening.js';

// The day line: the one clock on screen. It grew out of the old sky dial.
// A clock and a slim line of the seven chapter times: a thin bar across the
// top on phones, a short rail on the right on wider screens. A small sun
// travels along it and slowly turns into a crescent moon after 8 pm; dots
// behind it stay softly filled, the current one fills in.
//
// It's a <nav> with an ordered list of links, so screen readers get "6:40 am ·
// the alarm" and so on, with aria-current="time" on the current chapter.
// The links are one tab stop (roving tabindex): arrow keys, Home and End move
// between them. Hover or focus shows the label; a click goes to the chapter
// (in-page-links.js scrolls there and moves focus to its heading).

// After 8 pm the sun slowly becomes a crescent moon, fully formed by 11 pm.
const MOON_START = 20;
const MOON_FULL = 23;
// The shadow circle that bites the sun into a crescent: off to the side, then over it.
const BITE_FROM = [11, -4];
const BITE_TO = [1.9, -1.3];

const lerp = (a, b, t) => a + (b - a) * t;
const roundTo5 = (hours) => (Math.round((hours * 60) / 5) * 5) / 60;

const markup = (chapters) => `
  <p class="day-line__clock">${chapters[0].label}</p>
  <div class="day-line__rail">
    <span class="day-line__track" aria-hidden="true"></span>
    <span class="day-line__travelled" aria-hidden="true"></span>
    <ol class="day-line__list">
      ${chapters.map((c, i) => `
        <li style="--at: ${(i / Math.max(1, chapters.length - 1)).toFixed(4)}">
          <a class="day-line__dot" href="#${c.id}" tabindex="-1">
            <span class="day-line__label"><time datetime="${c.datetime}">${c.label}</time> · ${c.name}</span>
          </a>
        </li>`).join('')}
    </ol>
    <span class="day-line__now" aria-hidden="true">
      <svg viewBox="-6 -6 12 12" focusable="false">
        <defs>
          <mask id="day-line-crescent">
            <circle r="6" fill="white" />
            <circle class="day-line__bite" r="4.4" cx="${BITE_FROM[0]}" cy="${BITE_FROM[1]}" fill="black" />
          </mask>
        </defs>
        <circle class="day-line__sun" r="4.8" mask="url(#day-line-crescent)" />
      </svg>
    </span>
  </div>
`;

export function initDayLine(timeline, mount) {
  const chapters = readChapters(timeline.sections);
  if (chapters.length === 0) return;
  const last = chapters.length - 1;

  const nav = document.createElement('nav');
  nav.className = 'day-line';
  nav.setAttribute('aria-label', 'Through the day');
  nav.innerHTML = markup(chapters);
  mount.append(nav);

  const clock = nav.querySelector('.day-line__clock');
  const bite = nav.querySelector('.day-line__bite');
  const dots = [...nav.querySelectorAll('.day-line__dot')];

  // Where a time sits on the line (0–1), with the chapters evenly spaced.
  const placeOf = (hours) => {
    let i = 0;
    while (i < last - 1 && hours >= chapters[i + 1].hours) i++;
    const span = chapters[i + 1] ? chapters[i + 1].hours - chapters[i].hours : 1;
    const t = Math.min(1, Math.max(0, (hours - chapters[i].hours) / span));
    return (i + t) / Math.max(1, last);
  };

  let position = { index: 0, t: 0 };
  let current = -1;

  const setCurrent = (next) => {
    if (next === current) return;
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-past', i < next);
      dot.classList.toggle('is-current', i === next);
      if (i === next) dot.setAttribute('aria-current', 'time');
      else dot.removeAttribute('aria-current');
    });
    // The tab stop follows the current chapter, unless someone is moving
    // through the dots with the keyboard right now.
    if (!nav.contains(document.activeElement)) {
      dots.forEach((dot, i) => dot.setAttribute('tabindex', i === next ? '0' : '-1'));
    }
    current = next;
  };

  const update = () => {
    const scrolled = hoursAt(chapters, position);
    const hours = Math.max(scrolled, openingClock.hours);

    // Scroll time is rounded to 5 minutes so the clock doesn't flicker; the
    // opening clock's minutes are shown as they are.
    const time = formatTime(Math.max(roundTo5(scrolled), openingClock.hours));
    if (clock.textContent !== time) clock.textContent = time;

    nav.style.setProperty('--progress', placeOf(hours).toFixed(4));

    const moon = smoothstep((hours - MOON_START) / (MOON_FULL - MOON_START));
    bite.setAttribute('cx', lerp(BITE_FROM[0], BITE_TO[0], moon).toFixed(2));
    bite.setAttribute('cy', lerp(BITE_FROM[1], BITE_TO[1], moon).toFixed(2));

    const { index, t } = position;
    setCurrent(t < 0.5 ? index : Math.min(index + 1, last));
  };

  timeline.subscribe((state) => {
    position = state;
    update();
  });
  openingClock.subscribe(update);

  // One tab stop: arrow keys, Home and End move between the dots.
  nav.addEventListener('keydown', (event) => {
    const i = dots.indexOf(document.activeElement);
    if (i === -1) return;
    let next = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = Math.min(last, i + 1);
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = Math.max(0, i - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    dots.forEach((dot, j) => dot.setAttribute('tabindex', j === next ? '0' : '-1'));
    dots[next].focus();
  });

  // Leaving the line hands the tab stop back to the current chapter.
  nav.addEventListener('focusout', (event) => {
    if (nav.contains(event.relatedTarget)) return;
    dots.forEach((dot, i) => dot.setAttribute('tabindex', i === current ? '0' : '-1'));
  });
}
