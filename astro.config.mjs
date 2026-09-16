// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// DEPLOYMENT CONFIG - SOURCE OF TRUTH
// Two files affect the deploy. They own strictly separate concerns; keep it
// that way, because a setting defined in both places has no obvious winner.
//
//   astro.config.mjs (this file) OWNS: routing - redirects, output mode,
//     adapter, integrations. The Vercel adapter compiles these into
//     .vercel/output/config.json. Defining redirects here (not in vercel.json)
//     also means they work in `astro dev`.
//
//   vercel.json OWNS: HTTP response headers only. @astrojs/vercel cannot
//     express headers, so they must live there; Vercel applies them at the
//     platform layer and they never appear in the adapter's output config.
//
// Do NOT add `redirects`, `rewrites`, or `routes` to vercel.json - they would
// compete with the adapter's generated routes. Add them here instead.

// PRODUCTION ENV CHECK
// Vercel sets VERCEL_ENV=production only for production deploys, so previews
// and local builds are unaffected.
//
// Missing email keys warn rather than block the deploy: they are read at
// request time (access: 'secret' below), so setting them in Vercel only needs a
// redeploy, and until then the lead endpoints fail closed - the visitor is told
// to call instead of seeing a false success, and the function log records
// "LEAD NOT DELIVERED" (src/lib/email/deliver.ts).
if (process.env.VERCEL_ENV === 'production') {
  const missing = ['RESEND_API_KEY', 'LEAD_TO_EMAIL', 'EMAIL_FROM'].filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.warn(
      `\n[env] WARNING: lead emails are OFF - set these in Vercel > Settings > Environment Variables, then redeploy: ${missing.join(', ')}\n` +
        '[env] Until then, contact and chat leads are not delivered; visitors are asked to call instead.\n',
    );
  }
  // This one still blocks: a secret without the site key rejects every form
  // submission, and a site key without the secret shows a challenge nobody checks.
  const siteKey = Boolean(process.env.PUBLIC_TURNSTILE_SITE_KEY?.trim());
  const secret = Boolean(process.env.TURNSTILE_SECRET?.trim());
  if (siteKey !== secret) {
    throw new Error('[env] Production deploy blocked - set BOTH PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET, or neither.');
  }
}

// DEV-ONLY PAGES
// Injected only by `astro dev`, so they never exist in a build or a deploy.
// Their files live in src/dev/, outside src/pages/, for the same reason.
/** @type {import('astro').AstroIntegration} */
const devOnlyRoutes = {
  name: 'dev-only-routes',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command !== 'dev') return;
      // Lead email templates with sample data: http://localhost:4321/dev/emails
      injectRoute({ pattern: '/dev/emails', entrypoint: './src/dev/email-preview.astro', prerender: false });
    },
  },
};

// BUILD-TIME IMAGES ONLY
// Every page is prerendered, so images are optimized at build time and the
// runtime /_image endpoint is never called. Astro's default endpoint would
// still bundle sharp's ~17MB native binary into the serverless function of
// every deployment (41MB -> 22MB per deploy), so builds swap in a 404 stub.
// Dev keeps the real endpoint - it is what serves images under `astro dev`.
/** @type {import('astro').AstroIntegration} */
const buildTimeImagesOnly = {
  name: 'build-time-images-only',
  hooks: {
    'astro:config:setup': ({ command, updateConfig }) => {
      if (command !== 'build') return;
      updateConfig({ image: { endpoint: { entrypoint: './src/lib/assets/no-runtime-image-endpoint.ts' } } });
    },
  },
};

// https://astro.build/config
export default defineConfig({
  // Production domain. This is the single source of truth for the site origin -
  // canonicals, the sitemap, OG URLs and schema.org all derive from it via
  // `import.meta.env.SITE` (see src/lib/seo.ts). Do not hardcode the domain
  // anywhere else.
  //
  // jimdandysewer.com is a secondary domain that 301s here; the live business
  // site (previously Squarespace) is served from this origin.
  site: 'https://www.jimdandysewerandplumbing.com',
  output: 'static',
  // Server secrets are declared here with access: 'secret', which makes Astro
  // read them from the runtime environment on each request (Vercel function
  // env) instead of inlining them into the build output. Referencing a private
  // variable via import.meta.env in server code would bake its value into the
  // deployed bundle - verified by building with dummy secrets and grepping
  // .vercel/output. Import them from "astro:env/server".
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEAD_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      EMAIL_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
      EMAIL_REPLY_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  adapter: vercel(),
  // Canonical URLs have no trailing slash; the adapter 308s "/about/" to
  // "/about" so each page is reachable at exactly one URL.
  trailingSlash: 'never',
  redirects: {
    // /commercial and /services/commercial shipped as two full pages with the
    // same <title>, both indexable. The service-detail page is canonical; this
    // retires the parallel one instead of leaving it to compete.
    '/commercial': { status: 301, destination: '/services/commercial' },

    // LEGACY SQUARESPACE URLS - every URL in the live site's sitemap.xml
    // (www.jimdandysewerandplumbing.com, fetched 2026-09-15), mapped to its
    // closest page here so search rankings and old bookmarks carry over.
    // The blog is not being migrated; posts go to the service they covered.
    '/contact-us': { status: 301, destination: '/contact' },
    '/schedule-online': { status: 301, destination: '/contact' },
    '/jim-dandy-sewer-and-plumbing': { status: 301, destination: '/about' },
    '/recent-projects': { status: 301, destination: '/gallery' },
    '/service-area/mountlake-terrace': { status: 301, destination: '/service-area' },
    '/service-area/shoreline': { status: 301, destination: '/service-area' },
    '/services/commercial-plumbing': { status: 301, destination: '/services/commercial' },
    '/services/commercial-plumbing/drain-cleaning': { status: 301, destination: '/services/commercial' },
    '/services/drain-cleaning': { status: 301, destination: '/services/drains-clogs' },
    '/services/drain-cleaning/hydro-jetting': { status: 301, destination: '/services/drains-clogs' },
    '/services/plumbing': { status: 301, destination: '/services/all-plumbing' },
    '/services/plumbing/emergency-plumber': { status: 301, destination: '/services/emergency' },
    '/services/plumbing/water-heaters': { status: 301, destination: '/services/water-heaters' },
    '/services/plumbing/tankless-water-heaters': { status: 301, destination: '/services/water-heaters' },
    '/services/plumbing/boiler': { status: 301, destination: '/services/water-heaters' },
    '/services/plumbing/garbage-disposals': { status: 301, destination: '/services/all-plumbing' },
    '/services/plumbing/repiping': { status: 301, destination: '/services/all-plumbing' },
    '/services/plumbing/sump-pumps': { status: 301, destination: '/services/all-plumbing' },
    '/services/plumbing/toilets': { status: 301, destination: '/services/all-plumbing' },
    '/services/plumbing/water-filtration': { status: 301, destination: '/services/all-plumbing' },
    '/services/plumbing/water-softeners': { status: 301, destination: '/services/all-plumbing' },
    '/services/sewer': { status: 301, destination: '/services/sewer-services' },
    '/services/sewer/repair': { status: 301, destination: '/services/sewer-services' },
    '/services/sewer/replacement': { status: 301, destination: '/services/sewer-services' },
    '/services/sewer/sewer-camera-inspection': { status: 301, destination: '/services/sewer-services' },
    '/services/sewer/trenchless-repair': { status: 301, destination: '/services/sewer-services' },
    '/services/sewer/trenchless-replacement': { status: 301, destination: '/services/sewer-services' },
    '/blog': { status: 301, destination: '/services' },
    '/blog/all-about-your-homes-water-pressure-too-high-or-too-low': { status: 301, destination: '/services/all-plumbing' },
    '/blog/an-introduction-to-trenchless-sewer-repair-technology': { status: 301, destination: '/services/sewer-services' },
    '/blog/how-do-sump-pumps-work': { status: 301, destination: '/services/all-plumbing' },
    '/blog/is-your-water-heater-acting-up-when-to-repair-or-replace-in-seattle': { status: 301, destination: '/services/water-heaters' },
    '/blog/plumbing-for-commercial-properties-what-you-need-to-know-in-seattle-washington': { status: 301, destination: '/services/commercial' },
    '/blog/q8haeo8i14pe2x20db8ohgazfteclv': { status: 301, destination: '/services' },
    '/blog/troubleshooting-guide-why-wont-your-hot-water-turn-on': { status: 301, destination: '/services/water-heaters' },
    '/blog/understanding-your-homes-main-water-shut-off-valve': { status: 301, destination: '/services/all-plumbing' },
    '/blog/what-are-the-benefits-of-drain-cleaning': { status: 301, destination: '/services/drains-clogs' },
    '/blog/winter-plumbing-tips-protecting-your-pipes-from-seattles-cold-and-rain': { status: 301, destination: '/services/all-plumbing' },
    // /blog/category/* URLs contain "+", which redirect patterns cannot
    // express - they are handled by src/pages/blog/category/[...category].ts.
  },
  integrations: [
    devOnlyRoutes,
    buildTimeImagesOnly,
    react(),
    sitemap({
      // /privacy-policy is served with `noindex`. Listing it here as well is a
      // direct contradiction and shows up in Search Console as "Submitted URL
      // marked noindex", so it is excluded from the sitemap instead.
      filter: (page) => !page.includes('/privacy-policy'),
      // The integration emits directory URLs with a trailing slash ("/about/"),
      // but every canonical is emitted without one ("/about"). Google treats
      // those as different URLs; strip the slash so the two agree. The homepage
      // keeps its slash, because its canonical has one.
      serialize: (item) => {
        const url = new URL(item.url);
        if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
        return { ...item, url: url.toString() };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    domains: [],
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
