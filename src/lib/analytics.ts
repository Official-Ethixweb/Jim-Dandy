/**
 * One tracking surface for the whole site.
 *
 * Nothing here assumes an analytics provider exists. When neither
 * PUBLIC_GA4_ID nor PUBLIC_GTM_ID is configured, Analytics.astro renders no
 * script at all, `window.gtag`/`window.dataLayer` never appear, and every call
 * below is a silent no-op with zero network traffic. That keeps a
 * half-connected tracking setup from ever shipping.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fired the moment a lead is CONFIRMED delivered - never on click. */
export const LEAD_CONVERSION = "generate_lead";

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  try {
    if (typeof window === "undefined") return;
    // GTM / dataLayer consumers
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...params });
    }
    // GA4 via gtag.js
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch {
    // Analytics must never break a lead from being submitted.
  }
}

/**
 * Call ONLY after the server has confirmed the lead (HTTP 2xx). Firing this on
 * submit-click would report conversions for submissions that never landed,
 * which corrupts Ads/GA4 optimisation with leads the client never received.
 */
export function trackLeadConversion(source: "contact_form" | "chat_widget", params: Record<string, unknown> = {}): void {
  trackEvent(LEAD_CONVERSION, { lead_source: source, ...params });
}
