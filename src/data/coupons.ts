/**
 * Current offers. Tapping one on /coupons adds it to the quote form at the top
 * of that page (the form also reads ?coupon=<id>), and the lead email tells the
 * dispatcher which offer the customer chose.
 *
 * `eligibility` is for offers with a condition the website can't check - the
 * customer ticks it to apply the coupon, and the dispatcher confirms it at
 * booking. `service` preselects the matching service when none is chosen yet.
 * `code` is what the coupon shows and what the dispatcher sees; rename freely.
 */
export const coupons = [
  {
    id: "repair-50",
    code: "REPAIR50",
    value: "$50",
    unit: "Off",
    title: "$50 Off Any Repair Over $500",
    description: "Take $50 off any completed plumbing or sewer repair invoiced over $500.",
    terms: "Cannot be combined with other offers. One coupon per household. Present at time of service.",
  },
  {
    id: "second-opinion",
    code: "2NDLOOK",
    value: "Free",
    unit: "2nd Opinion",
    title: "Free Second Opinion",
    description: "Already have a quote from another plumber? We'll review it and give you an honest second opinion, free.",
    terms: "Valid for residential customers within our service area. Written estimate required.",
    eligibility: "I have a written estimate from another company",
  },
  {
    id: "diagnostic-0",
    code: "DIAG0",
    value: "$0",
    unit: "Diagnostic",
    title: "$0 Diagnostic Fee With Repair",
    description: "Diagnostic visit fee is waived when you move forward with the recommended repair.",
    terms: "Applies to standard diagnostic visits. Emergency after-hours dispatch fees may still apply.",
  },
  {
    id: "new-customer-10",
    code: "NEW10",
    value: "10%",
    unit: "Off",
    title: "10% Off for New Customers",
    description: "First-time Jim Dandy customers save 10% on their first completed service.",
    terms: "New customers only. Cannot be combined with other offers or financing promotions.",
    eligibility: "I'm a first-time Jim Dandy customer",
  },
  {
    id: "free-camera",
    code: "CAMERA",
    value: "Free",
    unit: "Camera Scope",
    title: "Free Camera Inspection",
    description: "Get a complimentary video camera inspection when you book a drain or sewer cleaning.",
    terms: "Must be scheduled at the same time as the cleaning service. One per property per visit.",
    service: "drains-clogs",
  },
  {
    id: "senior-military-10",
    code: "HONOR10",
    value: "10%",
    unit: "Off",
    title: "Senior & Military Discount",
    description: "Seniors (65+) and active-duty or veteran military save 10% on any completed service.",
    terms: "Valid ID or proof of service required at time of service. Cannot be combined with other offers.",
    eligibility: "I'm 65+, or active-duty or veteran military",
  },
] as const satisfies readonly CouponDef[];

type CouponDef = {
  id: string;
  code: string;
  value: string;
  unit: string;
  title: string;
  description: string;
  terms: string;
  eligibility?: string;
  service?: "emergency" | "drains-clogs" | "sewer-services" | "water-heaters" | "all-plumbing" | "commercial";
};

export type CouponId = (typeof coupons)[number]["id"];
export type Coupon = CouponDef & { id: CouponId };

export function findCoupon(id: string | null | undefined): Coupon | undefined {
  return id ? (coupons as readonly Coupon[]).find((c) => c.id === id) : undefined;
}

/** Custom events between the coupon cards and the quote form on /coupons. */
export const COUPON_APPLY_EVENT = "jd:apply-coupon";
export const COUPON_CHANGED_EVENT = "jd:coupon-changed";
