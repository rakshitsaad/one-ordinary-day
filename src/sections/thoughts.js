import { prefersReducedMotion } from '../scripts/motion.js';
import { scrollToY } from '../scripts/smooth-scroll.js';

// 4:50 pm: Aarav's anxious thoughts. Each one opens, in place, into a small
// moment: the worry stays, a calmer way to put it is written out below it, the
// reader can put it in their own words, and a gentle question asks whether it
// feels more manageable (never recorded). One moment is open at a time. The
// reader can also add a thought of their own. Without JS the markup is a plain
// list of worries and calmer versions.
//
// PRIVACY: what the reader writes never leaves this browser. No network calls,
// no analytics, no reading or judging the text. Nothing is stored unless they
// tick "Keep my notes on this device"; only then are their words kept in
// localStorage (KEY below), and "Delete my notes" removes them at once. Unkept
// notes are cleared on pagehide, so the back/forward cache can't bring them back.
// The answers to "Does this feel more manageable?" are never stored anywhere.

const KEY = 'ood-thought-notes';
const MAX_WORDS = 200; // characters for a calmer version
const MAX_THOUGHT = 120; // characters for a thought of their own
const WORD_STEP = 55; // ms between words as the calmer version is written out
const WORD_FADE = 900; // ms each word takes to appear

const REPLIES = {
  little: 'Small shifts count. A thought that feels a little lighter is a real change, even if it’s still there.',
  'not-really': 'That’s okay. Some thoughts take more than one try, and some are too heavy to sort out alone. Talking to someone can help. <a href="talk.html">Talk to someone</a>',
  unsure: 'That’s okay too. You can come back to this whenever you like.',
};

const PRIVACY = 'What you write stays on this device. It’s never sent to us or anyone else. Nothing is saved unless you choose “Keep my notes on this device”, and you can delete them anytime. If you’re on a shared or school computer, it’s best not to save.';
const SAFETY = 'If what you’re feeling is about hurting yourself, please <a href="talk.html">talk to someone right now</a>.';

// ---- Storage: only ever used after the reader opts in. Never throws. ----------

const storage = {
  read() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return data && data.v === 1 ? data : null;
    } catch {
      return null;
    }
  },
  write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Storage blocked: there was nothing saved anyway.
    }
  },
};

// ---- Small DOM helpers ------------------------------------------------------------

let uid = 0;
const nextId = (prefix) => `${prefix}-${++uid}`;

const keepToggle = (id) => `
  <label class="thoughts__keep" for="${id}">
    <input type="checkbox" id="${id}" data-keep />
    <span>Keep my notes on this device</span>
  </label>`;

// The writing area: shared by "Write it in your own words" and "Add a thought".
const writeArea = (id, { withThought }) => `
  <div class="moment__write" hidden>
    ${withThought ? `
      <label class="moment__prompt" for="${id}-thought">What’s the thought?</label>
      <input class="moment__field" id="${id}-thought" type="text" maxlength="${MAX_THOUGHT}" autocomplete="off" spellcheck="false" data-field="thought" />` : ''}
    <label class="moment__prompt" for="${id}-text">How would you say this to a friend who felt this way?${withThought ? ' <span class="moment__optional">(you can leave this for now)</span>' : ''}</label>
    <textarea class="moment__field moment__text" id="${id}-text" maxlength="${MAX_WORDS}" rows="3" autocomplete="off" spellcheck="false" data-field="words"></textarea>
    <p class="moment__count" aria-hidden="true">0 of ${MAX_WORDS}</p>
    <div class="moment__actions">
      <button class="moment__btn" type="button" data-act="${withThought ? 'add' : 'use'}">${withThought ? 'Add it' : 'Use my words'}</button>
      <button class="moment__link" type="button" data-act="cancel">Cancel</button>
    </div>
    ${keepToggle(`${id}-keep`)}
    <p class="moment__privacy">${PRIVACY}</p>
    <p class="moment__safety">${SAFETY}</p>
  </div>`;

const momentMarkup = (id) => `
  <p class="moment__label" data-label>another way to put it</p>
  <p class="moment__calm" data-calm></p>
  <p class="moment__empty" data-empty hidden>You haven’t written a kinder version of this one yet.</p>
  <div class="moment__actions" data-main-actions>
    <button class="moment__link" type="button" data-act="write">Write it in your own words</button>
    <button class="moment__link" type="button" data-act="suggested" hidden>Show the suggestion again</button>
    <button class="moment__link" type="button" data-act="remove" hidden>Remove this thought</button>
    <button class="moment__link" type="button" data-act="close">Close</button>
  </div>
  ${writeArea(id, { withThought: false })}
  <div class="moment__reflect" role="group" aria-labelledby="${id}-q" data-reflect hidden>
    <p class="moment__question" id="${id}-q">Does this feel more manageable?</p>
    <div class="moment__choices">
      <button class="moment__choice" type="button" aria-pressed="false" data-feel="little">A little</button>
      <button class="moment__choice" type="button" aria-pressed="false" data-feel="not-really">Not really</button>
      <button class="moment__choice" type="button" aria-pressed="false" data-feel="unsure">Not sure</button>
    </div>
    <p class="moment__reply" role="status"></p>
  </div>`;

export function initThoughts(root) {
  if (!root) return;

  const list = root.querySelector('.thoughts__box');
  const status = root.querySelector('[data-thoughts-status]');

  // ---- State: lives in this page only, unless the reader opts in. -----------------
  const thoughts = []; // { id, li, button, panel, worry, suggested, own, isOwn }
  let open = null;
  let keep = false;

  const announce = (text) => {
    // Clear, then set after a beat, so repeated text is announced too.
    status.textContent = '';
    setTimeout(() => { status.textContent = text; }, 60);
  };

  const hasNotes = () => thoughts.some((t) => t.own || t.isOwn);
  const snapshot = () => ({
    v: 1,
    words: Object.fromEntries(thoughts.filter((t) => !t.isOwn && t.own).map((t) => [t.key, t.own])),
    own: thoughts.filter((t) => t.isOwn).map((t) => ({ worry: t.worry, words: t.own || '' })),
  });
  const persist = () => {
    if (keep) storage.write(snapshot());
    notesBlock.hidden = !hasNotes() && !keep;
    deleteBtn.hidden = !hasNotes() && !keep;
  };

  // ---- The notes block at the end: keep / delete, and its confirmation. -----------
  const notesBlock = document.createElement('div');
  notesBlock.className = 'thoughts__notes';
  notesBlock.hidden = true;
  notesBlock.innerHTML = `
    <p class="thoughts__notes-title">Your notes</p>
    ${keepToggle(nextId('keep'))}
    <button class="moment__link thoughts__delete" type="button" data-act="delete">Delete my notes</button>
    <p class="thoughts__notes-status" role="status"></p>`;
  const deleteBtn = notesBlock.querySelector('.thoughts__delete');
  const notesStatus = notesBlock.querySelector('.thoughts__notes-status');

  const syncKeep = () => root.querySelectorAll('[data-keep]').forEach((box) => { box.checked = keep; });

  const setKeep = (value) => {
    keep = value;
    syncKeep();
    if (keep) {
      const saved = storage.write(snapshot());
      notesStatus.textContent = saved
        ? 'Your notes will be kept in this browser on this device.'
        : 'This browser isn’t allowing anything to be saved, so your notes will go when you leave.';
      if (!saved) {
        keep = false;
        syncKeep();
      }
    } else {
      storage.clear();
      notesStatus.textContent = 'Your notes won’t be kept after you leave this page.';
    }
    notesBlock.hidden = false;
    deleteBtn.hidden = !hasNotes() && !keep;
  };

  // ---- Showing a calmer version ---------------------------------------------------
  // Written out word by word, like handwriting arriving; the question follows once
  // it's there. With reduced motion both are simply there.
  function showCalm(t, { animate }) {
    const calm = t.panel.querySelector('[data-calm]');
    const label = t.panel.querySelector('[data-label]');
    const empty = t.panel.querySelector('[data-empty]');
    const reflect = t.panel.querySelector('[data-reflect]');
    const text = t.own || t.suggested;

    calm.classList.toggle('is-own', Boolean(t.own));
    label.textContent = t.own ? 'in your words' : 'another way to put it';
    t.panel.querySelector('[data-act="write"]').textContent = t.own ? 'Change my words' : 'Write it in your own words';
    t.panel.querySelector('[data-act="suggested"]').hidden = !(t.own && t.suggested);
    t.panel.querySelector('[data-act="remove"]').hidden = !t.isOwn;

    label.hidden = !text;
    empty.hidden = Boolean(text);
    reflect.hidden = !text;
    calm.replaceChildren();
    if (!text) return;

    if (!animate || prefersReducedMotion) {
      calm.textContent = text;
      reflect.style.removeProperty('--after');
      return;
    }
    const words = text.split(/\s+/);
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'moment__word';
      span.style.setProperty('--i', i);
      span.textContent = word; // the reader's own words only ever go in as text
      calm.append(span, i < words.length - 1 ? ' ' : '');
    });
    reflect.style.setProperty('--after', `${words.length * WORD_STEP + WORD_FADE * 0.6}ms`);
  }

  function resetReflection(t) {
    t.panel.querySelectorAll('.moment__choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    t.panel.querySelector('.moment__reply').innerHTML = '';
  }

  // ---- Opening and closing --------------------------------------------------------

  function openMoment(t) {
    if (open === t) return;
    if (open) closeMoment(open, { focus: false });
    open = t;
    t.li.classList.add('is-open');
    t.button.setAttribute('aria-expanded', 'true');
    t.panel.hidden = false;
    showCalm(t, { animate: true });
    const text = t.own || t.suggested;
    if (text) announce(`${t.own ? 'In your words' : 'Another way to put it'}: ${text}`);

    // Keep the open moment on screen, without ever taking the scroll away.
    requestAnimationFrame(() => {
      const box = t.li.getBoundingClientRect();
      const room = window.innerHeight - 96; // clear of the Talk pill and garden
      if (box.bottom > room) {
        scrollToY(window.scrollY + Math.min(box.bottom - room, Math.max(0, box.top - 80)));
      }
    });
  }

  function closeMoment(t, { focus = true } = {}) {
    closeWriting(t, { focus: false });
    resetReflection(t);
    t.li.classList.remove('is-open');
    t.button.setAttribute('aria-expanded', 'false');
    t.panel.hidden = true;
    if (open === t) open = null;
    if (focus) t.button.focus();
  }

  // ---- Writing their own words ----------------------------------------------------

  function openWriting(t) {
    const area = t.panel.querySelector('.moment__write');
    const text = area.querySelector('[data-field="words"]');
    area.hidden = false;
    t.panel.querySelector('[data-main-actions]').hidden = true;
    t.panel.querySelector('[data-reflect]').hidden = true;
    text.value = t.own || '';
    updateCount(text);
    syncKeep();
    text.focus();
  }

  function closeWriting(t, { focus = true } = {}) {
    const area = t.panel.querySelector('.moment__write');
    if (area.hidden) return;
    area.hidden = true;
    area.querySelectorAll('[data-field]').forEach((field) => { field.value = ''; });
    t.panel.querySelector('[data-main-actions]').hidden = false;
    showCalm(t, { animate: false });
    if (focus) t.panel.querySelector('[data-act="write"]').focus();
  }

  function useWords(t) {
    const words = t.panel.querySelector('[data-field="words"]').value.trim();
    t.own = words || null;
    closeWriting(t, { focus: false });
    showCalm(t, { animate: true });
    persist();
    t.panel.querySelector('[data-act="write"]').focus();
    if (t.own) announce(`In your words: ${t.own}`);
    else if (t.suggested) announce(`Another way to put it: ${t.suggested}`);
  }

  // Counter: quiet on screen, and only spoken when it matters.
  function updateCount(field) {
    const count = field.closest('.moment__write').querySelector('.moment__count');
    const left = MAX_WORDS - field.value.length;
    count.textContent = `${field.value.length} of ${MAX_WORDS}`;
    count.classList.toggle('is-near', left <= 20);
    if (left === 20 || left === 0) announce(left ? '20 characters left' : 'That’s the most this box takes');
  }

  // ---- Building a thought ---------------------------------------------------------

  function makeThought(li, { worry, suggested = '', own = null, isOwn = false, key = null }) {
    const id = nextId('moment');
    const t = { id, li, worry, suggested, own, isOwn, key };

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thought__open';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    const label = document.createElement('span');
    label.className = 'thought__worry';
    label.textContent = worry;
    button.append(label);

    const panel = document.createElement('div');
    panel.className = 'moment';
    panel.id = id;
    panel.hidden = true;
    panel.innerHTML = momentMarkup(id);

    li.replaceChildren(button, panel);
    li.classList.toggle('thought--own', isOwn);
    Object.assign(t, { button, panel });
    button.addEventListener('click', () => (open === t ? closeMoment(t) : openMoment(t)));
    return t;
  }

  const isWriting = (t) => !t.panel.querySelector('.moment__write').hidden;

  // ---- Turn the list into moments -------------------------------------------------

  [...list.querySelectorAll('.thought')].forEach((li, i) => {
    const worry = li.querySelector('.thought__worry').textContent.trim();
    const suggested = li.querySelector('.thought__calm').textContent.trim();
    thoughts.push(makeThought(li, { worry, suggested, key: `t${i + 1}` }));
  });

  // "Add a thought of my own"
  const addLi = document.createElement('li');
  addLi.className = 'thought thought--add';
  const addId = nextId('add');
  addLi.innerHTML = `
    <button class="thought__open thought__open--add" type="button" aria-expanded="false" aria-controls="${addId}">Add a thought of my own</button>
    <div class="moment" id="${addId}" hidden>${writeArea(addId, { withThought: true })}</div>`;
  list.append(addLi);
  const addButton = addLi.querySelector('.thought__open');
  const addPanel = addLi.querySelector('.moment');
  const adder = { li: addLi, button: addButton, panel: addPanel, isAdder: true };

  function openAdder() {
    if (open) closeMoment(open, { focus: false });
    open = adder;
    addLi.classList.add('is-open');
    addButton.setAttribute('aria-expanded', 'true');
    addPanel.hidden = false;
    addPanel.querySelector('.moment__write').hidden = false;
    addPanel.querySelectorAll('[data-field]').forEach((f) => { f.value = ''; });
    updateCount(addPanel.querySelector('[data-field="words"]'));
    syncKeep();
    addPanel.querySelector('[data-field="thought"]').focus();
  }

  function closeAdder({ focus = true } = {}) {
    addLi.classList.remove('is-open');
    addButton.setAttribute('aria-expanded', 'false');
    addPanel.hidden = true;
    addPanel.querySelectorAll('[data-field]').forEach((f) => { f.value = ''; });
    if (open === adder) open = null;
    if (focus) addButton.focus();
  }

  function addOwn({ worry, words }) {
    const li = document.createElement('li');
    li.className = 'thought';
    list.insertBefore(li, addLi);
    const t = makeThought(li, { worry, own: words || null, isOwn: true });
    thoughts.push(t);
    return t;
  }

  addButton.addEventListener('click', () => (open === adder ? closeAdder() : openAdder()));

  // Every moment's buttons, in one place.
  const closeAny = (t, opts) => (t.isAdder ? closeAdder(opts) : closeMoment(t, opts));
  root.addEventListener('click', (event) => {
    const control = event.target.closest('[data-act], [data-feel]');
    if (!control || !root.contains(control)) return;
    const li = control.closest('.thought');
    const t = li === addLi ? adder : thoughts.find((x) => x.li === li);

    if (control.dataset.feel && t) {
      t.panel.querySelectorAll('.moment__choice').forEach((b) => b.setAttribute('aria-pressed', String(b === control)));
      // Constant text only (it holds the help link); nothing here is recorded.
      t.panel.querySelector('.moment__reply').innerHTML = REPLIES[control.dataset.feel];
      return;
    }

    switch (control.dataset.act) {
      case 'close': closeAny(t); break;
      case 'write': openWriting(t); break;
      case 'cancel':
        if (t.isAdder) closeAdder();
        else closeWriting(t);
        break;
      case 'use': useWords(t); break;
      case 'suggested':
        t.own = null;
        showCalm(t, { animate: true });
        persist();
        announce(`Another way to put it: ${t.suggested}`);
        t.panel.querySelector('[data-act="write"]').focus();
        break;
      case 'remove': {
        closeMoment(t, { focus: false });
        thoughts.splice(thoughts.indexOf(t), 1);
        t.li.remove();
        persist();
        announce('Thought removed.');
        addButton.focus();
        break;
      }
      case 'add': {
        const worry = addPanel.querySelector('[data-field="thought"]').value.trim();
        const words = addPanel.querySelector('[data-field="words"]').value.trim();
        if (!worry) {
          announce('Write the thought first, then add it.');
          addPanel.querySelector('[data-field="thought"]').focus();
          break;
        }
        closeAdder({ focus: false });
        const added = addOwn({ worry, words });
        persist();
        openMoment(added);
        added.button.focus();
        break;
      }
      case 'delete': deleteNotes(); break;
      default: break;
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-keep]')) setKeep(event.target.checked);
  });

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-field="words"]')) updateCount(event.target);
  });

  // Escape: stop writing first, then close the moment.
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    if (open.isAdder) closeAdder();
    else if (isWriting(open)) closeWriting(open);
    else closeMoment(open);
  });

  // On a phone, keep the box being written in above the on-screen keyboard.
  root.addEventListener('focusin', (event) => {
    if (!event.target.matches('[data-field]') || !window.visualViewport) return;
    setTimeout(() => {
      const box = event.target.getBoundingClientRect();
      const vv = window.visualViewport;
      const bottom = vv.offsetTop + vv.height - 24;
      if (box.bottom > bottom) window.scrollBy({ top: box.bottom - bottom, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }, 350);
  });

  // ---- Deleting everything --------------------------------------------------------

  function clearAll() {
    if (open) closeAny(open, { focus: false });
    for (const t of [...thoughts]) {
      if (t.isOwn) {
        t.li.remove();
        thoughts.splice(thoughts.indexOf(t), 1);
      } else {
        t.own = null;
      }
    }
    root.querySelectorAll('[data-field]').forEach((f) => { f.value = ''; });
  }

  function deleteNotes() {
    clearAll();
    storage.clear();
    keep = false;
    syncKeep();
    deleteBtn.hidden = true;
    notesStatus.textContent = 'Your notes are deleted. Nothing is left on this page or this device.';
    announce('Your notes are deleted.');
    notesStatus.setAttribute('tabindex', '-1');
    notesStatus.focus({ preventScroll: true });
  }

  // Not kept: gone when the page goes, including from the back/forward cache.
  window.addEventListener('pagehide', () => {
    if (!keep) clearAll();
  });

  // ---- Notes kept from an earlier visit (only if they chose to keep them) -------

  const saved = storage.read();
  if (saved) {
    keep = true;
    for (const t of thoughts) {
      if (saved.words?.[t.key]) t.own = String(saved.words[t.key]).slice(0, MAX_WORDS);
    }
    for (const note of saved.own ?? []) {
      if (note?.worry) addOwn({ worry: String(note.worry).slice(0, MAX_THOUGHT), words: String(note.words || '').slice(0, MAX_WORDS) });
    }
  }

  root.append(notesBlock);
  root.classList.add('is-live');
  root.querySelector('.thoughts__intro').hidden = false;
  root.querySelector('.thoughts__hint').hidden = false;
  syncKeep();
  notesBlock.hidden = !hasNotes() && !keep;
  deleteBtn.hidden = !hasNotes() && !keep;
}
