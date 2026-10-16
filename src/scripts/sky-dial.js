import { smoothstep } from './color.js';

// The sun travels this arc (SVG units) from the first chapter's time to the last.
const ARC = { cx: 28, cy: 26, r: 21 };
// After 8 pm the sun slowly becomes a crescent moon, fully formed by 11 pm.
const MOON_START = 20;
const MOON_FULL = 23;
// The shadow circle that bites the sun into a crescent: off to the side, then over it.
const BITE_FROM = [11, -4];
const BITE_TO = [1.9, -1.3];

const parseTime = (datetime) => {
  const [h, m] = datetime.split(':').map(Number);
  return h + m / 60;
};

// 13.5 → "1:30 pm", rounded to 5 minutes so the clock doesn't flicker.
const formatTime = (hours) => {
  const total = Math.round((hours * 60) / 5) * 5;
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h24 % 12 || 12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'pm' : 'am'}`;
};

const lerp = (a, b, t) => a + (b - a) * t;
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function readChapters(sections) {
  return sections.map((section) => {
    const time = section.querySelector('time[datetime]');
    if (!section.id || !time) {
      throw new Error(`Chapter "${section.dataset.stop}" needs an id and a <time datetime>`);
    }
    return {
      id: section.id,
      stop: section.dataset.stop,
      name: capitalise(section.dataset.stop),
      datetime: time.dateTime,
      hours: parseTime(time.dateTime),
      label: time.textContent.trim(),
    };
  });
}

const markup = (chapters) => `
  <button class="dial__button" type="button" aria-expanded="false" aria-controls="dial-menu">
    <svg class="dial__sky" viewBox="0 0 56 32" aria-hidden="true" focusable="false">
      <defs>
        <mask id="dial-crescent">
          <circle r="6" fill="white" />
          <circle class="dial__bite" r="4.4" cx="${BITE_FROM[0]}" cy="${BITE_FROM[1]}" fill="black" />
        </mask>
      </defs>
      <path class="dial__track" d="M7 26 A21 21 0 0 1 49 26" />
      <path class="dial__travelled" d="M7 26 A21 21 0 0 1 49 26" pathLength="1" />
      <g class="dial__body" transform="translate(7 26)">
        <circle class="dial__sun" r="4.8" mask="url(#dial-crescent)" />
      </g>
    </svg>
    <span class="dial__clock">${chapters[0].label}</span><span class="visually-hidden">, jump to a time of day</span>
  </button>
  <nav class="dial__menu" id="dial-menu" aria-labelledby="dial-menu-title">
    <p class="dial__menu-title" id="dial-menu-title">jump to a time of day</p>
    <ul>
      ${chapters.map((c) => `
        <li>
          <a class="dial__item" href="#${c.id}">
            <span class="dial__swatch" style="--swatch-bg: var(--${c.stop}-bg); --swatch-ring: var(--${c.stop}-accent)" aria-hidden="true"></span>
            <span class="dial__name">${c.name}<svg class="dial__mark" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 7 C 25 2, 55 10, 98 4" pathLength="1" /></svg></span>
            <time class="dial__time" datetime="${c.datetime}">${c.label}</time>
          </a>
        </li>`).join('')}
    </ul>
  </nav>
`;

export function initSkyDial(timeline, mount) {
  const chapters = readChapters(timeline.sections);
  if (chapters.length === 0) return;

  const dial = document.createElement('div');
  dial.className = 'dial';
  dial.innerHTML = markup(chapters);
  mount.append(dial);

  const button = dial.querySelector('.dial__button');
  const clock = dial.querySelector('.dial__clock');
  const body = dial.querySelector('.dial__body');
  const travelled = dial.querySelector('.dial__travelled');
  const bite = dial.querySelector('.dial__bite');
  const items = [...dial.querySelectorAll('.dial__item')];

  const first = chapters[0].hours;
  const span = chapters.at(-1).hours - first || 1;
  let current = -1;

  // Follow the scroll.
  timeline.subscribe(({ index, t }) => {
    const from = chapters[index];
    const to = chapters[Math.min(index + 1, chapters.length - 1)];
    const hours = lerp(from.hours, to.hours, t);

    const time = formatTime(hours);
    if (clock.textContent !== time) clock.textContent = time;

    const progress = (hours - first) / span;
    const angle = Math.PI * (1 - progress);
    const x = ARC.cx + ARC.r * Math.cos(angle);
    const y = ARC.cy - ARC.r * Math.sin(angle);
    body.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    travelled.style.strokeDasharray = `${progress.toFixed(4)} 1`;

    const moon = smoothstep((hours - MOON_START) / (MOON_FULL - MOON_START));
    bite.setAttribute('cx', lerp(BITE_FROM[0], BITE_TO[0], moon).toFixed(2));
    bite.setAttribute('cy', lerp(BITE_FROM[1], BITE_TO[1], moon).toFixed(2));

    const nearest = t < 0.5 ? index : Math.min(index + 1, chapters.length - 1);
    if (nearest !== current) {
      items[current]?.removeAttribute('aria-current');
      items[nearest].setAttribute('aria-current', 'time');
      current = nearest;
    }
  });

  // Menu: a disclosure button with a list of links.
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';

  const open = () => {
    button.setAttribute('aria-expanded', 'true');
    dial.classList.add('is-open');
  };

  const close = ({ returnFocus = false } = {}) => {
    if (!isOpen()) return;
    button.setAttribute('aria-expanded', 'false');
    dial.classList.remove('is-open');
    if (returnFocus) button.focus();
  };

  const focusItem = (i) => items[(i + items.length) % items.length].focus();

  button.addEventListener('click', () => (isOpen() ? close() : open()));

  dial.addEventListener('keydown', (event) => {
    const onButton = event.target === button;
    const i = items.indexOf(document.activeElement);
    if (!onButton && i === -1) return;

    let next = null;
    if (event.key === 'ArrowDown') next = onButton ? Math.max(current, 0) : i + 1;
    else if (event.key === 'ArrowUp') next = onButton ? Math.max(current, 0) : i - 1;
    else if (event.key === 'Home' && !onButton) next = 0;
    else if (event.key === 'End' && !onButton) next = items.length - 1;
    if (next === null) return;

    event.preventDefault();
    open();
    focusItem(next);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close({ returnFocus: true });
  });

  // Close when focus or a click lands outside the dial.
  dial.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !dial.contains(event.relatedTarget)) close();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!dial.contains(event.target)) close();
  });

  // Picking a time closes the menu; the in-page link handler does the scrolling
  // and moves focus to that chapter.
  items.forEach((item) => item.addEventListener('click', () => close()));
}
