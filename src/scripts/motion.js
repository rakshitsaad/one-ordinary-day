// One place to ask "should things move?", light enough for any page to import
// (the talk page uses it without pulling in Lenis or GSAP).
export const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
