import type { APIRoute } from "astro";
import { contactSchema } from "@lib/schemas/contact";

export const prerender = false;

// Best-effort in-memory rate limit: protects a single warm serverless instance
// from rapid-fire abuse. It does NOT share state across cold starts or regions;
// swap for Vercel KV/Upstash before this endpoint handles real production traffic.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const result = contactSchema.safeParse(body);
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: result.error.issues }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // TODO(integration): forward result.data to the client's lead/CRM system
  // (email, ServiceTitan, Zapier webhook, etc.) once credentials are supplied.
  console.info("[contact] new lead", result.data);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
