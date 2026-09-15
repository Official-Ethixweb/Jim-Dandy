import { TURNSTILE_SECRET } from "astro:env/server";

/**
 * Cloudflare Turnstile, verified server-side.
 *
 * Deliberately has NO fallback/test key. If TURNSTILE_SECRET is unset the
 * feature is simply off and `turnstileEnabled` reports false, so the state is
 * visible rather than silently "passing" against a public test secret - the
 * exact failure mode the launch checklist calls out. Once the secret is set,
 * verification is enforced and any failure rejects the request (fail closed).
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;

/**
 * Read from "astro:env/server" (declared as a secret in astro.config.mjs), so
 * the value comes from the runtime environment and is never inlined into the
 * deployed bundle - reading it via import.meta.env did exactly that.
 */
function getSecret(): string | undefined {
  const value = TURNSTILE_SECRET?.trim();
  return value ? value : undefined;
}

/** True only when a real secret is configured for this environment. */
export function isTurnstileEnabled(): boolean {
  return getSecret() !== undefined;
}

export type TurnstileResult =
  | { ok: true; skipped?: true }
  | { ok: false; reason: string };

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = getSecret();
  if (!secret) return { ok: true, skipped: true };

  if (!token || !token.trim()) {
    return { ok: false, reason: "missing token" };
  }

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp && remoteIp !== "unknown") form.append("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: `siteverify http ${res.status}` };

    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true };
    return { ok: false, reason: (data["error-codes"] ?? ["unknown"]).join(",") };
  } catch (err) {
    // Network failure or timeout. Fail closed: a challenge we could not verify
    // is not a challenge that passed.
    return { ok: false, reason: err instanceof Error ? err.name : "verify failed" };
  }
}
