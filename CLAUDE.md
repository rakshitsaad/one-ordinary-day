# One Ordinary Day

A youth mental health awareness website. The visual reference is [reference/one-day.html](reference/one-day.html), a single-file prototype. Use it as the source of truth for look, feel and tone. Rebuild it properly in the stack below rather than copying it wholesale.

## Concept

The site follows a 17-year-old student through one day, from **6:40 am to 11:45 pm**. As the user scrolls, the colours of the whole site blend smoothly from dawn to night. That colour change is the progress bar.

- Each story section is `<section class="chapter" id="<stop>" data-stop="<stop>">` and contains `<time class="time" datetime="HH:MM">`. The colour blend, the dial clock and the jump menu all read from these, so a new chapter only needs this markup.
- [src/scripts/day-timeline.js](src/scripts/day-timeline.js) tracks which two sections the reader is between and how far along. A section counts as reached when its centre is at the centre of the screen. [day-colors.js](src/scripts/day-colors.js) and [sky-dial.js](src/scripts/sky-dial.js) subscribe to it; don't measure scroll position separately.
  - It re-measures on every ScrollTrigger refresh, and also whenever `<main>`'s height changes (a ResizeObserver calling `ScrollTrigger.refresh(true)`). On touch devices ScrollTrigger ignores height-only resizes under 25% (`ignoreMobileResize`, kept on so the URL bar doesn't refresh everything), so without this a split screen or foldable resize left stale anchors and moved the sunset→dusk flip onto story text. The URL bar doesn't change `<main>`'s height (nothing in it uses `dvh`), so it still shifts the anchors by half the toolbar height (~30px), which the interlude's margins absorb. Don't add `dvh` inside `<main>`, or every URL-bar change will refresh.
- Colours blend between neighbouring stops with smoothstep easing. They are exactly a section's stop when that section is centred.
- Drive everything through CSS custom properties on `:root` so every element follows the day automatically. Never hard-code a colour in a component.
  - `--bg`, `--fg`: page background and main text.
  - `--soft`: secondary body text (held at 4.5:1 or better).
  - `--accent`: decoration only (underlines, dots, strokes). Fails contrast as text at some stops.
  - `--accent-text`: accent-coloured text, **large sizes only** (24px+). Held at 3:1 or better by mixing toward `--fg`. Also used for focus rings and the dial's sun.
  - `--particle`: particle colour. Canvas code reads `dayColors` from `day-colors.js` instead of the CSS variable.
- Text colours can't blend smoothly across the sunset→dusk flip (dark text on light turning into light text on dark): halfway through, text and background would be the same colour. So the text swaps at the point where both colours read equally, and the background blend is squeezed into the middle 40% of that segment. No palette colours can hold 4.5:1 at the exact midpoint (text drops below 4.5:1 from about 50% to 58% of the segment, at worst 3.63:1), so: (1) an empty `.interlude` (`aria-hidden`) sits between sunset and dusk, so the flip happens while no body text is on screen (the 9:30 pm time and heading can be, and pass 3:1 as large text). It's a full screen of evening sky (100svh), or 70svh from 48rem wide and 50rem tall. On phones and short screens the chapters' text is taller than their min-height, so only their 14vh padding adds to the gap, and 70svh left the 7:10 pm and 9:30 pm paragraphs 0–40px from the screen edge during the dip; (2) fixed controls in `.site-header` read `--ui-*` colours, which day-colors.js holds at the nearest stop across the flip (they never blend through it). Measured at 360×640, 360×780, 768×1024 and 1280×800: all story text ≥4.5:1 (large ≥3:1) at every scroll position, with at least 83px of sky between the dip and the nearest paragraph; fixed controls ≥6.89:1 through the flip. When re-measuring after a resize, no reload is needed, but wait about a second for the refresh (the Browser pane can render at ~5 fps), and do reload when emulation crosses 768px wide: switching mobile emulation on or off can leave a stale page-scale `innerHeight` that skews the anchors. Keep the interlude empty, and keep both behaviours if you touch the blend code.
- **Sky dial** (top right, [sky-dial.js](src/scripts/sky-dial.js)): a sun travels a dotted arc and the clock shows the story time, rounded to 5 minutes. After 8 pm the sun slowly becomes a crescent moon (a mask circle slides over it), fully formed by 11 pm. Clicking the dial opens a jump-to-time menu.
  - Accessibility: it's a disclosure button (`aria-expanded`, `aria-controls`) with a `<nav>` list of links. Its name includes the visible clock text ("6:40 am, jump to a time of day"), and the current time is marked with `aria-current="time"`. Arrow keys, Home and End move through the items; Escape closes and returns focus to the button. Tabbing out or clicking outside also closes it.
- **In-page links** ([in-page-links.js](src/scripts/in-page-links.js)) handle every `#link`, including the dial menu and the night card's `#help`. ("Talk to someone" is a normal link to `talk.html`.) They scroll so the target chapter is centred, then move focus to its heading, or to the target element itself. Keep Lenis's `anchors` option off, or it will fight this.
- **Particles** ([particles.js](src/scripts/particles.js)): one fixed canvas behind the content and under the grain. Dust in the current particle colour drifts slowly upward and is gently pushed away by a mouse cursor (fine pointers only). The `NIGHT` and `FIREFLIES` tables in that file set, per stop, how star-like the dust is and how many fireflies are out. Values blend between stops, so dust turns into slow, twinkling stars from dusk to night, and fireflies fade in around dusk.
  - Performance: about 1 mote per 12,000 px² (max 110) and 9 fireflies on desktop; about 1 per 16,000 px² (max 40) and 4 fireflies on phones. Canvas resolution is capped at 2× (1.5× on phones). Pre-rendered sprites are used instead of per-particle gradients. The loop stops when the tab is hidden.
  - Reduced motion: no animation loop. One still frame is drawn whenever the colours change (on scroll) or the window resizes.
  - Twinkle and firefly pulses are smooth sine waves of 3s or longer. Never make them flash.

## Colour stops

| Stop      | Time     | Background | Text      | Accent    | Particles |
|-----------|----------|------------|-----------|-----------|-----------|
| dawn      | 6:40 am  | `#F3E6DA`  | `#3A2E2A` | `#D99A7A` | `#E8B89A` |
| morning   | 8:15 am  | `#EDF2E9`  | `#26332B` | `#6F9B7B` | `#B9CFAE` |
| midday    | 1:30 pm  | `#E2F0EE`  | `#1C3A3C` | `#3F8D89` | `#A9D3CE` |
| afternoon | 4:50 pm  | `#F5E6C6`  | `#3B2F1A` | `#B9802A` | `#E9C77E` |
| sunset    | 7:10 pm  | `#F1C2A6`  | `#3A1F1A` | `#A9483A` | `#F6DCC3` |
| dusk      | 9:30 pm  | `#5A4A6D`  | `#F3ECF7` | `#EDBBA1` | `#C9B8D6` |
| night     | 11:45 pm | `#162137`  | `#E8EDF6` | `#F0D9A0` | `#F6EFD8` |

Don't add colours outside this palette except tints made by mixing these (for example `color-mix()` of `--fg` into `--bg` for borders and surfaces).

## Typography

- **Instrument Serif** for headlines. Use the italic (coloured with `--accent-text`) only for a word that really carries the line, and rarely: today only the title ("ordinary") and "loud" at 4:50 pm. Other headlines use an ink underline or circle, or nothing. An italic accent on the last words of every heading was the most template-looking thing on the site.
- **Figtree** for body text.
- **Caveat** for handwritten margin notes and times.
- Keep body text to about 60 characters per line (`max-width: ~58–60ch`).
- **Fonts are self-hosted**, never from Google Fonts: their stylesheet blocked the first paint by ~0.85s on mobile. Latin woff2 files (Fontsource 5.3.0, OFL licences alongside) live in `src/assets/fonts/`, declared in [fonts.css](src/styles/fonts.css).
  - Each `--font-*` stack in tokens.css lists size-matched fallbacks ("Figtree Fallback: Arial", then Helvetica Neue, then Roboto; Times New Roman / Georgia / Noto Serif for Instrument Serif). They use `size-adjust` and ascent/descent overrides generated with `@capsizecss/core`. Regenerate them if a font changes.
  - Instrument Serif and Caveat use `font-display: swap`. With the matched fallbacks, heading heights don't change on swap (measured).
  - Figtree uses `font-display: optional`, because paragraphs can still wrap one line differently in Arial. It's preloaded, so it's almost always ready for the first paint; if not, the visit keeps the fallback rather than reflowing.
  - Both pages preload Figtree and Instrument Serif regular (`<link rel="preload" href="/src/assets/fonts/...">`; Vite hashes it to match the CSS). Don't preload more: it competes with the CSS.

## Motion

- Slow and calm. Ease-out curves, 0.8 to 1.4 seconds.
- Breathing loops run 6 to 8 seconds.
- No bouncy springs, no fast parallax, no scroll-jacking, no autoplay sound, no flashing.
- Every curve is an ease-out that never overshoots: `--ease-out` (cubic-bezier(0.22, 1, 0.36, 1)), GSAP `power2.out` / `power3.out`, Lenis easeOutCubic. Never use back, elastic, bounce or spring eases, or any cubic-bezier with a y value above 1.
- **Micro-interactions** ([interactions.css](src/styles/interactions.css), imported last; [interactions.js](src/scripts/interactions.js); [page-transition.js](src/scripts/page-transition.js)):
  - Buttons (`.talk`, `.breathe`, `.breath__go`, `.page__btn`, `.myths__arrow`, `.dial__button`, `.garden__button`, `.talk-end__home`) lift 2px on hover (fine pointers, motion allowed; only the solid pills `.talk`, `.dial__button` and `.garden__button` also get a soft shadow, and the hand-drawn buttons swell their highlighter instead) and compress to `scale: 0.97` on press. Pills only compress; myth notes rise 4px on hover. These use the individual `translate` / `scale` properties so they compose with existing transforms. interactions.css replaces each component's `transition` list, so add a component's own transitioned properties there too.
  - Exceptions to the 0.8–1.4s rule, on purpose: the press compresses in 0.25s so it registers under the finger, and leaving a page fades out in 0.5s so getting to help never feels delayed.
  - Text links (`a:not([class])`, `a.note`, `.talk-top__back`, `.talk-end__breathe`, `.myth__again`, `.garden__clear`) keep a faint resting underline (so they read as links without hover); on hover or keyboard focus a solid 1.5px line draws in from the left.
  - A soft ring (64px, at most 40% opacity, 0.9s) spreads where you click or tap. Not for keyboard clicks (`event.detail === 0`), not in text inputs, and off with reduced motion.
  - Page changes fade through the current background colour: the old page fades into its own `--bg` (0.5s), stores that colour in sessionStorage, and the next page starts as that colour and dissolves in (0.9s). The arriving half is a small inline `<style>` + `<script>` in **each page's `<head>`** (copy it into any new page), so the veil exists on first paint. Its own timers always reveal the page, even if the scripts fail. Same-page `#` links, other sites, `tel:`, new tabs and modified clicks are never intercepted; the Back button clears any leftover veil (`pageshow`). Off with reduced motion.
- Always respect `prefers-reduced-motion`. When it's set, turn off Lenis, reveals, drifting and breathing loops. Content must be fully readable with no motion at all. The colour change can stay because it follows the user's own scroll.

## Accessibility rules (from the full review)

- Contrast is AA at every stop *and* every blend position. Re-check with a scroll scan after any colour, layout or spacing change near sunset→dusk.
- Never transition `background-color` or `color` on anything whose colours follow the day (the header pills, buttons with `var(--fg)`/`var(--bg)` backgrounds): text changes instantly on scroll, so a lagging background drops contrast mid-blend.
- `html` has `scroll-padding-top: 5rem` and `scroll-padding-bottom: 6rem`, so focused elements never hide under the fixed dial, Talk pill or garden (WCAG 2.4.11).
- Tap targets: at least 44px tall for every button, call link and standalone link (`a.note`, helpline numbers included). Inline links inside paragraphs are exempt.
- Full-width strips: measure from a size container (`container-type: inline-size`, `100cqw`), never `100vw`, which includes the desktop scrollbar and overflows the page.
- A button's accessible name must contain its visible text (voice control). Put extra hints in a `.visually-hidden` span, not an `aria-label` that rewords the visible words.
- Reduced motion, as verified: no Lenis, a still particle frame, no reveals or hidden states, no drift, sway, orb, ripple, hover lift or page fade, all transitions effectively instant, and no CSS animation left running. The only motion is the breathing ring while an exercise the user started is running, plus the scroll-driven colour change.
- Every interactive element has a visible `:focus-visible` indicator (`--accent-text`, 3:1 against the page), or a documented custom one: the thought text outline, and the notebook writing line, which is 50% `--fg` at rest so it meets 3:1.

## Design rules (from the design review)

- **Desktop layout (64rem and up) is an editorial 12-column grid**, not a centred column ([sections.css](src/styles/sections.css)). Each chapter sets `--col` (its text columns), `--note-col` / `--note-row` (where its margin note hangs) and `--note-tilt`, plus its own `--pad`. The reading line moves left and right down the day; keep neighbouring chapters on different columns. Dawn is a full-height cover with the title low. Tools put the text on one side and the tool on the other (`grid-template-rows: auto auto auto 1fr`, so the tall side doesn't spread the text out). Phones stay one column.
- Sunset and dusk keep `min-height: 92svh` and `padding-block: 14vh` on desktop. Together with the `.interlude`, that keeps text off screen during the colour flip.
- The myths strip still assumes `.chapter__inner` is centred in the section and the deck spans `1 / -1`. Keep both, or redo the full-bleed calc.
- **Facts** each have their own layout:
  - `.fact--hang`: the number hangs in a left column.
  - `--aside`: narrow and right-leaning, with a pencil rule.
  - `--big`: a huge number with the sentence tucked beside it.
  - `--compare`: two hand-drawn bars (`aria-hidden`) with the full sentence below.

  The number is a `.fact__figure` span inside the sentence, so it reads as one line without CSS. Give a new fact a different layout from its neighbours, not a copy.
- **Buttons** in the page ([buttons.css](src/styles/buttons.css)) are a pen loop around the words: an SVG mask in `currentColor` with `vector-effect: non-scaling-stroke`. Main actions get an 18% `--accent` highlighter behind them (text measured at 8:1 or better). Only the fixed `.talk` pill stays solid (with the dial and garden), so help is always the strongest thing on screen. Forced-colours mode swaps the loop for a real border.
- **Margin notes** (`.note`) start with a small pen mark, not a shared dash: a short arrow (the default), `.note--tick` or `.note--squiggle` ([sections.css](src/styles/sections.css)), an SVG mask in `currentColor` like the buttons. Pick the mark that suits the line and differs from the notes either side; link notes that already end in ↓ never take the arrow. Down the story today: squiggle, tick, arrow, squiggle, arrow, squiggle, tick.
- **Footer** (`.site-footer`): a sign-off in Caveat ("lights off. asleep before midnight, this time.") and a short colophon saying what the project is and who it's for, that Aarav is made up and when the numbers were checked, with a link to talk.html. It lines up with the chapter column on phones and tablets; from 64rem it's on the 12-column grid, left-aligned (sign-off in columns 1–4, colophon in 6–11). On talk.html it stays in the page's 40rem column and links back to the story. Never a one-line "awareness project" tagline. If the check date in the talk page changes, update the footer's month too.
- **Copy tells to avoid** (all removed in the review):
  - Headings with an italic accent tail.
  - Eyebrow kickers on non-story sections (`.time` is only for real story times).
  - The `X isn't Y; it's Z` construction.
  - Stock phrases: "you're not alone", "highlight reel", "loops can be broken", "right here, right now", "you deserve to be heard", "that's it, that's the whole thing".
  - Narration that explains the lesson after a scene ("that one honest line is where the day starts to turn"). Show the next small moment instead, and let margin notes do the friend-talking.

## Never use

- Purple-to-blue gradients
- Glassmorphism cards everywhere
- Neon glows
- Emoji as icons
- Pure white (`#FFF`) or pure black (`#000`)
- Generic stock illustrations
- Bootstrap or default Tailwind looks
- Everything centered (use left-aligned, editorial layouts)
- The same rounded card on every block

## Always

- A subtle paper grain overlay (the reference uses an SVG `feTurbulence` noise at about 5% opacity, fixed and `pointer-events: none`).
- Hand-drawn SVG touches: underlines, circles, arrows. Draw them in with `stroke-dashoffset` as they come into view.
  - In copy, wrap words in `<span class="mark">` for an underline or `<span class="circle">` for a circle. Nothing else is needed. [ink.js](src/scripts/ink.js) builds the SVG in real pixels for each word and rebuilds it on resize, so strokes never stretch. Without JS, [ink.css](src/styles/ink.css) draws a finished static stroke with a CSS mask.
  - Ink paths use `pathLength="1000"`, not 1: GSAP tweens `stroke-dashoffset` in whole pixels, so 0–1 would jump straight to drawn.

- Warm, conversational copy, written like a friend talking. Plain words, short sentences, no clinical or preachy tone.
- A **"Talk to someone"** button visible on every page: fixed bottom-left, high-contrast, at least 44px tall, clear of the safe-area insets. On the story it opens `talk.html`; on `talk.html` it jumps to `#helplines`.

## Sections and features

### 4:50 pm thoughts ([thoughts.js](src/sections/thoughts.js), [thoughts.css](src/styles/thoughts.css))

- The markup in index.html is a `<ul>` of `<li class="thought">` items, each holding `.thought__worry` and `.thought__calm`. Without JS it reads as a list of worry → reframe. To add or edit a thought, just edit that list; keep worries short and reframes kind and realistic, never "everything will be fine".
  - Reframes are what Aarav could actually say to himself today, not poster slogans ("everyone moves at their own pace", "resting isn't wasting"). Tie them to his day where you can (asleep at 2:10, Kabir, boards in four months, rank 214) and don't stack the tidy "X, not Y" contrast; one in the list is plenty.
  - Length: keep each reframe to one line on a phone (about 35 characters, 222px of Instrument Serif italic at 375px). A reframe that wraps makes its thought taller and covers the worry underneath. Today only "then I’ll find a plan B…" and "four months to boards…" wrap.
- With JS, thoughts come into focus one at a time (every 0.9–1.5s), only while the box is on screen. They overlap and drift on a 7s loop. Tapping one softly pops it (a faint ring) into its reframe, which then sinks below the remaining worries. "Breathe with me" guides one breath (4s in, 6s out) while every thought fades on its own beat, then shows "one breath at a time." and offers "Start over".
- Touch: only the visible text takes taps (`pointer-events`), so a hidden reframe never blocks a thought underneath. Every target is at least 44px tall, with `touch-action: manipulation` and no tap highlight or long-press menu. Boxes under 480px wide use a staggered one-per-band layout (`NARROW_SPOTS`), because side-by-side spots collide on a phone. Measured with every thought on screen (drift paused): at least 64% of every worry stays free to tap on a 375px phone, and at least 80% on desktop. Re-measure after changing any thought's text.
- Accessibility: each thought is a real `<button>`. After softening, the reframe becomes its name, the button is `aria-disabled`, and a polite live region announces the reframe and the breathing steps.
- Reduced motion: all thoughts appear at once, nothing drifts, and taps and the breath clear instantly.

### Take a minute ([breathing.js](src/sections/breathing.js), [breathing.css](src/styles/breathing.css), [ambient-sound.js](src/scripts/ambient-sound.js))

- A breathing section after the night chapter (`#take-a-minute`). It's `.chapter` for layout but has no `data-stop`, so it isn't in the colour timeline or the dial, and always sits in the night palette. The night chapter links to it with a note.
- Two rhythms: box (4-4-4-4) and 4-7-8. A wobbling SVG blob grows on the in-breath (eased), stays full or empty on holds, and settles on the out-breath. A ring fills once per round, with small dots where each phase starts. Word cues only ("breathe in", "hold", "breathe out") in a polite live region. Three round dots, and after three rounds a kind note and "Breathe again".
- **No stressful timers:** never show seconds or countdowns. The clock only advances while the blob is on screen and the tab is visible, with frame time capped at 0.1s, so it pauses and never skips ahead. The rhythm can't change mid-run; Stop is always available.
- Ambient sound: rain or waves, **off by default**, generated with the Web Audio API (filtered pink/brown noise; waves swell on an ~11s cycle). No AudioContext exists until someone picks a sound. It fades in over 2.5s, crossfades between sounds, and fades out and suspends when off, when the section leaves the screen or when the tab hides. `public/sounds/` is free for real recordings later.
- Reduced motion: the blob doesn't wobble or scale. The cues and the ring still guide the breath.
- Without JS, both patterns appear as plain written instructions.
- Never claim medical benefits in this copy without a source. Keep it to "there's no wrong way" framing.

### 5-4-3-2-1 grounding ([grounding.js](src/sections/grounding.js), [grounding.css](src/styles/grounding.css))

- A section after "Take a minute" (`#five-senses`, no `data-stop`, night palette), which links to it with a note. It's a notebook of `<article class="page">`s: intro, see (5 lines), touch (4), hear (3), smell (2), taste (1), and a closing page that links to `talk.html`. Each page has a hand-drawn SVG doodle (pencil, eye, hand, ear, nose, chai glass, sprout) that draws itself in when its page opens.
- Page turns: pages are stacked in one grid cell. Forward lifts the current page around its left (bound) edge, rotateY 0° → −94°, revealing the next page underneath. Back lays the earlier page down over the current one. 1s, ease-out, with Web Animations and a timeout so a stalled animation can't leave it stuck. Pages not showing are `inert`; after each turn focus moves to the new page's heading. Enter in a box moves down the lines, then to Next, and never turns the page itself. With reduced motion pages swap instantly.
- **Privacy promise ("doesn't save or send anything you type") must stay true:** no `<form>`, no storage of the text, no network calls (the garden only records *that* the exercise was finished); `autocomplete="off"` (no restoring on reload) and `spellcheck="false"` (some browsers send spellcheck text to a server); every box is cleared on "Start again" and on `pagehide` (so the back/forward cache doesn't keep it). Don't add analytics or anything else that could read these boxes.
- Without JS the pages simply stack in order with the doodles drawn and no nav buttons, and the boxes still work.

### Myths we grew up with ([myths.js](src/sections/myths.js), [myths.css](src/styles/myths.css))

- The last section (`#myths`, no `data-stop`, night palette). Eight paper notes in a `<ul>`; each `<li class="myth">` sets `--paper`, `--ink` and `--tape` from one *daytime* stop (dawn, morning, midday, afternoon, sunset), so ink on paper always has the designed 9:1+ contrast. Notes are tilted (`--tilt` per nth-child), held up with washi tape, with one corner lifted. The centred note straightens slightly.
- The row is a native, full-width `scroll-snap` strip: swiping on phones is real native scrolling (momentum, vertical page scroll still works). Arrow buttons with hand-drawn arrows, ←/→ keys, and a "3 / 8" counter step through it. Don't replace this with custom pointer dragging.
- Flip: with JS the front of each note becomes one big `<button>` (labelled "Myth: … Flip to see what's actually true"). The back gets its own "see the myth again" button, and tapping the back (not a link) also flips it back. The hidden side is `inert`; focus moves to the visible side's button; a polite live region announces the fact. Don't put an overlay button over the note: in a `preserve-3d` flip, z-index is ignored and it would cover the source links on the back.
- Copy: myths are things loving family say, never mocking. Facts are warm, about 40 words, with no unsourced statistics; the two with numbers link WHO (1 in 7, aged 10–19) and CDC (8–10h sleep).
- Without JS each note shows the myth with the fact underneath, and the row still scrolls.

### Garden ([garden.js](src/scripts/garden.js), [garden.css](src/styles/garden.css), [care.js](src/scripts/care.js))

- A small pill in the bottom-right corner (the opposite corner to "Talk to someone"). Finishing something kind for yourself sprouts a plant: Take a minute's three rounds → a two-leaf sprout; reaching the end of 5-4-3-2-1 → a flower (once per run); reading the story → a grass tuft (at most once a day). The stem grows up, then the leaves unfold over about 1.4s; every plant sways slowly on a 7s loop.
- Sections report a finish with `tookCare(kind)` from care.js; the garden listens with `onCare`. Add new triggers the same way, never by importing the garden.
- "Read the story" means most chapters (all but one) each stayed centred for 1.2s, then the reader settles on 11:45 pm. Jumping straight to the end (the dial) doesn't count.
- **No points, streaks or numbers on screen.** Clicking the garden opens a note: "you took care of yourself {once / twice / n times} today." Other days get "your garden is still here, quietly growing." Never add counters, goals, "don't break your streak" or anything that makes a missed day feel like failing.
- Storage: `localStorage['ood-garden']` = `{ v: 1, plants: [{ k: kind, t: timestamp }] }`, last 100 kept. Every read and write is in try/catch; if storage is blocked the garden still grows for the visit. It records only *what* was finished and *when*, never anything typed. The note says so ("lives only in this browser"), and "clear my garden" (asks twice) removes it. Other tabs stay in sync via the `storage` event.
- 9 plants show at once. Each plant keeps a fixed slot, so the 10th quietly replaces the 1st. A sprout adds just the one new plant, so the others keep swaying. An empty garden shows a single seed.
- Reduced motion: no sway, and new plants appear grown.

### Talk to someone page ([talk.html](talk.html), [talk.js](src/talk.js), [talk.css](src/styles/talk.css))

- A separate, deliberately still page in the static dawn palette: no Lenis, GSAP, reveals, particles, dial or garden. talk.js only imports CSS, so in the production build the page needs no JavaScript at all. A solid sticky top bar always shows "← back to the story", and the page ends with a big "Back to One Ordinary Day" button and a link to `./#take-a-minute`.
- Sections: hero (with "in danger right now? call 112"), **Free helplines in India** (`#helplines`), "Telling someone you know" (a parent / a friend / a teacher or counsellor, each with something you could actually say in a speech bubble), "If a friend is struggling" (five steps; the fourth covers taking talk of not wanting to be alive seriously and not keeping it secret, per safe messaging), then the way back.
- `#helplines` is laid out as a printed directory, not a stack of cards: no tints, no rounded boxes. A heavy `--fg` rule opens the list. Tele-MANAS leads (`.line--main`): a bigger name, its 14416 set huge in Instrument Serif, and a Caveat `.note.line__pick` ("not sure which one to call? start here."), which hangs to the right of the name from 48rem. The other lines are hairline-ruled rows; from 48rem each row is name ····· number on one baseline (a dotted leader, `.line__name::after`), with the description, hours and source full width below. "Not in India?" sits after the list without a box.
- Every helpline has a `tel:` link (48px tall), when it's open, what it costs, and a **source link**. Only describe a line as confidential or anonymous if its own site says so. Toll-free numbers are labelled toll-free; for the rest, the page notes that normal call or data charges may apply. People outside India are pointed to Find A Helpline (findahelpline.com, ThroughLine, 175+ countries).
- Not listed on purpose: KIRAN 1800-599-0019 (reported merged into Tele-MANAS, current status unconfirmed) and SNEHA (official site unreachable behind a bot check, and its hours conflict between sources). Add them only after verifying on their official pages.

### Text reveals ([text-reveal.js](src/scripts/text-reveal.js))

- Headlines (`main h1, h2`) come into focus line by line: blur 7px and 20% opacity, to sharp over 1.2s, with lines 0.18s apart. Words are wrapped in temporary spans, grouped into lines when the reveal runs, then unwrapped, so the DOM ends up exactly as authored. GSAP SplitText isn't used because its auto re-split rebuilds the heading's HTML, which would destroy the ink SVGs inside it.
- Ink draws 0.6s after its trigger (underline 1.1s, circle 1.4s). Margin notes (`.note`) fade in while settling from a slightly bigger tilt.
- Everything fires when its top passes 85% down the screen, once.
- **Nothing waits invisibly.** The HTML is fully visible as authored. Hidden "before" states are applied only by JS, only to elements not yet seen, and each one is registered so `revealAll()` can finish it instantly. Elements already scrolled past are never hidden. Errors during setup, and printing (`beforeprint`), reveal everything. With reduced motion nothing is hidden at all, and ink shows fully drawn.

## Safety (non-negotiable)

- Follow safe-messaging guidelines for suicide and self-harm: no graphic detail, no methods, never present suicide as a solution or as inevitable. Use "died by suicide", never "committed suicide".
- Focus on hope, recovery and getting help. Any heavy moment in the story should be followed by a way to reach support.
- Never present quizzes or self-checks as a diagnosis. Frame them as reflection and point people toward talking to someone they trust or a professional.
- Never invent a helpline number. All numbers were checked on **16 Oct 2026** against official sources (each one is linked next to the number). Re-check them before launch and after any long gap:
  - Tele-MANAS 14416 / 1-800-891-4416, toll-free, 24×7, choose your language: telemanas.mohfw.gov.in (updated May 2026), PIB 2022 launch and PIB May 2024.
  - Vandrevala Foundation +91 9999 666 555, call or WhatsApp, free, 24×7, private and confidential: vandrevalafoundation.com/free-counseling.
  - iCALL (TISS) 9152987821, free, Mon–Sat 10 am–8 pm, anonymous, icall@tiss.edu: TISS iCALL project page.
  - AASRA 022 2754 6669, free, 24×7, English and Hindi, calls not recorded: aasra.info/helpline.html.
  - Child Helpline 1098, toll-free, 24×7, for children in difficult circumstances, integrated with 112: PIB, Ministry of Women and Child Development, 6 Aug 2025.
  - 112, India's emergency number: PIB (ERSS launch).
- The night section shows Tele-MANAS and 112 and links to talk.html for the rest.

## Story and copy

- Aarav, 17, Class 12, board exams four months away, coaching after school. Kabir is his friend from coaching; Mummy and Papa are his parents. Themes: sleep (morning), loneliness in a crowd (midday), social media comparison and family and exam pressure (afternoon), a friend checking in (sunset), talking to a friend and to mum (dusk), help and hope (night).
- Voice: warm, specific, Indian-English, never preachy. Show small real moments (the family WhatsApp group, the mock test ranks, haldi doodh) rather than giving advice. Margin notes read like a friend's scribble.
- Use curly quotes and apostrophes (“ ” ’) in copy.
- **Facts** (`<aside class="fact fact--<layout>" role="note">`, between chapters, no "did you know?" label: the number leads): occasional, one statistic each, and **every statistic links to a real source** that someone has opened and checked says exactly that. Prefer primary sources (WHO, UNICEF, government). If the primary can't be reached, name it and link a reputable report of it, e.g. "NCERT survey, as reported by The Week". Outside links open in a new tab and include a visually hidden "(opens in a new tab)".
- Never put a fact between sunset and dusk. The text colour flips there, and a fact would sit at the moment of lowest contrast.
- Current sources: CDC About Sleep (8–10h for teens, AASM), WHO Commission on Social Connection 2025 (17–21% lonely, 13–29), NCERT Manodarpan 2022 via The Week (8 in 10 anxious about studies/exams/results), UNICEF SOWC 2021 India release (41% vs 83%), WHO adolescent mental health fact sheet (1 in 7, aged 10–19).

## Tech

- **Vite + vanilla JavaScript.** No frameworks, no UI kits, no CSS frameworks.
- **GSAP + ScrollTrigger** for scroll-linked colour and reveals.
- **Lenis** for smooth scrolling. Connect it to ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)` and run Lenis from `gsap.ticker`). Remove `scroll-behavior: smooth` from CSS when Lenis is active.
- Keep it simple and fast: small bundle, no heavy assets, only animate `transform`, `opacity` and colour variables.
- Mobile first: write base styles for phones and add `min-width` media queries. Use 16px side gutters, respect `env(safe-area-inset-*)`, and allow no horizontal scroll.

### Launch performance

- **Lighthouse (mobile, 16 Oct 2026, production build via `npm run preview`):**
  - Story page: Performance 97–98, Accessibility 96, Best Practices 100, SEO 100 (FCP 1.8s, LCP 2.1–2.3s, TBT 10–50ms, CLS 0).
  - talk.html: 100 in all four.
  - Story page before the launch pass: 92 / 96 / 96 / 91.
  - The one accessibility flag is `color-contrast` on headings further down the page. Lighthouse catches them in their pre-reveal state (20% opacity, offscreen, see Text reveals). Readers never see them like that.
  - To re-run: `npx lighthouse http://localhost:4173/ --chrome-flags="--headless=new"` (mobile is the default).
- **Lazy sections** ([lazy.js](src/scripts/lazy.js)): `whenNear(el, load)` imports a section's code when it comes within 1.5 screens (IntersectionObserver), or straight away if a link lands on it. Until then the no-JS version shows. Take a minute (with ambient sound), 5-4-3-2-1 and the myths load this way, as separate chunks.
  - **Only lazy-load sections after the 11:45 pm chapter.** A section's height changes when it comes alive. Above night, that would move the colour timeline's anchors under a dial jump in progress. So the 4:50 pm thoughts load with the page, and the garden starts before the lazy sections so their "took care" signals have a listener.
- **Images:** the site uses none, apart from the link-preview image and icons in `public/`.
- **Head tags** (both pages): a specific `<title>`, a meta description of 160 characters or fewer, `theme-color`, and icons: favicon.svg (the dial's sun on its dotted arc over a hand-drawn horizon, dawn palette), favicon.ico (16 and 32px inside) and apple-touch-icon.png (180px, opaque). Plus Open Graph and `twitter:card` tags and `public/robots.txt`.
  - The preview image is `public/og-image.jpg`: 1200×630, JPEG q85 with 4:4:4 chroma, about 50 KB. Its source is [design/og-image.html](design/og-image.html), with regeneration steps in the file.
  - **og:image, og:url and canonical need full addresses.** vite.config.js fills `%SITE_URL%` in at build time from `SITE_URL` (in `.env.production`), or on Vercel from `VERCEL_PROJECT_PRODUCTION_URL`. That's the production domain, so it follows a custom domain automatically. With neither (a local build), the build warns, drops canonical and og:url, and leaves the image path relative.

### Deploying (Vercel)

- **Live at https://one-ordinary-day.vercel.app** (Vercel project `rakshit-23cd/one-ordinary-day`, Hobby plan, first published 16 Oct 2026). On the live site, mobile Lighthouse scored 95 / 96 / 100 / 100.
- There's no Git repository, so nothing deploys automatically. To publish changes, run `npm run deploy`. That's `vercel deploy --prod`: it uploads the source and Vercel runs `npm run build` in the cloud. This computer's Vercel CLI is signed in, and `.vercel/project.json` links the folder to the project. Never commit `.vercel/`.
- [vercel.json](vercel.json) holds the build settings (Vite, `dist`) and headers. Hashed `/assets/*` files are cached for a year (`immutable`); every page gets `nosniff`, a strict referrer policy, and camera / microphone / location switched off. HTML is revalidated on every visit, so a new deploy shows straight away.
- `.vercelignore` keeps `node_modules`, `dist`, `reference`, `design` and `.claude` out of the upload.
- Deployment Protection (Vercel Authentication) is on by default, but only for preview and per-deployment URLs. The production domain is public (checked with a signed-out request).

### Project structure

```
index.html            the story (entry page): head tags, font preloads
talk.html             "Talk to someone" page (second entry; see vite.config.js build.rollupOptions.input)
src/talk.js           its entry: CSS only (fonts, tokens, reset, base, sections, talk.css)
src/styles/fonts.css  self-hosted @font-face + size-matched fallbacks
src/assets/fonts/     latin woff2 files + OFL licences
src/scripts/lazy.js   whenNear(): load a section's code as the reader nears it
public/               favicon.svg/.ico, apple-touch-icon.png, og-image.jpg, robots.txt
design/og-image.html  source for the link-preview image (not built)
.env.production       SITE_URL for link previews (leave empty on Vercel)
vercel.json           Vercel build settings + headers; .vercelignore trims the upload
src/styles/talk.css   talk page: top bar, helpline directory, speech bubbles, circled steps
src/main.js           JS entry, imports styles and scripts
src/styles/           tokens.css (palette + live colour vars), reset.css, base.css (body, grain)
src/styles/sections.css  chapter layout, type, helpline, "Talk to someone" button
src/styles/dial.css   sky dial + jump menu
src/styles/ink.css    .mark / .circle: no-JS fallback strokes + SVG ink styles
src/scripts/          color.js (maths + WCAG contrast), smooth-scroll.js (Lenis + scrollToY),
                      day-timeline.js (scroll position → chapter + progress),
                      day-colors.js (colour blend), particles.js, sky-dial.js, in-page-links.js,
                      ink.js (hand-drawn SVG strokes), text-reveal.js
                      Init order in main.js matters: day-colors before particles.
src/sections/         per-section behaviour: thoughts.js (4:50 pm crowd), breathing.js
                      (Take a minute), grounding.js (5-4-3-2-1 notebook), myths.js (myth
                      notes). Story markup stays in index.html so it reads without JS
src/styles/myths.css          myth notes: paper, tape, tilt, flip, snap strip
src/scripts/motion.js         prefersReducedMotion (light; smooth-scroll.js re-exports it)
src/scripts/interactions.js   click ripple
src/scripts/page-transition.js  fade-through-background page changes (leaving half)
src/styles/interactions.css   button lift/press, link underline draw, ripple, page veil
src/scripts/care.js           tookCare(kind) / onCare(): "finished an exercise" signal
src/scripts/garden.js         corner garden + localStorage (try/catch) + story-read detection
src/styles/garden.css         garden pill, plants, growing + sway, the little note
src/styles/buttons.css        hand-drawn pen-loop buttons + highlighter (before interactions.css)
src/styles/grounding.css      5-4-3-2-1 notebook: paper, binding, lines, page turns
src/scripts/ambient-sound.js  generated rain / waves (Web Audio), off by default
src/styles/breathing.css      Take a minute: blob, ring, pills, kind note
src/styles/thoughts.css  the 4:50 pm crowd, pop, breathing orb
public/sounds/        optional audio, never autoplayed
```

The palette lives once, in `src/styles/tokens.css` as `--<stop>-bg/-fg/-accent/-particle`. Scripts read those values instead of duplicating hex codes in JS.

The project sits in a OneDrive-synced folder, where native file-change events get dropped. [vite.config.js](vite.config.js) turns on polling so Vite never serves a stale module (keep it unless the project moves out of OneDrive). It also lists both pages (index.html, talk.html) as build inputs; add any new page there too.

Commands (standard Vite):

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

## Gotchas from the reference

- **Sunset to dusk crossover:** the reference mixes text and background straight through, so text vanishes (1:1 contrast) halfway. It also starts each blend at the top of a section, so every section's text is read mid-blend. Both are fixed: `day-colors.js` plus the `.interlude` and `--ui-*` colours (see Concept).
- The reference's accent colour fails as text at dawn (1.9:1), morning and afternoon (2.8:1). Use `--accent-text` for text, never `--accent`.
- Content must be readable before JavaScript runs. Only apply a hidden or blurred reveal state once JS has confirmed an element is offscreen, as the reference does (see Text reveals).
- Decorative layers (grain, particles, dial graphic) get `aria-hidden="true"` and `pointer-events: none`.
- reset.css forces `[hidden] { display: none !important; }`. Without it, any component that sets `display` (grid, flex) ignores the `hidden` attribute; that once left the no-JS page showing JS-only controls. When testing no-JS states, check the computed `display`, not just the attribute.
