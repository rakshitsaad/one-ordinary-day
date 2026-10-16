// A tiny shared signal: "the reader just finished something kind for
// themselves". Sections announce it; the garden listens. Kinds:
// 'breathing' (Take a minute), 'grounding' (5-4-3-2-1), 'story' (read to 11:45 pm).

const EVENT = 'ood:took-care';

export function tookCare(kind) {
  document.dispatchEvent(new CustomEvent(EVENT, { detail: { kind } }));
}

export function onCare(handler) {
  document.addEventListener(EVENT, (event) => handler(event.detail.kind));
}
