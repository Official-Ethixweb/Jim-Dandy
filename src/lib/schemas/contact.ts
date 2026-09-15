import { z } from "zod";
import { fullNameField, emailField, phoneField, consentField, shortTextField, sourcePageField } from "./shared";

export const serviceOptions = [
  { value: "plumbing", label: "Plumbing", icon: "wrench" },
  { value: "heating", label: "Heating", icon: "flame" },
  { value: "sewers", label: "Sewers", icon: "search" },
  { value: "commercial", label: "Commercial", icon: "building-2" },
  { value: "other", label: "Other", icon: "more-horizontal" },
] as const;

export const serviceLabels: Record<(typeof serviceOptions)[number]["value"], string> = Object.fromEntries(
  serviceOptions.map((o) => [o.value, o.label]),
) as Record<(typeof serviceOptions)[number]["value"], string>;

export const contactSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    phone: phoneField,
    serviceNeeded: z
      .array(z.enum(["plumbing", "heating", "sewers", "commercial", "other"]))
      .min(1, "Select at least one service")
      .max(5),
    otherServiceDetail: shortTextField(120).optional(),
    consent: consentField,
    sourcePage: sourcePageField,
  })
  .refine((data) => !data.serviceNeeded.includes("other") || Boolean(data.otherServiceDetail?.trim()), {
    message: "Tell us briefly what you need",
    path: ["otherServiceDetail"],
  });

export type ContactFormValues = z.infer<typeof contactSchema>;
