import { scrollToY } from './smooth-scroll.js';

// Handles every same-page link (#dawn, #help, …). Chapters scroll to the point
// where their colours are exactly their own stop, then keyboard and screen
// reader focus moves there so nobody is left behind at the old position.
export function initInPageLinks(timeline) {
  const jumpTo = (target) => {
    const chapter = target.closest('section[data-stop]');
    // Anything else lands a little below the top, clear of the fixed day line.
    const y = chapter
      ? timeline.anchorOf(chapter)
      : Math.max(0, target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.08);
    scrollToY(y);

    const focusTarget = target === chapter || target.matches('section')
      ? target.querySelector('h1, h2') ?? target
      : target;
    if (!focusTarget) return;
    if (!focusTarget.matches('a, button, input, select, textarea, [tabindex]')) {
      focusTarget.setAttribute('tabindex', '-1');
    }
    focusTarget.focus({ preventScroll: true });
  };

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href^="#"]');
    const target = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;

    event.preventDefault();
    jumpTo(target);
  });

  return jumpTo;
}
