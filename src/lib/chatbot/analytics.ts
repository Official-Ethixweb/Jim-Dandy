/**
 * Chatbot funnel events. These delegate to the shared tracker in
 * @lib/analytics, so they reach GA4 and/or GTM through exactly the same path
 * as the contact form - and stay silent no-ops when neither is configured.
 */
import { trackEvent } from "@lib/analytics";
export const CHAT_EVENTS = {
  OPENED: "chat_opened",
  CLOSED: "chat_closed",
  MESSAGE_SENT: "chat_message_sent",
  INTENT_MATCHED: "chat_intent_matched",
  EMERGENCY_DETECTED: "chat_emergency_detected",
  QUICK_REPLY_CLICKED: "chat_quick_reply_clicked",
  WIZARD_STARTED: "chat_wizard_started",
  WIZARD_STEP: "chat_wizard_step",
  WIZARD_ABANDONED: "chat_wizard_abandoned",
  WIZARD_SUBMITTED: "chat_wizard_submitted",
  WIZARD_SUCCESS: "chat_wizard_success",
  WIZARD_ERROR: "chat_wizard_error",
  HUMAN_ESCALATION: "chat_human_escalation",
  RESTARTED: "chat_restarted",
} as const;

export function pushEvent(name: string, payload?: Record<string, unknown>): void {
  trackEvent(name, payload ?? {});
}
