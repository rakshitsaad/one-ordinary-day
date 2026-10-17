// "Copy number" and "Copy message" on the help page (talk.html).
// The buttons are hidden in the HTML and only shown here, so without JS the
// page is plain, selectable text and tel: links. Copying puts the text on the
// clipboard and nowhere else: nothing is sent, counted or recorded.
// If the browser won't copy (no permission, an old browser, an insecure page),
// the text is selected instead, so the reader can copy it themselves.

const COPIED_FOR = 2500; // ms the button says "Copied"
const SELECTED_FOR = 5000;

export function initCopy(root = document) {
  const status = document.getElementById('copy-status');

  const say = (text) => {
    if (!status) return;
    status.textContent = '';
    setTimeout(() => { status.textContent = text; }, 60);
  };

  for (const button of root.querySelectorAll('.copy-btn')) {
    const label = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    const original = label?.textContent ?? '';
    const isNumber = Boolean(button.dataset.copy);
    let timer = 0;

    const show = (text, ms) => {
      if (label) label.textContent = text;
      clearTimeout(timer);
      timer = setTimeout(() => { if (label) label.textContent = original; }, ms);
    };

    button.hidden = false;
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copySelect);
      // The visible digits (the spaced-out copy is only for screen readers).
      const visible = target?.querySelector('[aria-hidden="true"]') ?? target;
      const text = (button.dataset.copy || visible?.textContent || '').trim();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        show('Copied', COPIED_FOR);
        say(isNumber ? 'Number copied.' : 'Message copied.');
      } catch {
        if (visible) {
          const range = document.createRange();
          range.selectNodeContents(visible);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        show('Selected', SELECTED_FOR);
        say('Couldn’t copy automatically. The text is selected: use your phone’s Copy, or press Control C.');
      }
    });
  }
}
