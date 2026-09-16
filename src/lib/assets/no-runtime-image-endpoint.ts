import type { APIRoute } from "astro";

/**
 * Stands in for Astro's on-demand image endpoint (/_image) in production.
 *
 * Every page is prerendered, so every <Image> is optimized once at build time
 * into /_astro/*.webp and nothing requests /_image at runtime. Astro's default
 * endpoint would still pull sharp and its ~17MB native libvips binary into the
 * serverless function of every deployment, so builds use this instead (wired
 * up in astro.config.mjs). `astro dev` keeps the real endpoint, which serves
 * images during development.
 */
export const GET: APIRoute = () => new Response("Not found", { status: 404 });
