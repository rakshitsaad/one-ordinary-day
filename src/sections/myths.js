import { prefersReducedMotion } from '../scripts/smooth-scroll.js';

// "Myths we grew up with": a row of tilted paper notes. The row is a native
// scroll-snap strip, so phones swipe it with real momentum and vertical page
// scrolling still works over it. Arrow buttons (and arrow keys) step through
// it on desktop. Tapping a note flips it to show what's actually true.

export function initMyths(root) {
  if (!root) return;

  const track = root.querySelector('.myths__track');
  const notes = [...track.querySelectorAll('.myth')];
  const prev = root.querySelector('.myths__arrow--prev');
  const next = root.querySelector('.myths__arrow--next');
  const count = root.querySelector('.myths__count');
  const status = root.querySelector('[data-myths-status]');
  if (notes.length === 0) return;

  root.classList.add('is-live');
  root.querySelector('.myths__controls').hidden = false;

  let announceTimer = 0;
  const announce = (text) => {
    clearTimeout(announceTimer);
    status.textContent = '';
    announceTimer = setTimeout(() => { status.textContent = text; }, 60);
  };

  // --- Flipping ---------------------------------------------------------------
  // The front of each note becomes one big button. The back gets its own small
  // "see the myth again" button, so links on the back (sources) stay clickable.
  const fronts = notes.map((li) => {
    const oldFront = li.querySelector('.myth__face--front');
    const back = li.querySelector('.myth__face--back');
    const myth = oldFront.querySelector('.myth__text').textContent;
    const fact = back.querySelector('.myth__fact').textContent;

    const front = document.createElement('button');
    front.type = 'button';
    front.className = oldFront.className;
    // Buttons may only hold inline content, so the paragraph becomes a span.
    for (const child of [...oldFront.children]) {
      const span = document.createElement('span');
      span.className = child.className;
      span.textContent = child.textContent;
      if (child.hasAttribute('aria-hidden')) span.setAttribute('aria-hidden', 'true');
      front.append(span);
    }
    // The name comes from the visible words ("myth “…”") plus a hidden hint,
    // so voice-control users can say what they see.
    const hint = document.createElement('span');
    hint.className = 'visually-hidden';
    hint.textContent = ', flip to see what’s actually true';
    front.append(hint);
    oldFront.replaceWith(front);

    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'myth__again';
    again.textContent = 'see the myth again';
    back.append(again);

    const setFlipped = (flipped) => {
      li.classList.toggle('is-flipped', flipped);
      // The side you can't see can't be read out or tabbed into.
      front.inert = flipped;
      back.inert = !flipped;
    };
    setFlipped(false);

    front.addEventListener('click', () => {
      setFlipped(true);
      again.focus({ preventScroll: true });
      announce(`Actually: ${fact}`);
    });
    const flipBack = () => {
      setFlipped(false);
      front.focus({ preventScroll: true });
      announce(`Myth: ${myth}`);
    };
    again.addEventListener('click', flipBack);
    // Tapping anywhere on the back (except a link) flips it back too.
    back.addEventListener('click', (event) => {
      if (!event.target.closest('a, button')) flipBack();
    });

    return { li, front, myth };
  });

  // --- Which note is in the middle --------------------------------------------
  let current = 0;

  function centred() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    notes.forEach((li, i) => {
      const distance = Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  function update() {
    current = centred();
    count.textContent = `${current + 1} / ${notes.length}`;
    notes.forEach((li, i) => li.classList.toggle('is-centred', i === current));
    prev.setAttribute('aria-disabled', String(current === 0));
    next.setAttribute('aria-disabled', String(current === notes.length - 1));
  }

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  }, { passive: true });
  track.addEventListener('scrollend', update); // settles even if frames are throttled
  window.addEventListener('resize', update);

  const centre = (i) => {
    const li = notes[i];
    track.scrollTo({
      left: li.offsetLeft + li.offsetWidth / 2 - track.clientWidth / 2,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  function go(index, { focus = false } = {}) {
    const i = Math.max(0, Math.min(notes.length - 1, index));
    centre(i);
    if (focus) {
      const note = fronts[i];
      (note.li.classList.contains('is-flipped') ? note.li.querySelector('.myth__again') : note.front)
        .focus({ preventScroll: true });
    }
    announce(`${i + 1} of ${notes.length}: ${fronts[i].myth}`);
    return i;
  }

  prev.addEventListener('click', () => current > 0 && go(current - 1));
  next.addEventListener('click', () => current < notes.length - 1 && go(current + 1));

  // Left/right arrow keys step through the notes when focus is in the row.
  track.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const from = notes.indexOf(event.target.closest('.myth'));
    const base = from === -1 ? current : from;
    current = go(base + (event.key === 'ArrowRight' ? 1 : -1), { focus: true });
  });

  // Tabbing onto a note brings it to the middle.
  track.addEventListener('focusin', (event) => {
    const i = notes.indexOf(event.target.closest('.myth'));
    if (i !== -1 && i !== centred()) centre(i);
  });

  update();
}
