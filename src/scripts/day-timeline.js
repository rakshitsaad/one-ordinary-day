import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp01 } from './color.js';

// Tracks where the reader is in the day: which two sections they are between
// (`index` and `index + 1`) and how far along (`t`, 0–1).
// A section is reached when its centre meets the centre of the screen.
export function createDayTimeline(sections) {
  const listeners = new Set();
  const layout = sections[0]?.closest('main') ?? document.documentElement;
  let anchors = [];
  let measuredHeight = 0;
  let state = { index: 0, t: 0 };

  const measure = () => {
    measuredHeight = layout.offsetHeight;
    const max = ScrollTrigger.maxScroll(window);
    anchors = sections.map((section) => {
      const { top, height } = section.getBoundingClientRect();
      const centre = top + window.scrollY + height / 2 - window.innerHeight / 2;
      return Math.min(max, Math.max(0, centre));
    });
  };

  const locate = (scroll) => {
    if (anchors.length < 2) return { index: 0, t: 0 };
    let i = 0;
    while (i < anchors.length - 2 && scroll >= anchors[i + 1]) i++;
    const span = anchors[i + 1] - anchors[i];
    const t = span > 0 ? clamp01((scroll - anchors[i]) / span) : Number(scroll >= anchors[i]);
    return { index: i, t };
  };

  const emit = (scroll) => {
    state = locate(scroll);
    listeners.forEach((fn) => fn(state));
  };

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onRefresh: (self) => {
      measure();
      emit(self.scroll());
    },
    onUpdate: (self) => emit(self.scroll()),
  });

  measure();
  emit(window.scrollY);

  // Web fonts change line wrapping, which moves the section centres.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  // On touch devices ScrollTrigger ignores height-only resizes (so the URL bar
  // showing or hiding doesn't refresh everything). But a real one (split screen,
  // a foldable) resizes the svh/vh sections, and stale anchors would move the
  // sunset→dusk flip onto story text. So re-measure whenever the layout's height
  // actually changes. The URL bar doesn't change it: nothing in <main> uses dvh.
  // Comparing with the height at the last refresh can't loop. refresh(true)
  // restarts ScrollTrigger's own 0.2s resize timer, so it merges with a refresh
  // already on its way and waits for scrollEnd if the reader is mid-scroll.
  new ResizeObserver(() => {
    if (layout.offsetHeight !== measuredHeight) ScrollTrigger.refresh(true);
  }).observe(layout);

  return {
    sections,
    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    // Scroll position where this section's colours are exactly its own stop.
    anchorOf(section) {
      return anchors[sections.indexOf(section)];
    },
  };
}
