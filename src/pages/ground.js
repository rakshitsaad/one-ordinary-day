// /ground: the 5-4-3-2-1 notebook.
import '../styles/pages/ground.css';
import { initGrounding } from '../sections/grounding.js';
import { initGarden } from '../scripts/garden.js';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initGarden(document.querySelector('.site-header'));
initGrounding(document.querySelector('[data-notebook]'));
initRipples();
initPageTransitions();
