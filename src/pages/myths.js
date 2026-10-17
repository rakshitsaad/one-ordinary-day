// /myths: Myths we grew up with.
import '../styles/pages/myths.css';
import { initMyths } from '../sections/myths.js';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initMyths(document.querySelector('[data-myths]'));
initRipples();
initPageTransitions();
