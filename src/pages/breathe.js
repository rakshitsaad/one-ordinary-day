// /breathe: Take a minute (box breathing or 4-7-8, optional rain or waves).
import '../styles/pages/breathe.css';
import { initBreathing } from '../sections/breathing.js';
import { initGarden } from '../scripts/garden.js';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';

initGarden(document.querySelector('.site-header')); // before the exercise, so its "took care" has a listener
initBreathing(document.querySelector('[data-breath]'));
initRipples();
initPageTransitions();
