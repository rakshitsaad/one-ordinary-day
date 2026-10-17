// /story: Aarav's day, from 6:40 am to lights out. The one page that scrolls
// through the day: the colours, sky, particles, scenes and day line all follow
// the reader's scroll (see CLAUDE.md, Concept).
import '../styles/pages/story.css';
import { initSmoothScroll } from '../scripts/smooth-scroll.js';
import { createDayTimeline } from '../scripts/day-timeline.js';
import { initDayColors } from '../scripts/day-colors.js';
import { initParticles } from '../scripts/particles.js';
import { initSky } from '../scripts/sky.js';
import { initScenes } from '../scripts/scenes.js';
import { initDayLine } from '../scripts/day-line.js';
import { initOpening } from '../scripts/opening.js';
import { initInPageLinks } from '../scripts/in-page-links.js';
import { initTextReveal } from '../scripts/text-reveal.js';
import { initGarden } from '../scripts/garden.js';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initSmoothScroll();

const header = document.querySelector('.site-header');
const timeline = createDayTimeline([...document.querySelectorAll('section[data-stop]')]);
initDayColors(timeline); // must subscribe before anything that reads dayColors
initSky(timeline); // the sun, moon and horizon glow, behind the particles
initParticles(timeline);
initScenes(timeline); // small details in each chapter's top margin
initDayLine(timeline, header);
initOpening(timeline, document.querySelector('.opening')); // its clock feeds the day line and the sky
initInPageLinks(timeline);
initTextReveal();
initGarden(header, { timeline });
initRipples();
initPageTransitions(); // after in-page links, so #links are already handled
