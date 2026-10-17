// The library's chips ("I feel anxious", "I feel low"…): pick one and the
// tiles that might help most are marked, while the rest fade a little. Nothing
// is hidden, nothing moves out of place, and the choice isn't stored or sent
// anywhere. "Show everything" puts it back. Without JS the chips stay hidden
// and every tile simply shows.

const LABELS = {
  anxious: 'when you feel anxious',
  low: 'when you feel low',
  stressed: 'when you feel stressed',
  friend: 'when you want to help a friend',
};

export function initLibrary(root) {
  if (!root) return;
  const chips = root.querySelector('.chips');
  const status = root.querySelector('[data-library-status]');
  const slots = [...root.querySelectorAll('.tile-slot')];
  if (!chips) return;

  const say = (text) => {
    status.textContent = '';
    setTimeout(() => { status.textContent = text; }, 60);
  };

  function show(filter) {
    chips.querySelectorAll('.chip').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
    });
    const matches = [];
    for (const slot of slots) {
      const match = filter !== 'all' && slot.dataset.for.split(/\s+/).includes(filter);
      slot.classList.toggle('is-match', match);
      slot.classList.toggle('is-quiet', filter !== 'all' && !match);
      if (match) matches.push(slot.querySelector('.tile__name').textContent);
    }
    root.classList.toggle('is-filtered', filter !== 'all');
    say(filter === 'all'
      ? 'Showing everything.'
      : `Marked what might help ${LABELS[filter]}: ${matches.join(', ')}. Everything else is still here.`);
  }

  chips.hidden = false;
  chips.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    // Pressing the chip that's already on goes back to everything.
    const on = chip.getAttribute('aria-pressed') === 'true';
    show(on && chip.dataset.filter !== 'all' ? 'all' : chip.dataset.filter);
  });
}
