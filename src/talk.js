// "Talk to someone" page. Deliberately quiet: no smooth scrolling, no reveals,
// no particles. Shared tokens, reset, grain and type, its own styles, and the
// same finishing touches as the story (button feel, link underlines, ripple,
// the fade between pages). Works fully without JavaScript.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/talk.css';
import './styles/buttons.css';
import './styles/interactions.css';
import { initRipples } from './scripts/interactions.js';
import { initPageTransitions } from './scripts/page-transition.js';

initRipples();
initPageTransitions();
