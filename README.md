# Jim Dandy Sewer & Plumbing

Production Astro site for Jim Dandy Sewer & Plumbing, built from the Figma design
(`Jim Dandy Sewer & Plumbing`, node `279-1603`).

## Stack

Astro 7 · TypeScript (strict) · Tailwind CSS 4 · React islands · Framer Motion ·
React Hook Form + Zod · Lucide icons · Resend (lead emails, via its HTTP API) ·
`@astrojs/vercel` adapter.

## Commands

| Command           | Action                                      |
| :----------------- | :------------------------------------------ |
| `npm install`       | Install dependencies                        |
| `npm run dev`       | Start dev server at `localhost:4321`        |
| `npm run build`     | Build to `./dist` and `.vercel/output`      |
| `npx astro check`   | Type-check only                             |

> `npm run build` does **not** type-check. Run `npx astro check` separately (or
> add it to CI) before sign-off.

## Deployment configuration

Two files affect the deploy, owning strictly separate concerns:

| File | Owns | Applied by |
| :--- | :--- | :--- |
| `astro.config.mjs` | Routing: `redirects`, output mode, adapter, integrations | Compiled into `.vercel/output/config.json` by `@astrojs/vercel` |
| `vercel.json` | HTTP response headers **only** | Vercel, at the platform layer |

`@astrojs/vercel` cannot express response headers, which is why `vercel.json`
exists at all. **Do not add `redirects`, `rewrites`, or `routes` to
`vercel.json`** — they would compete with the adapter's generated routes with no
obvious winner. Redirects belong in `astro.config.mjs`, where they also work in
`astro dev`.

## Environment variables

See [`.env.example`](.env.example) for the full annotated list with owners.
Locally every variable is optional. **In production, `RESEND_API_KEY`,
`LEAD_TO_EMAIL` and `EMAIL_FROM` are required** - a Vercel production build
fails with a clear error if any is missing, so a deploy can never go live with
leads silently going nowhere.

**Rotation semantics differ by prefix, and this matters:**

- **`PUBLIC_*` are inlined into the build.** They are embedded in the generated
  HTML/JS, so they are visible in page source (never put a secret in one) and
  changing the value in the Vercel dashboard does nothing until you **trigger a
  new deployment that rebuilds**.
- **Server secrets (`RESEND_API_KEY`, `TURNSTILE_SECRET`) are read from
  `process.env` at request time** and are kept out of the build output. Rotating
  one is a dashboard edit plus a redeploy.

## Lead emails

Both lead sources - the contact form (`/api/contact`) and the chat assistant
(`/api/chat-lead`) - run through one pipeline in `src/lib/leads/handleLead.ts`:
size limit → same-origin check → rate limit → honeypot/timing → Turnstile (when
configured) → validation → email → response.

Every lead sends two emails through Resend (`src/lib/email/deliver.ts`):

| Email | To | Template | If it fails |
| :--- | :--- | :--- | :--- |
| New-lead notification | `LEAD_TO_EMAIL` (comma-separated, e.g. your Gmail) | `leadNotificationEmail` | Visitor sees an error with the phone number - never a success screen |
| Customer confirmation | The address the customer entered | `customerConfirmationEmail` | Logged; the lead is already with the office |

Templates live in `src/lib/email/templates.ts` (table-based HTML + plain text,
all visitor input escaped). Emergency chat leads get an "EMERGENCY" subject and
banner. Personal data is never written to the logs - only the lead reference ID.

**One-time Resend setup:** create an account → add and verify the sending domain
(`jimdandysewerandplumbing.com`, DNS records at the registrar) → create an API
key → set the three variables in Vercel → redeploy → submit the form on the live
site and confirm both emails arrive (check spam the first time).

## Chat assistant

A deterministic, no-LLM assistant (`src/lib/chatbot/`) - no API costs, no
hallucinated answers, and it can't be talked into anything.

- **`brain.ts`** - the conversation pipeline: gas-leak safety first, then
  emergencies, the lead form, yes/no in context, details volunteered in chat
  (name, phone, email, city - reused so the form never asks twice), small talk,
  intents, knowledge search, and an honest fallback.
- **`language.ts`** - slang, contractions, typos, repeated letters, detail
  extraction, abuse / gibberish / non-English / injection detection.
- **`src/data/chatbot/kb.ts` + `retrieval.ts`** - ~120 answerable documents built
  from `site.ts` (FAQs, service guides, coupons, financing, careers) plus
  standard safety steps, ranked with BM25. Rule: no business fact that isn't on
  the website; anything else routes to "the team can confirm".
- Leads go through `/api/chat-lead` -> the same email pipeline as the form.
- Phones get a full-screen chat sized to the visual viewport (keyboard-safe);
  the brain chunk (~37KB gz) loads only when someone reaches for the launcher.

To teach it something new, add a document to `kb.ts` (questions + answer).

## Launch steps

1. Vercel → Settings → Environment Variables (Production): `RESEND_API_KEY`,
   `LEAD_TO_EMAIL`, `EMAIL_FROM` (+ optional `EMAIL_REPLY_TO`, `PUBLIC_GA4_ID`,
   Turnstile pair).
2. Deploy, then on the production URL: submit the contact form and the chat
   wizard once each and confirm both emails arrive for each.
3. Point `www.jimdandysewerandplumbing.com` DNS at Vercel; keep the apex and
   `jimdandysewer.com` redirecting to it.
4. Spot-check legacy URLs (e.g. `/contact-us`, `/services/sewer/repair`) - all 47
   URLs from the old Squarespace sitemap 301 to their new pages
   (`astro.config.mjs`, plus `src/pages/blog/category/[...category].ts`).
5. Submit `/sitemap-index.xml` in Google Search Console; validate the homepage
   and one service page in the Rich Results Test.
6. Rollback: Vercel → Deployments → promote the previous deployment.
7. 24-48h later: confirm real leads are arriving and check the function logs for
   `LEAD NOT DELIVERED`.

## Project structure

```
src/
├── assets/
│   ├── photos/     Real photography, cropped from Figma exports (astro:assets)
│   ├── logos/      BBB/Angi/PHCC certification badge logos
│   └── icons/      3D service icons (Emergency, Drains & Clogs, ...)
├── components/
│   ├── layout/     Header, Footer, Logo, Seo (React islands + Astro)
│   ├── sections/   One file per section (Hero, ServicesGrid, FaqSection, ...)
│   └── ui/         Reusable primitives (Button, SectionHeading, YearsBadge, ...)
├── data/
│   ├── site.ts     Single source of truth for business info, nav, services, FAQs, copy
│   └── coupons.ts  Coupon offers shown on /coupons
├── layouts/        Base HTML shell
├── lib/
│   ├── email/      Lead email templates + Resend delivery
│   ├── leads/      Shared lead request pipeline
│   ├── security/   Rate limit, same-origin, honeypot, Turnstile
│   └── ...         SEO/schema.org helpers, Zod schemas, chatbot engine
└── pages/
    ├── index.astro             Home
    ├── services/index.astro    Services hub
    ├── services/[slug].astro   6 service detail pages (data-driven)
    ├── coupons.astro
    ├── service-area.astro
    ├── about.astro
    ├── contact.astro
    ├── privacy-policy.astro
    ├── blog/category/[...category].ts  301s legacy Squarespace blog category URLs
    ├── api/contact.ts          Contact form lead endpoint
    └── api/chat-lead.ts        Chat assistant lead endpoint
```

Design tokens (colors, type scale, shadows) live in `src/styles/global.css` under
`@theme`, extracted from the Figma file's variables - change them there and every
component picks it up.

## Status

All routes build cleanly (`astro check`: 0 errors, 0 warnings; `npm audit`: 0
vulnerabilities). QA on 2026-09-15 covered 20 routes at 16 viewports (320px to
2560px) in Chromium, plus WebKit and Firefox: no horizontal overflow, clipped
text, broken or distorted images, or console errors; axe-core WCAG 2.2 AA scan
clean. Lead form and chat were tested end-to-end, including server errors,
network loss, rate limiting and double submits.

`/commercial` 301s to `/services/commercial` (the two pages used to duplicate
each other). The 16 per-city service-area links point to anchors on
`/service-area` rather than standalone city pages (scope decision to avoid thin
content).

## Needs client input before launch

1. **Email delivery credentials** - Resend account, DNS access to verify the
   sending domain, and the Gmail address(es) for `LEAD_TO_EMAIL`. Until these are
   set, the production build refuses to deploy.
2. **Coupon offers** - `src/data/coupons.ts` holds standard industry offers;
   confirm terms, amounts and expirations.
3. **Business details** - verify license numbers, address and office hours in
   `src/data/site.ts` against the licensing documents and Google Business
   Profile (schema.org hours are derived from the same values).
4. **Reviews** - confirm every testimonial in `reviews` (homepage) and
   `extraReviews` (`/reviews`) is a real, attributable Google review.
5. **Facebook / X profile URLs** - `business.social` still holds bare domain
   placeholders; their icons and schema `sameAs` entries stay hidden until real
   profile URLs are filled in.
6. **Privacy Policy and Terms** - standard text (SMS/TCPA language included);
   needs a pass from the client's counsel.
7. **Blog content** - the old site's 10 blog posts are not migrated; their URLs
   301 to the most relevant service page. Migrating the posts would preserve
   more search value if the client wants it.
8. **Analytics** - set `PUBLIC_GA4_ID` (or GTM) if the client wants tracking;
   conversions already fire only after a confirmed lead.
