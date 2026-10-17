// /tonight: A note for tonight.
import '../styles/pages/tonight.css';
import { initTonight } from '../sections/tonight.js';
import { initGarden } from '../scripts/garden.js';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initGarden(document.querySelector('.site-header'));
initTonight(document.querySelector('[data-tonight]'));
initRipples();
initPageTransitions();
