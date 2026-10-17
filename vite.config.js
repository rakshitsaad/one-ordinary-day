import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = (path) => fileURLToPath(new URL(path, import.meta.url));

// Every page is its own HTML file in its own folder, so it has a clean address
// (/library, /story…) on any static host. Add a new page here and in vercel.json
// if it needs a redirect. `/` is the intro (index.html).
const PAGES = [
  'library',
  'story',
  'breathe',
  'ground',
  'thoughts',
  'myths',
  'talk',
  'start-the-conversation',
  'tonight',
  'about',
];

// Link previews (WhatsApp, Instagram, X...) need full addresses for the page and
// its preview image. The pages say %SITE_URL%; this fills it in from SITE_URL
// (set it in .env.production, or in your host's build settings). Until it's set,
// the canonical and og:url tags are left out and the image path stays relative,
// which works for search engines but not for most link previews.
function siteUrl(url) {
  return {
    name: 'site-url',
    configResolved(config) {
      if (config.command === 'build' && !url) {
        config.logger.warn('\nSITE_URL is not set: link previews need it. Add it to .env.production before launch.\n');
      }
    },
    transformIndexHtml(html) {
      if (url) return html.replaceAll('%SITE_URL%', url);
      return html
        .replace(/^[ \t]*<(?:link rel="canonical"|meta property="og:url")[^>]*%SITE_URL%[^>]*>\r?\n/gm, '')
        .replaceAll('%SITE_URL%', '');
    },
  };
}

// The parts every page shares (head tags, the top bar, the footer) live once in
// src/partials/ and are dropped in wherever a page says
// <!-- include:name key="value" -->. {{key}} in a partial takes that value, or the
// default below. Runs before Vite reads the HTML, so the partials' own asset
// links (the font preloads) are processed like any other.
// /talk passes talkLink="" to both: a "Talk to someone" link on the page it
// opens would only point back at itself.
const PARTIAL_DEFAULTS = {
  bar: { skip: '/talk#right-now', class: '', talkLink: '<a class="talk" href="/talk">Talk to someone</a>' },
  footer: { talkLink: '<a href="/talk">Talk to someone</a>' },
};

function partials() {
  return {
    name: 'partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!--\s*include:([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g, (_, name, attrs) => {
          const values = { ...PARTIAL_DEFAULTS[name] };
          for (const [, key, value] of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) values[key] = value;
          const partial = readFileSync(file(`./src/partials/${name}.html`), 'utf8');
          return partial.replace(/\{\{(\w+)\}\}/g, (__, key) => values[key] ?? '').trimEnd();
        });
      },
    },
  };
}

// The dev and preview servers serve /library/ but not /library; Vercel serves
// both (cleanUrls). Map the clean address to the folder so links work locally.
function cleanUrls() {
  const rewrite = (req, _res, next) => {
    const [path, query] = req.url.split('?');
    const name = path.replace(/^\/|\/$/g, '');
    if (PAGES.includes(name) && !path.endsWith('/')) req.url = `/${name}/${query ? `?${query}` : ''}`;
    next();
  };
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

// SITE_URL wins if set. On Vercel it falls back to the project's production
// address (VERCEL_PROJECT_PRODUCTION_URL, e.g. one-ordinary-day.vercel.app, or
// the custom domain once one is added), so previews work with no setup.
function resolveSiteUrl(env) {
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = env.SITE_URL || (vercel ? `https://${vercel}` : '');
  return url.trim().replace(/\/+$/, '');
}

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  return {
    plugins: [partials(), siteUrl(resolveSiteUrl(env)), cleanUrls()],
    server: {
      // The project lives in a OneDrive-synced folder, where native file events
      // can be dropped (a quick second save was missed, serving stale modules).
      // Polling is slightly heavier but never misses a change.
      watch: { usePolling: true, interval: 200 },
    },
    build: {
      rollupOptions: {
        input: {
          index: file('./index.html'),
          ...Object.fromEntries(PAGES.map((name) => [name, file(`./${name}/index.html`)])),
        },
      },
    },
  };
});
