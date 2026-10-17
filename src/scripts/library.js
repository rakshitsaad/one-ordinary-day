import { prefersReducedMotion, scrollGently } from './motion.js';

// The library's chips ("I feel anxious", "I feel low"…). Pick one and the
// tiles that might help glide up into a first group, "These might help right
// now", most helpful first (ORDER); everything else glides down into
// "Everything else" and fades a little. The tiles really move in the page, so
// the Tab order matches what you see. Another chip rearranges again, and "Show
// everything" (or the same chip again) puts every tile back in its usual
// order. Nothing is hidden, and the choice isn't stored or sent anywhere.
// Without JS the chips stay hidden and every tile simply shows.
//
// The glide: a same-document View Transition where the browser has one (each
// tile has its own view-transition-name while it moves, library.css), or a
// FLIP slide where it doesn't. With reduced motion the tiles just reorder.
// The "might help" notes appear once the tiles have settled.

// Most helpful first. "Talk to someone" is in every group, so help is always close.
const ORDER = {
  anxious: ['breathe', 'ground', 'thoughts', 'talk'],
  low: ['talk', 'thoughts', 'conversation', 'tonight'],
  stressed: ['breathe', 'thoughts', 'ground', 'talk'],
  friend: ['conversation', 'talk', 'myths', 'story'],
};

const FOR = {
  anxious: 'when you feel anxious',
  low: 'when you feel low',
  stressed: 'when you feel stressed',
  friend: 'when you want to help a friend',
};

const MOVE = 600; // ms, as in library.css
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // --ease-out

export function initLibrary(root) {
  if (!root) return;
  const chips = root.querySelector('.chips');
  const status = root.querySelector('[data-library-status]');
  const top = root.querySelector('.tiles--top');
  const rest = root.querySelector('.tiles--rest');
  const topLabel = root.querySelector('.tiles__label--top');
  const restLabel = root.querySelector('.tiles__label--rest');
  if (!chips || !top || !rest) return;

  const html = document.documentElement;
  const slots = [...rest.querySelectorAll('.tile-slot')]; // the usual order
  const byPage = new Map(slots.map((slot) => [slot.dataset.page, slot]));
  let current = 'all';
  let turn = 0;

  const say = (text) => {
    status.textContent = '';
    setTimeout(() => { status.textContent = text; }, 60);
  };

  // Puts the tiles in their places for `filter` (DOM order = what you see).
  function arrange(filter) {
    const filtered = filter !== 'all';
    const picks = filtered ? ORDER[filter].map((page) => byPage.get(page)).filter(Boolean) : [];
    top.replaceChildren(...picks);
    rest.replaceChildren(...slots.filter((slot) => !picks.includes(slot)));
    for (const slot of slots) {
      slot.classList.toggle('is-match', picks.includes(slot));
      slot.classList.toggle('is-quiet', filtered && !picks.includes(slot));
    }
    top.hidden = !filtered;
    topLabel.hidden = !filtered;
    restLabel.hidden = !filtered;
    if (filtered) {
      rest.removeAttribute('aria-label');
      rest.setAttribute('aria-labelledby', restLabel.id);
    } else {
      rest.removeAttribute('aria-labelledby');
      rest.setAttribute('aria-label', 'Every page');
    }
    root.classList.toggle('is-filtered', filtered);
    root.classList.remove('labels-in');
    return picks;
  }

  // The fallback glide: each tile slides from where it was (FLIP, transform only).
  function slide(change) {
    const before = new Map(slots.map((slot) => [slot, slot.getBoundingClientRect()]));
    const result = change();
    for (const slot of slots) {
      const was = before.get(slot);
      const now = slot.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        slot.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], { duration: MOVE, easing: EASE });
      }
    }
    return result;
  }

  // The tiles moving up pass over the ones moving down, never under them.
  function raise(picks) {
    let style = document.getElementById('library-raise');
    if (!style) {
      style = document.createElement('style');
      style.id = 'library-raise';
      document.head.append(style);
    }
    style.textContent = picks
      .map((slot) => `::view-transition-group(tile-${slot.dataset.page}) { z-index: 2; }`)
      .join('\n');
  }

  // Once settled: the "might help" notes, and the top of the tiles in view if
  // it isn't already (a gentle scroll, never a jump).
  function settled() {
    root.classList.add('labels-in');
    const wrapTop = root.querySelector('[data-tiles]').getBoundingClientRect().top;
    const bar = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    if (wrapTop < bar + 8 || wrapTop > window.innerHeight * 0.75) {
      scrollGently(window.scrollY + wrapTop - bar - 24);
    }
  }

  function show(filter) {
    current = filter;
    const run = ++turn;
    chips.querySelectorAll('.chip').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
    });
    root.classList.add('has-arranged'); // the first fade-in never replays
    const picks = filter === 'all' ? [] : ORDER[filter].map((page) => byPage.get(page)).filter(Boolean);

    if (prefersReducedMotion) {
      arrange(filter);
      settled();
    } else if (document.startViewTransition) {
      raise(picks);
      html.classList.add('is-arranging');
      const transition = document.startViewTransition(() => { arrange(filter); });
      // Skipped (a hidden tab, or another chip mid-glide): the tiles still move,
      // just without the glide.
      transition.ready.catch(() => {});
      transition.finished.catch(() => {}).then(() => {
        if (run !== turn) return; // a newer chip took over
        html.classList.remove('is-arranging');
        settled();
      });
    } else {
      slide(() => arrange(filter));
      setTimeout(() => { if (run === turn) settled(); }, MOVE);
    }

    say(filter === 'all'
      ? `Showing all ${slots.length} pages in the usual order.`
      : `${picks.length} pages might help ${FOR[filter]}: ${picks.map((slot) => slot.querySelector('.tile__name').textContent).join(', ')}. Everything else comes after them.`);
  }

  chips.hidden = false;
  chips.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    // The chip that's already on goes back to everything.
    const filter = chip.dataset.filter === current && current !== 'all' ? 'all' : chip.dataset.filter;
    if (filter === current) return;
    show(filter);
  });
}
