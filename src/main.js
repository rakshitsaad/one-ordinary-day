import './styles/main.css';
import { initSmoothScroll } from './scripts/smooth-scroll.js';
import { createDayTimeline } from './scripts/day-timeline.js';
import { initDayColors } from './scripts/day-colors.js';
import { initParticles } from './scripts/particles.js';
import { initSkyDial } from './scripts/sky-dial.js';
import { initInPageLinks } from './scripts/in-page-links.js';
import { initTextReveal } from './scripts/text-reveal.js';
import { initThoughts } from './sections/thoughts.js';
import { initGarden } from './scripts/garden.js';
import { whenNear } from './scripts/lazy.js';
import { initRipples } from './scripts/interactions.js';
import { initPageTransitions } from './scripts/page-transition.js';

initSmoothScroll();

const timeline = createDayTimeline([...document.querySelectorAll('section[data-stop]')]);
initDayColors(timeline); // must subscribe before anything that reads dayColors
initParticles(timeline);
initSkyDial(timeline, document.querySelector('.site-header'));
initInPageLinks(timeline);
initTextReveal();
// Part of the 4:50 pm chapter, so it loads now: its height changes when it
// comes alive, and that must happen before the colour timeline is measured.
initThoughts(document.querySelector('[data-thoughts]'));
// Before the exercises below, so every "took care" signal has a listener.
initGarden(timeline, document.querySelector('.site-header'));

// The three exercises after the story load when the reader gets near them.
const breath = document.querySelector('[data-breath]');
whenNear(breath, () => import('./sections/breathing.js').then((m) => m.initBreathing(breath)));
const notebook = document.querySelector('[data-notebook]');
whenNear(notebook, () => import('./sections/grounding.js').then((m) => m.initGrounding(notebook)));
const myths = document.querySelector('[data-myths]');
whenNear(myths, () => import('./sections/myths.js').then((m) => m.initMyths(myths)));
initRipples();
initPageTransitions(); // after in-page links, so #links are already handled
