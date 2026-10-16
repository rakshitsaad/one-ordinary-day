import { prefersReducedMotion } from './motion.js';

// A soft ring that spreads and fades where you click or tap. Only for real
// pointer clicks (not keyboard, not scroll gestures), never while typing.
export function initRipples() {
  if (prefersReducedMotion) return;

  const layer = document.createElement('div');
  layer.className = 'ripples';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  document.addEventListener('click', (event) => {
    if (event.detail === 0) return; // keyboard-triggered click
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    layer.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    setTimeout(() => ripple.remove(), 1500); // in case animations are paused
    while (layer.children.length > 4) layer.firstElementChild.remove();
  }, { passive: true });
}
