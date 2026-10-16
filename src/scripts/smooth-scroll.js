import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { prefersReducedMotion } from './motion.js';

gsap.registerPlugin(ScrollTrigger);

export { prefersReducedMotion };

let lenis = null;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

// Lenis smooths wheel scrolling and feeds ScrollTrigger from GSAP's ticker so
// everything updates on the same frame. Touch keeps native scrolling.
// With reduced motion we skip Lenis entirely and use the browser's own scroll.
export function initSmoothScroll() {
  if (prefersReducedMotion) return null;

  lenis = new Lenis({ lerp: 0.09, autoRaf: false });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

// Calm programmatic scroll: ease-out, 0.8–1.4s depending on distance.
// Jumps instantly when reduced motion is on.
export function scrollToY(y) {
  if (!lenis) {
    window.scrollTo(0, y);
    return;
  }
  const screens = Math.abs(y - window.scrollY) / window.innerHeight;
  lenis.scrollTo(y, { duration: Math.min(1.4, 0.8 + screens * 0.1), easing: easeOutCubic });
}
