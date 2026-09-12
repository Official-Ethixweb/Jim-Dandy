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
 * Read at REQUEST time from process.env, not build time.
 *
 * Vite statically replaces `import.meta.env.X` during the build, which would
 * bake the secret into the deployed function bundle and make rotation a full
 * rebuild rather than a dashboard edit. Reading process.env first keeps the
 * secret out of the build artifact entirely when it is set only in the hosting
 * dashboard - which is how production should be configured.
 *
 * The import.meta.env fallback exists purely for local development, where
 * Astro loads .env into import.meta.env but not into process.env. In a
 * production build with the var unset at build time, Vite replaces that
 * expression with `undefined`, so nothing is inlined.
 */
function getSecret(): string | undefined {
  const fromRuntime = typeof process !== "undefined" ? process.env?.TURNSTILE_SECRET : undefined;
  const fromBuild = import.meta.env.TURNSTILE_SECRET as string | undefined;
  const value = fromRuntime ?? fromBuild;
  return value && value.trim() ? value.trim() : undefined;
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
