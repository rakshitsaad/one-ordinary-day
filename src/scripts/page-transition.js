import { prefersReducedMotion } from './motion.js';

// Moving between pages: a soft cross-fade. Browsers with cross-document View
// Transitions (Chrome, Edge, Safari 18.2+) do it natively from the
// @view-transition rule in src/partials/head.html, so this does nothing there.
// Elsewhere it fades through the current background colour: the page dissolves
// into its own colour, and the next page starts as that colour and dissolves in.
//
// Both halves are short (0.3s out, 0.6s in) so nothing ever makes you wait. The
// arriving half lives in a tiny inline <style> + <script> in the shared head
// (so the veil is there on the very first paint); this module fades it.

const KEY = 'ood-page-fade';
const LEAVE_MS = 300;
const ARRIVE_MS = 600;
const NATIVE = 'PageRevealEvent' in window; // cross-document View Transitions

export function initPageTransitions() {
  const root = document.documentElement;

  // Arriving: fade the veil the <head> script put up.
  if (root.hasAttribute('data-arriving')) {
    const reveal = () => root.classList.add('is-arrived');
    requestAnimationFrame(() => requestAnimationFrame(reveal));
    setTimeout(reveal, 120); // if frames are throttled
    setTimeout(() => {
      root.removeAttribute('data-arriving');
      root.classList.remove('is-arrived');
      root.style.removeProperty('--arrive-bg');
    }, ARRIVE_MS + 300);
  }

  if (prefersReducedMotion || NATIVE) return;

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return; // other sites, tel:, mailto:
    if (url.pathname === location.pathname && url.search === location.search) return; // same page (#hash)

    event.preventDefault();
    leave(url.href);
  });

  // Coming back with the Back button can restore this page exactly as it was
  // left, veil and all; take it down.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) document.querySelectorAll('.page-veil').forEach((veil) => veil.remove());
  });
}

function leave(href) {
  const colour = getComputedStyle(document.body).backgroundColor;
  try {
    sessionStorage.setItem(KEY, colour);
  } catch {
    // No storage: the next page simply appears without the fade-in.
  }

  const veil = document.createElement('div');
  veil.className = 'page-veil';
  veil.style.background = colour;
  document.body.append(veil);
  void veil.offsetWidth; // start from transparent so the fade runs
  veil.classList.add('is-showing');

  setTimeout(() => location.assign(href), LEAVE_MS);
  setTimeout(() => veil.remove(), 4000); // if navigation never happens, don't leave a blank screen
}
