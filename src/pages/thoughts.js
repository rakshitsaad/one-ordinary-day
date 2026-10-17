// /thoughts: Untangle a thought (Aarav's 4:50 pm thoughts).
import '../styles/pages/thoughts.css';
import { initThoughts } from '../sections/thoughts.js';
import { initGarden } from '../scripts/garden.js';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initGarden(document.querySelector('.site-header'));
initThoughts(document.querySelector('[data-thoughts]'));
initRipples();
initPageTransitions();
