import { z } from "zod";

/**
 * Zero-dependency spam signals that work with no third-party keys at all.
 * These are a cheap first filter, not a security boundary - a determined bot
 * can forge both. Turnstile (see ./turnstile.ts) is the real gate once its
 * secret is configured; these catch the naive volume that never runs JS.
 */

/** A human needs longer than this to fill the lead form honestly. */
const MIN_FILL_MS = 3_000;
/** Older than this and the page has been parked/replayed - treat as stale. */
const MAX_FILL_MS = 6 * 60 * 60 * 1000;

export const antiBotSchema = z.object({
  /**
   * Honeypot. A real user never sees this field, so any value means a bot
   * filled it in. Named `company` because that is what naive form-fillers
   * look for - `honeypot` would be skipped by anything half-decent.
   */
  company: z.string().optional(),
  /** Milliseconds between the form mounting and submit, measured client-side. */
  elapsedMs: z.number().int().nonnegative().optional(),
  /** Cloudflare Turnstile token, when the widget is configured. */
  turnstileToken: z.string().optional(),
});

export type AntiBotFields = z.infer<typeof antiBotSchema>;

export type SpamVerdict = { spam: false } | { spam: true; reason: string };

/**
 * Evaluates the keyless spam signals. `requireTiming` is on for the real HTML
 * form (which always reports elapsedMs) and off for the chat wizard, whose
 * payload has no such field.
 */
export function checkSpamSignals(
  fields: AntiBotFields,
  { requireTiming = false }: { requireTiming?: boolean } = {},
): SpamVerdict {
  if (fields.company && fields.company.trim() !== "") {
    return { spam: true, reason: "honeypot filled" };
  }

  if (fields.elapsedMs === undefined) {
    return requireTiming ? { spam: true, reason: "missing timing" } : { spam: false };
  }

  if (fields.elapsedMs < MIN_FILL_MS) {
    return { spam: true, reason: `submitted in ${fields.elapsedMs}ms` };
  }

  if (fields.elapsedMs > MAX_FILL_MS) {
    return { spam: true, reason: "stale form" };
  }

  return { spam: false };
}

export { MIN_FILL_MS };
