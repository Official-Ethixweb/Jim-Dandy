/**
 * Shared request guards for the public lead endpoints.
 *
 * Both /api/contact and /api/chat-lead had an identical copy of the rate-limit
 * logic; it lives here now so the two cannot drift apart, and so the eviction
 * fix below applies to both.
 */

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
/** Evict idle IPs this often, so a long-lived warm instance does not accumulate
 *  one Map entry per unique client address for the lifetime of the process. */
const SWEEP_EVERY_MS = 5 * 60_000;

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [ip, times] of hits) {
    if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(ip);
  }
}

/**
 * Best-effort in-memory rate limit: protects a single warm serverless instance
 * from rapid-fire abuse. It does NOT share state across cold starts or regions;
 * swap for Vercel KV/Upstash before this endpoint handles real production
 * traffic.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  sweep(now);
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * These endpoints are for this site's own forms and nothing else, so rather than
 * leaving CORS absent (which merely relies on the browser's default) the policy
 * is stated explicitly: same-origin POSTs only, and no Access-Control-Allow-*
 * response headers are ever emitted, so no other site can read a response.
 *
 * Doubling as CSRF defence: browsers always attach Origin to a cross-site POST,
 * so a form on another domain cannot forge one that passes this check. Nothing
 * here uses cookie or session auth today, but the guard means adding one later
 * cannot silently open a CSRF hole.
 *
 * The expected origin is derived from the forwarded host rather than hardcoded,
 * so production, Vercel preview deploys, and localhost all validate correctly
 * without a per-environment allowlist.
 */
export function isSameOrigin(request: Request): { ok: true } | { ok: false; reason: string } {
  const origin = request.headers.get("origin");
  if (!origin) return { ok: false, reason: "missing Origin header" };

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return { ok: false, reason: "missing Host header" };

  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  try {
    if (new URL(origin).origin === `${proto}://${host}`) return { ok: true };
  } catch {
    return { ok: false, reason: "unparseable Origin" };
  }
  return { ok: false, reason: `cross-origin: ${origin}` };
}
