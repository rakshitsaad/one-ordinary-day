import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

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
    plugins: [siteUrl(resolveSiteUrl(env))],
    server: {
      // The project lives in a OneDrive-synced folder, where native file events
      // can be dropped (a quick second save was missed, serving stale modules).
      // Polling is slightly heavier but never misses a change.
      watch: { usePolling: true, interval: 200 },
    },
    build: {
      // Two pages: the story, and "Talk to someone".
      rollupOptions: {
        input: {
          main: page('./index.html'),
          talk: page('./talk.html'),
        },
      },
    },
  };
});
