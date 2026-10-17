// One place to ask "should things move?", light enough for any page to import
// (the talk page uses it without pulling in Lenis or GSAP).
export const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// A gentle programmatic scroll for pages without Lenis (everything but the
// story, which uses scrollToY in smooth-scroll.js). Never locks the scroll.
export function scrollGently(y) {
  window.scrollTo({ top: y, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}
