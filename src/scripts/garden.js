import { onCare } from './care.js';

// A small garden in the bottom-right corner. Finishing the breathing exercise,
// the 5-4-3-2-1, or the whole story sprouts a new plant. No points, no streaks,
// no numbers on screen: clicking it just says how often you looked after
// yourself today. Only "what was finished, and when" is kept, in this browser.

const KEY = 'ood-garden';
const KEEP = 100; // remembered plants (older ones are forgotten quietly)
const SHOWN = 9; // plants that fit in the corner
// Where each plant grows along the ground (SVG x), in planting order, so the
// garden fills out from the middle. The 10th plant replaces the 1st, and so on.
const SLOTS = [60, 38, 82, 27, 93, 49, 71, 16, 104];
const GROUND = 50;
const STORY_DWELL = 1200; // ms a chapter must stay centred to count as read

// --- Storage: never let a blocked or full localStorage break the page. -------

const store = {
  read() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (!Array.isArray(data?.plants)) return [];
      return data.plants.filter((p) => typeof p?.k === 'string' && Number.isFinite(p?.t));
    } catch {
      return [];
    }
  },
  write(plants) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, plants: plants.slice(-KEEP) }));
    } catch {
      // Private browsing or storage full: the garden still grows, it just won't remember.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing to do
    }
  },
};

// --- Plants: tiny hand-drawn shapes growing up from (0, 0). ------------------

const petals = Array.from({ length: 5 }, (_, i) => {
  const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
  return `<circle class="plant__petal" cx="${(Math.cos(a) * 3).toFixed(2)}" cy="${(-22 + Math.sin(a) * 3).toFixed(2)}" r="2.3" />`;
}).join('');

const PLANTS = {
  // Take a minute: a two-leaf sprout.
  breathing: `
    <path class="plant__stem" pathLength="100" d="M0 0 C 0 -6, 1 -10, 0 -16" />
    <path class="plant__leaf plant__leaf--l" style="--d: 0.7s" d="M0 -9 C -6 -11, -9 -16, -8 -19 C -3 -18, 0 -14, 0 -9 Z" />
    <path class="plant__leaf plant__leaf--r" style="--d: 0.9s" d="M0 -12 C 5 -15, 9 -17, 9 -21 C 4 -21, 1 -17, 0 -12 Z" />`,
  // 5-4-3-2-1: a small flower.
  grounding: `
    <path class="plant__stem" pathLength="100" d="M0 0 C 1 -7, -1 -13, 0 -19" />
    <path class="plant__leaf plant__leaf--r" style="--d: 0.7s" d="M0 -7 C 4 -8, 6 -11, 6 -13 C 3 -13, 1 -11, 0 -7 Z" />
    <g class="plant__bloom" style="--d: 1s">${petals}<circle class="plant__centre" cx="0" cy="-22" r="1.6" /></g>`,
  // The whole story: a tuft of grass.
  story: `
    <path class="plant__stem" pathLength="100" d="M0 0 C -1 -6, -4 -10, -6 -14" />
    <path class="plant__stem" pathLength="100" style="--d: 0.25s" d="M0 0 C 0 -7, 1 -12, 1 -18" />
    <path class="plant__stem" pathLength="100" style="--d: 0.5s" d="M0 0 C 2 -5, 5 -8, 8 -11" />`,
};

// Small, stable variety per plant (size and lean), from when it was planted.
const vary = (t, salt) => {
  const x = Math.sin(t * 0.0001 + salt * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function plantMarkup(plant, index, isNew) {
  const x = SLOTS[index % SLOTS.length];
  const scale = (0.85 + vary(plant.t, 1) * 0.3).toFixed(2);
  const lean = (vary(plant.t, 2) * 8 - 4).toFixed(1);
  const sway = (-(index * 1.3) % 7).toFixed(1);
  return `<g class="plant${isNew ? ' is-new' : ''}" transform="translate(${x} ${GROUND}) scale(${scale})">`
    + `<g class="plant__body" style="--lean: ${lean}deg; --sway-delay: ${sway}s">${PLANTS[plant.k] ?? PLANTS.breathing}</g></g>`;
}

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function messageFor(plants) {
  if (plants.length === 0) {
    return ['nothing planted yet.', 'Finish a breathing exercise, the 5-4-3-2-1, or the whole story, and something small will grow here.'];
  }
  const today = plants.filter((p) => sameDay(p.t, Date.now())).length;
  if (today === 0) return ['your garden is still here, quietly growing.', 'Come back whenever you need to.'];
  const times = today === 1 ? 'once' : today === 2 ? 'twice' : `${today} times`;
  return [`you took care of yourself ${times} today.`, ''];
}

// --- The widget ------------------------------------------------------------

export function initGarden(timeline, mount) {
  let plants = store.read();

  const garden = document.createElement('div');
  garden.className = 'garden';
  garden.innerHTML = `
    <button class="garden__button" type="button" aria-expanded="false" aria-controls="garden-note">
      <span class="visually-hidden">Your garden</span>
      <svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">
        <path class="garden__ground" d="M6 50 C 30 47, 62 53, 114 49" />
        <ellipse class="garden__seed" cx="60" cy="48.5" rx="2.4" ry="1.6" />
        <g class="garden__plants"></g>
      </svg>
    </button>
    <div class="garden__note" id="garden-note">
      <p class="garden__message"></p>
      <p class="garden__detail"></p>
      <p class="garden__privacy">Your garden lives only in this browser. Nothing is sent anywhere.</p>
      <button class="garden__clear" type="button">clear my garden</button>
    </div>
    <p class="visually-hidden" aria-live="polite"></p>`;
  mount.append(garden);

  const button = garden.querySelector('.garden__button');
  const layer = garden.querySelector('.garden__plants');
  const seed = garden.querySelector('.garden__seed');
  const note = garden.querySelector('.garden__note');
  const message = garden.querySelector('.garden__message');
  const detail = garden.querySelector('.garden__detail');
  const clear = garden.querySelector('.garden__clear');
  const live = garden.querySelector('[aria-live]');

  function render() {
    const start = Math.max(0, plants.length - SHOWN);
    layer.innerHTML = plants
      .slice(start)
      .map((plant, i) => plantMarkup(plant, start + i, false))
      .join('');
    seed.style.display = plants.length ? 'none' : '';
  }

  // Add just the new plant, so the others keep swaying undisturbed. The oldest
  // one shown shares its spot, so it quietly makes room.
  function sproutNewest() {
    const index = plants.length - 1;
    layer.querySelectorAll('.plant.is-new').forEach((p) => p.classList.remove('is-new'));
    layer.insertAdjacentHTML('beforeend', plantMarkup(plants[index], index, true));
    while (layer.children.length > SHOWN) layer.firstElementChild.remove();
    seed.style.display = 'none';
  }

  function writeMessage() {
    const [main, extra] = messageFor(plants);
    message.textContent = main;
    detail.textContent = extra;
    detail.hidden = !extra;
    clear.hidden = plants.length === 0;
  }

  let announceTimer = 0;
  const announce = (text) => {
    clearTimeout(announceTimer);
    live.textContent = '';
    announceTimer = setTimeout(() => { live.textContent = text; }, 60);
  };

  function plant(kind) {
    plants = [...plants, { k: kind, t: Date.now() }].slice(-KEEP);
    store.write(plants);
    sproutNewest();
    writeMessage();
    announce('Something new is growing in your garden.');
  }

  // --- Open / close the little note ------------------------------------------
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  let confirming = false;

  function resetClear() {
    confirming = false;
    clear.textContent = 'clear my garden';
  }
  function open() {
    writeMessage();
    resetClear();
    button.setAttribute('aria-expanded', 'true');
    garden.classList.add('is-open');
  }
  function close({ returnFocus = false } = {}) {
    if (!isOpen()) return;
    button.setAttribute('aria-expanded', 'false');
    garden.classList.remove('is-open');
    if (returnFocus) button.focus();
  }

  button.addEventListener('click', () => (isOpen() ? close() : open()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close({ returnFocus: true });
  });
  document.addEventListener('pointerdown', (e) => {
    if (!garden.contains(e.target)) close();
  });
  garden.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !garden.contains(e.relatedTarget)) close();
  });

  // Clearing asks once more, gently, before it forgets everything.
  clear.addEventListener('click', () => {
    if (!confirming) {
      confirming = true;
      clear.textContent = 'tap again to clear it';
      return;
    }
    plants = [];
    store.clear();
    render();
    writeMessage();
    resetClear();
    announce('Your garden is cleared.');
    button.focus();
  });

  // Another tab changed the garden: catch up quietly.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY && e.key !== null) return;
    plants = store.read();
    render();
    writeMessage();
  });

  // --- What grows a plant ---------------------------------------------------
  onCare((kind) => plant(kind));
  watchStory(timeline, () => {
    // Reading the story grows at most one plant a day.
    if (!plants.some((p) => p.k === 'story' && sameDay(p.t, Date.now()))) plant('story');
  });

  render();
  writeMessage();
}

// The story counts as read once most chapters have each stayed centred for a
// moment, and the reader then settles on the last one (11:45 pm). Jumping
// straight to the end doesn't count.
function watchStory(timeline, onRead) {
  const last = timeline.sections.length - 1;
  if (last < 1) return;
  const read = new Set();
  let current = -1;
  let since = 0;
  let timer = 0;
  let done = false;

  timeline.subscribe(({ index, t }) => {
    if (done) return;
    const nearest = t < 0.5 ? index : Math.min(index + 1, last);
    if (nearest === current) return;
    if (current !== -1 && performance.now() - since >= STORY_DWELL) read.add(current);
    current = nearest;
    since = performance.now();
    clearTimeout(timer);
    if (nearest === last) {
      timer = setTimeout(() => {
        // Allow one chapter to have been skimmed.
        if (current === last && read.size >= last - 1) {
          done = true;
          onRead();
        }
      }, STORY_DWELL);
    }
  });
}
