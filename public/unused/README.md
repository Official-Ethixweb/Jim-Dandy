# unused/

Archived design-export assets that are **not** currently referenced by the site. This is
consolidated, de-duplicated leftovers from the various Figma/Wix export dumps that used to
live directly under `public/` (`default/`, `jim-dandy/`, `NEW/`, `new assets from website/`).
Exact-duplicate files across those dumps were removed — only one copy of each unique image
survives here.

- `design-system/` — Figma component exports (buttons, icons, logos, cards, nav, etc.)
- `screens/` — full-page mockup screenshots from Figma
- `reference/home-page/` — design review screenshots/drafts for the homepage
- `site-content/` — images scraped from the old/reference site (service photos, badges,
  review avatars, social icons); grouped into a subfolder per source image when multiple
  resolution renditions existed
- `team/` — team photo variants
- `textures/` — background textures pulled in during design exploration, not currently wired up

If you want to use something from here, move it into `public/shared/` (if used across
multiple pages/components) or `public/pages/<page>/` (if specific to one page), then
reference it from the component and delete it from here.
