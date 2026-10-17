// / : the intro. The feeling cards are plain <details>, so the page needs no
// JavaScript; this only adds the soft click ring and the page fade, and a PNG
// for Aarav's picture where WebP doesn't load.
import '../styles/pages/home.css';
import { initRipples } from '../scripts/interactions.js';
import { initPageTransitions } from '../scripts/page-transition.js';
import worriedPng from '../assets/images/aarav-worried.png';
import calmPng from '../assets/images/aarav-calm.png';

const PNG = { worried: worriedPng, calm: calmPng };
document.querySelectorAll('.mind__face').forEach((face) => {
  const probe = new Image();
  probe.onerror = () => {
    face.setAttribute('href', PNG[face.classList.contains('mind__face--calm') ? 'calm' : 'worried']);
  };
  probe.src = face.getAttribute('href');
});

initRipples();
initPageTransitions();
