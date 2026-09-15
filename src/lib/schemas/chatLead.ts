import { z } from "zod";
import { fullNameField, emailField, phoneField, consentField, shortTextField, sourcePageField } from "./shared";
import type { ServiceSlug } from "@data/chatbot/knowledge";

export const chatbotLeadSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  phone: phoneField,
  serviceNeeded: z.enum(["plumbing", "heating", "sewers", "commercial", "other"]),
  problem: shortTextField(300).min(3, "Tell us briefly what's going on"),
  urgency: z.enum(["emergency", "today", "this-week", "flexible"]),
  audience: z.enum(["residential", "commercial"]),
  city: shortTextField(60).min(2, "Let us know your city"),
  timing: shortTextField(120).optional(),
  notes: shortTextField(500).optional(),
  consent: consentField,
  source: z.literal("chat"),
  sourcePage: sourcePageField,
});

export type ChatbotLeadValues = z.infer<typeof chatbotLeadSchema>;

export const urgencyLabels: Record<ChatbotLeadValues["urgency"], string> = {
  emergency: "Emergency",
  today: "Today",
  "this-week": "This week",
  flexible: "Flexible",
};

export const audienceLabels: Record<ChatbotLeadValues["audience"], string> = {
  residential: "Residential",
  commercial: "Commercial",
};

/** Maps a chatbot service slug to the shared serviceNeeded enum used by both lead forms. */
export function serviceNeededFromSlug(slug: ServiceSlug): ChatbotLeadValues["serviceNeeded"] {
  switch (slug) {
    case "water-heaters":
      return "heating";
    case "sewer-services":
      return "sewers";
    case "commercial":
      return "commercial";
    case "drains-clogs":
    case "all-plumbing":
    case "emergency":
    default:
      return "plumbing";
  }
}
