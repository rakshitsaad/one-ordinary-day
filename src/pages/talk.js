// /talk: Talk to someone. Deliberately still: no ripple, reveals or hover
// motion, only the fade between pages. Works fully without JavaScript; JS only
// adds the Copy buttons (copy.js) and the page fade.
import '../styles/pages/talk.css';
import { initCopy } from '../scripts/copy.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initCopy();
initPageTransitions();
