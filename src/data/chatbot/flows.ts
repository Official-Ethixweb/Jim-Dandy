import { chatbotLeadSchema, type ChatbotLeadValues } from "@lib/schemas/chatLead";
import { CHAT_CONSENT_TEXT } from "@lib/schemas/shared";
import type { WizardStep } from "@lib/chatbot/context";

export const STEP_ORDER: WizardStep[] = [
  "problem",
  "urgency",
  "audience",
  "city",
  "timing",
  "name",
  "phone",
  "email",
  "consent",
  "notes",
  "confirm",
];

export const STEP_FIELD: Partial<Record<WizardStep, keyof ChatbotLeadValues>> = {
  problem: "problem",
  urgency: "urgency",
  audience: "audience",
  city: "city",
  timing: "timing",
  name: "fullName",
  phone: "phone",
  email: "email",
  consent: "consent",
  notes: "notes",
};

export const STEP_PROMPT: Record<WizardStep, string> = {
  problem: "What do you need help with? A quick description is perfect.",
  urgency: "How urgent is this?",
  audience: "Is this for a home or a business?",
  city: "Which city are you located in?",
  timing: "Any preferred day or time? (Or say \"ASAP\" / \"flexible\")",
  name: "What's your full name?",
  phone: "Best phone number to reach you?",
  email: "And your email address? We'll send a confirmation there.",
  consent: `One last check before I pass this along: ${CHAT_CONSENT_TEXT} Is that OK?`,
  notes: "Anything else we should know? (Optional - just say \"skip\" if not)",
  confirm: "Here's what I've got - send this to the team?",
  submitting: "Sending your request...",
  success: "You're all set!",
  error: "Something went wrong sending that.",
};

export const STEP_QUICK_REPLIES: Partial<Record<WizardStep, { label: string; value: string }[]>> = {
  urgency: [
    { label: "Emergency", value: "emergency" },
    { label: "Today", value: "today" },
    { label: "This week", value: "this-week" },
    { label: "Flexible", value: "flexible" },
  ],
  audience: [
    { label: "Residential", value: "residential" },
    { label: "Commercial", value: "commercial" },
  ],
  timing: [{ label: "Flexible / ASAP", value: "skip" }],
  consent: [
    { label: "Yes, that's OK", value: "i agree" },
    { label: "No thanks", value: "no" },
  ],
  notes: [{ label: "Skip", value: "skip" }],
};

const SKIPPABLE_STEPS: WizardStep[] = ["timing", "notes"];

export function isSkipValue(value: string): boolean {
  return /^(skip|no|nope|nah|none|nothing|n\/?a|no thanks|no thank you|nothing else|that is all|that's all|all good|i am good|im good|not really|no notes|flexible|asap|any ?time|whenever)$/.test(value.trim().toLowerCase());
}

/** What the visitor sees when an answer doesn't fit - never a raw validation message. */
const FRIENDLY_ERRORS: Partial<Record<WizardStep, string>> = {
  problem: "Tell me a little about what's going on - even a few words helps (like \"leaking under the kitchen sink\").",
  urgency: "How soon do you need someone - right away, today, this week, or whenever works? Tap one below.",
  audience: "Is this for a home or a business? Tap one below.",
  city: "Which city is the job in?",
  name: "What name should the team ask for?",
  phone: "That number doesn't look quite right - could you double-check it, including the area code?",
  email: "That email doesn't look quite right - could you double-check it? (like name@example.com)",
};

export function nextStep(current: WizardStep): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  if (idx === -1 || idx === STEP_ORDER.length - 1) return "confirm";
  return STEP_ORDER[idx + 1];
}

/** Validates a single step's answer against the matching slice of chatbotLeadSchema. */
export function validateStep(step: WizardStep, value: string): { ok: true; value: string } | { ok: false; error: string } {
  const field = STEP_FIELD[step];
  if (!field) return { ok: true, value };

  // Consent must be an explicit yes - it is what makes contacting them lawful.
  if (step === "consent") {
    return /^(i agree|agree|yes|yep|yeah|ok|okay|sure|y|that'?s ok|yes,? that'?s ok)[.!]?$/i.test(value.trim())
      ? { ok: true, value: "true" }
      : {
          ok: false,
          error: "No problem - we can only follow up on a request with your OK to contact you. Tap \"Yes, that's OK\" to continue, or call us directly instead.",
        };
  }

  if (SKIPPABLE_STEPS.includes(step) && isSkipValue(value)) {
    return { ok: true, value: step === "timing" && /asap|any ?time|whenever|flexible/i.test(value) ? value.trim().toLowerCase() : "" };
  }

  const shape = chatbotLeadSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }>;
  const fieldSchema = shape[field];
  const result = fieldSchema.safeParse(value);
  if (!result.success) {
    return { ok: false, error: FRIENDLY_ERRORS[step] ?? "That doesn't look quite right - could you try again?" };
  }
  return { ok: true, value };
}

export function isWizardComplete(answers: Partial<ChatbotLeadValues>): boolean {
  return chatbotLeadSchema.omit({ consent: true, source: true }).safeParse(answers).success;
}
