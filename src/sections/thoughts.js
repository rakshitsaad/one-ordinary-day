import { prefersReducedMotion, scrollGently as scrollToY } from '../scripts/motion.js';

// 4:50 pm: Aarav's anxious thoughts, made personal. "Which of these feels
// closest to something you've thought?" Picking one draws a circle round it and
// lets the others soften, and the thought turns into a calmer version in
// place: the worry stays, smaller and softer but still readable (the feeling
// isn't crossed out or erased), and the calmer words write themselves in just
// beneath it. Then, quietly and only if they want: "What would you tell a
// friend who felt this way?" (the one writing box) and "Does this feel more
// manageable?" (never recorded). Tap another thought to switch, the same one to
// let it go back, or "Start over". "None of these. Let me write my own" adds a
// thought of their own. Without JS the markup is a plain list of worries and
// calmer versions.
//
// PRIVACY: what the reader picks or writes never leaves this browser. No
// network calls, no analytics, no reading or judging the text, and which
// thought they pick is never stored anywhere. Nothing is stored unless they
// tick "Keep my notes on this device"; only then are their words (and their own
// thoughts) kept in localStorage (KEY below), and "Delete my notes" removes them
// at once. "Start over" clears the screen; it never silently deletes kept notes
// (it says they're still kept and points to "Delete my notes"). Unkept notes
// are cleared on pagehide, so the back/forward cache can't bring them back.

const KEY = 'ood-thought-notes';
const MAX_WORDS = 200; // characters for what they'd tell a friend
const MAX_THOUGHT = 120; // characters for a thought of their own

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // --ease-out
const SETTLE = 800; // ms the thoughts take to glide into their new places
const FADE = 450; // ms a calmer version takes to fade back
const WRITE_START = 350; // ms before the calmer words begin (the circle is drawing)
const WRITE_WORD = 700; // ms each word takes to write in
const WRITE_END = 1900; // ms by which the last word has started

const REPLIES = {
  little: 'Small shifts count. A thought that feels a little lighter is a real change, even if it’s still there.',
  'not-really': 'That’s okay. Some thoughts take more than one try, and some are too heavy to sort out alone. Talking to someone can help. <a href="talk.html">Talk to someone</a> or see <a href="talk.html#start-the-conversation">how to start the conversation</a>.',
  unsure: 'That’s okay too. You can come back to this whenever you like.',
};

const PRIVACY = 'What you write stays on this device and is never sent anywhere. Nothing is saved unless you tick “Keep my notes on this device”. “Start over” clears the screen; notes you chose to keep stay until you delete them. On a shared or school computer, it’s best not to save.';
const SAFETY = 'If what you’re feeling is about hurting yourself, please <a href="talk.html">talk to someone right now</a>.';

// A loose loop drawn round the thought that feels closest (stretched to fit).
const CIRCLE = '<svg class="thought__circle" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1000" d="M30 9C78 3 152 4 186 13C198 17 199 34 192 44C181 55 118 57 70 55C30 54 6 48 5 33C4 18 20 9 44 6C62 4 80 5 98 7" /></svg>';

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

// Next to every place they can type: keep (opt-in), privacy, safety.
const privacyBlock = (id) => `
  ${keepToggle(`${id}-keep`)}
  <p class="moment__privacy">${PRIVACY}</p>
  <p class="moment__safety">${SAFETY}</p>`;

// The one writing box: what they'd tell a friend who felt this way.
const friendBox = (id) => `
  <div class="moment__write" hidden>
    <label class="moment__prompt" for="${id}-text">What would you tell a friend who felt this way?</label>
    <textarea class="moment__field moment__text" id="${id}-text" maxlength="${MAX_WORDS}" rows="3" placeholder="you could say…" autocomplete="off" spellcheck="false" data-field="words"></textarea>
    <p class="moment__count" aria-hidden="true">0 of ${MAX_WORDS}</p>
    <div class="moment__actions">
      <button class="moment__btn" type="button" data-act="use">Done</button>
      <button class="moment__link" type="button" data-act="cancel">Never mind</button>
    </div>
    ${privacyBlock(id)}
  </div>`;

const momentMarkup = (id) => `
  <p class="moment__label" data-label>another way to put it</p>
  <p class="moment__calm" data-calm></p>
  <div class="moment__yours" data-yours hidden>
    <p class="moment__label">what you’d tell a friend</p>
    <p class="moment__words" data-words></p>
    <p class="moment__echo">Maybe you could say that to yourself too.</p>
  </div>
  <div class="moment__actions moment__after" data-main-actions>
    <button class="moment__link" type="button" data-act="write">What would you tell a friend who felt this way?</button>
    <button class="moment__link" type="button" data-act="remove" hidden>Remove this thought</button>
    <button class="moment__link" type="button" data-act="close">Close</button>
  </div>
  ${friendBox(id)}
  <div class="moment__reflect moment__after" role="group" aria-labelledby="${id}-q" data-reflect hidden>
    <p class="moment__question" id="${id}-q">Does this feel more manageable?</p>
    <div class="moment__choices">
      <button class="moment__choice" type="button" aria-pressed="false" data-feel="little">A little</button>
      <button class="moment__choice" type="button" aria-pressed="false" data-feel="not-really">Not really</button>
      <button class="moment__choice" type="button" aria-pressed="false" data-feel="unsure">Not sure</button>
    </div>
    <p class="moment__reply" role="status"></p>
  </div>`;

const settleAll = (animations, ms) => Promise.race([
  Promise.all(animations.map((a) => a.finished.catch(() => {}))),
  new Promise((resolve) => { setTimeout(resolve, ms + 150); }),
]);

export function initThoughts(root) {
  if (!root) return;

  const list = root.querySelector('.thoughts__box');
  const status = root.querySelector('[data-thoughts-status]');
  const hint = root.querySelector('.thoughts__hint');
  const limits = root.querySelector('.thoughts__limits');
  const motion = !prefersReducedMotion;

  // ---- State: lives in this page only, unless the reader opts in. -----------------
  const thoughts = []; // { id, li, button, panel, worry, suggested, own, isOwn, key }
  let open = null; // the thought (or the "write my own" box) that's open
  let keep = false;
  let turn = 0; // each pick, return or start over; a newer one takes over

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

  // ---- "Start over", and the notes block (keep / delete) ---------------------------
  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'moment__link thoughts__restart';
  restart.dataset.act = 'restart';
  restart.textContent = 'Start over';
  restart.hidden = true;

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

  // Start over shows while there's something on screen to clear.
  const syncRestart = () => {
    restart.hidden = !(open || (hasNotes() && !keep));
  };

  const persist = () => {
    if (keep) storage.write(snapshot());
    notesBlock.hidden = !hasNotes() && !keep;
    deleteBtn.hidden = !hasNotes() && !keep;
    syncRestart();
  };

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
    syncRestart();
  };

  // ---- Moving gently ----------------------------------------------------------------
  // Every change of layout glides into place (FLIP, transform only): the thoughts
  // move to their new spots, and the picked one shrinks with its circle. Returns
  // where each thought ends up. With reduced motion it simply changes.
  function settle(change) {
    const items = [...list.children];
    const before = new Map(items.map((li) => [li, {
      box: li.getBoundingClientRect(),
      btn: li.querySelector('.thought__open')?.getBoundingClientRect(),
    }]));
    for (const li of items) {
      [li, li.querySelector('.thought__open')].forEach((el) => el?.getAnimations().filter((a) => a.id === 'settle').forEach((a) => a.cancel()));
    }
    change();

    const after = new Map([...list.children].map((li) => [li, li.getBoundingClientRect()]));
    if (!motion) return after;
    for (const [li, box] of after) {
      const was = before.get(li);
      if (!was) {
        li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: SETTLE, easing: EASE }).id = 'settle';
        continue;
      }
      const dx = was.box.left - box.left;
      const dy = was.box.top - box.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        li.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], { duration: SETTLE, easing: EASE }).id = 'settle';
      }
      const btn = li.querySelector('.thought__open');
      const now = btn?.getBoundingClientRect();
      if (now?.width && was.btn?.width) {
        const scale = was.btn.width / now.width;
        if (Math.abs(scale - 1) > 0.03) {
          btn.animate([
            { scale: String(scale), transformOrigin: 'left top' },
            { scale: '1', transformOrigin: 'left top' },
          ], { duration: SETTLE, easing: EASE }).id = 'settle';
        }
      }
    }
    return after;
  }

  // The calmer version and the circle fade back before the thought settles.
  function fadeBack(t) {
    if (!motion || !t) return Promise.resolve();
    const els = [t.panel, t.button.querySelector('.thought__circle')].filter(Boolean);
    return settleAll(els.map((el) => el.animate(
      [{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }],
      { duration: FADE, easing: EASE, fill: 'forwards' },
    )), FADE);
  }

  // Keep the open thought on screen, without ever taking the scroll away.
  function keepInView(box) {
    if (!box) return;
    const room = window.innerHeight - 96; // clear of the garden (the top stays below the top bar)
    if (box.bottom > room) {
      scrollToY(window.scrollY + Math.min(box.bottom - room, Math.max(0, box.top - 80)));
    }
  }

  // ---- Writing words in, as if by hand ------------------------------------------------
  // Word by word, left to right, finished within about two seconds. Returns when
  // the writing is done (ms). The reader's own words only ever go in as text.
  function writeIn(el, text, start) {
    el.replaceChildren();
    if (!text) return 0;
    if (!motion || start == null) {
      el.textContent = text;
      return 0;
    }
    const words = text.split(/\s+/);
    const step = words.length > 1
      ? Math.min(70, Math.max(18, (WRITE_END - start - WRITE_WORD) / (words.length - 1)))
      : 0;
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'moment__word';
      span.style.setProperty('--at', `${Math.round(start + i * step)}ms`);
      span.textContent = word;
      el.append(span, i < words.length - 1 ? ' ' : '');
    });
    return Math.round(start + (words.length - 1) * step + WRITE_WORD * 0.7);
  }

  // What the open thought shows. `animate`: write the calmer version in.
  function showCalm(t, { animate }) {
    const calm = t.panel.querySelector('[data-calm]');
    const yours = t.panel.querySelector('[data-yours]');
    let done = writeIn(calm, t.suggested, animate ? WRITE_START : null);
    calm.hidden = !t.suggested;
    t.panel.querySelector('[data-label]').hidden = !t.suggested;

    yours.hidden = !t.own;
    // Their own thought has no suggestion: their words are the calmer version.
    const words = writeIn(yours.querySelector('[data-words]'), t.own || '', animate && !t.suggested ? WRITE_START : null);
    done = Math.max(done, words);
    yours.style.setProperty('--echo-at', `${done}ms`);

    t.panel.querySelector('[data-act="write"]').textContent = t.own
      ? 'Change what you’d tell a friend'
      : 'What would you tell a friend who felt this way?';
    t.panel.querySelector('[data-act="remove"]').hidden = !t.isOwn;
    t.panel.querySelector('[data-reflect]').hidden = !(t.suggested || t.own);
    t.panel.style.setProperty('--after', `${done}ms`);
  }

  function resetReflection(t) {
    t.panel.querySelectorAll('.moment__choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    t.panel.querySelector('.moment__reply').innerHTML = '';
  }

  // ---- Opening and closing ------------------------------------------------------------

  function expand(t) {
    open = t;
    t.li.classList.add('is-open');
    t.button.setAttribute('aria-expanded', 'true');
    t.panel.hidden = false;
    root.classList.add('has-pick');
    if (t.isAdder) {
      t.panel.querySelectorAll('[data-field]').forEach((f) => { f.value = ''; });
      syncKeep();
    }
  }

  function collapse(t) {
    if (t.isAdder) {
      t.panel.querySelectorAll('[data-field]').forEach((f) => { f.value = ''; });
    } else {
      closeWriting(t, { focus: false });
      resetReflection(t);
    }
    t.li.classList.remove('is-open');
    t.button.setAttribute('aria-expanded', 'false');
    t.panel.hidden = true;
    [t.panel, t.button.querySelector('.thought__circle')].forEach((el) => el?.getAnimations().forEach((a) => a.cancel()));
    if (open === t) open = null;
    if (!open) root.classList.remove('has-pick');
  }

  async function pick(t) {
    if (open === t) return;
    const run = ++turn;
    const prev = open;
    if (prev) {
      await fadeBack(prev);
      if (run !== turn) return;
    }
    const after = settle(() => {
      if (prev) collapse(prev);
      expand(t);
      if (!t.isAdder) showCalm(t, { animate: true });
    });
    syncRestart();
    if (t.isAdder) {
      t.panel.querySelector('[data-field="thought"]').focus();
    } else if (t.suggested || t.own) {
      announce(t.suggested ? `Another way to put it: ${t.suggested}` : `What you’d tell a friend: ${t.own}`);
    }
    keepInView(after.get(t.li));
  }

  async function letGo(t, { focus = true } = {}) {
    if (open !== t) return;
    const run = ++turn;
    await fadeBack(t);
    if (run !== turn) return;
    settle(() => collapse(t));
    syncRestart();
    if (focus) t.button.focus({ preventScroll: true });
  }

  // ---- What they'd tell a friend (the one writing box) -------------------------------

  const isWriting = (t) => !t.isAdder && !t.panel.querySelector('.moment__write').hidden;

  function openWriting(t) {
    const area = t.panel.querySelector('.moment__write');
    const text = area.querySelector('[data-field="words"]');
    area.hidden = false;
    t.panel.querySelector('[data-main-actions]').hidden = true;
    t.panel.querySelector('[data-reflect]').hidden = true;
    t.panel.querySelector('[data-yours]').hidden = true;
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
    if (t.own) {
      // Their words write themselves in, then the echo.
      const yours = t.panel.querySelector('[data-yours]');
      const done = writeIn(yours.querySelector('[data-words]'), t.own, motion ? 0 : null);
      yours.style.setProperty('--echo-at', `${done}ms`);
      announce(`What you’d tell a friend: ${t.own}. Maybe you could say that to yourself too.`);
    }
    persist();
    t.panel.querySelector('[data-act="write"]').focus();
  }

  // Counter: quiet on screen, and only spoken when it matters.
  function updateCount(field) {
    const count = field.closest('.moment__write')?.querySelector('.moment__count');
    if (!count) return;
    const left = MAX_WORDS - field.value.length;
    count.textContent = `${field.value.length} of ${MAX_WORDS}`;
    count.classList.toggle('is-near', left <= 20);
    if (left === 20 || left === 0) announce(left ? '20 characters left' : 'That’s the most this box takes');
  }

  // ---- Building a thought -------------------------------------------------------------

  function makeThought(li, { worry, suggested = '', own = null, isOwn = false, key = null }) {
    const id = nextId('moment');
    const t = { id, li, worry, suggested, own, isOwn, key };

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thought__open';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.innerHTML = CIRCLE;
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
    button.addEventListener('click', () => (open === t ? letGo(t) : pick(t)));
    return t;
  }

  // ---- Turn the list into thoughts you can pick -----------------------------------

  [...list.querySelectorAll('.thought')].forEach((li, i) => {
    const worry = li.querySelector('.thought__worry').textContent.trim();
    const suggested = li.querySelector('.thought__calm').textContent.trim();
    thoughts.push(makeThought(li, { worry, suggested, key: `t${i + 1}` }));
  });

  // "None of these. Let me write my own": the thought itself, then the same
  // friend box as every other thought (offered, never pushed).
  const addLi = document.createElement('li');
  addLi.className = 'thought thought--add';
  const addId = nextId('add');
  addLi.innerHTML = `
    <button class="thought__open thought__open--add" type="button" aria-expanded="false" aria-controls="${addId}">None of these. Let me write my own</button>
    <div class="moment" id="${addId}" hidden>
      <div class="moment__write">
        <label class="moment__prompt" for="${addId}-thought">What’s the thought?</label>
        <input class="moment__field" id="${addId}-thought" type="text" maxlength="${MAX_THOUGHT}" autocomplete="off" spellcheck="false" enterkeyhint="done" data-field="thought" />
        <div class="moment__actions">
          <button class="moment__btn" type="button" data-act="add">Add it</button>
          <button class="moment__link" type="button" data-act="cancel">Never mind</button>
        </div>
        ${privacyBlock(addId)}
      </div>
    </div>`;
  list.append(addLi);
  const addButton = addLi.querySelector('.thought__open');
  const adder = { li: addLi, button: addButton, panel: addLi.querySelector('.moment'), isAdder: true };
  addButton.addEventListener('click', () => (open === adder ? letGo(adder) : pick(adder)));

  function addOwn({ worry, words }) {
    const li = document.createElement('li');
    li.className = 'thought';
    const t = makeThought(li, { worry, own: words || null, isOwn: true });
    list.insertBefore(li, addLi);
    thoughts.push(t);
    return t;
  }

  function addFromBox() {
    const field = adder.panel.querySelector('[data-field="thought"]');
    const worry = field.value.trim();
    if (!worry) {
      announce('Write the thought first, then add it.');
      field.focus();
      return;
    }
    ++turn;
    let added;
    const after = settle(() => {
      collapse(adder);
      added = addOwn({ worry });
      expand(added);
      showCalm(added, { animate: false });
    });
    persist();
    added.button.focus({ preventScroll: true });
    announce(`Added your thought: ${worry}. If you like, say what you’d tell a friend who felt this way.`);
    keepInView(after.get(added.li));
  }

  // ---- Start over: everything back as it was ---------------------------------------
  // Clears the screen: no thought picked, no circle, every box closed and empty.
  // Words that were never saved go too. Kept notes are never deleted silently:
  // they stay saved, and the notes block says so, next to "Delete my notes".
  async function startOver() {
    const run = ++turn;
    const t = open;
    if (t) {
      await fadeBack(t);
      if (run !== turn) return;
    }
    const kept = keep && hasNotes();
    settle(() => {
      if (t) collapse(t);
      if (!keep) clearNotes();
      root.querySelectorAll('[data-field]').forEach((f) => { f.value = ''; });
    });
    persist();
    if (kept) {
      notesBlock.hidden = false;
      deleteBtn.hidden = false;
      notesStatus.textContent = 'Back to the start. The notes you chose to keep are still saved on this device; “Delete my notes” removes them.';
    }
    announce(kept
      ? 'Back to the start. Your saved notes are still kept on this device.'
      : 'Back to the start. All the thoughts are as they were.');
    thoughts[0]?.button.focus({ preventScroll: true });
  }

  // Their words and their own thoughts, from the page (not from storage).
  function clearNotes() {
    for (const t of [...thoughts]) {
      if (t.isOwn) {
        t.li.remove();
        thoughts.splice(thoughts.indexOf(t), 1);
      } else {
        t.own = null;
      }
    }
  }

  // ---- Every button, in one place ---------------------------------------------------

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
      case 'close': letGo(t); break;
      case 'write': openWriting(t); break;
      case 'cancel':
        if (t.isAdder) letGo(t);
        else closeWriting(t);
        break;
      case 'use': useWords(t); break;
      case 'add': addFromBox(); break;
      case 'remove': {
        ++turn;
        settle(() => {
          collapse(t);
          thoughts.splice(thoughts.indexOf(t), 1);
          t.li.remove();
        });
        persist();
        announce('Thought removed.');
        addButton.focus({ preventScroll: true });
        break;
      }
      case 'restart': startOver(); break;
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

  root.addEventListener('keydown', (event) => {
    // Enter in "What's the thought?" adds it.
    if (event.key === 'Enter' && event.target.matches('[data-field="thought"]') && !event.isComposing) {
      event.preventDefault();
      addFromBox();
      return;
    }
    // Escape: stop writing first, then let the thought go back.
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    if (isWriting(open)) closeWriting(open);
    else letGo(open);
  });

  // Keep the box being written in visible: above the on-screen keyboard on a
  // phone, and below the fixed top bar (with "Talk to someone") everywhere.
  root.addEventListener('focusin', (event) => {
    if (!event.target.matches('[data-field]')) return;
    setTimeout(() => {
      const box = event.target.getBoundingClientRect();
      const bar = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
      const vv = window.visualViewport;
      const bottom = vv ? vv.offsetTop + vv.height - 24 : window.innerHeight - 24;
      const behavior = prefersReducedMotion ? 'auto' : 'smooth';
      if (box.top < bar + 16) window.scrollBy({ top: box.top - bar - 16, behavior });
      else if (box.bottom > bottom) window.scrollBy({ top: Math.min(box.bottom - bottom, box.top - bar - 16), behavior });
    }, 350);
  });

  // ---- Deleting everything ------------------------------------------------------------

  function clearAll() {
    ++turn;
    if (open) collapse(open);
    clearNotes();
    root.querySelectorAll('[data-field]').forEach((f) => { f.value = ''; });
    syncRestart();
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

  list.after(restart);
  (limits ?? status).before(notesBlock);
  if (hint) list.setAttribute('aria-labelledby', hint.id);
  root.classList.add('is-live');
  root.querySelector('.thoughts__intro').hidden = false;
  if (hint) hint.hidden = false;
  syncKeep();
  notesBlock.hidden = !hasNotes() && !keep;
  deleteBtn.hidden = !hasNotes() && !keep;
  syncRestart();
}
