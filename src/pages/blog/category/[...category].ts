import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Legacy Squarespace blog category URLs (e.g. /blog/category/Water+Heaters).
 * The "+" in them can't be expressed as a static redirect in astro.config.mjs,
 * so they are resolved here and sent to the matching service page with a 301.
 */
const destinations: Record<string, string> = {
  "commercial plumbing": "/services/commercial",
  "drain cleaning": "/services/drains-clogs",
  plumbing: "/services/all-plumbing",
  sewer: "/services/sewer-services",
  "water heaters": "/services/water-heaters",
};

export const GET: APIRoute = ({ params, redirect }) => {
  const key = decodeURIComponent(params.category ?? "")
    .replace(/\+/g, " ")
    .trim()
    .toLowerCase();
  return redirect(destinations[key] ?? "/services", 301);
};
