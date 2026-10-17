import { prefersReducedMotion } from '../scripts/motion.js';
import { scrollToY } from '../scripts/smooth-scroll.js';
import { copyText } from '../scripts/copy.js';

// "A note for tonight" (#tonight): the quiet end of the day. The reader picks
// one gentle note to carry with them (or writes their own), and can copy it or
// keep it pinned in the corner while they look around.
//
// Privacy (must stay true, and the page says so): nothing is stored or sent.
// No localStorage, cookies, network calls or analytics; their own words only
// ever go into the page as textContent. The pinned note and anything written
// are cleared on pagehide, so even the back/forward cache doesn't keep them.
//
// Without JS (or until this loads) the notes are a plain list. Here each one
// becomes a button. Picking fades the others back and glides the note to the
// middle of the desk (FLIP, transform and opacity only, ease-out, no bounce);
// with reduced motion it simply appears there.

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // --ease-out
const FADE = 700; // the other notes fade back
const MOVE = 1100; // the picked note glides to the middle
const APPEAR = 900; // its options fade in
const COPIED_FOR = 2500;
const SELECTED_FOR = 5000;

const CROSS = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5.5C8 8.5 11 11.5 15 14.8M14.6 5C11.5 8.2 8.4 11.6 5.4 15" /></svg>';

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Wait for animations, but never much longer than they should take, so a
// stalled one can't leave the desk stuck.
const settle = (animations, ms) => Promise.race([
  Promise.all(animations.map((a) => a.finished.catch(() => {}))),
  wait(ms + 200),
]);

const xy = (value) => {
  if (!value || value === 'none') return [0, 0];
  const [x = '0', y = '0'] = value.split(' ');
  return [parseFloat(x) || 0, parseFloat(y) || 0];
};

function snapshot(el) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    translate: style.translate,
    rotate: style.rotate === 'none' ? '0deg' : style.rotate,
    scale: style.scale === 'none' ? '1' : style.scale,
  };
}

const isGlide = (a) => 'translate' in (a.effect.getKeyframes()[0] ?? {});
const isFade = (a) => !isGlide(a);

// Plays the move from where the element was (`first`) to where it is now. The
// caller adds .is-moving (no CSS transitions) before changing the layout, so
// `last` is the true resting place, not the start of a transition. It comes
// off once no glide is left running (a new one may have taken over).
function glide(el, first) {
  const last = snapshot(el);
  const [x, y] = xy(last.translate);
  const animation = el.animate([
    { translate: `${x + first.cx - last.cx}px ${y + first.cy - last.cy}px`, rotate: first.rotate, scale: first.scale },
    { translate: `${x}px ${y}px`, rotate: last.rotate, scale: last.scale },
  ], { duration: MOVE, easing: EASE });
  const done = () => {
    if (!el.getAnimations().some((a) => a !== animation && isGlide(a))) el.classList.remove('is-moving');
  };
  animation.finished.then(done, done);
  return animation;
}

// Starts moving `el`: from where it is right now (even mid-glide) to wherever
// `change()` puts it.
function move(el, change, motion) {
  const first = snapshot(el);
  el.getAnimations().filter(isGlide).forEach((a) => a.cancel());
  if (motion) el.classList.add('is-moving');
  change();
  return motion ? glide(el, first) : null;
}

const fadeIn = (el, delay = 0) => el.animate(
  [{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }],
  { duration: APPEAR, delay, easing: EASE, fill: 'backwards' },
);

// Scrolls gently (never locks) so `top`…`bottom` sits between the top bar and
// the bottom of the visible screen (above an on-screen keyboard).
function bringIntoView(top, bottom) {
  const bar = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
  const vv = window.visualViewport;
  const end = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 24;
  if (top < bar + 16) scrollToY(window.scrollY + top - bar - 16);
  else if (bottom > end) scrollToY(window.scrollY + Math.min(bottom - end, top - bar - 16));
}

export function initTonight(desk) {
  if (!desk || desk.dataset.live) return;
  desk.dataset.live = 'true';

  const root = document.documentElement;
  const list = desk.querySelector('.tonight__notes');
  const actions = desk.querySelector('[data-actions]');
  const write = desk.querySelector('[data-write]');
  const options = desk.querySelector('[data-options]');
  const field = desk.querySelector('.tonight__field');
  const status = desk.querySelector('[data-tonight-status]');
  const copyButton = actions.querySelector('[data-act="copy"]');
  const pinButton = actions.querySelector('[data-act="pin"]');
  const labels = new Map([[copyButton, copyButton.textContent], [pinButton, pinButton.textContent]]);

  // Each written note becomes a button. Its text stays, hidden, as the view
  // shown once it's picked (plain text, so it can be selected and read).
  const notes = [...list.children].map((li) => {
    const text = li.querySelector('.tonight__text');
    if (li.hasAttribute('data-own')) {
      li.hidden = false;
      return { li, text, button: li.querySelector('.tonight__pick'), words: text.querySelector('.tonight__words'), own: true };
    }

    const words = document.createElement('span');
    words.className = 'tonight__words';
    words.append(...text.childNodes);
    const said = document.createElement('span');
    said.className = 'visually-hidden';
    said.textContent = 'Your note for tonight: ';
    text.append(said, words);
    text.tabIndex = -1;
    text.hidden = true;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tonight__pick';
    const hint = document.createElement('span');
    hint.className = 'visually-hidden';
    hint.textContent = 'Pick this note: ';
    button.append(hint, ...[...words.childNodes].map((node) => node.cloneNode(true)));
    li.prepend(button);
    return { li, text, button, words, own: false };
  });

  let chosen = null;
  let busy = false; // only while the others fade out, or the options fade away
  let turn = 0; // each pick or return; a newer one takes over
  let pinned = null; // { el, text }
  const timers = new Map();

  const say = (message) => {
    status.textContent = '';
    setTimeout(() => { status.textContent = message; }, 60);
  };

  const flash = (button, label, ms) => {
    button.textContent = label;
    clearTimeout(timers.get(button));
    timers.set(button, setTimeout(() => { button.textContent = labels.get(button); }, ms));
  };

  // "Keep it on screen" reads "On screen now" while this very note is pinned.
  const syncPinButton = () => {
    const isPinned = Boolean(pinned && chosen && pinned.text === chosen.words.textContent);
    pinButton.textContent = isPinned ? 'On screen now' : labels.get(pinButton);
    if (isPinned) pinButton.setAttribute('aria-disabled', 'true');
    else pinButton.removeAttribute('aria-disabled');
  };

  function setLayout(note, on, writing = false) {
    for (const other of notes) if (other !== note) other.li.hidden = on;
    desk.classList.toggle('has-choice', on);
    note.li.classList.toggle('is-chosen', on);
    note.button.hidden = on;
    note.text.hidden = !on;
    // Their own note's words are hidden from screen readers while they write
    // (the box itself has them).
    if (note.own && (!on || writing)) note.text.setAttribute('aria-hidden', 'true');
    else if (note.own) note.text.removeAttribute('aria-hidden');
    actions.hidden = !on;
    write.hidden = !(on && writing);
    options.hidden = on && writing;
  }

  async function choose(note) {
    if (busy || chosen) return;
    busy = true;
    chosen = note;
    const run = ++turn;
    const motion = !prefersReducedMotion;
    const others = notes.filter((n) => n !== note).map((n) => n.li);

    // Hold the desk's height, so nothing below it moves (and the page can't
    // jump), and the note's width, so its words don't rewrap on the way.
    desk.style.minHeight = `${desk.offsetHeight}px`;
    note.li.style.width = `${note.li.offsetWidth}px`;

    if (motion) {
      note.li.classList.add('is-lifting');
      // Each fades from wherever it is (it may still be fading back in).
      await settle(others.map((li) => {
        const from = getComputedStyle(li).opacity;
        li.getAnimations().filter(isFade).forEach((a) => a.cancel());
        return li.animate([{ opacity: from }, { opacity: 0 }], { duration: FADE, easing: EASE, fill: 'forwards' });
      }), FADE);
      if (run !== turn) return; // the page was left meanwhile
    }

    const glideIn = move(note.li, () => {
      if (note.own) note.words.textContent = field.value.trim();
      setLayout(note, true, note.own);
      note.li.classList.remove('is-lifting');
    }, motion);
    for (const li of others) li.getAnimations().filter(isFade).forEach((a) => a.cancel());
    syncPinButton();
    // Focus moves at once, so keyboard and screen reader users are already
    // there: the note itself (read out), or the box to write in.
    (note.own ? field : note.text).focus({ preventScroll: true });
    busy = false; // its options work straight away, even mid-glide

    if (motion) await settle([glideIn, fadeIn(actions, 450)], MOVE + 450);
    if (run === turn) bringIntoView(note.li.getBoundingClientRect().top, actions.getBoundingClientRect().bottom);
  }

  async function back({ instant = false } = {}) {
    if (!chosen || (busy && !instant)) return;
    const note = chosen;
    const run = ++turn;
    const motion = !prefersReducedMotion && !instant;
    busy = true;

    if (motion) {
      const from = getComputedStyle(actions).opacity;
      actions.getAnimations().forEach((a) => a.cancel());
      await settle([actions.animate([{ opacity: from }, { opacity: 0 }], { duration: 500, easing: EASE, fill: 'forwards' })], 500);
    }

    const glideBack = move(note.li, () => {
      setLayout(note, false);
      note.li.classList.remove('is-lifting');
      desk.style.minHeight = '';
      note.li.style.width = '';
    }, motion);
    actions.getAnimations().forEach((a) => a.cancel());
    chosen = null;
    busy = false; // the notes can be picked again straight away
    if (instant) {
      for (const n of notes) n.li.getAnimations().forEach((a) => a.cancel());
      return;
    }
    note.button.focus({ preventScroll: true });

    if (motion) {
      const others = notes.filter((n) => n !== note).map((n) => n.li);
      await settle([
        glideBack,
        ...others.map((li) => li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: APPEAR, delay: 250, easing: EASE, fill: 'backwards' })),
      ], MOVE + 250);
    }
    if (run === turn) {
      const rect = note.li.getBoundingClientRect();
      bringIntoView(rect.top, rect.bottom);
    }
  }

  function keepOwn() {
    if (!chosen?.own) return;
    const words = field.value.trim();
    if (!words) {
      say('Write a few words first, or choose another note.');
      field.focus();
      return;
    }
    chosen.words.textContent = words;
    chosen.text.removeAttribute('aria-hidden');
    write.hidden = true;
    options.hidden = false;
    syncPinButton();
    chosen.text.focus({ preventScroll: true });
    if (!prefersReducedMotion) fadeIn(options);
  }

  async function copy() {
    const text = chosen.words.textContent.trim();
    if (await copyText(text, chosen.words) === 'copied') {
      flash(copyButton, 'Copied', COPIED_FOR);
      say('Copied.');
    } else {
      flash(copyButton, 'Selected', SELECTED_FOR);
      say('Couldn’t copy automatically. The note is selected: use your phone’s Copy, or press Control C.');
    }
  }

  // ---- Kept on screen --------------------------------------------------------

  function unpin({ animate = true } = {}) {
    if (!pinned) return;
    const { el } = pinned;
    pinned = null;
    root.classList.remove('has-pinned-note');
    root.style.removeProperty('--pinned-h');
    syncPinButton();
    if (!animate || prefersReducedMotion) {
      el.remove();
      return;
    }
    el.style.pointerEvents = 'none';
    settle([el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: EASE, fill: 'forwards' })], 600).then(() => el.remove());
  }

  function pin() {
    if (pinButton.getAttribute('aria-disabled') === 'true') return;
    unpin({ animate: false });

    const el = document.createElement('div');
    el.className = 'pinned-note';
    el.setAttribute('role', 'note');
    el.setAttribute('aria-label', 'Your note for tonight');
    for (const prop of ['--paper', '--ink', '--pin']) el.style.setProperty(prop, chosen.li.style.getPropertyValue(prop));
    const text = document.createElement('p');
    text.className = 'pinned-note__text';
    text.append(...[...chosen.words.childNodes].map((node) => node.cloneNode(true)));
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'pinned-note__close';
    close.setAttribute('aria-label', 'Take the note off the screen');
    close.innerHTML = CROSS;
    el.append(text, close);
    // In the top bar (see tonight.css): beside "Talk to someone" on wider
    // screens, the bottom-left corner on phones.
    (document.querySelector('.site-header') ?? document.body).append(el);

    pinned = { el, text: chosen.words.textContent };
    root.style.setProperty('--pinned-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    root.classList.add('has-pinned-note');
    syncPinButton();
    if (!prefersReducedMotion) {
      el.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 1000, easing: EASE });
    }
    const where = window.matchMedia('(min-width: 48rem)').matches
      ? 'at the top of the screen, next to Talk to someone'
      : 'in the bottom left corner of the screen';
    say(`Pinned ${where}. It stays while you look around, and goes when you close or leave this page.`);

    // Closing it returns focus to wherever the reader came from.
    let cameFrom = null;
    el.addEventListener('focusin', (event) => {
      if (!el.contains(event.relatedTarget)) cameFrom = event.relatedTarget;
    });
    close.addEventListener('click', () => {
      const target = cameFrom?.isConnected && cameFrom.getClientRects().length ? cameFrom : document.querySelector('.talk');
      unpin();
      target?.focus({ preventScroll: true });
      say('Note taken off the screen.');
    });
  }

  // On a touch screen, tuck the pinned note away while a text box has focus,
  // so it never sits over the box or the keyboard.
  const coarse = window.matchMedia('(pointer: coarse)');
  const isTyping = (el) => Boolean(el?.matches?.('textarea, input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"])'));
  document.addEventListener('focusin', (event) => {
    root.classList.toggle('is-typing', coarse.matches && isTyping(event.target));
  });
  document.addEventListener('focusout', (event) => {
    if (!isTyping(event.relatedTarget)) root.classList.remove('is-typing');
  });

  // ---- Events ------------------------------------------------------------------

  list.addEventListener('click', (event) => {
    const note = notes.find((n) => n.button === event.target.closest('.tonight__pick'));
    if (note) choose(note);
  });

  actions.addEventListener('click', (event) => {
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (!act || busy || !chosen) return;
    if (act === 'another') back();
    else if (act === 'use') keepOwn();
    else if (act === 'copy') copy();
    else if (act === 'pin') pin();
  });

  // Their words appear on the note as they write.
  field.addEventListener('input', () => {
    if (chosen?.own && !write.hidden) chosen.words.textContent = field.value.trim();
  });

  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      keepOwn();
    }
  });

  // Above the on-screen keyboard once it opens.
  field.addEventListener('focus', () => {
    setTimeout(() => {
      const rect = field.getBoundingClientRect();
      bringIntoView(rect.top, rect.bottom);
    }, 350);
  });

  desk.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && chosen && !busy) {
      event.preventDefault();
      back();
    }
  });

  window.addEventListener('pagehide', () => {
    field.value = '';
    notes.find((n) => n.own).words.textContent = '';
    unpin({ animate: false });
    if (chosen) back({ instant: true });
  });
}
