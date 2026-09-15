import {
  business,
  serviceBySlug,
  serviceExtras,
  coupons,
  financing,
  allFaqs,
  citySet,
  cityToCounty,
  cityList,
  differentiators,
  type ServiceSlug,
} from "@data/chatbot/knowledge";
import type { IntentMatch } from "./intent-engine";
import type { ChatContext, PendingOffer, WizardStep } from "./context";
import type { KbLink } from "@data/chatbot/kb";
import type { IntentName } from "@data/chatbot/intents";

export type QuickReply = { label: string; value: string };

export type ChatResponse = {
  text: string;
  quickReplies?: QuickReply[];
  startWizard?: WizardStep;
  setEntity?: { service?: ServiceSlug | null; city?: string | null; audience?: "residential" | "commercial" | null };
  emergency?: boolean;
  /** What a bare "yes" should do next. */
  pending?: PendingOffer;
  links?: KbLink[];
};

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { label: "Book a service", value: "Book a service" },
  { label: "I have an emergency", value: "I have an emergency" },
  { label: "Get an estimate", value: "Get an estimate" },
  { label: "Service area", value: "Do you service my area?" },
];

const SERVICE_QUICK_REPLIES: QuickReply[] = [
  { label: "Get an estimate", value: "Get an estimate" },
  { label: "Book this service", value: "Book a service" },
  { label: "Pricing", value: "How much does it cost?" },
  { label: "Common questions", value: "FAQ" },
];

function callCta(): string {
  return `call ${business.phone}`;
}

function findFaqMatch(message: string): { question: string; answer: string } | null {
  const clean = message.toLowerCase();
  const tokens = clean.split(/\W+/).filter(Boolean);
  let best: { question: string; answer: string; score: number } | null = null;
  for (const faq of allFaqs) {
    const qTokens = faq.question.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap = qTokens.filter((t) => tokens.includes(t)).length;
    if (overlap < 2) continue;
    if (!best || overlap > best.score) best = { question: faq.question, answer: faq.answer, score: overlap };
  }
  return best;
}

const UNKNOWN_TIER1 = [
  "I'm not totally sure I caught that. Are you asking about a service, pricing, our service area, or booking?",
  "Hmm, I want to make sure I get this right - is this about a specific service, an estimate, or something else?",
];

const UNKNOWN_TIER2 = [
  "Let's narrow it down - pick whichever fits best:",
  "No problem, here are the most common things I can help with:",
];

const UNKNOWN_TIER3 = [
  `That one's best answered by the team directly. You can ${callCta()}, or I can grab your info and have someone follow up.`,
  `I don't want to guess on that one. The fastest path is to ${callCta()} - or I can pass your question along to the team.`,
];

function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

/**
 * resolve() is the single seam between the deterministic engine and the UI.
 * It takes the raw message, current conversation context, and the intent
 * match, and returns a plain serializable response. A future LLM/retrieval
 * layer can replace this function's body without touching the UI, wizard,
 * lead capture, or analytics wiring.
 */
export function resolve(message: string, ctx: ChatContext, match: IntentMatch): ChatResponse {
  const { intent, entities } = match;

  if (intent === "EMERGENCY") {
    return {
      text: `That sounds urgent - please ${callCta()} right now for the fastest help. A real dispatcher answers 24/7 and can get a licensed tech routed to you immediately.`,
      quickReplies: [
        { label: `Call ${business.phone}`, value: "call" },
        { label: "Continue with the form", value: "continue form" },
      ],
      emergency: true,
    };
  }

  switch (intent) {
    case "GREETING":
      return {
        text: greetingFor(ctx),
        quickReplies: quickRepliesFor(ctx),
      };

    case "GOODBYE":
      return { text: `Take care${ctx.profile?.fullName ? `, ${ctx.profile.fullName.split(" ")[0]}` : ""}! If anything comes up, I'm right here - or call ${business.phone} anytime. 👋` };

    case "THANK_YOU":
      return { text: pick(["You're very welcome! Anything else I can help with?", "Happy to help! Anything else on your mind?", "Anytime! Let me know if there's anything else."], ctx.turn ?? 0), quickReplies: DEFAULT_QUICK_REPLIES };

    case "BOOK_SERVICE":
    case "GET_ESTIMATE": {
      const svc = entities.serviceSlug ?? ctx.activeService;
      const label = svc ? serviceBySlug.get(svc)?.label.toLowerCase().replace(/^all /, "").replace(/s$/, "") : undefined;
      const lead = label ? `Let's get your ${label} issue taken care of.` : "Happy to help.";
      return {
        text: `${lead} Just a few quick details and I'll get this to the team.`,
        startWizard: "problem",
        setEntity: svc ? { service: svc } : undefined,
      };
    }

    case "CONTACT":
      return {
        text: `You can reach us at ${business.phone}, email ${business.email}, or visit us at ${business.address.full}. ${business.hours}.`,
        quickReplies: [{ label: "Send my info", value: "Book a service" }, { label: "Call now", value: "call" }],
      };

    case "PHONE":
      return { text: `Our number is ${business.phone}. A live dispatcher answers 24/7 for emergencies; regular office hours are ${business.hours.split(" · ")[0]}.`, quickReplies: [{ label: `Call ${business.phone}`, value: "call" }] };

    case "EMAIL":
      return { text: `You can email us at ${business.email} - we reply within one business day. For anything urgent, call ${business.phone}.` };

    case "ADDRESS":
      return { text: `We're based at ${business.address.full.replace(/, United States$/, "")}, and our technicians come to you anywhere in King, Snohomish, and Pierce Counties.`, links: [{ label: "Directions & contact", href: "/contact" }] };

    case "HOURS":
      return { text: `Office hours are ${business.hours.split(" · ")[0]}, and emergency service runs 24/7 - nights, weekends, and holidays included. Call ${business.phone} anytime.` };

    case "SERVICES":
      return {
        text: "We handle Emergency plumbing, Drains & Clogs, Sewer Services, Water Heaters, All Plumbing, and Commercial work. What's going on?",
        quickReplies: [
          { label: "Emergency", value: "emergency" },
          { label: "Drains & Clogs", value: "drains and clogs" },
          { label: "Water Heaters", value: "water heaters" },
          { label: "Sewer Services", value: "sewer services" },
        ],
      };

    case "SPECIFIC_SERVICE": {
      const slug = (match.matchedServiceSlug ?? entities.serviceSlug) as ServiceSlug | undefined;
      if (!slug) return unknownResponse(ctx);
      const svc = serviceBySlug.get(slug)!;
      const extra = serviceExtras[slug];
      return {
        text: `${svc.description} ${extra ? extra.overview[0] : ""}`.trim(),
        quickReplies: SERVICE_QUICK_REPLIES,
        setEntity: { service: slug },
      };
    }

    case "SERVICE_RECOMMENDATION": {
      if (entities.symptomCandidates && entities.symptomCandidates.length > 1) {
        return {
          text: "That could be a couple of things - which sounds closer?",
          quickReplies: entities.symptomCandidates.slice(0, 3).map((slug) => ({
            label: serviceBySlug.get(slug)!.label,
            value: serviceBySlug.get(slug)!.label,
          })),
        };
      }
      const slug = entities.symptomSlug;
      if (!slug) return unknownResponse(ctx);
      const svc = serviceBySlug.get(slug)!;
      return {
        text: `That sounds like something our ${svc.label} service may be able to help with. ${svc.description}`,
        quickReplies: SERVICE_QUICK_REPLIES,
        setEntity: { service: slug },
      };
    }

    case "SERVICE_AREA_CITY_CHECK": {
      const city = entities.city;
      if (city && citySet.has(city.toLowerCase())) {
        const county = cityToCounty.get(city.toLowerCase());
        return {
          text: `Yes - we dispatch same-day in ${city}${county ? ` (${county})` : ""}. Want to get something scheduled?`,
          pending: "start_wizard",
          quickReplies: [{ label: "Book a service", value: "Book a service" }, { label: "Get an estimate", value: "Get an estimate" }],
          setEntity: { city },
        };
      }
      return {
        text: `I don't see that city in our core service area, but we cover King, Snohomish, and Pierce Counties${cityList.length ? ` (including ${cityList.slice(0, 5).join(", ")}, and more)` : ""}. The fastest way to know for sure is a quick call to ${business.phone}.`,
        quickReplies: [{ label: `Call ${business.phone}`, value: "call" }, { label: "See full service area", value: "service area" }],
      };
    }

    case "PRICING_COST": {
      const pricingSlug = entities.serviceSlug ?? ctx.activeService;
      const faq = allFaqs.find((f) => f.question.toLowerCase().includes("cost"));
      const svcNote = pricingSlug ? ` for your ${serviceBySlug.get(pricingSlug)?.label} request` : "";
      return {
        text: `${faq?.answer ?? "We diagnose on-site and give flat-rate, upfront pricing before any work begins."} Want me to set up a visit${svcNote}?`,
        quickReplies: [{ label: "Get an estimate", value: "Get an estimate" }, { label: `Call ${business.phone}`, value: "call" }],
        setEntity: pricingSlug ? { service: pricingSlug } : undefined,
      };
    }

    case "COUPONS_OFFERS": {
      const list = coupons.slice(0, 3).map((c) => `- ${c.title}: ${c.description}`).join("\n");
      return {
        text: `Here are some current offers:\n${list}\n\nMention any of these when you book or call - ask your technician if you qualify for more than one.`,
        quickReplies: [{ label: "Book a service", value: "Book a service" }, { label: "See all coupons", value: "coupons page" }],
      };
    }

    case "FINANCING": {
      const items = financing.financeable.slice(0, 3).map((f) => f.label).join(", ");
      return {
        text: `${financing.intro} Financing typically applies to larger jobs like ${items}. Ask your technician or use the "Get Financed" link to apply.`,
        quickReplies: [{ label: "Get an estimate", value: "Get an estimate" }, { label: `Call ${business.phone}`, value: "call" }],
      };
    }

    case "WARRANTY_GUARANTEE": {
      const faq = allFaqs.find((f) => f.question.toLowerCase().includes("guarantee"));
      const diff = differentiators.find((d) => d.title.toLowerCase().includes("warranty"));
      return { text: faq?.answer ?? diff?.description ?? "Every repair is backed by our workmanship guarantee." };
    }

    case "REVIEWS_TESTIMONIALS":
      return {
        text: `We're rated ${business.rating.value}/5 from ${business.rating.count}+ reviews. Customers consistently mention our upfront pricing and same-day response.`,
        quickReplies: [{ label: "Book a service", value: "Book a service" }],
        links: [{ label: "Read reviews", href: "/reviews" }],
      };

    case "ABOUT_EXPERIENCE":
      return {
        text: `${business.name} has been serving the Puget Sound region since ${business.founded} - that's ${business.yearsInBusiness} years. Every technician is a licensed, bonded, and insured Washington State plumber (license ${business.licenses[0]}).`,
      };

    case "RESIDENTIAL_COMMERCIAL": {
      const wantsCommercial = message.toLowerCase().includes("commercial") || message.toLowerCase().includes("business");
      return {
        text: wantsCommercial
          ? "Yes - we support offices, restaurants, and multi-family properties with scheduled maintenance and priority 24/7 emergency response."
          : "We handle both residential and commercial plumbing. Which fits your situation?",
        quickReplies: [{ label: "Residential", value: "residential" }, { label: "Commercial", value: "commercial" }],
        setEntity: wantsCommercial ? { audience: "commercial" } : undefined,
      };
    }

    case "CAREERS":
      return { text: "We're always looking for good people - licensed plumbers, apprentices, sewer & drain techs, and office/dispatch staff. The Careers page has the details.", links: [{ label: "Careers", href: "/careers" }] };

    case "COMPLAINT_HUMAN":
      return {
        text: `Of course - the fastest way to reach a person is ${callCta()}. I can also grab your info now so someone follows up.`,
        quickReplies: [{ label: `Call ${business.phone}`, value: "call" }, { label: "Leave my info", value: "Book a service" }],
      };

    case "FAQ": {
      const faq = findFaqMatch(message);
      if (faq) return { text: faq.answer };
      return unknownResponse(ctx);
    }

    default:
      return unknownResponse(ctx);
  }
}

function greetingFor(ctx: ChatContext): string {
  const { pageContext } = ctx;
  if (pageContext.serviceSlug) {
    const svc = serviceBySlug.get(pageContext.serviceSlug);
    if (svc) return `Hi there! Have a question about ${svc.label}? I can help, or get you an estimate.`;
  }
  if (pageContext.isServiceArea) return "Hi! Looking for service in your area? Tell me your city and I'll check.";
  if (pageContext.isCoupons) return "Hi! Want to hear about our current coupons and specials?";
  if (pageContext.isCommercial) return "Hi! Looking for commercial plumbing support? I can help.";
  if (pageContext.isFinancing) return "Hi! Have questions about financing a repair or install? Ask away.";
  return "Hi there! I'm the Jim Dandy Assistant. How can I help with your plumbing today?";
}

function quickRepliesFor(ctx: ChatContext): QuickReply[] {
  if (ctx.pageContext.serviceSlug) {
    return SERVICE_QUICK_REPLIES;
  }
  if (ctx.pageContext.isCoupons) {
    return [{ label: "See coupons", value: "Any coupons?" }, { label: "Book a service", value: "Book a service" }];
  }
  return DEFAULT_QUICK_REPLIES;
}

function unknownResponse(ctx: ChatContext): ChatResponse {
  const tier = ctx.consecutiveUnknown;
  if (tier <= 1) {
    return {
      text: pick(UNKNOWN_TIER1, tier),
      quickReplies: [
        { label: "Services", value: "What services do you offer?" },
        { label: "Pricing", value: "How much does it cost?" },
        { label: "Service area", value: "Do you service my area?" },
        { label: "Booking", value: "Book a service" },
      ],
    };
  }
  if (tier === 2) {
    return {
      text: pick(UNKNOWN_TIER2, tier),
      quickReplies: [
        { label: "Services", value: "What services do you offer?" },
        { label: "Get an estimate", value: "Get an estimate" },
        { label: "Coupons", value: "Any coupons?" },
        { label: "Talk to a person", value: "talk to a person" },
      ],
    };
  }
  return {
    text: pick(UNKNOWN_TIER3, tier),
    quickReplies: [{ label: `Call ${business.phone}`, value: "call" }, { label: "Leave my info", value: "Book a service" }],
  };
}

export function fallbackIntentName(ctx: ChatContext): IntentName | undefined {
  return ctx.lastIntent ?? undefined;
}
