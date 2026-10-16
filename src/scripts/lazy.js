// Load a section's code only when the reader gets near it, so the first screen
// doesn't wait for exercises far down the page.
//
// Until then the section shows its no-JS version, which is complete and usable.
// Only use this for sections *after* the last story chapter: their height
// changes when they come alive, and anything above 11:45 pm moving would shift
// the colour timeline's anchors. (day-timeline.js re-measures when the page
// height changes, but a dial jump already in progress would land off-centre.)

const AHEAD = '0px 0px 150% 0px'; // start loading 1.5 screens before it's visible

export function whenNear(el, load) {
  if (!el) return;

  const run = () => load().catch((error) => {
    // The no-JS version stays in place, so the section still works.
    console.error('Could not load section', error);
  });

  if (!('IntersectionObserver' in window)) {
    run();
    return;
  }

  // Also fires straight away if a link or a reload lands on the section.
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    io.disconnect();
    run();
  }, { rootMargin: AHEAD });
  io.observe(el);
}
