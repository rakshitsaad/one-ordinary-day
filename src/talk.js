// "Talk to someone" page. Deliberately still: no Lenis, reveals,
// particles or ripple, only the fade between pages. Shared tokens, reset, grain
// and type, and its own styles. Works fully without JavaScript; JS only adds
// the Copy buttons (copy.js) and the page fade.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/talk.css';
import './styles/buttons.css';
import './styles/interactions.css';
import { initCopy } from './scripts/copy.js';
import { initPageTransitions } from './scripts/page-transition.js';

initCopy();
initPageTransitions();
