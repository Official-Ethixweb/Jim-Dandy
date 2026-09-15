import type { z } from "zod";
import { business } from "@data/site";
import { antiBotSchema, checkSpamSignals } from "@lib/security/antiBot";
import { verifyTurnstile } from "@lib/security/turnstile";
import { isRateLimited, clientIp, isSameOrigin } from "@lib/security/requestGuard";
import { deliverLead } from "@lib/email/deliver";
import type { LeadRecord } from "@lib/email/templates";

/**
 * The one request pipeline behind both public lead endpoints, so the contact
 * form and the chat assistant cannot drift apart:
 *
 *   size cap -> same-origin -> rate limit -> JSON -> spam signals -> Turnstile
 *   -> schema validation -> email delivery -> response
 *
 * A 200 is returned only once the office notification has actually been
 * accepted by the email provider.
 */

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
/** A real lead is well under 4KB; anything past this is not a form submission. */
const MAX_BODY_BYTES = 16_000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

type Options<S extends z.ZodType> = {
  tag: string;
  schema: S;
  /** The HTML form always reports fill time; the chat wizard has none to report. */
  requireTiming: boolean;
  toLead: (data: z.infer<S>, meta: { id: string; submittedAt: Date }) => LeadRecord;
};

export async function handleLeadRequest<S extends z.ZodType>(request: Request, opts: Options<S>): Promise<Response> {
  const { tag } = opts;
  try {
    const ip = clientIp(request);

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_BODY_BYTES) {
      return json(413, { error: "Request too large." });
    }

    // Same-origin only - this is what stops another site forging a submission.
    const origin = isSameOrigin(request);
    if (!origin.ok) {
      console.warn(`${tag} rejected cross-origin request: ${origin.reason}`);
      return json(403, { error: "Forbidden" });
    }

    if (isRateLimited(ip)) {
      return json(429, { error: "Too many requests. Please wait a minute and try again." });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { error: "Request too large." });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    // Spam signals before anything else. The response is deliberately generic
    // so a bot learns nothing about which signal caught it.
    const signals = antiBotSchema.safeParse(body);
    const verdict = checkSpamSignals(signals.success ? signals.data : {}, { requireTiming: opts.requireTiming });
    if (verdict.spam) {
      console.warn(`${tag} rejected submission: ${verdict.reason}`);
      return json(400, { error: "Unable to process this submission." });
    }

    const turnstile = await verifyTurnstile(signals.success ? signals.data.turnstileToken : undefined, ip);
    if (!turnstile.ok) {
      console.warn(`${tag} turnstile rejected: ${turnstile.reason}`);
      return json(403, { error: "Verification failed. Please reload the page and try again." });
    }

    const result = opts.schema.safeParse(body);
    if (!result.success) {
      // Field path and message only - never the schema internals or the input.
      const issues = result.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message }));
      return json(422, { error: "Please check the highlighted fields.", issues });
    }

    const lead = opts.toLead(result.data, { id: crypto.randomUUID(), submittedAt: new Date() });
    const delivery = await deliverLead(lead);
    if (!delivery.ok) {
      return json(502, {
        error: `We couldn't send your request just now. Please call us at ${business.phone} - a dispatcher answers 24/7.`,
      });
    }

    return json(200, { ok: true, reference: lead.id });
  } catch (err) {
    // Logged server-side only; the client never sees an exception or stack.
    console.error(`${tag} unhandled error`, err instanceof Error ? err.message : err);
    return json(500, { error: `Something went wrong on our end. Please call us at ${business.phone}.` });
  }
}
