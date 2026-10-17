// Small, quiet details for each chapter, drawn by hand in SVG: one or two per
// scene, in the chapter's empty top margin (never over text). They fade in as
// the chapter reaches the middle of the screen and out as it leaves; their slow
// loops (8s or longer, transform and opacity only) pause while they're away.
// Decoration only: aria-hidden, no pointer events, nothing without JS.
// The opening (6:40 am) has its own scene in index.html.

const svg = (viewBox, body) => `<svg viewBox="${viewBox}" focusable="false">${body}</svg>`;

const phone = (extra = '') => svg('0 0 30 50', `
  <rect class="scene__glow-fill" x="5.5" y="7" width="19" height="34" rx="2" />
  <path class="scene__ink" d="M7 3H23C25.5 3 27 4.5 27 7V43C27 45.5 25.5 47 23 47H7C4.5 47 3 45.5 3 43V7C3 4.5 4.5 3 7 3Z" />
  <path class="scene__ink scene__ink--thin" d="M12 43.5H18" />${extra}`);

const DETAILS = {
  // 8:15 am: birds far off over the road, and the chai he gulped before the bus.
  morning: [
    ['birds', svg('0 0 90 40', `
      <path class="scene__ink scene__bird" d="M6 22C10 16 14 16 17 21C20 16 24 16 28 22" />
      <path class="scene__ink scene__bird" d="M36 12C39 8 42 8 44 11C46 8 49 8 52 12" />
      <path class="scene__ink scene__bird" d="M62 27C65 23 68 23 70 26C72 23 75 23 78 27" />`)],
    ['chai', svg('0 0 40 56', `
      <path class="scene__steam" d="M17 18C14 13 20 10 17 4" />
      <path class="scene__steam" d="M23 17C20 12 26 9 23 3" />
      <path class="scene__fill" d="M11.6 30L13.6 49C15 50.5 25 50.5 26.4 49L28.4 30Z" />
      <path class="scene__ink" d="M10 22L13 50C13.5 52 26.5 52 27 50L30 22M9 22C16 20 24 20 31 22" />
      <path class="scene__ink scene__ink--thin" d="M16.5 25L17.5 48M20 25V48.5M23.5 25L22.5 48" />`)],
  ],
  // 1:30 pm: the canteen fan's slow shadow on the ceiling.
  midday: [
    ['fan', svg('-40 -40 80 80', `
      <g class="scene__blades">
        <path class="scene__shadow" d="M2 -4C10 -11 30 -11 35 -4C30 2 10 2 2 -4Z" />
        <path class="scene__shadow" d="M2 -4C10 -11 30 -11 35 -4C30 2 10 2 2 -4Z" transform="rotate(120)" />
        <path class="scene__shadow" d="M2 -4C10 -11 30 -11 35 -4C30 2 10 2 2 -4Z" transform="rotate(240)" />
        <circle class="scene__shadow" r="6" />
      </g>`)],
  ],
  // 4:50 pm: heavier clouds gathering while the thoughts get loud (the light
  // dims a little too: see DIM in day-colors.js).
  afternoon: [
    ['clouds', svg('0 0 150 64', `
      <path class="scene__cloud" d="M22 46C10 46 8 33 19 31C19 20 34 16 40 25C44 12 65 10 69 25C78 19 93 23 91 34C102 34 104 46 93 46Z" />
      <path class="scene__cloud scene__cloud--back" d="M98 30C90 30 89 22 96 21C96 14 106 11 110 17C113 9 127 9 129 18C135 14 145 18 143 25C150 25 150 30 143 30Z" />`)],
  ],
  // 7:10 pm: the streetlight outside flickers on, and Kabir's message lights up the phone.
  sunset: [
    ['lamp', `<span class="scene__lamp-glow"></span>${svg('0 0 60 90', `
      <path class="scene__ink" d="M14 88V24C14 13 21 9 31 10" />
      <path class="scene__ink" d="M27 8C31 5.5 40 5.5 45 9.5L41 14H31Z" />
      <path class="scene__ink scene__ink--thin" d="M8 88H21" />`)}`],
    ['phone', phone('<path class="scene__ink scene__ink--thin" d="M9 14H21M9 18H17" />')],
  ],
  // 9:30 pm: the two glasses of haldi doodh, still warm.
  dusk: [
    ['doodh', svg('0 0 70 56', `
      <path class="scene__steam" d="M16 14C13 9 19 6 16 1" />
      <path class="scene__steam" d="M47 15C44 10 50 7 47 2" />
      <path class="scene__milk" d="M9.7 26L11.6 49C13 50.5 23 50.5 24.4 49L26.3 26Z" />
      <path class="scene__milk" d="M40.7 27L42.6 49C44 50.5 54 50.5 55.4 49L57.3 27Z" />
      <path class="scene__ink" d="M8 19L11 50C11.5 52 24.5 52 25 50L28 19M39 20L42 50C42.5 52 55.5 52 56 50L59 20" />`)],
  ],
  // 11:45 pm: the phone charging in the kitchen, and one window still lit across the lane.
  night: [
    ['window', svg('0 0 50 64', `
      <path class="scene__ink scene__ink--thin" d="M4 63V18L25 6L46 18V63" />
      <rect class="scene__lit" x="12" y="26" width="10" height="12" rx="1" />
      <rect class="scene__ink scene__ink--thin" x="28" y="26" width="10" height="12" rx="1" />
      <rect class="scene__ink scene__ink--thin" x="12" y="45" width="10" height="12" rx="1" />`)],
    ['charging', phone('<circle class="scene__charge" cx="15" cy="25" r="2.4" /><path class="scene__ink scene__ink--thin" d="M15 47C15 55 24 59 40 57" />')],
  ],
};

export function initScenes(timeline) {
  const sections = timeline.sections.filter((s) => DETAILS[s.dataset.stop]);
  if (sections.length === 0) return;

  for (const section of sections) {
    const scene = document.createElement('div');
    scene.className = 'scene';
    scene.setAttribute('aria-hidden', 'true');
    scene.innerHTML = DETAILS[section.dataset.stop]
      .map(([name, art]) => `<div class="scene__detail scene__detail--${name}">${art}</div>`)
      .join('');
    section.prepend(scene);
  }

  // Present while the chapter overlaps the middle of the screen.
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('is-present', entry.isIntersecting);
  }, { rootMargin: '-35% 0px -35% 0px' });
  sections.forEach((section) => io.observe(section));
}
