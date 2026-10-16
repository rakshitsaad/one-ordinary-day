# One Ordinary Day

A youth mental health awareness website. You spend one school day with Aarav, 17, from 6:40 am to 11:45 pm: boards four months away, coaching after school, the family WhatsApp group, a friend who checks in. As you scroll, the colours of the whole site move from dawn to night.

**Live site: https://one-ordinary-day.vercel.app**

After the story come three small things to try (a breathing exercise, a 5-4-3-2-1 grounding notebook, and myths we grew up with) and a page of free, verified helplines in India.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

## Publish

`npm run build` makes the finished site in `dist/`. `npm run deploy` publishes it to Vercel (it needs the Vercel CLI to be signed in once).

## Built with

- Vite and plain JavaScript, with no framework
- GSAP and ScrollTrigger for the scroll-linked colour and reveals, and Lenis for smooth scrolling
- Instrument Serif, Figtree and Caveat fonts, self-hosted (SIL Open Font License, see `src/assets/fonts/`)

[CLAUDE.md](CLAUDE.md) has the full design notes: colour stops, motion rules, accessibility checks and the safety guidelines the copy follows.

## Sources and safety

Every statistic on the site links to its source. The helpline numbers were checked against official sources on 16 October 2026; check them again before relying on them. If you're in India and need to talk to someone now, call **Tele-MANAS on 14416** (free, 24×7). In an emergency, call **112**.
