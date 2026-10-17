import { clamp01, smoothstep } from './color.js';

// Story time, shared by the colour engine, the sky and the day line.

const parseTime = (datetime) => {
  const [h, m] = datetime.split(':').map(Number);
  return h + m / 60;
};

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Each chapter's id, stop, time (hours) and its short name for the day line.
// Read once at start-up: the opening clock later changes the 6:40 marker's
// text, which must not move the chapter itself.
export function readChapters(sections) {
  return sections.map((section) => {
    const time = section.querySelector('time[datetime]');
    if (!section.id || !time) {
      throw new Error(`Chapter "${section.dataset.stop}" needs an id and a <time datetime>`);
    }
    return {
      id: section.id,
      stop: section.dataset.stop,
      name: section.dataset.name || capitalise(section.dataset.stop),
      datetime: time.dateTime,
      hours: parseTime(time.dateTime),
      label: time.textContent.trim(),
    };
  });
}

// Timeline position ({ index, t }) → story time in hours.
export const hoursAt = (chapters, { index, t }) => {
  const from = chapters[index];
  const to = chapters[Math.min(index + 1, chapters.length - 1)];
  return from.hours + (to.hours - from.hours) * t;
};

// 13.5 → "1:30 pm".
export const formatTime = (hours) => {
  const total = Math.round(hours * 60);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h24 % 12 || 12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'pm' : 'am'}`;
};

// ---- The sun and the moon -------------------------------------------------------
// Positions are fractions of the viewport (0–1, from the top left); `shown` is
// how visible each one is (0–1). The colour engine uses `shown` to decide which
// sky tones text has to stay readable against.

// The sun comes up after the opening (whose window already has a low sun in it),
// so there are never two suns on the first screen.
const SUN_RISE = 7; // fades in from 7:00, low on the left by 8:15
const SUN_SET = 19.6; // touching the horizon on the right at 7:10, gone by 7:36
const MOON_RISE = 20.75; // after dusk; fully out by about 9:40, high by 11:45
const MOON_HIGH = 24;

export function sunAt(hours) {
  const p = clamp01((hours - SUN_RISE) / (SUN_SET - SUN_RISE));
  return {
    x: 0.14 + 0.72 * p,
    y: 0.94 - 0.72 * Math.sin(Math.PI * p),
    shown: smoothstep((hours - SUN_RISE) / 0.35) * (1 - smoothstep((hours - (SUN_SET - 0.45)) / 0.45)),
  };
}

export function moonAt(hours) {
  const q = clamp01((hours - MOON_RISE) / (MOON_HIGH - MOON_RISE));
  return {
    x: 0.84 - 0.14 * q,
    y: 0.8 - 0.56 * q,
    shown: smoothstep((hours - MOON_RISE) / 0.9),
  };
}
