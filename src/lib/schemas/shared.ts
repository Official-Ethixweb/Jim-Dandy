import { z } from "zod";

/** Angle brackets never belong in a name or short free-text answer, and
 *  rejecting them keeps markup out of the lead emails at the source (the
 *  templates escape everything regardless). */
const NO_MARKUP = /^[^<>]*$/;

export const fullNameField = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(80, "That name looks too long")
  .regex(NO_MARKUP, "Please use letters only in your name");
export const emailField = z.string().trim().max(254, "That email looks too long").pipe(z.email("Enter a valid email address"));
/** Allows the usual punctuation people type, but requires 10-15 real digits:
 *  a US number is 10, with a leading country code 11. "-------" used to pass. */
export const phoneField = z
  .string()
  .trim()
  .regex(/^[\d\s().+-]{7,24}$/, "Enter a valid phone number")
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 10 && digits <= 15;
  }, "Enter a valid phone number, including area code");
/** Shown next to the contact form's consent checkbox, and quoted verbatim in
 *  the lead notification so there is a record of what the customer agreed to. */
export const CONSENT_TEXT =
  "By submitting this form and signing up for texts, you consent to receive messages from " +
  "Jim Dandy Sewer & Plumbing at the number provided regarding your request, updates " +
  "about appointments and services or promotions and offers, including messages sent by " +
  "autodialer. Consent is not a condition of purchase. Msg & data rates may apply. Msg " +
  "frequency varies. Unsubscribe at any time by replying STOP. Reply HELP for help.";

/** The chat assistant's shorter consent prompt - it is only ever about this request. */
export const CHAT_CONSENT_TEXT =
  "Jim Dandy Sewer & Plumbing may call, text, or email you at the details you gave about this " +
  "request. Msg & data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase.";

export const consentField = z.literal(true, {
  message: "Please confirm you consent to be contacted",
});
export const shortTextField = (max: number) => z.string().trim().max(max).regex(NO_MARKUP, "Please remove < and > characters");
/** The page the lead was submitted from, for the notification email. */
export const sourcePageField = z
  .string()
  .trim()
  .max(200)
  .regex(/^\/[\w\-./]*$/)
  .optional()
  .catch(undefined);
