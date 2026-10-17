# One Ordinary Day

A youth mental health awareness website. The visual reference is [reference/one-day.html](reference/one-day.html), a single-file prototype. Use it as the source of truth for look, feel and tone. Rebuild it properly in the stack below rather than copying it wholesale.

## Git rule

- **Never commit or push to git without asking me first and waiting for my yes.** A push to `main` also publishes the live site (see Deploying). Ask again each time: a yes covers that one commit or push, not later ones.

## Pages

Separate pages, each with its own address (Vite multi-page build; see Tech › Pages and build). Each sits in one colour stop that fits its mood, except the story, whose colours follow the scroll.

| URL | Page | Colours | Files |
|---|---|---|---|
| `/` | Intro: why the site exists, three feeling cards, two facts, what's here | dawn | index.html, home.css, pages/home.js |
| `/library` | The dashboard: every page as a tile, with gentle filters | morning | library/, library.css, scripts/library.js |
| `/story` | "One ordinary day": Aarav's day, 6:40 am to 11:45 pm (scroll-driven sky, day line, colours) | live | story/, pages/story.js |
| `/breathe` | Take a minute | midday (sea-glass) | breathe/, sections/breathing.js |
| `/ground` | 5-4-3-2-1 grounding | morning | ground/, sections/grounding.js |
| `/thoughts` | Untangle a thought (Aarav's 4:50 pm thoughts) | afternoon | thoughts/, sections/thoughts.js |
| `/myths` | Myths we grew up with | dusk | myths/, sections/myths.js |
| `/talk` | Talk to someone: Right now, what happens when you call, other support, helplines | dawn, still | talk/, talk.css |
| `/start-the-conversation` | The conversation guide, and helping a friend | dawn, still | start-the-conversation/, conversation.css |
| `/tonight` | A note for tonight | night | tonight/, sections/tonight.js |
| `/about` | About this site, and Your privacy | dawn, still | about/ |

Every page has the same top bar (the site name home to the intro, "Library", "Talk to someone"), "Skip to help" first, and the same footer (Library · About this site · Talk to someone). On /talk itself the "Talk to someone" link is left out of both, since it would only point back at the page you're on (`talkLink=""` on its includes). Exercise and info pages add "← Back to library" at the top and "Next you could try…" at the bottom: breathe → ground → thoughts → start the conversation → talk; myths → start the conversation; tonight → talk; story → tonight; about → the intro.

## Concept (the story, /story)

The story follows a 17-year-old student through one day, from **6:40 am to 11:45 pm**. As the reader scrolls, the colours of the whole page blend smoothly from dawn to night. That colour change is the progress bar.

- Each story section is `<section class="chapter" id="<stop>" data-stop="<stop>" data-name="<2–3 words>">` and contains `<time class="time" datetime="HH:MM">`. The colour blend, the sky, the day line and its labels ("4:50 pm · the noise") all read from these (via [day-time.js](src/scripts/day-time.js), once at start-up), so a new chapter only needs this markup.
- [src/scripts/day-timeline.js](src/scripts/day-timeline.js) tracks which two sections the reader is between and how far along. A section counts as reached when its centre is at the centre of the screen. [day-colors.js](src/scripts/day-colors.js), [sky.js](src/scripts/sky.js) and [day-line.js](src/scripts/day-line.js) subscribe to it; don't measure scroll position separately.
  - It re-measures on every ScrollTrigger refresh, and also whenever `<main>`'s height changes (a ResizeObserver calling `ScrollTrigger.refresh(true)`). On touch devices ScrollTrigger ignores height-only resizes under 25% (`ignoreMobileResize`, kept on so the URL bar doesn't refresh everything), so without this a split screen or foldable resize left stale anchors and moved the sunset→dusk flip onto story text. The URL bar doesn't change `<main>`'s height (nothing in it uses `dvh`), so it still shifts the anchors by half the toolbar height (~30px), which the interlude's margins absorb. Don't add `dvh` inside `<main>`, or every URL-bar change will refresh.
- Colours blend between neighbouring stops with smoothstep easing. They are exactly a section's stop when that section is centred, except at 4:50 pm, where the light dims a little, the hour the thoughts get loud (`DIM` in day-colors.js: the background moves 7% towards the text colour, and the text colours are recomputed against it).
- Drive everything through CSS custom properties on `:root` so every element follows the day automatically. Never hard-code a colour in a component.
  - `--bg`, `--fg`: page background and main text.
  - `--soft`: secondary body text (held at 4.5:1 or better).
  - `--accent`: decoration only (underlines, dots, strokes). Fails contrast as text at some stops.
  - `--accent-text`: accent-coloured text, **large sizes only** (24px+). Held at 3:1 or better by mixing toward `--fg`. Also used for focus rings and the day line.
  - `--sky-low`, `--sky-sun`, `--sky-moon`: the sky's horizon glow, sun core and moon (see One sky).
  - `--soft` and `--accent-text` are held at their floors against every sky tone on screen (the background, the horizon glow, and the sun or moon when they're up), not just `--bg`.
  - `--particle`: particle colour. Canvas code reads `dayColors` from `day-colors.js` instead of the CSS variable.
- Text colours can't blend smoothly across the sunset→dusk flip (dark text on light turning into light text on dark): halfway through, text and background would be the same colour. So the text swaps at the point where both colours read equally, and the background blend is squeezed into the middle 40% of that segment. No palette colours can hold 4.5:1 at the exact midpoint (text drops below 4.5:1 from about 50% to 58% of the segment, at worst 3.63:1), so: (1) an empty `.interlude` (`aria-hidden`) sits between sunset and dusk, so the flip happens while no body text is on screen (the 9:30 pm time and heading can be, and pass 3:1 as large text). It's a full screen of evening sky (100svh) at every size. 70svh used to be enough on roomy screens, but the day line's rail narrows the text column from 48rem, so the 9:30 pm paragraph grew taller and reached the dip at 1280×800 (3.76:1). On phones, 70svh had already left the 7:10 pm and 9:30 pm paragraphs 0–40px from the screen edge; (2) fixed controls in `.site-header` read `--ui-*` colours, which day-colors.js holds at the nearest stop across the flip (they never blend through it). Measured on 17 Oct 2026 at 360×640 and 1280×800, against the background and every sky tone each piece of text overlapped (horizon glow, sun, moon): no failures, with every lowest value at its floor (4.5:1, and 3:1 for the large 9:30 pm time during the flip). Earlier runs at 360×780 and 768×1024 also passed. Fixed controls stay at 6.89:1 or better through the flip. When re-measuring after a resize, no reload is needed, but wait about a second for the refresh (the Browser pane can render at ~5 fps), and do reload when emulation crosses 768px wide: switching mobile emulation on or off can leave a stale page-scale `innerHeight` that skews the anchors. Keep the interlude empty, and keep both behaviours if you touch the blend code.
- **Day line** ([day-line.js](src/scripts/day-line.js), [day-line.css](src/styles/day-line.css)): the one clock on screen, which replaced the old sky dial and its jump menu, so there's never a second progress indicator.
  - On phones its seven dots sit in a slim strip (`--line-h`: 40px) just under the top bar, on the bar's colour: the bar itself has the site name, "Library" and "Talk to someone". The clock is visually hidden there (screen readers still get it), and each chapter shows its own time. From 48rem the clock is a pill at the right end of the top bar, with a slim 30px rail hanging below it; the bar keeps "Talk to someone" clear of it (`.site-header--story` padding). From 48rem, `--gutter-right` grows to 3.5rem so text never runs under the rail.
  - It has seven dots, evenly spaced (proportional spacing put 6:40 and 8:15 too close to tap). The travelled line runs up to a small sun that rides the line and, after 8 pm, slowly becomes a crescent moon (a mask circle slides over it, fully formed by 11 pm). Past dots stay softly filled, and the current one fills in over 1.2s.
  - The clock shows the story time rounded to 5 minutes, or the opening clock's exact minute while that's later, so it never runs backwards.
  - It reads `--ui-*` on its own solid `--ui-bg`, so it stays readable through the sunset→dusk flip. Dots and the travelled line use `--ui-accent-text` (3:1 or better).
  - Accessibility: it's a `<nav aria-label="Through the day">` with an ordered list of links, one per chapter. Each link's name is its label ("4:50 pm · the noise"), which shows as a small tag on hover or keyboard focus and is always read by screen readers. The current chapter has `aria-current="time"`. The links are one tab stop (roving tabindex that follows the current chapter): arrow keys, Home and End move between them, and Enter goes there. Tap targets are 44px tall on phones and 30px on the rail. Measured at 360×740: the bar is 56px with the strip below it (56–96px), and nothing overflows.
- **One sky** ([sky.js](src/scripts/sky.js), [sky.css](src/styles/sky.css)): the page background is the sky. A fixed layer behind the particles and grain adds:
  - A glow along the horizon (peach at dawn, gold in the afternoon, deep orange at sunset, the last light at dusk; `HORIZON` in day-colors.js).
  - A soft sun that rises after the opening (whose window already has a low sun, so there are never two suns on the first screen), crosses the sky and sets just after 7:10 pm.
  - A faint crescent moon from about 9 pm. The stars and fireflies come from particles.js.
  - Positions come from story time (`sunAt` / `moonAt` in day-time.js). Everything follows scroll, and the opening clock while the reader lingers, so there's no animation loop and it's the same with reduced motion. Only transform and opacity change.
  - **Contrast:** no sky tone may take `--fg` below 6:1 (`SKY_FG_MIN`). Tones are weakened as needed: against the mid-purple 9:30 pm sky the moon and the last light stay faint, and only come out properly once the sky is dark. `--soft` and `--accent-text` are then held against every tone on screen.
- **In-page links** ([in-page-links.js](src/scripts/in-page-links.js), on /story only) handle every `#link`, including the day line's dots and the night card's `#help`. (Links to other pages are normal links. The other pages have no Lenis; their `#links` use the browser's own smooth scroll.) They scroll so the target chapter is centred, then move focus to its heading, or to the target element itself. Keep Lenis's `anchors` option off, or it will fight this.
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
  - Every page preloads Figtree and Instrument Serif regular (in the shared head, src/partials/head.html) (`<link rel="preload" href="/src/assets/fonts/...">`; Vite hashes it to match the CSS). Don't preload more: it competes with the CSS.

## Motion

- Slow and calm. Ease-out curves, 0.8 to 1.4 seconds.
- Breathing loops run 6 to 8 seconds.
- No bouncy springs, no fast parallax, no scroll-jacking, no autoplay sound, no flashing.
- Every curve is an ease-out that never overshoots: `--ease-out` (cubic-bezier(0.22, 1, 0.36, 1)), GSAP `power2.out` / `power3.out`, Lenis easeOutCubic. Never use back, elastic, bounce or spring eases, or any cubic-bezier with a y value above 1.
- **Micro-interactions** ([interactions.css](src/styles/interactions.css), imported last; [interactions.js](src/scripts/interactions.js); [page-transition.js](src/scripts/page-transition.js)):
  - On the still pages (/talk, /start-the-conversation, /about: `body.talk-page`, talk.css) all of this is switched off except the page change: no ripple, lift, press, drawn underline or link transitions.
  - Buttons (`.talk`, `.thought__open`, `.moment__btn`, `.moment__choice`, `.breath__go`, `.page__btn`, `.myths__arrow`, `.garden__button`, `.talk-end__home`, `.tonight__btn`, `.home__explore`, `.home__help`) lift 2px on hover (fine pointers, motion allowed; only the solid pills `.talk` and `.garden__button` also get a soft shadow, and the hand-drawn buttons swell their highlighter instead) and compress to `scale: 0.97` on press. Pills only compress; myth notes rise 4px on hover, and so do the notes for tonight (not while one is picked). These use the individual `translate` / `scale` properties so they compose with existing transforms. interactions.css replaces each component's `transition` list, so add a component's own transitioned properties there too.
  - Exceptions to the 0.8–1.4s rule, on purpose: the press compresses in 0.25s so it registers under the finger, and page changes are short (0.35s cross-fade, or 0.3s out / 0.6s in) so getting to help never feels delayed.
  - Text links (`a:not([class])`, `a.note`, `.talk-end__breathe`, `.myth__again`, `.garden__clear`) keep a faint resting underline (so they read as links without hover); on hover or keyboard focus a solid 1.5px line draws in from the left.
  - A soft ring (64px, at most 40% opacity, 0.9s) spreads where you click or tap. Not for keyboard clicks (`event.detail === 0`), not in text inputs, and off with reduced motion.
  - **Page changes:** browsers with cross-document View Transitions (Chrome, Edge, Safari 18.2+; detected as `PageRevealEvent`) cross-fade natively from `@view-transition { navigation: auto }` in the shared head (0.35s; the top bar has `view-transition-name`, so it stays put). Others fade through the current background colour: the old page fades into its own `--bg` (0.3s), stores that colour in sessionStorage, and the next page starts as that colour and dissolves in (0.6s). The arriving half is a small inline `<style>` + `<script>` in the shared head partial, so the veil exists on first paint, and its own timers always reveal the page. Same-page `#` links, other sites, `tel:`, new tabs and modified clicks are never intercepted; the Back button clears any leftover veil (`pageshow`). Neither runs with reduced motion.
- Always respect `prefers-reduced-motion`. When it's set, turn off Lenis, reveals, drifting and breathing loops. Content must be fully readable with no motion at all. The colour change can stay because it follows the user's own scroll.

## Accessibility rules (from the full review)

- Contrast is AA at every stop *and* every blend position. Re-check with a scroll scan after any colour, layout or spacing change near sunset→dusk.
- Never transition `background-color` or `color` on anything whose colours follow the day (the header pills, buttons with `var(--fg)`/`var(--bg)` backgrounds): text changes instantly on scroll, so a lagging background drops contrast mid-blend.
- `html` has `scroll-padding-top: 5rem` and `scroll-padding-bottom: 6rem`, so focused elements never hide under the fixed top bar (56px on phones, 64px from 48rem) or the garden (WCAG 2.4.11). On /story phones the day-line strip adds 40px, and day-line.css raises the top padding to match.
- Tap targets: at least 44px tall for every button, call link and standalone link (`a.note`, helpline numbers included). Inline links inside paragraphs are exempt.
- Full-width strips: measure from a size container (`container-type: inline-size`, `100cqw`), never `100vw`, which includes the desktop scrollbar and overflows the page.
- A button's accessible name must contain its visible text (voice control). Put extra hints in a `.visually-hidden` span, not an `aria-label` that rewords the visible words.
- Reduced motion, as verified: no Lenis, a still particle frame, no reveals or hidden states, no drift, sway, orb, ripple, hover lift or page fade, all transitions effectively instant, and no CSS animation left running. The only motion is the breathing ring while an exercise the user started is running, plus the scroll-driven colour change.
- Every interactive element has a visible `:focus-visible` indicator (`--accent-text`, 3:1 against the page), or a documented custom one: the notebook writing line, which is 50% `--fg` at rest so it meets 3:1.

## Design rules (from the design review)

- **Centring:** the intro (`/`) and the library (`/library`) are centred on purpose: big, calm, easy to scan. Every other page uses a centred column with left-aligned text inside (centred paragraphs are harder to read).
- **The story's desktop layout (64rem and up) is an editorial 12-column grid**, not a centred column ([sections.css](src/styles/sections.css)); the exercise pages keep their sections' own layouts on the same grid. Each chapter sets `--col` (its text columns), `--note-col` / `--note-row` (where its margin note hangs) and `--note-tilt`, plus its own `--pad`. The reading line moves left and right down the day; keep neighbouring chapters on different columns. The opening (6:40 am) is a full-height cover with the title low and Aarav’s window on the right (see Opening screen). Tools put the text on one side and the tool on the other (`grid-template-rows: auto auto auto 1fr`, so the tall side doesn't spread the text out). Phones stay one column.
- Sunset and dusk keep `min-height: 92svh` and `padding-block: 14vh` on desktop. Together with the `.interlude`, that keeps text off screen during the colour flip.
- The myths strip still assumes `.chapter__inner` is centred in the section and the deck spans `1 / -1`. Keep both, or redo the full-bleed calc.
- **Facts** each have their own layout:
  - `.fact--hang`: the number hangs in a left column.
  - `--aside`: narrow and right-leaning, with a pencil rule.
  - `--big`: a huge number with the sentence tucked beside it.
  - `--compare`: two hand-drawn bars (`aria-hidden`) with the full sentence below.

  The number is a `.fact__figure` span inside the sentence, so it reads as one line without CSS. Give a new fact a different layout from its neighbours, not a copy.
- **Buttons** in the page ([buttons.css](src/styles/buttons.css)) are a pen loop around the words: an SVG mask in `currentColor` with `vector-effect: non-scaling-stroke`. Main actions get an 18% `--accent` highlighter behind them (text measured at 8:1 or better). Only the fixed `.talk` pill stays solid (with the day line and garden), so help is always the strongest thing on screen. Forced-colours mode swaps the loop for a real border.
- **Margin notes** (`.note`) start with a small pen mark, not a shared dash: a short arrow (the default), `.note--tick` or `.note--squiggle` ([sections.css](src/styles/sections.css)), an SVG mask in `currentColor` like the buttons. Pick the mark that suits the line and differs from the notes either side; link notes that already end in ↓ never take the arrow. Down the story today: tick, arrow, squiggle, arrow, squiggle, tick (the opening has no note).
- **Footer** (`.site-footer`, src/partials/footer.html, the same on every page): a short colophon saying what the project is and who it's for, that Aarav is made up and when the numbers were checked, and three links (Library, About this site, Talk to someone; 44px tall). It lines up with the column on phones and tablets; from 64rem it's on the 12-column grid (colophon in columns 1–7, links on the right). On the still pages it stays in their 40rem column. The story's own sign-off ("lights off. asleep before midnight, this time.") closes the story itself (`.story-end`). Never a one-line "awareness project" tagline. If the check date on /talk changes, update the footer's month too.
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
- Everything centered (use left-aligned, editorial layouts; the intro and the library are the deliberate exceptions)
- The same rounded card on every block

## Always

- A subtle paper grain overlay (the reference uses an SVG `feTurbulence` noise at about 5% opacity, fixed and `pointer-events: none`).
- Hand-drawn SVG touches: underlines, circles, arrows. Draw them in with `stroke-dashoffset` as they come into view.
  - In copy, wrap words in `<span class="mark">` for an underline or `<span class="circle">` for a circle. Nothing else is needed. [ink.js](src/scripts/ink.js) builds the SVG in real pixels for each word and rebuilds it on resize, so strokes never stretch. Without JS, [ink.css](src/styles/ink.css) draws a finished static stroke with a CSS mask.
  - Ink paths use `pathLength="1000"`, not 1: GSAP tweens `stroke-dashoffset` in whole pixels, so 0–1 would jump straight to drawn.

- Warm, conversational copy, written like a friend talking. Plain words, short sentences, no clinical or preachy tone.
- **Help is always one tap away** (src/partials/bar.html; shell.css `.site-header`, `.talk`, `.skip-link`):
  - **"Skip to help"** is the very first focusable item on every page (`.skip-link`, off screen until focused, then a solid 44px pill at the top left). It goes to `/talk#right-now`, or `#right-now` on /talk.
  - **The top bar**, fixed on every page (`--bar-h`: 56px, 64px from 48rem, plus the top safe-area inset), solid `--ui-bg` with a 14px fade below: the site name (Instrument Serif, home to the intro page `/`; its name is "One Ordinary Day, home"), "Library" (to /library), and **"Talk to someone"** (`.talk`) at the right: solid `--fg` on `--bg`, 44px tall, never behind a menu, the only help button. It goes to /talk; on /talk itself it's left out (the page is the help, and "Skip to help" still jumps to `#right-now`). On /story it reads `--ui-*` colours, so it holds 6.89:1 or better at every scroll position (sunset→dusk flip included). It sits at the top, so it never covers text, the garden, a writing box or the keyboard. No pulse, bounce or attention animation, ever. All three fit a 360px phone (tighter type and gaps on phones; a touch smaller again under 350px, measured at 320px).
  - Help links besides the bar: the night chapter, the "Not really" reply and the safety line in Untangle a thought, the intro's "I need help now", the library's "Talk to someone" tile, the goodnight in A note for tonight, "Next you could try…" links, and the footer.
  - A pinned note (A note for tonight) may sit in the bar just before "Talk to someone" from 48rem; it never covers or replaces the help link.

## Sections and features

### Intro page, / ([index.html](index.html), [home.css](src/styles/home.css))

- Centred, with big, calm type, in the dawn palette. It replaced an earlier in-page intro (removed).
  - "One Ordinary Day" (Caveat), then the h1: **"Anxiety. Depression. Stress."** (huge, one word per line, each with a hand-drawn underline) and "More young people carry them than you’d think."
  - "This is a short, interactive story about what teenagers often carry quietly, with small things that can help, and a way to reach someone when it’s too much."
  - "Explore the library" (pen loop + highlighter, /library) and "I need help now" (pen loop, /talk), then "No sign-up. Nothing you write leaves your device." and "This site talks about stress, anxiety and feeling low. Go at your own pace."
- **Three feeling cards** (`<details class="feeling">`, so they open with no JavaScript, from the keyboard and for screen readers). Each drawing shows the feeling without words and settles on hover, keyboard focus or when open; loops are slow (2.8–7s) and stop with reduced motion:
  - Anxiety: tangled scribbles that buzz, then untangle into three calm lines. Opens to "It can feel like…" (four teenage lines), "Lots of people feel this, especially around exams. It’s okay to ask for help." and "Try a slow breath" (/breathe).
  - Depression: a soft grey cloud that sits heavy; a little light breaks through. → "How to start the conversation" (/start-the-conversation).
  - Stress: books piling up and wobbling, then settling into a neat stack. → "Untangle a thought" (/thoughts).
  - Never diagnostic: "it can feel like", never "you have…" or "symptoms".
- **Two facts** (checked 18 Oct 2026; see Story and copy › sources): WHO, 1 in 7 aged 10–19 worldwide; UNICEF India, 1 in 7 aged 15–24 often feel depressed or have little interest in doing things.
- **"What you’ll find here"**: six links with hand-drawn icons (the story, calming exercises, myths, how to talk to someone, free helplines, a note for tonight), and "Or see everything in the library".
- A tiny inline script in its `<head>` forwards links from the old one-page site: `/#take-a-minute` → /breathe, `#five-senses` → /ground, `#myths`, `#tonight`, `#about`, `#help` → /story#help, and chapter hashes (`#sunset`…) → /story#….

### Library, /library ([library/index.html](library/index.html), [library.css](src/styles/library.css), [library.js](src/scripts/library.js))

- Centred, morning palette: "Where would you like to go?", one line, filter chips, then a tile for every page (icon, name, one line, a rough time in Caveat), and "New here? Start with the intro".
- **Tiles** are paper cards, cut and tilted by hand, in varied sizes: from 64rem a 3-column grid where the story runs wide, "Talk to someone" stands two rows tall (warmer tint, firmer border: stands out, never louder) and "A note for tonight" spans two; 2 columns from 40rem; stacked on phones. They fade in one after another (50ms apart, under 1s), lift 3px with a soft shadow on hover, and press to 0.98.
- **Chips** (`aria-pressed` buttons in a labelled group, hidden without JS): "I feel anxious", "I feel low", "I feel stressed", "I want to help a friend", "Show everything". A chip marks the matching tiles (`.is-match`, a firmer border and a small "might help" tag) and fades the rest a little (`.is-quiet`, opacity 0.72, text still 4.97:1). Nothing is hidden or moved, a polite status lists the marked tiles, and the choice isn't stored. Pressing the active chip again shows everything. Which tile answers which chip: `data-for` on each `.tile-slot`.

### Opening screen ([opening.js](src/scripts/opening.js), [opening.css](src/styles/opening.css))

- The 6:40 am chapter (`#dawn.opening`) is the first screen of /story, 100svh tall. It holds only the time marker, the headline (the biggest thing on the page: up to 7rem on phones and tablets, 9.5rem on desktop, with "ordinary" in italic `--accent-text`, and a `<br>` after it so it’s two lines in every font: without it, the fallback font fitted the title on one line at 412px, and the real font’s swap pushed the bottom-aligned opening up by 60px, CLS 0.11), one short line about Aarav, and "Scroll through his day" with a hand-drawn arrow. No other buttons or links; the top bar with "Talk to someone" stays. The longer intro lives at the end of the 8:15 am chapter.
- **Scene: soft window light** (`.opening__scene`, `aria-hidden`, no pointer events). It's drawn in SVG and CSS from the palette:
  - A window with an Indian-style grill, rooftops with a water tank, and a low sun outside, all following the day's colour variables. It sits top left on phones and tablets, and top right from 64rem, always below the top bar and the day-line strip (`--window-top` in opening.css is built from `--bar-h` and `--line-h`).
  - A sheer curtain swaying from the rod (11s).
  - The snoozed alarm: a phone on the sill, its screen glow breathing on an 8s loop.
  - Sunlight thrown on the wall: a blurred SVG mask shaped like the two panes and the grill's shadows. It drifts (26s) and brightens and dims (14s).
  - Only `transform` and `opacity` animate. Every loop is 8s or slower, with no bounce. The loops pause off screen (`.is-away`) and stop with reduced motion. High-contrast mode hides the scene.
- **Contrast:** text never sits on anything darker than the wall. The sunlight colour is a fixed mix (80% `--night-particle`, 20% `--night-accent`), brighter than the dawn wall but darker than the greener 8:15 one. So it fades out once the reader scrolls on (`.is-leaving`, past 12% of the way to 8:15, when the colours have moved about 4%) and comes back at the top. The intro and cue use `--fg`, not `--soft`. Measured at 360×640 and 1280×800, including mid-fade: lowest 3.0:1 for large accent text, at its designed minimum. A warmer 75/25 mix measured 2.99:1, so don't warm it further.
- **Readable on load:** the section has `data-no-reveal`, so text-reveal leaves the headline alone, and the cue is visible until JS sees a scroll. Without JS everything shows; the scene's CSS loops still run, and the clock just says 6:40.
- **The clock:** while the reader stays at the top (timeline progress under 0.02) and the tab is visible, the marker ticks one minute every 4s, from 6:40 to 6:59, with a soft 1.2s fade on each change. It updates the `<time>`'s text and `datetime`, which is safe because day-time.js reads chapter times once at start-up.
  - `openingClock` feeds the day line (and the sky), which shows `max(scroll time rounded to 5 min, opening clock)`. Leaving the top hands over without going backwards (6:46 → 6:50 → …), and coming back shows the morning where it stopped.
  - With reduced motion the clock stays at 6:40.
- **The cue** fades out (0.9s) once the reader scrolls about 30px (progress over 0.04) and stays gone. The arrow drifts 7px down and back on an 8s loop.
- On short screens the section grows rather than overlapping: its top padding reserves the window's height, and its bottom padding clears the garden. Everything fits on a 360×640 screen.

### Ambient details ([scenes.js](src/scripts/scenes.js), [scenes.css](src/styles/scenes.css))

- One or two small hand-drawn SVG details per chapter, injected by JS (decoration only: `aria-hidden`, no pointer events, nothing without JS):
  - 8:15 am: birds far off, and a cutting-chai glass with steam.
  - 1:30 pm: the canteen fan's slow shadow (one turn per 18s).
  - 4:50 pm: heavier clouds gathering, while the light dims (`DIM`).
  - 7:10 pm: a streetlight that comes on a moment after the scene arrives, and Kabir's message glowing on a phone.
  - 9:30 pm: the two glasses of haldi doodh, still warm.
  - 11:45 pm: one window still lit across the lane, and the phone charging in the kitchen (screen off, a breathing charge light).
  - 6:40 am lives in the opening's own scene: the snoozed alarm glowing on the windowsill.
- **Never near text:** they sit in the chapter's empty top padding band (14vh on phones, the chapter's `--pad` top on desktop, mirrored as `--pad-top` in scenes.css; keep the two in step). On desktop each sits on the side the text isn't.
- They fade in over 1.6s when the chapter overlaps the middle 30% of the screen (`.is-present`, an IntersectionObserver with -35% margins) and out as it leaves. Loops are 8s or slower, animate transform and opacity only, and pause while the chapter is away. Reduced motion leaves them still (reset.css).
- To add one, add an entry to `DETAILS` in scenes.js and a position in scenes.css. Keep each scene to two details at most, tied to something in the text.

### Moving through the day

- Chapters blend into each other, and the reader is always in charge of the scroll: no snapping, pinning, locking or scroll-speed changes. Lenis smoothing (required in Tech) stays at its gentle default (`lerp: 0.09`); touch keeps native scrolling.
- Headings come into focus and paragraphs ease in (see Text reveals), details cross-fade (Ambient details), and the light changes with scroll (One sky).

### Untangle a thought, /thoughts ([thoughts.js](src/sections/thoughts.js), [thoughts.css](src/styles/thoughts.css))

- Aarav's 4:50 pm thoughts, on their own page (afternoon palette) with a short framing line. The story's 4:50 pm chapter keeps its text and links here with a note ("untangle one of these thoughts"). The markup in thoughts/index.html is a `<ul>` of `<li class="thought">` items, each holding `.thought__worry` and `.thought__calm`. Without JS it reads as a list of worry → calmer version. To add or edit a thought, just edit that list.
  - Calmer versions sound like a kind friend talking to themselves: realistic, never "everything will be fine", and never dismissing the feeling ("That stings.", "that would really hurt"). Tie them to Aarav's day where you can (asleep at 2:10, four hours of sleep, Kabir, rank 214), one or two sentences each. No poster lines, and don't stack the tidy "X, not Y" contrast.
- **With JS it's personal: "Which of these feels closest to something you’ve thought?"** (the drifting crowd and "Breathe with me" were replaced long ago; the full breathing exercise is in Take a minute):
  - Before the thoughts sits one calm line ("There’s no right way to do this. You can try it, or just read."), then the question (`.thoughts__hint`, which labels the list).
  - The thoughts are hand-circled notes in Caveat, wrapped and slightly tilted like a crowded head (the pen loop from buttons.css at 40%). Each is a disclosure `<button aria-expanded aria-controls>`.
  - **Picking one** (`.is-open`, `.has-pick` on the box): a fuller hand-drawn circle draws itself round it (an SVG in each button, `--accent-text`, 1.1s), and the other thoughts soften to `--soft` with fainter loops (colours switch instantly; never transition them).
  - **It turns into its calmer version in place**, with no card or box: the worry steps back, smaller (1.2rem) and in `--soft` but still readable and still circled, and the calmer words write themselves in underneath, word by word, left to right (`.moment__word`, 0.7s each, starting 0.35s in, all in by about 2s). No strike-through, on purpose: crossing out a feeling reads as "that thought was wrong", and fading it away would erase it. Every layout change glides (FLIP in `settle()`: the thoughts translate to their new places over 0.8s and the picked button scales down with its circle; transform only). The calmer version is announced in a polite live region ("Another way to put it: …").
  - Tap another thought to switch (the open one fades back first, 0.45s), the same one or "Close" to let it go back, Escape to stop writing and then let it go. Only one is open at a time; a newer tap always takes over.
  - **After it's written** (`.moment__after`, delayed until the words are in), quietly: "What would you tell a friend who felt this way?" opens **the one writing box**: 200 characters, labelled with the same question, placeholder "you could say…", a quiet "n of 200" counter (spoken only at 20 left and at the limit), "Done" and "Never mind". Their words then write themselves in under "what you’d tell a friend", followed by "Maybe you could say that to yourself too." The link becomes "Change what you’d tell a friend". Nothing nags them to write.
  - **Gentle reflection, never recorded:** "Does this feel more manageable?" offers "A little", "Not really" and "Not sure" (`aria-pressed` buttons in a labelled group). Each gets a short warm reply in a status region; "Not really" links to /talk. Answers live only in the open thought and reset when it closes. No numbers, no progress, no tracking.
  - **"None of these. Let me write my own"** closes the list: one line, "What’s the thought?" (120 characters, Enter adds it). It joins the list, picked, with no suggested version; the same friend box is offered (never opened for them), plus "Remove this thought".
  - **"Start over"** (a quiet link under the thoughts, shown while there's something to clear): the open thought fades back, the circle and softening go, every box closes and empties, and words that were never saved (and their own thoughts) are cleared. Notes they chose to keep are never deleted silently: they stay saved, and the notes block says so next to "Delete my notes". Focus goes to the first thought.
  - At the end, always (also without JS): "These are small ways to look at a thought differently. They’re not a replacement for talking to someone. If a thought keeps coming back or feels too heavy, a counsellor or a helpline can help: talk to someone." (`.thoughts__limits`, linking /talk).
  - **Never** use the words diagnosis, score, result, level, fix, cure, therapy or treatment anywhere in this interaction (the "I’m so behind" calmer version used to say "fixable").
- **Privacy (must stay true):**
  - What the reader writes never leaves the browser: no network calls, no analytics, no form submission (there's no `<form>`).
  - The text is never read, analysed or judged: no keyword detection and no automatic responses. Their words only ever go into the page as `textContent`.
  - Fields use `autocomplete="off"` and `spellcheck="false"` (some browsers send spellcheck text to a server).
  - Which thought they pick is never stored, sent or counted.
  - Nothing is stored unless they tick "Keep my notes on this device" (unchecked by default; one in each writing area and one under "Your notes" at the end, kept in sync). Then their words and their own thoughts go in `localStorage['ood-thought-notes']` = `{ v: 1, words: { t1: "…" }, own: [{ worry, words }] }`. Unticking removes it at once.
  - "Delete my notes" clears the page and the device and confirms on the page (a status line that takes focus; no browser dialogs).
  - Unkept notes are cleared on `pagehide`, so the back/forward cache can't bring them back.
  - Every storage call is in try/catch. If storage is blocked, "keep" un-ticks itself and says notes will go when they leave.
  - Each writing area always shows the privacy note ("What you write stays on this device and is never sent anywhere… “Start over” clears the screen; notes you chose to keep stay until you delete them…") and the safety line ("If what you're feeling is about hurting yourself, please talk to someone right now", linking /talk).
- Accessibility: the calmer version and their words are announced through a polite live region ("Another way to put it: …" / "What you’d tell a friend: …"). The text box and fields have real labels. Every target is at least 44px tall (the checkbox's whole label row toggles it). Measured at 360×740: the softened and picked worries (`--soft`) 4.70:1 or better on the background and horizon glow, the circle 3.13:1, everything else 8.86:1 or better.
- If the picked thought's bottom lands under the garden, it is gently scrolled up (`scrollGently` in motion.js; never locked). On phones, a focused field is scrolled above the on-screen keyboard (`visualViewport`).
- Reduced motion: no circle drawing, no writing-in, no gliding: the calmer version, the circle and everything after simply appear, and Start over is instant.

### Take a minute ([breathing.js](src/sections/breathing.js), [breathing.css](src/styles/breathing.css), [ambient-sound.js](src/scripts/ambient-sound.js))

- /breathe, in the midday (sea-glass) palette (`#take-a-minute`, a `.chapter` for layout). The story's night chapter links to it with a note, and it suggests /ground next.
- Two rhythms: box (4-4-4-4) and 4-7-8. A wobbling SVG blob grows on the in-breath (eased), stays full or empty on holds, and settles on the out-breath. A ring fills once per round, with small dots where each phase starts. Word cues only ("breathe in", "hold", "breathe out") in a polite live region. Three round dots, and after three rounds a kind note and "Breathe again".
- **No stressful timers:** never show seconds or countdowns. The clock only advances while the blob is on screen and the tab is visible, with frame time capped at 0.1s, so it pauses and never skips ahead. The rhythm can't change mid-run; Stop is always available.
- Ambient sound: rain or waves, **off by default**, generated with the Web Audio API (filtered pink/brown noise; waves swell on an ~11s cycle). No AudioContext exists until someone picks a sound. It fades in over 2.5s, crossfades between sounds, and fades out and suspends when off, when the section leaves the screen or when the tab hides. `public/sounds/` is free for real recordings later.
- Reduced motion: the blob doesn't wobble or scale. The cues and the ring still guide the breath.
- Without JS, both patterns appear as plain written instructions.
- Never claim medical benefits in this copy without a source. Keep it to "there's no wrong way" framing.

### 5-4-3-2-1 grounding ([grounding.js](src/sections/grounding.js), [grounding.css](src/styles/grounding.css))

- /ground, in the morning palette (`#five-senses`); /breathe links to it with a note. It's a notebook of `<article class="page">`s: intro, see (5 lines), touch (4), hear (3), smell (2), taste (1), and a closing page that links to /talk. Each page has a hand-drawn SVG doodle (pencil, eye, hand, ear, nose, chai glass, sprout) that draws itself in when its page opens.
- Page turns: pages are stacked in one grid cell. Forward lifts the current page around its left (bound) edge, rotateY 0° → −94°, revealing the next page underneath. Back lays the earlier page down over the current one. 1s, ease-out, with Web Animations and a timeout so a stalled animation can't leave it stuck. Pages not showing are `inert`; after each turn focus moves to the new page's heading. Enter in a box moves down the lines, then to Next, and never turns the page itself. With reduced motion pages swap instantly.
- **Privacy promise ("doesn't save or send anything you type") must stay true:** no `<form>`, no storage of the text, no network calls (the garden only records *that* the exercise was finished); `autocomplete="off"` (no restoring on reload) and `spellcheck="false"` (some browsers send spellcheck text to a server); every box is cleared on "Start again" and on `pagehide` (so the back/forward cache doesn't keep it). Don't add analytics or anything else that could read these boxes.
- Without JS the pages simply stack in order with the doodles drawn and no nav buttons, and the boxes still work.

### Myths we grew up with ([myths.js](src/sections/myths.js), [myths.css](src/styles/myths.css))

- /myths, in the dusk palette (`#myths`). Eight paper notes in a `<ul>`; each `<li class="myth">` sets `--paper`, `--ink` and `--tape` from one *daytime* stop (dawn, morning, midday, afternoon, sunset), so ink on paper always has the designed 9:1+ contrast. Notes are tilted (`--tilt` per nth-child), held up with washi tape, with one corner lifted. The centred note straightens slightly.
- The row is a native, full-width `scroll-snap` strip: swiping on phones is real native scrolling (momentum, vertical page scroll still works). Arrow buttons with hand-drawn arrows, ←/→ keys, and a "3 / 8" counter step through it. Don't replace this with custom pointer dragging.
- Flip: with JS the front of each note becomes one big `<button>` (labelled "Myth: … Flip to see what's actually true"). The back gets its own "see the myth again" button, and tapping the back (not a link) also flips it back. The hidden side is `inert`; focus moves to the visible side's button; a polite live region announces the fact. Don't put an overlay button over the note: in a `preserve-3d` flip, z-index is ignored and it would cover the source links on the back.
- Copy: myths are things loving family say, never mocking. Facts are warm, about 40 words, with no unsourced statistics; the two with numbers link WHO (1 in 7, aged 10–19) and CDC (8–10h sleep).
- Without JS each note shows the myth with the fact underneath, and the row still scrolls.

### A note for tonight ([tonight.js](src/sections/tonight.js), [tonight.css](src/styles/tonight.css))

- /tonight, in the night palette (`#tonight`); the story's end suggests it. Heading "A note for tonight" (ink underline on "tonight"), "Pick one to keep with you. You don’t have to do anything with it.", a desk of notes under a soft lamp glow (12% `--night-accent`), the privacy line, then "Goodnight, Aarav. Goodnight to you too." in Caveat, a quiet help line (/talk and Tele-MANAS 14416, free, any time of night) and a "start the day again" note linking /story.
- **The notes** (a `<ul>` in tonight/index.html; edit the list to change them): eight reminders in Aarav’s voice, honest rather than cheerful, no slogans. Each `<li class="tonight__note tonight__note--<kind>">` borrows a daytime stop's `--paper` / `--ink` / `--pin` like the myth notes (9.35:1 or better), and is held differently: `--pin` (a round pin), `--tape`, `--fold` (a folded corner, drawn with a gradient, not clip-path, which would clip the focus ring) and `--clip` (a ruled index card with a paper clip). Kinds and papers are arranged so no two neighbours match in the 2- or 3-column grid. Tilts and small nudges per nth-child. Different from the myths on purpose: smaller, loose on a desk, no flip.
  - The last note, "Write my own" (`[data-own]`, moonlight paper with a pencil-dashed edge), is `hidden` without JS.
- **Picking** (tonight.js): each note becomes a `<button>` ("Pick this note: …", containing the visible words). Picking holds the desk's height (so nothing below moves and the page can't jump), fades the others (0.7s), and glides the note to the middle of the desk, 14% bigger and straighter (FLIP with the individual `translate` / `rotate` / `scale` properties, 1.1s ease-out; `.is-moving` switches CSS transitions off while it plays). Its options fade in under it: **Copy** (copy.js `copyText`: "Copied" on the button, or the words selected and "Selected" if the clipboard refuses), **Keep it on screen** and **Choose another**. Focus moves to the picked words (a plain `<p tabindex="-1">`, read out as "Your note for tonight: …"), Escape or "Choose another" goes back and returns focus to that note's button. Taps work again as soon as the layout changes; a newer pick or return takes over a glide in progress. With reduced motion it simply appears there.
  - "Write my own" opens a 120-character box (`autocomplete="off"`, `spellcheck="false"`); the words appear on the note as they're typed, and "Keep this note" (or Enter) makes it the picked note. The draft stays in the box (in memory only) if they choose another and come back.
- **Kept on screen** (`.pinned-note`, inserted in `.site-header` just before "Talk to someone", `role="note"`, "Your note for tonight"): only while the reader stays on /tonight (saving it anywhere would break the privacy promise). From 48rem it sits in the top bar itself (two lines at most, clear of the site name and "Library"), so it covers nothing. On phones the bar is full, so it's a small fixed note in the bottom-left corner, opposite the garden, which tucks away while a text box has focus on a touch screen (`html.is-typing`) and pushes the footer and `scroll-padding-bottom` clear of itself (`--pinned-h`). One at a time; a small × ("Take the note off the screen") removes it and returns focus where it came from. The button reads "On screen now" while that note is pinned. Pinning and removing are announced in the section's polite status.
- **Privacy (must stay true; the page says "Nothing here is saved or sent anywhere. Your note stays only until you close this page."):** no localStorage, sessionStorage, cookies, network calls or analytics; their words only ever go into the page as `textContent`. On `pagehide` the box, their note and the pinned note are cleared and the desk resets, so even the back/forward cache doesn't keep them (so going to any other page clears it too).
- Without JS: the eight notes read as a plain list on the desk, with no buttons.

### Garden ([garden.js](src/scripts/garden.js), [garden.css](src/styles/garden.css), [care.js](src/scripts/care.js))

- A small pill in the bottom-right corner, on the library, the story and the exercise pages (/breathe, /ground, /thoughts, /tonight); not on the intro, myths or the still pages. Finishing something kind for yourself sprouts a plant: Take a minute's three rounds → a two-leaf sprout; reaching the end of 5-4-3-2-1 → a flower (once per run); reading the story → a grass tuft (at most once a day). The stem grows up, then the leaves unfold over about 1.4s; every plant sways slowly on a 7s loop.
- Sections report a finish with `tookCare(kind)` from care.js; the garden listens with `onCare`. Add new triggers the same way, never by importing the garden.
- "Read the story" means most chapters (all but one) each stayed centred for 1.2s, then the reader settles on 11:45 pm. Jumping straight to the end (the day line) doesn't count.
- **No points, streaks or numbers on screen.** Clicking the garden opens a note: "you took care of yourself {once / twice / n times} today." Other days get "your garden is still here, quietly growing." Never add counters, goals, "don't break your streak" or anything that makes a missed day feel like failing.
- Storage: `localStorage['ood-garden']` = `{ v: 1, plants: [{ k: kind, t: timestamp }] }`, last 100 kept. Every read and write is in try/catch; if storage is blocked the garden still grows for the visit. It records only *what* was finished and *when*, never anything typed. The note says so ("lives only in this browser"), and "clear my garden" (asks twice) removes it. Other tabs stay in sync via the `storage` event.
- 9 plants show at once. Each plant keeps a fixed slot, so the 10th quietly replaces the 1st. A sprout adds just the one new plant, so the others keep swaying. An empty garden shows a single seed.
- Reduced motion: no sway, and new plants appear grown.

### Talk to someone, /talk ([talk/index.html](talk/index.html), [talk.css](src/styles/talk.css))

- The help page. Deliberately still, in the static dawn palette: no Lenis, GSAP, reveals, particles, sky, day line, garden, ripple or hover motion, only the page change. It works fully without JavaScript; pages/talk.js adds only the Copy buttons ([copy.js](src/scripts/copy.js)). "← Back to library" at the top; it ends with "Whenever you’re ready.", a "Back to library" button and "Next you could try: how to start the conversation". No analytics or tracking of help clicks, ever.
- Sections, in this order:
  - **Right now** (`#right-now`, `tabindex="-1"`, the skip link's target): a framed box (2px `--fg` border, 8% `--accent` tint). First 112 ("If you’re in immediate danger, or you might hurt yourself, call 112"), then Tele-MANAS with 14416 huge and 1-800-891-4416 below, a "How to call" block ("Open your phone app, dial 14416, and press call. It’s free. You can say: …") and a sources line.
  - An intro and an on-this-page list (the conversation guide and privacy now link to their own pages).
  - **What happens when I call?** (`#what-happens`): only what the Tele-MANAS About and FAQ pages say (language menu, trained counsellor, call-backs, referrals, confidential and not recorded, and the immediate-danger exception).
  - **Other ways to get support** (`#other-support`): talk now (→ `#helplines`), someone you know (→ /start-the-conversation), and ongoing support (counsellor, clinical psychologist, psychiatrist, one line each).
  - **Free helplines in India** (`#helplines`), ending with "Last checked: [date]" (`.talk-checked`).
- A tiny inline script in its `<head>` forwards old links into sections that moved: `#start-the-conversation`, `#talk-friend|parent|teacher|counsellor` and `#helping-a-friend` → /start-the-conversation, `#privacy` → /about#privacy. (`/talk.html` itself redirects to `/talk` in vercel.json, keeping the hash.)
- **Numbers and copying:** each number in the Right now box is a `.dial`: big selectable digits (`user-select: all`) whose visible text is `aria-hidden`, with a visually hidden spaced copy ("1 4 4 1 6") so screen readers read digits, not "fourteen thousand…". Then a 48px Call link (`tel:`; its name "Call 1 4 4 1 6" contains the visible word) and a Copy number button. Copy buttons are `hidden` in the HTML and shown by copy.js, so without JS the page is plain text and `tel:` links. A copy shows "Copied" on the button and says "Number copied." / "Message copied." in a polite status (`#copy-status`); if the clipboard refuses, the text is selected instead, the button says "Selected", and the status explains how to copy it. Nothing is sent or counted.
- `#helplines` is laid out as a printed directory, not a stack of cards: no tints, no rounded boxes. A heavy `--fg` rule opens the list. Tele-MANAS leads (`.line--main`): a bigger name, its 14416 set huge in Instrument Serif, and a Caveat `.note.line__pick` ("not sure which one to call? start here."), which hangs to the right of the name from 48rem. The other lines are hairline-ruled rows; from 48rem each row is name ····· number on one baseline (a dotted leader, `.line__name::after`), with the description, hours and source full width below. "Not in India?" sits after the list without a box.
- Every helpline has a `tel:` link (48px tall), when it's open, what it costs, and a **source link**. Only describe a line as confidential or anonymous if its own site says so. Toll-free numbers are labelled toll-free; for the rest, the page notes that normal call or data charges may apply. People outside India are pointed to Find A Helpline (findahelpline.com, ThroughLine, 175+ countries).
- Not listed on purpose: KIRAN 1800-599-0019 (reported merged into Tele-MANAS, current status unconfirmed) and SNEHA (official site unreachable behind a bot check, and its hours conflict between sources). Add them only after verifying on their official pages.

### Start the conversation, /start-the-conversation ([start-the-conversation/index.html](start-the-conversation/index.html), [conversation.css](src/styles/conversation.css))

- Still like /talk (`body.talk-page`, dawn). h1 "How do I start the conversation?", then a friend, a parent, a teacher, a school counsellor (`article.guide#talk-…`, h2 each). Each has when they're a good choice, three or four messages in Aarav's voice (one "short version", one "in Hinglish" with `lang="hi-Latn"`), each with a Copy message button (copy.js), and three tips. A bad first reaction doesn't mean you were wrong to say it; try someone else, or a free helpline (/talk).
- **How to help a friend who’s struggling** (`#helping-a-friend`): what to say, what to avoid, and a framed "When to tell a trusted adult" (straight away, even if asked to keep it secret; 112 for immediate danger).

### About, /about ([about/index.html](about/index.html))

- Still like /talk. What the site is, who it's for, what's real and what isn't (Aarav is made up; helpline numbers checked October 2026; every number linked to its source; nothing here is a test or a diagnosis), **"Your privacy"** (`#privacy`), a gentle content note (112 for danger, /talk for helplines), and the way back.
- "Your privacy" says in plain words: no accounts, ads, analytics or tracking code; nothing you click, pick or type is sent anywhere; anything written in Untangle a thought, the 5-4-3-2-1 notebook or A note for tonight stays on the device; nothing is saved unless "Keep my notes on this device" is chosen (and "Delete my notes" removes it; "Start over" keeps kept notes); which thought you pick and reflection answers aren't kept; the notebook and tonight never save; the library's chips aren't kept; the garden only remembers that an exercise was finished, and when; don't save on a shared or school computer. Keep it true whenever storage changes anywhere on the site.

### Text reveals ([text-reveal.js](src/scripts/text-reveal.js), /story only)

- Headlines (`main h1, h2`) come into focus line by line, except inside `[data-no-reveal]` (the opening screen, which must be readable on load): blur 7px and 20% opacity, to sharp over 1.2s, with lines 0.18s apart. Words are wrapped in temporary spans, grouped into lines when the reveal runs, then unwrapped, so the DOM ends up exactly as authored. GSAP SplitText isn't used because its auto re-split rebuilds the heading's HTML, which would destroy the ink SVGs inside it.
- Story paragraphs (`.chapter__inner > p`, `.fact > p`) ease in from 25% opacity and 12px lower over 1.2s, 0.2s after they arrive, with the same rules as headings (registered, never hidden once seen, none with reduced motion).
- Ink draws 0.6s after its trigger (underline 1.1s, circle 1.4s). Margin notes (`.note`) fade in while settling from a slightly bigger tilt.
- Everything fires when its top passes 85% down the screen, once.
- **Nothing waits invisibly.** The HTML is fully visible as authored. Hidden "before" states are applied only by JS, only to elements not yet seen, and each one is registered so `revealAll()` can finish it instantly. Elements already scrolled past are never hidden. Errors during setup, and printing (`beforeprint`), reveal everything. With reduced motion nothing is hidden at all, and ink shows fully drawn.

## Safety (non-negotiable)

- Follow safe-messaging guidelines for suicide and self-harm: no graphic detail, no methods, never present suicide as a solution or as inevitable. Use "died by suicide", never "committed suicide".
- Focus on hope, recovery and getting help. Any heavy moment in the story should be followed by a way to reach support.
- Never present quizzes or self-checks as a diagnosis. Frame them as reflection and point people toward talking to someone they trust or a professional.
- Never invent a helpline number. All numbers were checked on **17 Oct 2026** against official sources (each one is linked next to the number), and /talk says "Last checked: 17 October 2026". Re-check them before launch and after any long gap, and update that line:
  - Tele-MANAS 14416 / 1-800-891-4416, toll-free, 24×7, choose your language: telemanas.mohfw.gov.in (updated 13 May 2026), PIB 2022 launch and PIB May 2024. The 2022 PIB release prints the long number as "1-800-91-4416", a typo; the official site and the 2024 release both say 1-800-891-4416. The site doesn't list which languages, so the page says only "choose your language".
  - What a Tele-MANAS call is like (telemanas About and FAQ): a recorded menu to pick a language, then a trained counsellor; it may call you back; it can refer you to a clinical psychologist, a psychiatrist or nearby services; calls are confidential and not audio-recorded, except that if someone might be in immediate danger they may involve family or others who can help.
  - Vandrevala Foundation +91 9999 666 555, call or WhatsApp, free, 24×7, private and confidential: vandrevalafoundation.com/free-counseling.
  - iCALL (TISS) 9152987821, free, Mon–Sat 10 am–8 pm, anonymous, icall@tiss.edu: TISS iCALL project page.
  - AASRA 022 2754 6669, free, 24×7, English and Hindi, calls not recorded: aasra.info/helpline.html.
  - Child Helpline 1098, toll-free, 24×7, for children in difficult circumstances, integrated with 112: PIB, Ministry of Women and Child Development, 6 Aug 2025.
  - 112, India's emergency number for police, fire and health, from any phone: PIB (ERSS launch, 19 Feb 2019).
- The story's night chapter shows Tele-MANAS and 112 and links to /talk and /start-the-conversation for the rest.

## Story and copy

- Aarav, 17, Class 12, board exams four months away, coaching after school. Kabir is his friend from coaching; Mummy and Papa are his parents. Themes: sleep (morning), loneliness in a crowd (midday), social media comparison and family and exam pressure (afternoon), a friend checking in (sunset), talking to a friend and to mum (dusk), help and hope (night).
- Voice: warm, specific, Indian-English, never preachy. Show small real moments (the family WhatsApp group, the mock test ranks, haldi doodh) rather than giving advice. Margin notes read like a friend's scribble.
- Use curly quotes and apostrophes (“ ” ’) in copy.
- **Facts** (`<aside class="fact fact--<layout>" role="note">`, between chapters, no "did you know?" label: the number leads): occasional, one statistic each, and **every statistic links to a real source** that someone has opened and checked says exactly that. Prefer primary sources (WHO, UNICEF, government). If the primary can't be reached, name it and link a reputable report of it, e.g. "NCERT survey, as reported by The Week". Outside links open in a new tab and include a visually hidden "(opens in a new tab)".
- Never put a fact between sunset and dusk. The text colour flips there, and a fact would sit at the moment of lowest contrast.
- Current sources: CDC About Sleep (8–10h for teens, AASM), WHO Commission on Social Connection 2025 (17–21% lonely, 13–29), NCERT Manodarpan 2022 via The Week (8 in 10 anxious about studies/exams/results), UNICEF SOWC 2021 India release (41% vs 83%; and, on the intro, "around 14 per cent of 15 to 24-year-olds in India, or 1 in 7, reported often feeling depressed or having little interest in doing things", re-checked 18 Oct 2026), WHO adolescent mental health fact sheet (1 in 7, aged 10–19; page dated 1 September 2025, re-checked 18 Oct 2026).
- Not used, couldn't be checked on a web page: the NIMHANS National Mental Health Survey 2015–16 figures for 13–17-year-olds (only in PDF reports at indianmhs.nimhans.ac.in).

## Tech

- **Vite + vanilla JavaScript.** No frameworks, no UI kits, no CSS frameworks.

### Pages and build

- **A Vite multi-page site, no router.** Each page is its own HTML file in its own folder (`library/index.html`…), so it has a clean address on any static host, works without JavaScript, and loads only its own code; Back and refresh just work. The page list is `PAGES` in [vite.config.js](vite.config.js) (plus `index.html` for `/`). To add a page: a folder with index.html, a `src/pages/<name>.js` entry, a `src/styles/pages/<name>.css`, and its name in `PAGES`.
- **Partials:** the shared head tags, the top bar and the footer live once in `src/partials/` (head.html, bar.html, footer.html). A page says `<!-- include:bar skip="#right-now" talkLink="" -->`; the `partials` plugin in vite.config.js drops the file in before Vite reads the HTML, filling `{{key}}` from the comment or its defaults. Each page keeps its own title, description, theme-color, canonical and og:title / og:description / og:url.
- **Clean URLs:** links are `/library`, never `.html` or a trailing slash. Vercel serves them (`cleanUrls`, `trailingSlash: false`); the `clean-urls` plugin does the same for `npm run dev` and `npm run preview`.
- **Palettes:** `<html data-palette="morning">` (palettes.css) sets the page's stop; dawn is the default; /story has none (day-colors.js writes its colours). `--soft` takes 76% of the text colour on the light stops and 84% on dusk and night. Measured on 18 Oct 2026, text on each page's background: `--fg` 6.89:1 or better (dusk), `--soft` 4.58:1 or better (dawn), `--accent-text` 3.16:1 or better.
- **CSS:** each page has one entry, `src/styles/pages/<name>.css`: `site-start.css` (fonts, tokens, palettes, reset, base, sections, shell, ink), then its components, then `site-end.css` (buttons, interactions, which must come last). The shared frame (bar, footer, `.site-main` column, back and next links) is shell.css. Don't name a page class `.page`: the 5-4-3-2-1 notebook's pages use it.
- **JS:** each page has one entry in `src/pages/`. Only /story loads GSAP, ScrollTrigger and Lenis (about 150 KB with the story's own code); the other pages load a few KB (breathe about 16 KB in all, talk under 3 KB). Shared helpers that any page can import without pulling those in: motion.js (`prefersReducedMotion`, `scrollGently`), care.js, copy.js, garden.js, page-transition.js, interactions.js.
- **GSAP + ScrollTrigger** for scroll-linked colour and reveals (on /story).
- **Lenis** for smooth scrolling (on /story). Connect it to ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)` and run Lenis from `gsap.ticker`). Remove `scroll-behavior: smooth` from CSS when Lenis is active.
- Keep it simple and fast: small bundle, no heavy assets, only animate `transform`, `opacity` and colour variables.
- Mobile first: write base styles for phones and add `min-width` media queries. Use 16px side gutters, respect `env(safe-area-inset-*)`, and allow no horizontal scroll.

### Launch performance

- **Lighthouse (mobile, 16 Oct 2026, production build via `npm run preview`), from before the site was split into pages; re-run it for the new pages:**
  - Story page: Performance 97–98, Accessibility 96, Best Practices 100, SEO 100 (FCP 1.8s, LCP 2.1–2.3s, TBT 10–50ms, CLS 0). Re-measured on 17 Oct 2026 after the sky, day line and scene details went in: the same scores.
  - The help page (then talk.html): 100 in all four.
  - Story page before the launch pass: 92 / 96 / 96 / 91.
  - The one accessibility flag is `color-contrast` on headings and paragraphs further down the page. Lighthouse catches them in their pre-reveal state (20% opacity, offscreen, see Text reveals). Readers never see them like that.
  - To re-run: `npx lighthouse http://localhost:4173/ --chrome-flags="--headless=new"` (mobile is the default).
- **Images:** the site uses none, apart from the link-preview image and icons in `public/`.
- **Head tags** (every page): a specific `<title>`, a meta description of 160 characters or fewer (the intro's uses the one-line summary: "a short, interactive story about what teenagers often carry quietly"), `theme-color` (the page's background), and icons: favicon.svg (the old sky dial's sun on its dotted arc over a hand-drawn horizon, dawn palette), favicon.ico (16 and 32px inside) and apple-touch-icon.png (180px, opaque). Plus Open Graph and `twitter:card` tags and `public/robots.txt`.
  - The preview image is `public/og-image.jpg`: 1200×630, JPEG q85 with 4:4:4 chroma, about 50 KB. Its source is [design/og-image.html](design/og-image.html), with regeneration steps in the file.
  - **og:image, og:url and canonical need full addresses.** vite.config.js fills `%SITE_URL%` in at build time from `SITE_URL` (in `.env.production`), or on Vercel from `VERCEL_PROJECT_PRODUCTION_URL`. That's the production domain, so it follows a custom domain automatically. With neither (a local build), the build warns, drops canonical and og:url, and leaves the image path relative.

### Deploying (Vercel)

- **Live at https://one-ordinary-day.vercel.app** (Vercel project `rakshit-23cd/one-ordinary-day`, Hobby plan, first published 16 Oct 2026). On the live site, mobile Lighthouse scored 95 / 96 / 100 / 100.
- **Code on GitHub: https://github.com/rakshitsaad/one-ordinary-day** (public, branch `main`, pushed over HTTPS; Git Credential Manager on this computer is already signed in).
- **Vercel is connected to the repository, so pushing is publishing.** Every push to `main` builds and replaces the live site (about a minute). A push to any other branch gets its own preview URL and leaves the live site alone. So test locally (`npm run build && npm run preview`) before pushing to `main`, or work on a branch.
  - The Vercel GitHub App can see only this one repository ("Only select repositories"). Change that in GitHub › Settings › Applications › Vercel.
  - Git deployments clone the whole repository, so `.vercelignore` only applies to CLI uploads.
- `npm run deploy` (`vercel deploy --prod`) still works for publishing straight from this folder without a commit. The CLI is signed in on this computer, and `.vercel/project.json` links the folder to the project. Never commit `.vercel/`.
- The repository is public, so never commit secrets. `.env.production` holds only the public `SITE_URL`; anything private goes in `.env.local`, which is ignored.
- [vercel.json](vercel.json) holds the build settings (Vite, `dist`), clean URLs (`cleanUrls`, `trailingSlash: false`), redirects (`/talk.html` → `/talk`, `/index.html` → `/`) and headers. Hashed `/assets/*` files are cached for a year (`immutable`); every page gets `nosniff`, a strict referrer policy, and camera / microphone / location switched off. HTML is revalidated on every visit, so a new deploy shows straight away.
- `.vercelignore` keeps `node_modules`, `dist`, `reference`, `design` and `.claude` out of the upload.
- Deployment Protection (Vercel Authentication) is on by default, but only for preview and per-deployment URLs. The production domain is public (checked with a signed-out request).

### Project structure

```
index.html              / : the intro (feeling cards, facts, what's here)
library/index.html      /library: the dashboard
story/index.html        /story: Aarav's day (chapters, facts, interlude, end)
breathe/ ground/ thoughts/ myths/ tonight/   one page each, with its section
talk/index.html         /talk: Talk to someone
start-the-conversation/index.html   the guide and helping a friend
about/index.html        /about: about this site, and privacy
src/partials/           head.html, bar.html, footer.html (shared; see Pages and build)
src/pages/              one JS entry per page (story.js, breathe.js, talk.js, home.js…)
src/styles/pages/       one CSS entry per page; site-start.css / site-end.css wrap them
src/styles/             tokens.css (palette + live colour vars), palettes.css (one stop per page),
                        reset.css, base.css (body, grain), sections.css (type, chapters, facts,
                        helpline, story end), shell.css (bar, skip link, footer, page column,
                        back / next links), ink.css (.mark / .circle)
src/styles/home.css     the intro; library.css the dashboard; conversation.css the guide
src/styles/talk.css     the still pages: column, Right now box, helpline directory, way back
src/styles/fonts.css    self-hosted @font-face + size-matched fallbacks
src/assets/fonts/       latin woff2 files + OFL licences
src/scripts/opening.js  opening clock (openingClock, read by day-line.js and sky.js) + scroll cue
src/scripts/day-time.js chapter times, hoursAt(), formatTime(), sunAt() / moonAt()
src/scripts/day-line.js the day line (clock + chapter dots); src/styles/day-line.css
src/scripts/sky.js      one sky: horizon glow, sun, moon; src/styles/sky.css
src/scripts/scenes.js   small details per chapter; src/styles/scenes.css
src/styles/opening.css  opening screen: window scene, sunlight, curtain, cue
src/scripts/            color.js (maths + WCAG contrast), smooth-scroll.js (Lenis + scrollToY),
                        day-timeline.js (scroll position → chapter + progress),
                        day-colors.js (colour blend + sky tones), particles.js, in-page-links.js,
                        ink.js (hand-drawn SVG strokes), text-reveal.js: all /story only.
                        Init order in pages/story.js matters: day-colors before particles.
src/scripts/library.js  the library's chips
src/scripts/copy.js     copyText() (select-text fallback) + the Copy buttons on /talk and
                        /start-the-conversation; also used by A note for tonight
src/sections/           per-section behaviour: thoughts.js, breathing.js, grounding.js,
                        myths.js, tonight.js. Markup stays in each page's HTML, so it reads
                        without JS
src/styles/myths.css          myth notes: paper, tape, tilt, flip, snap strip
src/styles/tonight.css        A note for tonight: desk, lamp glow, notes, picked state, pinned note
src/scripts/motion.js         prefersReducedMotion + scrollGently (light; any page can import it)
src/scripts/interactions.js   click ripple
src/scripts/page-transition.js  the fallback page fade (leaving half); View Transitions where supported
src/styles/interactions.css   button lift/press, link underline draw, ripple, page veil
src/scripts/care.js           tookCare(kind) / onCare(): "finished an exercise" signal
src/scripts/garden.js         corner garden + localStorage (try/catch) + story-read detection
src/styles/garden.css         garden pill, plants, growing + sway, the little note
src/styles/buttons.css        hand-drawn pen-loop buttons + highlighter (before interactions.css)
src/styles/grounding.css      5-4-3-2-1 notebook: paper, binding, lines, page turns
src/scripts/ambient-sound.js  generated rain / waves (Web Audio), off by default
src/styles/breathing.css      Take a minute: blob, ring, pills, kind note
src/styles/thoughts.css       Untangle a thought: circled thoughts, in-place reframe, writing, notes
public/                 favicon.svg/.ico, apple-touch-icon.png, og-image.jpg, robots.txt
public/sounds/          optional audio, never autoplayed
design/og-image.html    source for the link-preview image (not built)
.env.production         SITE_URL for link previews (leave empty on Vercel)
vercel.json             Vercel build settings, clean URLs, redirects, headers
```

The palette lives once, in `src/styles/tokens.css` as `--<stop>-bg/-fg/-accent/-particle`. Scripts read those values instead of duplicating hex codes in JS.

The project sits in a OneDrive-synced folder, where native file-change events get dropped. [vite.config.js](vite.config.js) turns on polling so Vite never serves a stale module (keep it unless the project moves out of OneDrive). It also lists every page as a build input (`PAGES`); add any new page there too.

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
- Decorative layers (grain, particles, sky, scene details) get `aria-hidden="true"` and `pointer-events: none`.
- reset.css forces `[hidden] { display: none !important; }`. Without it, any component that sets `display` (grid, flex) ignores the `hidden` attribute; that once left the no-JS page showing JS-only controls. When testing no-JS states, check the computed `display`, not just the attribute.
