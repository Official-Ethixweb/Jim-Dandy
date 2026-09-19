import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Legacy Squarespace blog category URLs (e.g. /blog/category/Water+Heaters).
 * The "+" in them can't be expressed as a static redirect in astro.config.mjs,
 * so they are resolved here and sent to the blog with a 301 (categories are
 * a filter on the blog index, not separate pages).
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
  return redirect(key in destinations ? "/blog" : "/blog", 301);
};
