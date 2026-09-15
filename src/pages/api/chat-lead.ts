import type { APIRoute } from "astro";
import { chatbotLeadSchema, urgencyLabels, audienceLabels } from "@lib/schemas/chatLead";
import { serviceLabels } from "@lib/schemas/contact";
import { CHAT_CONSENT_TEXT } from "@lib/schemas/shared";
import { handleLeadRequest } from "@lib/leads/handleLead";

export const prerender = false;

export const POST: APIRoute = ({ request }) =>
  handleLeadRequest(request, {
    tag: "[chat-lead]",
    schema: chatbotLeadSchema,
    // The chat is conversational: no honeypot field and no fill time to
    // measure. Turnstile, origin and rate limiting still apply.
    requireTiming: false,
    toLead: (data, meta) => ({
      ...meta,
      source: "chat",
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      services: [serviceLabels[data.serviceNeeded]],
      problem: data.problem,
      urgency: urgencyLabels[data.urgency],
      isEmergency: data.urgency === "emergency",
      audience: audienceLabels[data.audience],
      city: data.city,
      timing: data.timing || undefined,
      notes: data.notes || undefined,
      sourcePage: data.sourcePage,
      consentText: CHAT_CONSENT_TEXT,
    }),
  });
