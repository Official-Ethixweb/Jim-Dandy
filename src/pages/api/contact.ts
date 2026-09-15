import type { APIRoute } from "astro";
import { contactSchema, serviceLabels } from "@lib/schemas/contact";
import { CONSENT_TEXT } from "@lib/schemas/shared";
import { handleLeadRequest } from "@lib/leads/handleLead";

export const prerender = false;

export const POST: APIRoute = ({ request }) =>
  handleLeadRequest(request, {
    tag: "[contact]",
    schema: contactSchema,
    requireTiming: true,
    toLead: (data, meta) => ({
      ...meta,
      source: "contact_form",
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      services: data.serviceNeeded.map((value) => serviceLabels[value]),
      otherServiceDetail: data.serviceNeeded.includes("other") ? data.otherServiceDetail : undefined,
      sourcePage: data.sourcePage,
      consentText: CONSENT_TEXT,
    }),
  });
