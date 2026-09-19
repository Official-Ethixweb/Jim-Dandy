import { z } from "zod";
import { services } from "@data/site";
import { coupons, findCoupon, type CouponId } from "@data/coupons";
import { fullNameField, emailField, phoneField, consentField, shortTextField, sourcePageField } from "./shared";

/**
 * The short quote form in page heroes and the home-page ribbon. It lists the
 * site's actual services (not the contact form's broad categories), so the
 * office email names exactly what the visitor picked - "Drains & Clogs",
 * not "Plumbing" - plus "Other" with a free-text description.
 */
export const quickServiceOptions = [
  ...services.map((s) => ({ value: s.slug, label: s.label })),
  { value: "other", label: "Other (tell us)" },
] as const;

export type QuickServiceValue = (typeof services)[number]["slug"] | "other";

const serviceValues = quickServiceOptions.map((o) => o.value) as [QuickServiceValue, ...QuickServiceValue[]];
const couponIds = coupons.map((c) => c.id) as [CouponId, ...CouponId[]];

/**
 * `services` is a list - a visitor can need a water heater AND a drain cleared.
 * Older pages (and the dropdown) send a single `service`; it is folded into
 * the list so either shape validates.
 */
const withServiceList = (body: unknown) => {
  if (!body || typeof body !== "object") return body;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.services) && typeof b.service === "string" && b.service) return { ...b, services: [b.service] };
  return b;
};

/** What the browser validates (react-hook-form). */
export const quickLeadFormSchema = z
  .object({
    fullName: fullNameField,
    phone: phoneField,
    email: emailField,
    services: z
      .array(z.enum(serviceValues), { message: "Choose at least one service" })
      .min(1, "Choose at least one service")
      .max(serviceValues.length),
    otherServiceDetail: shortTextField(120).optional(),
    consent: consentField,
    sourcePage: sourcePageField,
    /** A coupon tapped on /coupons. Unknown ids are dropped, not rejected. */
    coupon: z.enum(couponIds).optional().catch(undefined),
    /** The customer's tick on a conditional offer ("I'm a first-time customer"). */
    couponEligible: z.boolean().optional(),
  })
  .refine((data) => !data.services.includes("other") || Boolean(data.otherServiceDetail?.trim()), {
    message: "Tell us briefly what you need",
    path: ["otherServiceDetail"],
  })
  .refine((data) => !findCoupon(data.coupon)?.eligibility || data.couponEligible === true, {
    message: "Confirm you qualify for this offer, or remove the coupon",
    path: ["couponEligible"],
  });

/** What /api/quick-lead validates: the same rules, accepting either payload shape. */
export const quickLeadSchema = z.preprocess(withServiceList, quickLeadFormSchema);

export type QuickLeadValues = z.infer<typeof quickLeadFormSchema>;

/** How a chosen coupon reads in the lead emails. */
export function couponSummary(id: CouponId | undefined, eligible?: boolean): string | undefined {
  const coupon = findCoupon(id);
  if (!coupon) return undefined;
  const confirmed = coupon.eligibility && eligible ? ` - customer confirmed: "${coupon.eligibility}"` : "";
  return `${coupon.title} (code ${coupon.code})${confirmed}`;
}

export function quickServiceLabel(value: QuickServiceValue): string {
  return value === "other" ? "Other" : (services.find((s) => s.slug === value)?.label ?? value);
}
