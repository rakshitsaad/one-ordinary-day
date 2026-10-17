// /library: every page, one tap away, with gentle filters.
import '../styles/pages/library.css';
import { initLibrary } from '../scripts/library.js';
import { initGarden } from '../scripts/garden.js';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initLibrary(document.querySelector('[data-library]'));
initGarden(document.querySelector('.site-header'));
initRipples();
initPageTransitions();
