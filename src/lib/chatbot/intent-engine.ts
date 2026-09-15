import { INTENTS, type IntentDef, type IntentName } from "@data/chatbot/intents";
import { citySet, cityList, serviceNameIndex, symptomIndex, type ServiceSlug } from "@data/chatbot/knowledge";
import type { ChatContext } from "./context";
import { normalize, tokenize, applyTypoCorrection, canonicalOf, damerauLevenshtein } from "./normalize";

export type Entities = {
  serviceSlug?: ServiceSlug;
  city?: string;
  cityMentionedButUnlisted?: boolean;
  symptomSlug?: ServiceSlug;
  symptomCandidates?: ServiceSlug[];
};

export type IntentMatch = {
  intent: IntentName;
  confidence: number;
  ambiguous: boolean;
  runnerUp?: IntentName;
  entities: Entities;
  matchedServiceSlug?: ServiceSlug;
};

function scoreIntent(def: IntentDef, cleanText: string, messageTokens: string[], ctx: ChatContext): number {
  let score = 0;
  for (const phrase of def.phrases) {
    if (cleanText.includes(normalize(phrase))) score += 10;
  }

  // A keyword counts if some token the user actually typed shares its exact
  // canonical concept - computed 1:1 per message token, not via a flattened
  // "is this canonical id present anywhere" set. The flattened-set approach
  // caused one mention of "offer" to also score "discount", "deal", and
  // "special" as if each had separately appeared, because all five share
  // the same synonym-group canonical id. Comparing token-by-token avoids
  // that false cross-crediting while still letting synonyms match (message
  // "clogged" still matches keyword "drain" since both canonicalize the
  // same way) and typo correction still applies (messageTokens is already
  // typo-corrected by the caller).
  const messageCanonicals = new Set(messageTokens.map(canonicalOf));
  const matchedCanonicals = new Set<string>();
  for (const { term, weight } of def.keywords) {
    const canonicalTerm = canonicalOf(term);
    if (messageCanonicals.has(canonicalTerm) && !matchedCanonicals.has(canonicalTerm)) {
      matchedCanonicals.add(canonicalTerm);
      score += weight;
    }
  }

  for (const neg of def.negativeKeywords ?? []) {
    if (messageCanonicals.has(canonicalOf(neg))) score -= 8;
  }
  score += def.contextBoost?.(ctx) ?? 0;
  if (ctx.lastIntent === def.name) score += 2;
  return score;
}

const CITY_CUE_WORDS = new Set(["in", "near", "around", "at", "to"]);

/** A short list of common nearby-but-unlisted place names, so we can tell
 * "a city was named but isn't in our area" apart from "no city was named". */
const KNOWN_UNLISTED_PLACES = [
  "portland", "spokane", "olympia", "vancouver", "yakima", "bellingham",
  "chicago", "new york", "los angeles", "san francisco", "boston", "miami",
  "houston", "denver", "phoenix", "dallas", "austin", "san diego",
];

function extractCity(tokens: string[], rawText: string): { city?: string; mentioned: boolean } {
  const clean = normalize(rawText);
  for (const city of cityList) {
    if (clean.includes(city.toLowerCase())) return { city, mentioned: true };
  }
  for (const token of tokens) {
    for (const city of cityList) {
      const cityLower = city.toLowerCase();
      if (cityLower.split(" ").length > 1) continue;
      const md = token.length <= 5 ? 1 : 2;
      if (damerauLevenshtein(token, cityLower, md) <= md) return { city, mentioned: true };
    }
  }
  for (const place of KNOWN_UNLISTED_PLACES) {
    if (clean.includes(place)) return { mentioned: true };
  }
  // Heuristic: a capitalized-looking single word right after a location cue
  // ("service Portland", "in Kalamazoo") that isn't a known city/place is
  // still treated as "a city was mentioned" so we don't silently fall back
  // to a stale city from earlier in the conversation.
  const rawTokens = rawText.split(/\s+/);
  for (let i = 0; i < rawTokens.length; i++) {
    const word = rawTokens[i].replace(/[^A-Za-z]/g, "");
    if (word.length < 3) continue;
    const isCapitalized = /^[A-Z][a-z]+$/.test(word);
    const prev = rawTokens[i - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (isCapitalized && prev && CITY_CUE_WORDS.has(prev)) {
      return { mentioned: true };
    }
  }
  return { mentioned: false };
}

function extractServiceSlug(rawText: string): ServiceSlug | undefined {
  const clean = normalize(rawText);
  for (const { name, slug } of serviceNameIndex) {
    if (clean.includes(name)) return slug;
    // Tolerate singular/plural mismatches ("water heater" vs "water heaters")
    // since service labels are plural but users often ask in the singular.
    if (name.endsWith("s") && clean.includes(name.slice(0, -1))) return slug;
  }
  return undefined;
}

const WEAK_SYMPTOM_WORDS = new Set([
  "not", "the", "and", "any", "all", "one", "out", "off", "for", "too", "are", "was", "can", "you", "get", "got", "won't",
  "water", "house", "home", "more", "same", "time", "when", "with", "from", "into", "your", "that", "this", "have",
  "back", "need", "just", "they", "their", "fixture", "fixtures", "anywhere", "everywhere", "multiple", "planning",
  "working", "work", "install", "installed", "new", "running", "making", "noise", "noises", "leaking", "fast", "slow",
]);

function extractSymptomMatch(tokens: string[]): { best?: ServiceSlug; candidates: ServiceSlug[] } {
  const scores = new Map<string, number>();
  const bySlug = new Map<string, ServiceSlug>();
  for (const entry of symptomIndex) {
    // Only distinctive words count toward a symptom match: "no" and "up" used
    // to make a bare "no" recommend Emergency and "what's up" recommend Sewer.
    const phraseTokens = entry.phrase.split(" ").filter((pt) => pt.length >= 3 && !WEAK_SYMPTOM_WORDS.has(pt));
    const overlap = phraseTokens.filter((pt) => tokens.includes(pt)).length;
    if (overlap === 0 || (phraseTokens.length >= 3 && overlap < 2)) continue;
    const key = entry.slug;
    const current = scores.get(key) ?? 0;
    scores.set(key, current + overlap * entry.weight);
    bySlug.set(key, entry.slug);
  }
  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return { candidates: [] };
  const [topSlug, topScore] = ranked[0];
  const close = ranked.filter(([, s]) => topScore - s <= 3).map(([slug]) => bySlug.get(slug)!);
  if (close.length > 1) return { candidates: close };
  return { best: bySlug.get(topSlug), candidates: [bySlug.get(topSlug)!] };
}

export function extractEntities(message: string, ctx: ChatContext): Entities {
  const tokens = applyTypoCorrection(tokenize(message));
  const cityResult = extractCity(tokens, message);
  const city = cityResult.city ?? (cityResult.mentioned ? undefined : ctx.activeCity ?? undefined);
  const serviceSlug = extractServiceSlug(message) ?? ctx.activeService ?? undefined;
  const symptom = extractSymptomMatch(tokens);
  return {
    serviceSlug,
    city: city && citySet.has(city.toLowerCase()) ? city : undefined,
    cityMentionedButUnlisted: cityResult.mentioned && !cityResult.city,
    symptomSlug: symptom.best,
    symptomCandidates: symptom.candidates.length > 1 ? symptom.candidates : undefined,
  };
}

export function matchIntent(message: string, ctx: ChatContext): IntentMatch {
  const clean = normalize(message);
  const rawTokens = tokenize(message);
  const correctedTokens = applyTypoCorrection(rawTokens);

  const entities = extractEntities(message, ctx);

  // Symptom-based service recommendation takes priority when it's a confident,
  // unambiguous match and no stronger explicit intent phrase is present.
  const scored = INTENTS.filter((d) => d.name !== "SERVICE_RECOMMENDATION" && d.name !== "FAQ").map((def) => ({
    def,
    score: scoreIntent(def, clean, correctedTokens, ctx),
  }));

  if (entities.symptomSlug || (entities.symptomCandidates && entities.symptomCandidates.length > 1)) {
    const symptomScore = 9;
    scored.push({
      def: { name: "SERVICE_RECOMMENDATION", phrases: [], keywords: [], minScore: 6, priority: 50 },
      score: symptomScore,
    });
  }

  scored.sort((a, b) => b.score - a.score || b.def.priority - a.def.priority);

  // Misrouting a genuine emergency (e.g. into a generic "Emergency service"
  // description instead of the urgent, call-now response) is the costliest
  // failure mode this bot can make. If EMERGENCY cleared its own minScore
  // at all, it wins outright regardless of what other intent scored higher -
  // we never want a strong service-name match to outrank a real emergency.
  const emergencyCandidate = scored.find((s) => s.def.name === "EMERGENCY");
  const emergencyWins = emergencyCandidate && emergencyCandidate.score >= emergencyCandidate.def.minScore;

  // "How much does a water heater cost" is still a pricing question, not a
  // request for the Water Heaters service description - a strong service-
  // name phrase/keyword match (SPECIFIC_SERVICE) can otherwise outscore
  // PRICING_COST just because the service name is longer/more specific than
  // a single price word. If PRICING_COST cleared its own minScore, it wins
  // over a competing SPECIFIC_SERVICE match (but not over EMERGENCY).
  const pricingCandidate = scored.find((s) => s.def.name === "PRICING_COST");
  const pricingWins =
    !emergencyWins &&
    pricingCandidate &&
    pricingCandidate.score >= pricingCandidate.def.minScore &&
    scored[0]?.def.name === "SPECIFIC_SERVICE";

  // An explicit, literal service-name mention ("tell me about drains") is a
  // stronger signal than a fuzzy single-token overlap against symptom sign
  // text (SERVICE_RECOMMENDATION), which can otherwise misfire when a bare
  // word like "drains" happens to also appear inside a *different* service's
  // sign copy (e.g. "multiple drains backing up" under Sewer Services).
  const specificServiceCandidate = scored.find((s) => s.def.name === "SPECIFIC_SERVICE");
  const specificServiceWins =
    !emergencyWins &&
    !pricingWins &&
    specificServiceCandidate &&
    specificServiceCandidate.score >= specificServiceCandidate.def.minScore &&
    scored[0]?.def.name === "SERVICE_RECOMMENDATION";

  const top = emergencyWins
    ? emergencyCandidate
    : pricingWins
      ? pricingCandidate
      : specificServiceWins
        ? specificServiceCandidate
        : scored[0];
  const second = top === scored[0] ? scored[1] : scored[0];

  if (!top || top.score < top.def.minScore) {
    return {
      intent: "UNKNOWN",
      confidence: 0,
      ambiguous: false,
      runnerUp: second?.def.name,
      entities,
    };
  }

  const ambiguous = !!second && top.score - second.score < 2 && second.score >= second.def.minScore;
  const matchedServiceSlug = top.def.serviceSlug as ServiceSlug | undefined;

  return {
    intent: top.def.name,
    confidence: Math.min(1, top.score / 20),
    ambiguous,
    runnerUp: ambiguous ? second?.def.name : undefined,
    entities,
    matchedServiceSlug: matchedServiceSlug ?? entities.serviceSlug,
  };
}
