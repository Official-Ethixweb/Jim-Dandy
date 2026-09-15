/**
 * Domain synonym canonicalization and known-misspelling aliases. Pure data,
 * no logic - consumed by src/lib/chatbot/normalize.ts.
 */

/** token -> canonical form. Every key AND every listed variant map to the same canonical id. */
const SYNONYM_GROUPS: string[][] = [
  ["price", "cost", "pricing", "charge", "rate", "fee", "expensive", "afford"],
  ["estimate", "quote"],
  ["choose", "pick", "select", "hire", "prefer"],
  ["leak", "leaking", "leaks", "leaky", "drip", "dripping", "drips"],
  ["drain", "drains", "clogged", "clog", "clogs", "backed", "backup", "blocked", "blockage", "stopped"],
  ["sewer", "sewage", "mainline", "main-line", "septic"],
  ["heater", "heaters", "tank", "tankless", "hotwater", "hot-water"],
  ["plumber", "plumbing", "plumbers"],
  ["emergency", "urgent", "asap", "immediately", "flooding", "flooded", "burst"],
  ["book", "schedule", "appointment", "appt", "reserve"],
  ["hours", "open", "closed", "time", "available"],
  ["coupon", "coupons", "discount", "discounts", "offer", "offers", "deal", "deals", "special", "specials", "savings"],
  ["financing", "finance", "payments", "payment-plan", "monthly"],
  ["warranty", "guarantee", "guaranteed", "covered"],
  ["review", "reviews", "testimonial", "testimonials", "rating", "ratings"],
  ["license", "licensed", "licensing", "bonded", "insured", "insurance"],
  ["commercial", "business", "restaurant", "office", "property"],
  ["residential", "home", "house", "household"],
  ["area", "areas", "zone", "zones", "location", "locations", "city", "cities"],
  ["human", "person", "someone", "representative", "agent", "operator"],
  ["hello", "hi", "hey", "howdy", "yo"],
  ["bye", "goodbye", "farewell", "later"],
  ["thanks", "thank", "appreciate", "appreciated"],
];

export const SYNONYM_CANONICAL: Map<string, string> = new Map();
for (const group of SYNONYM_GROUPS) {
  const canonical = group[0];
  for (const term of group) SYNONYM_CANONICAL.set(term, canonical);
}

/** Highest-value known misspellings, checked before Levenshtein (O(1) short-circuit). */
export const TYPO_ALIASES: Record<string, string> = {
  plumer: "plumber",
  plummer: "plumber",
  plumbr: "plumber",
  emergancy: "emergency",
  emergency: "emergency",
  emergecy: "emergency",
  urgnt: "urgent",
  drin: "drain",
  draine: "drain",
  clogd: "clogged",
  cloged: "clogged",
  servce: "service",
  servic: "service",
  servise: "service",
  watre: "water",
  waater: "water",
  heatr: "heater",
  heaterr: "heater",
  sewr: "sewer",
  sewage: "sewage",
  seattl: "seattle",
  seatle: "seattle",
  belleview: "bellevue",
  belvue: "bellevue",
  reddmond: "redmond",
  renten: "renton",
  taccoma: "tacoma",
  evertt: "everett",
  edmunds: "edmonds",
  linwood: "lynnwood",
  bothel: "bothell",
  hydrojeting: "hydrojetting",
  "hydro jeting": "hydrojetting",
  guarentee: "guarantee",
  gaurantee: "guarantee",
  finacing: "financing",
  financeing: "financing",
  discont: "discount",
  cupon: "coupon",
  coupen: "coupon",
};
