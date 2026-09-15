/**
 * Language understanding helpers for the rule-based assistant: everything that
 * turns what a person actually types ("heyyy u guys open 2day??") into
 * something the intent engine and knowledge retrieval can work with, plus
 * extraction of the details a lead needs (phone, email, name, ZIP).
 *
 * Pure functions, no DOM or framework dependencies.
 */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon'?t\b/g, "will not"],
  [/\bcan'?t\b/g, "can not"],
  [/\bain'?t\b/g, "is not"],
  [/\bshan'?t\b/g, "shall not"],
  [/\b(\w+)n't\b/g, "$1 not"],
  [/\b(what|where|who|how|when|why|there|here|that|it|he|she)'?s\b/g, "$1 is"],
  [/\b(i)'?m\b/g, "i am"],
  [/\b(you|we|they)'?re\b/g, "$1 are"],
  [/\b(i|you|we|they)'?ve\b/g, "$1 have"],
  [/\b(i|you|we|they|he|she|it)'?ll\b/g, "$1 will"],
  [/\b(i|you|we|they|he|she)'?d\b/g, "$1 would"],
  [/\by'?all\b/g, "you all"],
];

/** Texting shorthand -> plain English. Whole-token replacements only. */
const SLANG: Record<string, string> = {
  u: "you", ur: "your", r: "are", k: "ok", kk: "ok", okay: "ok", okey: "ok", oky: "ok",
  pls: "please", plz: "please", plez: "please", thx: "thanks", thnx: "thanks", thanx: "thanks", ty: "thanks", tysm: "thanks",
  tnx: "thanks", cheers: "thanks", appreciate: "thanks", wanna: "want to", gonna: "going to", gotta: "have to",
  lemme: "let me", gimme: "give me", idk: "i do not know", dunno: "do not know", asap: "asap", rn: "right now",
  tmrw: "tomorrow", tmr: "tomorrow", tomorow: "tomorrow", "2day": "today", tday: "today", tonite: "tonight",
  b4: "before", bc: "because", cuz: "because", coz: "because", w: "with", wo: "without", abt: "about",
  info: "information", appt: "appointment", pic: "picture", pics: "pictures", msg: "message", num: "number",
  no: "no", nah: "no", nope: "no", naw: "no", yep: "yes", yup: "yes", yeah: "yes", ya: "yes", yea: "yes", yah: "yes",
  sure: "sure", thru: "through", tho: "though", hrs: "hours", mins: "minutes", min: "minute", ppl: "people",
  wat: "what", wut: "what", wht: "what", hw: "how", hlp: "help", hlep: "help", halp: "help",
  bathrm: "bathroom", kitchn: "kitchen", toliet: "toilet", toilette: "toilet", tiolet: "toilet", toilit: "toilet",
  fawcet: "faucet", faucit: "faucet", facet: "faucet", sinc: "sink", shwr: "shower", pipez: "pipes",
};

const GREETING_WORDS = new Set([
  "hi", "hello", "hey", "heya", "hiya", "howdy", "yo", "sup", "hola", "greetings", "hallo", "helo", "hellow",
  "hellooo", "hii", "hey there", "hi there", "hello there", "wassup", "whassup", "wazzup", "wsp", "hru",
]);

const FLAT_GREETINGS = new Set(Array.from(GREETING_WORDS, (w) => w.replace(/([a-z])\1+/g, "$1")));

export function squeezeRepeats(word: string): string {
  // "heyyyy" -> "hey", "hiiii" -> "hi", "soooo" -> "so". Letters repeated 3+
  // times collapse to one; genuine doubles ("hello", "tree") are untouched.
  return word.replace(/([a-z])\1{2,}/g, "$1");
}

/** Lowercase, expand contractions and slang, strip emoji/punctuation noise. */
export function preprocess(raw: string): string {
  let text = raw.toLowerCase().normalize("NFKC").replace(/[‘’ʼ`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) text = text.replace(re, rep);
  text = text
    .replace(/[^\p{L}\p{N}\s$%@.'-]/gu, " ")
    // A period that is not a decimal point (no lookbehind: Safari < 16.4 cannot parse it).
    .replace(/(^|\D)\.(?!\d)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  return text
    .split(" ")
    .map((w) => {
      const squeezed = squeezeRepeats(w.replace(/^'+|'+$/g, ""));
      return SLANG[squeezed] ?? squeezed;
    })
    .join(" ")
    .trim();
}

export function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Very light stemmer: enough to make "clogged/clogs/clogging" and "leaks/leaking" meet. */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  return word
    .replace(/ies$/, "y")
    .replace(/(ss)$/, "$1")
    .replace(/([^s])s$/, "$1")
    .replace(/(\w{3,})ing$/, "$1")
    .replace(/(\w{3,})ed$/, "$1")
    .replace(/(\w)\1$/, "$1");
}

// ---------------------------------------------------------------------------
// Detail extraction
// ---------------------------------------------------------------------------

export function extractPhone(raw: string): string | undefined {
  const match = raw.match(/(?:\+?1[\s.-]?)?\(?\b(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/);
  if (!match) return undefined;
  const [, area, prefix, line] = match;
  // Area and exchange codes never start with 0 or 1 in the NANP.
  if (/^[01]/.test(area) || /^[01]/.test(prefix)) return undefined;
  return `(${area}) ${prefix}-${line}`;
}

export function extractEmail(raw: string): string | undefined {
  const match = raw.match(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i);
  return match?.[0].toLowerCase();
}

/** Words that follow "I'm" but are clearly not a name ("I'm in Seattle", "I'm looking for..."). */
const NOT_NAME_WORDS = new Set([
  "in", "at", "on", "looking", "trying", "not", "just", "having", "getting", "calling", "interested", "here", "from",
  "a", "an", "the", "so", "very", "really", "sure", "ok", "fine", "good", "great", "okay", "wondering", "asking",
  "worried", "home", "out", "back", "done", "ready", "available", "free", "sorry", "new", "located", "based", "near",
  "going", "moving", "selling", "buying", "renting", "the", "your", "an", "frustrated", "upset", "angry", "confused",
  "stuck", "busy", "tired", "happy", "glad", "thinking", "hoping", "needing", "need", "trying", "about", "calling",
]);

export function extractName(input: string): string | undefined {
  // Names never span a sentence boundary: "I'm Carla Diaz. Our water heater..."
  const raw = input.replace(/([a-z]{2,})[.!?;,]\s+/gi, "$1 | ");
  const patterns = [
    /\bmy name(?:'s| is)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+){0,2})/i,
    /\bname(?:'s|:)\s*([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+){0,2})/i,
    /\b(?:this is|call me|it'?s)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})/,
    /\b(?:[Ii]'?m|[Ii] am)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})\b/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    const parts = m[1].split(/\s+/).filter((p) => !NOT_NAME_WORDS.has(p.toLowerCase()));
    // Stop at the first word that is obviously not part of a name.
    const nameParts: string[] = [];
    for (const p of m[1].split(/\s+/)) {
      if (NOT_NAME_WORDS.has(p.toLowerCase()) || /^(and|my|phone|number|email|at|from|in)$/i.test(p)) break;
      nameParts.push(p);
    }
    if (!parts.length || !nameParts.length) continue;
    const name = nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
    if (name.length >= 2 && name.length <= 60) return name;
  }
  return undefined;
}

/** Washington ZIP codes run 980xx-994xx. */
/**
 * The part of a message that describes the problem, without the contact
 * details and pleasantries around it: "Hi, I'm Carla. Our water heater is
 * leaking. My cell is 425-555-0187" -> "Our water heater is leaking".
 */
export function problemSentence(raw: string): string {
  const sentences = raw
    .replace(/([.!?])\s+/g, "$1\n")
    .split(/\n+|\s*;\s*/)
    .flatMap((s) => s.split(/,\s+(?=(?:you can|reach me|call me|my (?:cell|number|phone|email)|text me|email me))/i))
    .map((s) => s.trim())
    .filter(Boolean);
  const cleaned = sentences
    .map((s) =>
      s
        .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "")
        .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "")
        .replace(/\b(?:hi|hello|hey|good (?:morning|afternoon|evening))\b[,!]?\s*/gi, "")
        .replace(/\b(?:i'?m|i am|this is|my name is|name is)\s+[A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+)?[,.]?\s*/g, "")
        .replace(/\b(?:you can )?(?:reach|call|text|email) me(?: at| on)?\b[\s:]*(?:or)?\s*/gi, "")
        .replace(/\bmy (?:cell|number|phone|email)(?: number)?(?: is)?\b[\s:]*/gi, "")
        .replace(/\s+(?:or|and)\s*$/i, "")
        .replace(/[\s,.-]+$/, "")
        .trim(),
    )
    .filter((s) => s.split(/\s+/).length >= 2);
  const problem = cleaned.find((s) => /\b(leak|clog|drain|toilet|sink|pipe|water|sewer|heater|faucet|shower|smell|flood|back(ed|ing)? up|broke|burst|drip|disposal|pump|tub|overflow|noise|gas|hot)\b/i.test(s));
  return (problem ?? cleaned[0] ?? raw).slice(0, 300);
}

export function extractZip(raw: string): string | undefined {
  const m = raw.match(/\b(9[89]\d{3})\b/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 98000 && n <= 99499 ? m[1] : undefined;
}

// ---------------------------------------------------------------------------
// Utterance classification
// ---------------------------------------------------------------------------

const YES = new Set(["yes", "y", "sure", "ok", "okay", "yes please", "please", "please do", "do it", "go ahead", "sounds good", "absolutely", "definitely", "of course", "correct", "right", "that is right", "that works", "perfect", "great", "yes that is right", "alright", "all right", "fine", "let us do it", "lets do it", "why not", "ok sure", "sure thing", "yes i would", "i would like that", "please yes", "that would be great", "that would help", "go for it", "affirmative", "totally", "yea sure", "yes sure", "ok thanks", "sure thanks"]);
const NO = new Set(["no", "n", "no thanks", "no thank you", "not now", "not right now", "maybe later", "later", "nevermind", "never mind", "not really", "i am good", "im good", "all good", "no need", "that is ok", "that is okay", "not interested", "i am ok", "no i am good", "nothing", "nope thanks", "no its fine", "no it is fine", "pass", "skip it"]);

export function isYes(text: string): boolean {
  return YES.has(text.replace(/[!?]+$/, "").trim());
}
export function isNo(text: string): boolean {
  return NO.has(text.replace(/[!?]+$/, "").trim());
}

export function greetingOnly(text: string): boolean {
  const t = text
    .replace(/\b(anyone|anybody|someone) (there|here|home|around)\b/g, "")
    .replace(/\b(to you|what is good|whats good|what is poppin|whats poppin|what is happening|how is it going|what is new|whats new)\b/g, "")
    .replace(/\b(good (morning|afternoon|evening|day))\b/g, "hi")
    .replace(/\b(there|guys|team|jim|dandy|folks|everyone|bot|assistant|man|buddy|friend|mate|again|all|yall|you all)\b/g, "")
    .replace(/\b(\w+)( \1\b)+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (GREETING_WORDS.has(t)) return true;
  // "heyy", "hellooo", "hii" - compare with every doubled letter collapsed.
  const flat = (w: string) => w.replace(/([a-z])\1+/g, "$1");
  if (t && t.split(" ").every((w) => GREETING_WORDS.has(w) || FLAT_GREETINGS.has(flat(w)))) return true;
  return /^(good (morning|afternoon|evening|day)|what is up|whats up|wassup|how do you do|hey hey|hi hi|hello hello|morning|evening|afternoon)$/.test(t);
}

/** "hi i have a clog" -> strips the greeting so the rest can be understood on its own. */
export function stripGreetingPrefix(text: string): { greeted: boolean; rest: string } {
  const m = text.match(/^(hi|hello|hey|heya|hiya|howdy|yo|sup|hola|greetings|good (morning|afternoon|evening|day))\b[\s,!-]*(there\b)?[\s,!-]*/);
  if (!m) return { greeted: false, rest: text };
  return { greeted: true, rest: text.slice(m[0].length).trim() };
}

const PROFANITY = [
  "fuck", "fucking", "fucker", "shit", "shitty", "bitch", "bastard", "asshole", "dick", "cunt", "motherfucker",
  "damn you", "screw you", "piece of shit", "wtf", "stfu", "idiot", "stupid bot", "dumb bot", "you suck", "useless bot",
  "moron", "retard", "trash bot",
];

const INSULTS = /\b(you are|you re|this (bot|thing|chat) is|this is|ur|so) (useless|dumb|stupid|terrible|trash|garbage|awful|the worst|pathetic|a joke|worthless|annoying)\b|\b(screw (this|you|it)|damn (it|you)|go to hell|shut up|i hate (you|this)|this sucks|you suck|useless|worthless)\b/;

export function isAbusive(text: string): boolean {
  if (INSULTS.test(text)) return true;
  return PROFANITY.some((p) => new RegExp(`\\b${p.replace(/ /g, "\\s+")}\\b`).test(text));
}

const NON_ENGLISH_MARKERS = [
  "hola", "necesito", "plomero", "ayuda", "agua", "fuga", "gracias", "por favor", "tengo", "problema", "baño", "tubería",
  "cuánto", "cuanto", "cuesta", "habla", "español", "espanol", "bonjour", "merci", "ciao", "obrigado", "xin chào",
  "necesita", "urgente", "inodoro", "calentador", "drenaje",
];

export function looksNonEnglish(raw: string): boolean {
  if (/[Ѐ-ӿ؀-ۿऀ-ॿ一-鿿぀-ヿ가-힯฀-๿]/.test(raw)) return true;
  const t = raw.toLowerCase();
  const hits = NON_ENGLISH_MARKERS.filter((w) => new RegExp(`(^|\\s)${w}(\\s|$|[?!.,])`).test(t)).length;
  return hits >= 2 || (hits === 1 && t.split(/\s+/).length <= 2 && t.trim() !== "hola");
}

export function looksLikeGibberish(text: string): boolean {
  const letters = text.replace(/[^a-z]/g, "");
  if (!letters) return text.replace(/[\s?!.]/g, "").length > 0 && !/\d{3,}/.test(text);
  const tokens = words(text);
  const bad = tokens.filter((w) => {
    const l = w.replace(/[^a-z]/g, "");
    if (l.length < 5) return false;
    const vowels = (l.match(/[aeiouy]/g) ?? []).length;
    return vowels / l.length < 0.15 || /[bcdfghjklmnpqrstvwxz]{5,}/.test(l) || /(asdf|qwer|zxcv|hjkl|jkl;|sdfg|dfgh|fghj)/.test(l);
  }).length;
  return tokens.length > 0 && bad / tokens.length >= 0.5;
}

export function looksLikeQuestion(raw: string, text: string): boolean {
  return (
    /\?\s*$/.test(raw) ||
    /^((actually|so|and|but|ok|okay|also|wait|hey|um|well|oh|btw|by the way|quick question|one more thing|and also|sorry)[, ]+)*(do|does|did|can|could|will|would|should|is|are|am|was|were|how|what|when|where|why|who|which|any|have|has)\b/.test(text) ||
    /\b(should i|can i|do i need|is it (safe|ok|normal|bad)|what should i|how do i|how can i|why is my|why does my|what does it mean)\b/.test(text)
  );
}

/** Attempts to steer a rules bot - irrelevant to us, but worth answering gracefully. */
export function looksLikeInjection(text: string): boolean {
  if (/(<\s*\/?\s*script|javascript:|drop table|select \* from|union select|or 1\s*=\s*1|;\s*--|\{\{.*\}\}|\$\{)/i.test(text)) return true;
  return /\b(ignore (all |the |your )?(previous|prior|above) (instructions|prompts|rules)|(print|show|reveal|tell me) (me )?(your )?(system )?(prompt|instructions)|system prompt|you are now|act as|jailbreak|developer mode|pretend (to be|you are))\b/.test(text);
}
