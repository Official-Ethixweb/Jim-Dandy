import { RESEND_API_KEY, LEAD_TO_EMAIL, EMAIL_FROM, EMAIL_REPLY_TO } from "astro:env/server";
import { business } from "@data/site";
import { SITE_URL } from "@lib/seo";
import {
  customerConfirmationEmail,
  leadNotificationEmail,
  type BusinessInfo,
  type LeadRecord,
  type RenderedEmail,
} from "./templates";

/**
 * Lead delivery over Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 *
 * Two emails per lead:
 *   1. Notification to the office (LEAD_TO_EMAIL). REQUIRED - if it does not
 *      send, the lead is reported as failed so the visitor is told to call
 *      instead of being shown a success screen for a lead nobody received.
 *   2. Confirmation to the customer. BEST EFFORT - the lead is already safely
 *      with the office, so a failure here is logged, not surfaced.
 *
 * Configuration comes from "astro:env/server" secrets (declared in
 * astro.config.mjs), which are read from the runtime environment per request
 * and never inlined into the build output.
 */

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 8_000;

type EmailConfig = { apiKey: string; to: string[]; from: string; replyTo: string };

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getEmailConfig(): EmailConfig | null {
  const apiKey = clean(RESEND_API_KEY);
  const to = clean(LEAD_TO_EMAIL)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = clean(EMAIL_FROM);
  if (!apiKey || !to?.length || !from) return null;
  return { apiKey, to, from, replyTo: clean(EMAIL_REPLY_TO) ?? business.email };
}

export const businessInfo: BusinessInfo = {
  name: business.name,
  shortName: business.shortName,
  phone: business.phone,
  phoneHref: business.phoneHref,
  email: business.email,
  address: business.address.full.replace(/, United States$/, ""),
  licenses: business.licenses,
  siteUrl: SITE_URL,
};

type SendResult = { ok: true; id?: string } | { ok: false; reason: string };

async function send(
  config: EmailConfig,
  email: RenderedEmail,
  { to, replyTo, idempotencyKey }: { to: string[]; replyTo: string; idempotencyKey: string },
): Promise<SendResult> {
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        // A retried request (double submit, network retry) never sends twice.
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to,
        reply_to: replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Resend's error body names the problem (unverified domain, bad key) and
      // never echoes the recipient, so it is safe to log.
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, reason: `resend http ${res.status} ${detail}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? `${err.name}: ${err.message}` : "send failed" };
  }
}

export type DeliveryResult =
  | { ok: true; mode: "sent" | "dev-log" }
  | { ok: false; reason: "not-configured" | "send-failed" };

export async function deliverLead(lead: LeadRecord): Promise<DeliveryResult> {
  const tag = `[lead ${lead.id} ${lead.source}]`;
  const config = getEmailConfig();

  if (!config) {
    if (import.meta.env.DEV) {
      // Local development only: no provider, so show that the pipeline ran
      // without printing the visitor's personal details.
      console.info(`${tag} email not configured - dev mode, would send notification + confirmation`);
      return { ok: true, mode: "dev-log" };
    }
    console.error(`${tag} LEAD NOT DELIVERED: RESEND_API_KEY / LEAD_TO_EMAIL / EMAIL_FROM are not set`);
    return { ok: false, reason: "not-configured" };
  }

  const notification = await send(config, leadNotificationEmail(lead, businessInfo), {
    to: config.to,
    replyTo: lead.email,
    idempotencyKey: `lead-${lead.id}-notify`,
  });
  if (!notification.ok) {
    console.error(`${tag} LEAD NOT DELIVERED: notification failed - ${notification.reason}`);
    return { ok: false, reason: "send-failed" };
  }

  const confirmation = await send(config, customerConfirmationEmail(lead, businessInfo), {
    to: [lead.email],
    replyTo: config.replyTo,
    idempotencyKey: `lead-${lead.id}-confirm`,
  });
  if (!confirmation.ok) {
    console.warn(`${tag} notification sent (${notification.id}), customer confirmation failed - ${confirmation.reason}`);
  } else {
    console.info(`${tag} delivered: notification ${notification.id}, confirmation ${confirmation.id}`);
  }
  return { ok: true, mode: "sent" };
}
