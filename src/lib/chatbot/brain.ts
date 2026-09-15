/**
 * The assistant's conversation brain - a deterministic, no-LLM pipeline that
 * behaves conversationally: it remembers who you are and what you asked,
 * understands "yes" in context, answers questions from the site's knowledge
 * base, prioritises safety, and turns a chat into a delivered lead.
 *
 * Pure: `converse(state, text)` returns the next state plus an optional side
 * effect (call, submit lead) for the UI to perform. The widget and the test
 * suite run exactly the same code.
 */
import { business, serviceBySlug, allFaqs, citySet, cityToCounty, cityList, coupons, type ServiceSlug } from "@data/chatbot/knowledge";
import { serviceCounties } from "@data/site";

const serviceCountiesByName = new Map(serviceCounties.map((c) => [c.name.toLowerCase(), c.cities]));
import type { KbLink } from "@data/chatbot/kb";
import { STEP_FIELD, STEP_PROMPT, STEP_QUICK_REPLIES, nextStep, validateStep } from "@data/chatbot/flows";
import { serviceNeededFromSlug, urgencyLabels, audienceLabels, type ChatbotLeadValues } from "@lib/schemas/chatLead";
import { matchIntent, extractEntities } from "./intent-engine";
import { resolve, type ChatResponse, type QuickReply } from "./resolver";
import { bestAnswer, subjectCovered } from "./retrieval";
import {
  preprocess,
  extractEmail,
  extractName,
  extractPhone,
  extractZip,
  greetingOnly,
  stripGreetingPrefix,
  isAbusive,
  isNo,
  isYes,
  looksLikeGibberish,
  looksLikeInjection,
  looksLikeQuestion,
  looksNonEnglish,
  problemSentence,
} from "./language";
import { chatReducer, type ChatContext, type ChatMessage, type PendingOffer, type WizardStep } from "./context";

export type BrainAction = { type: "call" } | { type: "submit_lead"; payload: ChatbotLeadValues };
export type BrainResult = { state: ChatContext; action?: BrainAction };

type Reply = ChatResponse & { links?: KbLink[] };

const CALL: QuickReply = { label: `Call ${business.phone}`, value: "call" };
const BOOK: QuickReply = { label: "Send my details", value: "Book a service" };
const MAIN_MENU: QuickReply[] = [
  { label: "Book a service", value: "Book a service" },
  { label: "I have an emergency", value: "I have an emergency" },
  { label: "Pricing", value: "How much does it cost?" },
  { label: "Service area", value: "Do you service my area?" },
];

let idCounter = 0;
function message(from: "bot" | "user", text: string, quickReplies?: QuickReply[], links?: KbLink[]): ChatMessage {
  idCounter = (idCounter + 1) % 1_000_000;
  return { id: `${Date.now().toString(36)}-${idCounter}`, from, text, quickReplies, links, timestamp: Date.now() };
}

/** Deterministic variety: the same situation reads differently turn to turn. */
function vary(options: string[], seed: number): string {
  return options[Math.abs(seed) % options.length];
}

function firstName(state: ChatContext): string | undefined {
  return state.profile.fullName?.split(" ")[0];
}

// ---------------------------------------------------------------------------
// Safety patterns
// ---------------------------------------------------------------------------

const GAS_RE =
  /\b(smell(s|ing)? (of |like )?(natural )?gas|gas (smell|leak|odou?r)|leaking gas|gas is leaking|carbon monoxide|co (alarm|detector)|hissing (from|at|near) (the )?gas|rotten eggs? (smell|odou?r)?\s*(near|by|from|around|in) (the )?(stove|oven|range|furnace|fireplace|dryer|gas|appliance|kitchen|basement|garage|meter)|(stove|oven|furnace|range|dryer) (smells|smell) like rotten eggs?)\b/;
/** "rotten egg smell" with no water/drain context is treated as possible gas. */
const ROTTEN_EGG_AIR_RE = /\brotten eggs?\b/;
const WATER_CONTEXT_RE = /\b(water|drain|sink|shower|tub|toilet|faucet|tap|sewer|bathroom)\b/;

const EMERGENCY_RE = new RegExp(
  [
    "\\bburst\\b", "pipes? (burst|broke|broken|exploded|split|cracked|blew)", "\\bflood(ing|ed|s)?\\b",
    "water (is )?(everywhere|pouring|gushing|spraying|shooting|coming (in|through|out of) (the )?(ceiling|wall|floor))",
    "(ceiling|wall) is (leaking|dripping|pouring|caving)", "sewage (is )?(backing up|coming up|coming out|everywhere|in (the|my))",
    "sewer (is )?backing up into", "(toilet|sink|tub|drain|shower) is overflowing", "overflowing (toilet|sink|tub|drain)",
    "no water (at all|anywhere|in (the|my) (house|home))", "\\b(emergency|urgent)\\b", "water heater (burst|exploded|is flooding|is pouring)",
    "(leak|leaking) (really )?bad", "leaking everywhere", "main (line )?(broke|burst)",
    "backing up with sewage", "sewage (all over|on the floor|coming into|flooding)", "sewer (line )?backup into (the )?(house|home|basement)",
    "raw sewage", "water (spraying|gushing) everywhere", "(overflowed|overflowing) (everywhere|all over)", "grease trap (overflowed|overflowing)", "can not (turn|shut) (the )?water off", "wo?n'?t stop (leaking|running|overflowing)",
  ].join("|"),
);

// ---------------------------------------------------------------------------
// Small talk and conversational patterns (checked against preprocessed text)
// ---------------------------------------------------------------------------

type Pattern = { re: RegExp; reply: (state: ChatContext) => Reply };

const SMALL_TALK: Pattern[] = [
  {
    re: /^(how are you|how are you doing|how is it going|how are things|how is your day|you good|how have you been|hru|how do you do|what is up|whats up|sup|wassup)( today)?$/,
    reply: (s) => ({
      text: vary(
        [
          "I'm doing great, thanks for asking! Ready to help with anything plumbing. What's going on at your place?",
          "All good here - no leaks on my end! How can I help you today?",
          "Doing well, thanks! Is there a plumbing problem I can help you sort out?",
        ],
        s.turn,
      ),
      quickReplies: MAIN_MENU,
    }),
  },
  {
    re: /\b(are you (a )?(real|human|person|bot|robot|ai|machine|computer|chat ?gpt|live)|is this (a )?(bot|robot|real person|human|ai|automated)|am i (talking|chatting|speaking) (to|with) (a )?(bot|robot|human|person|real person)|are you automated)\b/,
    reply: () => ({
      text: `I'm the Jim Dandy virtual assistant - not a person, but I know our services, pricing approach, service area, and coupons, and I can send your request straight to our dispatch team. If you'd rather talk to a real person, call ${business.phone} - a live dispatcher answers 24/7.`,
      quickReplies: [CALL, BOOK],
    }),
  },
  {
    re: /\b(what is your name|who are you|what are you|your name|introduce yourself)\b/,
    reply: () => ({
      text: "I'm the Jim Dandy Assistant! I can answer questions about plumbing, drains, sewers, and water heaters, check if we serve your city, share current coupons, and get a technician headed your way.",
      quickReplies: MAIN_MENU,
    }),
  },
  {
    re: /(^help$|^help please$|\b(what can you do|what do you do|how can you help|what can i ask|help me|i need help|can you help( me)?|what are my options|menu|options)\b$)/,
    reply: (s) => ({
      text: `${firstName(s) ? `Sure, ${firstName(s)}! ` : "Happy to help! "}I can:\n• Help figure out what's wrong and which service fits\n• Explain pricing, coupons, and financing\n• Check if we cover your city\n• Answer common plumbing questions\n• Send your request to dispatch so a tech calls you\nWhat's going on?`,
      quickReplies: MAIN_MENU,
    }),
  },
  {
    re: /\b(tell me a joke|say something funny|make me laugh|know any jokes|joke)\b/,
    reply: (s) => ({
      text: vary(
        [
          "Why did the plumber break up with the toilet? It was a relationship that was going down the drain. 🚽\nNow - anything I can actually fix for you?",
          "What's a plumber's favorite shoe? Clogs! 👞\nAnything plumbing-related I can help with today?",
          "I'd tell you a joke about a clogged drain, but it might not go through. 😄\nNeed help with a real one?",
        ],
        s.turn,
      ),
      quickReplies: MAIN_MENU,
    }),
  },
  {
    re: /^(lol|lmao|haha+|hehe+|ha|rofl|:\)|😂|funny)$/,
    reply: () => ({ text: "😄 Glad I could lighten things up. Anything plumbing-related I can help with?" }),
  },
  {
    re: /\b(you are (awesome|great|amazing|helpful|the best|smart|cool)|good bot|nice bot|love (you|this)|this is (great|awesome|helpful)|you rock)\b/,
    reply: () => ({ text: "Thank you - that made my day! 😊 Anything else I can help with?", quickReplies: MAIN_MENU }),
  },
  {
    re: /^(test|testing|test test|testing 123|1 2 3|123|ping)$/,
    reply: () => ({ text: "I'm here and working! 👋 Ask me anything about plumbing, or tell me what's going on.", quickReplies: MAIN_MENU }),
  },
  {
    re: /^(hmm+|um+|uh+|huh|what|\?+|idk|i do not know|not sure|confused|i am confused|[a-z]|\.+|\d{1,4}|ok so|so)$/,
    reply: () => ({
      text: "No problem - tell me what's happening in your own words (like \"my kitchen sink is draining slowly\"), or pick one of these:",
      quickReplies: MAIN_MENU,
    }),
  },
  {
    re: /\b(weather|temperature outside|forecast|news|politics|president|election|stock market|stocks|bitcoin|crypto|sports|football|basketball|baseball|soccer|recipe|cook dinner|movie|song|music|homework|write (me )?(a|an|some) (essay|poem|story|code)|coding|programming language|capital of|translate|meaning of life|who won)\b/,
    reply: () => ({
      text: `That's outside my wheelhouse - I'm a plumbing specialist! 🔧 But if anything's leaking, clogged, backing up, or out of hot water, I'm your assistant. You can also call ${business.phone} anytime.`,
      quickReplies: MAIN_MENU,
    }),
  },
];

const ACKS: Pattern[] = [
  {
    re: /^(cool|nice|awesome|great|sweet|neat|got it|gotcha|understood|sounds good|ok cool|cool thanks|okie|alright then|good to know|makes sense|i see|oh ok|ah ok|noted|good|very good|excellent|wonderful|amazing|haha ok|lol ok|ok great)$/,
    reply: (s) => ({ text: vary(["👍 Anything else I can help with?", "Great! Anything else on your mind?", "Glad that helps. Anything else I can do for you?"], s.turn), quickReplies: MAIN_MENU }),
  },
  {
    re: /^(wait|hold on|hang on|one sec(ond)?|one moment|just a (sec|second|minute|moment)|brb|give me a (sec|second|minute)|be right back|let me check|let me think)$/,
    reply: () => ({ text: "Take your time - I'll be right here. 🙂" }),
  },
  {
    re: /^(maybe|possibly|perhaps|i guess|kind of|sort of|not sure yet|thinking about it|let me think about it)$/,
    reply: () => ({ text: "No pressure at all. Whenever you're ready, I can answer questions or get a tech scheduled - or call " + business.phone + " to talk it through.", quickReplies: MAIN_MENU }),
  },
  {
    re: /^(have a (good|great|nice) (day|night|one|evening|weekend)|good ?night|see (you|ya)( later| soon)?|talk (to you )?later|ttyl|gtg|got to go|gotta go|catch you later|cya|later|take care|peace|that is all|that is it|all set|i am all set|nothing else)$/,
    reply: (s) => ({ text: `Take care${firstName(s) ? `, ${firstName(s)}` : ""}! If anything comes up, I'm right here - or call ${business.phone} anytime. 👋` }),
  },
  {
    re: /^(anyone there|anybody there|is anyone there|is anybody there|are you there|you there|is this working|hello anyone there|is anyone available( to chat)?|anyone available|can i chat with someone)$/,
    reply: () => ({ text: "Yes, I'm here! 👋 I'm the Jim Dandy Assistant. What's going on with your plumbing?", quickReplies: MAIN_MENU }),
  },
  {
    re: /^(can i ask (you )?(something|a question|you a question)|i have a question|quick question|question|i got a question|got a question)$/,
    reply: () => ({ text: "Of course - ask away! I know our services, pricing, coupons, service area, and a lot of plumbing know-how." }),
  },
  {
    re: /^what is \d+\s*(plus|minus|times|x|\+|-|\*|\/)\s*\d+$/,
    reply: () => ({ text: "Math isn't really my department - I'm better with pipes than numbers! 😄 Anything plumbing-related I can help with?", quickReplies: MAIN_MENU }),
  },
  {
    re: /\b(do you have feelings|are you (smart|intelligent|sentient|alive|conscious)|do you think|can you think|do you dream)\b/,
    reply: () => ({ text: "I'm a virtual assistant, so no feelings - just a lot of plumbing knowledge. 🔧 What can I help you with?", quickReplies: MAIN_MENU }),
  },
  {
    re: /\b(speak|talk|chat|write|understand) (in )?(spanish|espanol|español|chinese|mandarin|russian|vietnamese|korean|french|hindi|tagalog|arabic|another language|other languages)\b|\bhablas? (espanol|español|ingles)\b/,
    reply: () => ({ text: `I can only chat in English for now. For help in another language, please call ${business.phone} and our team will do their best to assist.`, quickReplies: [CALL] }),
  },
];

const CANCEL_RE = /^(cancel|stop|quit|exit|never ?mind|forget it|start over|restart|reset|go back|nvm|no stop|stop it)$/;

// ---------------------------------------------------------------------------
// Wizard helpers
// ---------------------------------------------------------------------------

function nextOpenStep(state: ChatContext, from: WizardStep): WizardStep {
  let step = from;
  const answers = state.wizard.answers as Record<string, unknown>;
  // Skip steps the visitor already answered earlier in the chat.
  while (step !== "confirm") {
    const field = STEP_FIELD[step];
    if (!field || answers[field] === undefined || answers[field] === "") return step;
    step = nextStep(step);
  }
  return step;
}

function stepPrompt(state: ChatContext, step: WizardStep): Reply {
  if (step === "confirm") return confirmSummary(state);
  const name = firstName(state);
  let text = STEP_PROMPT[step];
  if (step === "phone" && name) text = `Thanks, ${name}! What's the best phone number to reach you?`;
  if (step === "urgency" && state.lastProblem) text = "How soon do you need someone?";
  return { text, quickReplies: STEP_QUICK_REPLIES[step] };
}

function confirmSummary(state: ChatContext): Reply {
  const a = state.wizard.answers as Partial<ChatbotLeadValues>;
  const lines = [
    a.problem ? `Issue: ${a.problem}` : null,
    a.urgency ? `Urgency: ${urgencyLabels[a.urgency] ?? a.urgency}` : null,
    a.audience ? `Type: ${audienceLabels[a.audience] ?? a.audience}` : null,
    a.city ? `City: ${a.city}` : null,
    a.timing ? `Timing: ${a.timing}` : null,
    a.fullName ? `Name: ${a.fullName}` : null,
    a.phone ? `Phone: ${a.phone}` : null,
    a.email ? `Email: ${a.email}` : null,
    a.notes ? `Notes: ${a.notes}` : null,
  ].filter(Boolean);
  return {
    text: `Here's what I've got:\n${lines.join("\n")}\n\nSend this to the team?`,
    quickReplies: [
      { label: "Send it", value: "confirm send" },
      { label: "Edit something", value: "edit details" },
      { label: "Start over", value: "restart wizard" },
    ],
  };
}

/** Turns a natural answer ("I'm in Kent", "it's for my restaurant") into the step's canonical value. */
function interpretAnswer(state: ChatContext, step: WizardStep, raw: string, text: string): string {
  switch (step) {
    case "urgency":
      if (EMERGENCY_RE.test(text) || /\b(right now|asap|immediately|now)\b/.test(text)) return "emergency";
      if (/\b(today|tonight|this (morning|afternoon|evening)|same day)\b/.test(text)) return "today";
      if (/\b(this week|tomorrow|few days|couple (of )?days|next few days|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)\b/.test(text)) return "this-week";
      if (/\b(flexible|no rush|whenever|any ?time|not urgent|next week|next month|later|no hurry)\b/.test(text)) return "flexible";
      return text.replace(/\s+/g, "-");
    case "audience":
      if (/\b(home|house|residential|apartment|condo|townhouse|my place|rental|duplex|mobile home)\b/.test(text)) return "residential";
      if (/\b(business|commercial|restaurant|office|store|shop|building|property|company|school|church|hotel|warehouse|retail)\b/.test(text)) return "commercial";
      if (/^(skip|idk|i do not know|not sure|either|both|whatever)$/.test(text)) return "residential";
      return text;
    case "city": {
      const entities = extractEntities(raw, state);
      if (entities.city) return entities.city;
      return raw.replace(/^(i am|i'?m|we are|we'?re|it is|it'?s|located|live|living)?\s*(in|at|near|around)?\s*/i, "").replace(/[.!]+$/, "").trim();
    }
    case "name":
      return extractName(raw) ?? raw.replace(/^(my name is|name is|i am|i'?m|it'?s|this is|call me)\s+/i, "").replace(/[.!]+$/, "").trim();
    case "phone":
      return extractPhone(raw) ?? raw.trim();
    case "email":
      return extractEmail(raw) ?? raw.trim();
    default:
      return raw.trim();
  }
}

/** Pulls any details the visitor volunteered and stores them for the lead form. */
function absorbDetails(state: ChatContext, raw: string): { state: ChatContext; found: string[] } {
  const found: string[] = [];
  const answers = { ...state.wizard.answers } as Record<string, string>;
  const profile = { ...state.profile };
  const phone = extractPhone(raw);
  const email = extractEmail(raw);
  const name = extractName(raw);
  if (phone) { answers.phone = phone; profile.phone = phone; found.push("phone"); }
  if (email) { answers.email = email; profile.email = email; found.push("email"); }
  if (name) { answers.fullName = name; profile.fullName = name; found.push("name"); }
  if (!found.length) return { state, found };
  return { state: { ...state, profile, wizard: { ...state.wizard, answers: answers as ChatContext["wizard"]["answers"] } }, found };
}

function withBot(state: ChatContext, reply: Reply): ChatContext {
  let next = chatReducer(state, { type: "ADD_MESSAGE", message: message("bot", reply.text, reply.quickReplies, reply.links) });
  if (reply.setEntity) next = chatReducer(next, { type: "SET_ENTITY", ...reply.setEntity });
  if (reply.emergency) next = chatReducer(next, { type: "EMERGENCY_DETECTED" });
  return next;
}

function startWizard(state: ChatContext, intro?: string): BrainResult {
  let next: ChatContext = { ...state, pending: null, wizard: { ...state.wizard, active: true, paused: false, invalidAttempts: 0, editing: false } };
  // Carry forward everything already known.
  const answers = { ...next.wizard.answers } as Record<string, string>;
  if (next.lastProblem && !answers.problem) answers.problem = next.lastProblem;
  if (next.profile.fullName && !answers.fullName) answers.fullName = next.profile.fullName;
  if (next.profile.phone && !answers.phone) answers.phone = next.profile.phone;
  if (next.profile.email && !answers.email) answers.email = next.profile.email;
  if (next.activeCity && !answers.city) answers.city = next.activeCity;
  if (next.audience && !answers.audience) answers.audience = next.audience;
  if (next.emergencyFlag && !answers.urgency) answers.urgency = "emergency";
  next = { ...next, wizard: { ...next.wizard, answers: answers as ChatContext["wizard"]["answers"] } };
  const step = nextOpenStep(next, "problem");
  next = chatReducer(next, { type: "WIZARD_STEP", step });
  const prompt = stepPrompt(next, step);
  const known = [answers.problem && "what you described", answers.fullName && "your name", answers.phone && "your number"].filter(Boolean);
  const lead =
    intro ??
    (answers.problem && state.turn <= 1
      ? `Happy to help with ${answers.problem.length <= 40 ? answers.problem.replace(/^(my|our|the|a|an) /i, "your ") : "that"}. `
      : known.length
        ? `Great - I've got ${known.length > 2 ? `${known.slice(0, -1).join(", ")}, and ${known[known.length - 1]}` : known.join(" and ")} from our chat. `
        : "Let's get a technician on it - just a few quick questions. ");
  return { state: withBot(next, { ...prompt, text: `${lead}${prompt.text}` }) };
}

function buildPayload(state: ChatContext): ChatbotLeadValues {
  const a = state.wizard.answers as Partial<ChatbotLeadValues>;
  const described = a.problem ? extractEntities(a.problem, state) : undefined;
  const slug = state.activeService ?? described?.serviceSlug ?? described?.symptomSlug;
  return {
    fullName: a.fullName ?? "",
    email: a.email ?? "",
    phone: a.phone ?? "",
    serviceNeeded: slug ? serviceNeededFromSlug(slug) : "other",
    problem: a.problem ?? "",
    urgency: (a.urgency as ChatbotLeadValues["urgency"]) ?? "flexible",
    audience: (a.audience as ChatbotLeadValues["audience"]) ?? "residential",
    city: a.city ?? "",
    timing: a.timing || undefined,
    notes: a.notes || undefined,
    consent: true,
    source: "chat",
  };
}

function handleWizard(state: ChatContext, raw: string, text: string): BrainResult | null {
  const step = state.wizard.step as WizardStep;
  const command = raw.toLowerCase().trim();

  if (CANCEL_RE.test(text)) {
    const next = chatReducer({ ...state, pending: null, lastProblem: null, emergencyFlag: false }, { type: "WIZARD_RESET" });
    return { state: withBot(next, { text: `No problem, I've cancelled that request. Your details weren't sent. Anything else I can help with?`, quickReplies: MAIN_MENU }) };
  }

  if (step === "confirm") {
    if (/^(confirm send|send it|send|yes|yep|sure|ok|looks good|correct|submit|go ahead|that is right|all good|perfect|yes send it)$/.test(text) || isYes(text)) {
      const next = chatReducer(state, { type: "WIZARD_STEP", step: "submitting" });
      return { state: withBot(next, { text: STEP_PROMPT.submitting }), action: { type: "submit_lead", payload: buildPayload(state) } };
    }
    const editMatch = command.match(/^edit:(problem|name|phone|email|city)$/);
    if (editMatch) {
      const target = editMatch[1] as WizardStep;
      const next = chatReducer(state, { type: "WIZARD_STEP", step: target });
      return { state: withBot({ ...next, wizard: { ...next.wizard, editing: true } }, stepPrompt(next, target)) };
    }
    if (/^(edit details|edit|change|no|wrong|fix|not right|that is wrong|update)/.test(text) || isNo(text)) {
      return {
        state: withBot(state, {
          text: "Sure - what would you like to change?",
          quickReplies: [
            { label: "Issue", value: "edit:problem" },
            { label: "Name", value: "edit:name" },
            { label: "Phone", value: "edit:phone" },
            { label: "Email", value: "edit:email" },
            { label: "City", value: "edit:city" },
          ],
        }),
      };
    }
    return { state: withBot(state, confirmSummary(state)) };
  }

  if (step === "error") {
    if (/^(retry submit|retry|try again|yes)$/.test(text)) {
      const next = chatReducer(state, { type: "WIZARD_STEP", step: "submitting" });
      return { state: withBot(next, { text: STEP_PROMPT.submitting }), action: { type: "submit_lead", payload: buildPayload(state) } };
    }
    return null;
  }

  if (!STEP_FIELD[step] && step !== "consent") return null;

  // At the "what's going on" step, a clear question about something else
  // (hours, prices, area...) is answered rather than saved as the problem.
  if (step === "problem" && looksLikeQuestion(raw, text)) {
    const ents = extractEntities(raw, { ...state, activeService: null });
    const aboutProblem = ents.symptomSlug || ents.serviceSlug || EMERGENCY_RE.test(text) || /\b(leak|clog|drain|toilet|sink|pipe|water|sewer|heater|faucet|shower|smell|flood|back(ed|ing)? up)\b/.test(text);
    if (!aboutProblem) {
      const detour = answerFreely(state, raw, text, { inWizard: true });
      if (detour) {
        const prompt = stepPrompt(state, step);
        return { state: withBot(state, { ...detour, text: `${detour.text}\n\nBack to your request - ${prompt.text.charAt(0).toLowerCase()}${prompt.text.slice(1)}`, quickReplies: prompt.quickReplies }) };
      }
    }
  }

  const value = interpretAnswer(state, step, raw, text);
  let result = validateStep(step, value);

  // A "name" that is really an answer to something else ("asap", "house", "Tacoma").
  if (result.ok && step === "name") {
    const lower = result.value.toLowerCase();
    const notAName = /\d|@/.test(lower) || /^(asap|yes|no|ok|okay|skip|today|tomorrow|flexible|house|home|business|none|n\/a|idk|emergency|residential|commercial|sure|nope|nah|yep|hi|hello|hey|thanks|test)$/.test(lower) || citySet.has(lower) || lower.split(" ").length > 5;
    if (notAName) result = { ok: false, error: "What name should the team ask for?" };
  }

  if (!result.ok) {
    // Details that answer a different question ("Kent" while we asked home or business)
    // are kept, and the form moves on to whatever is still missing.
    const answers = state.wizard.answers as Record<string, string>;
    const found: [string, string][] = [];
    const cityFound = extractEntities(raw, { ...state, activeCity: null }).city;
    if (cityFound && !answers.city && step !== "city") found.push(["city", cityFound]);
    const phoneFound = extractPhone(raw);
    if (phoneFound && !answers.phone && step !== "phone") found.push(["phone", phoneFound]);
    const emailFound = extractEmail(raw);
    if (emailFound && !answers.email && step !== "email") found.push(["email", emailFound]);
    const nameFound = extractName(raw);
    if (nameFound && !answers.fullName && step !== "name") found.push(["fullName", nameFound]);
    if (found.length) {
      let next = state;
      for (const [f, v] of found) {
        next = chatReducer(next, { type: "WIZARD_ANSWER", field: f as keyof ChatbotLeadValues, value: v });
        if (f === "city") next = chatReducer(next, { type: "SET_ENTITY", city: v });
        if (f === "phone") next = { ...next, profile: { ...next.profile, phone: v } };
        if (f === "email") next = { ...next, profile: { ...next.profile, email: v } };
        if (f === "fullName") next = { ...next, profile: { ...next.profile, fullName: v } };
      }
      const prompt = stepPrompt(next, step);
      return { state: withBot(next, { ...prompt, text: `Thanks, noted. ${prompt.text}` }) };
    }
    // They described the problem (again, or better) instead of answering this step.
    const ents = extractEntities(raw, { ...state, activeService: null });
    if (["urgency", "audience", "timing"].includes(step) && (ents.symptomSlug || ents.serviceSlug) && text.split(" ").length >= 2) {
      let next = chatReducer(state, { type: "WIZARD_ANSWER", field: "problem", value: raw.trim() });
      next = { ...next, lastProblem: raw.trim() };
      if (COMMERCIAL_CUE.test(text)) next = chatReducer(chatReducer(next, { type: "WIZARD_ANSWER", field: "audience", value: "commercial" }), { type: "SET_ENTITY", audience: "commercial" });
      const prompt = stepPrompt(next, step);
      return { state: withBot(next, { ...prompt, text: `Got it, I've noted that. ${prompt.text}` }) };
    }
    // A question in the middle of the form gets answered, then we pick the form back up.
    if (looksLikeQuestion(raw, text) && step !== "problem" && step !== "notes") {
      const detour = answerFreely(state, raw, text, { inWizard: true });
      if (detour) {
        const prompt = stepPrompt(state, step);
        return { state: withBot(state, { ...detour, text: `${detour.text}\n\nBack to your request - ${prompt.text.charAt(0).toLowerCase()}${prompt.text.slice(1)}`, quickReplies: prompt.quickReplies }) };
      }
    }
    const next = chatReducer(state, { type: "WIZARD_INVALID" });
    const attempts = state.wizard.invalidAttempts + 1;
    return {
      state: withBot(next, {
        text: attempts >= 2 ? `${result.error} If it's easier, you can call ${business.phone} instead.` : result.error,
        quickReplies: attempts >= 2 ? [CALL, ...(STEP_QUICK_REPLIES[step] ?? [])] : STEP_QUICK_REPLIES[step],
      }),
    };
  }

  const field = STEP_FIELD[step];
  let next = state;
  if (field) next = chatReducer(next, { type: "WIZARD_ANSWER", field, value: result.value });
  if (step === "name") {
    const proper = result.value.replace(/\b([a-z])/g, (c) => c.toUpperCase());
    next = chatReducer(next, { type: "WIZARD_ANSWER", field: "fullName", value: proper });
    next = { ...next, profile: { ...next.profile, fullName: proper } };
  }
  if (step === "phone") next = { ...next, profile: { ...next.profile, phone: result.value } };
  if (step === "email") next = { ...next, profile: { ...next.profile, email: result.value } };
  if (step === "city" && citySet.has(result.value.toLowerCase())) next = chatReducer(next, { type: "SET_ENTITY", city: result.value });
  if (step === "problem") next = { ...next, lastProblem: result.value };

  // Free-text answers can carry other details too ("John, 206-555-0134").
  if (step !== "phone" && step !== "email") next = absorbDetails(next, raw).state;
  if (step === "problem" && EMERGENCY_RE.test(text)) {
    next = chatReducer(next, { type: "WIZARD_ANSWER", field: "urgency", value: "emergency" });
  }

  const upcoming = state.wizard.editing ? "confirm" : nextOpenStep(next, nextStep(step));
  next = chatReducer({ ...next, wizard: { ...next.wizard, editing: false } }, { type: "WIZARD_STEP", step: upcoming });

  let prefix = "";
  if (step === "problem" && EMERGENCY_RE.test(text)) {
    prefix = `That sounds urgent - if water or sewage is actively coming in, call ${business.phone} now for the fastest dispatch. I'll mark this as an emergency.\n\n`;
  } else if (step === "city" && citySet.has(result.value.toLowerCase())) {
    prefix = `Great - we serve ${result.value}. `;
  } else if (step === "city" && !citySet.has(result.value.toLowerCase())) {
    prefix = `Thanks - ${result.value} isn't on our main city list, but the team will confirm coverage when they reach out.\n\n`;
  }
  const prompt = stepPrompt(next, upcoming);
  return { state: withBot(next, { ...prompt, text: `${prefix}${prompt.text}` }) };
}

// ---------------------------------------------------------------------------
// Free conversation
// ---------------------------------------------------------------------------

const EMPATHY: Partial<Record<ServiceSlug, string[]>> = {
  "drains-clogs": ["Ugh, a stubborn clog is no fun.", "Slow or blocked drains are frustrating - let's get that flowing again.", "Clogs happen to everyone - good news, they're our specialty."],
  "water-heaters": ["No hot water is the worst - let's fix that.", "Water heater trouble is never convenient.", "Cold showers are nobody's idea of fun."],
  "sewer-services": ["Sewer problems are stressful - you're in the right place.", "That sounds like it could be the sewer line.", "Let's get that sewer issue looked at properly."],
  "all-plumbing": ["That's a very fixable problem.", "Good call getting that looked at before it gets worse.", "Our techs handle that kind of thing every day."],
  commercial: ["Downtime costs money - we'll keep you open.", "We work with a lot of businesses on exactly this."],
  emergency: ["That sounds serious."],
};

function emergencyReply(state: ChatContext): Reply {
  return {
    text: `🚨 That sounds urgent. Call ${business.phone} right now - a real dispatcher answers 24/7 and can get a licensed tech to you fast.\n\nWhile you wait: if water is coming in, shut off your main water valve (usually where the line enters the house - turn it clockwise).${state.profile.phone ? "" : "\n\nCan't call? Tap below and I'll flag your request as an emergency."}`,
    quickReplies: [CALL, { label: "Send an urgent request", value: "Book a service" }, { label: "How do I shut off my water?", value: "how do i shut off my water" }],
    emergency: true,
  };
}

function gasReply(): Reply {
  return {
    text: `⚠️ If you smell gas, please act now:\n1. Leave the building immediately - don't use light switches, flames, or your phone inside.\n2. From outside, call 911 or your gas company's emergency line.\n3. Don't go back in until it's declared safe.\n\nOnce everyone is safe, call us at ${business.phone} and a licensed tech can inspect and repair gas lines.`,
    quickReplies: [CALL, { label: "I'm safe - send a request", value: "Book a service" }],
    emergency: true,
  };
}

function areaReply(_state: ChatContext, city: string | undefined, unlistedMention: boolean, zip?: string): Reply {
  if (city && citySet.has(city.toLowerCase())) {
    const county = cityToCounty.get(city.toLowerCase());
    return {
      text: `Yes! We serve ${city}${county ? ` in ${county}` : ""}, with same-day appointments for most jobs. Want me to get a technician scheduled?`,
      quickReplies: [{ label: "Yes, book it", value: "Book a service" }, { label: "Pricing", value: "How much does it cost?" }],
      setEntity: { city },
      pending: "start_wizard",
    };
  }
  if (zip) {
    return {
      text: `${zip} is a Washington ZIP - we cover King, Snohomish, and Pierce Counties, so there's a good chance we're nearby. Which city is that in? Or call ${business.phone} and dispatch will confirm right away.`,
      quickReplies: [CALL, { label: "See service area", value: "service area" }],
    };
  }
  if (unlistedMention) {
    return {
      text: `That one isn't in our regular service area - we cover King, Snohomish, and Pierce Counties in Washington (${cityList.slice(0, 6).join(", ")}, and more). If you're close to the edge, call ${business.phone} and dispatch can confirm.`,
      quickReplies: [CALL, { label: "See service area", value: "service area" }],
      links: [{ label: "Service area", href: "/service-area" }],
    };
  }
  return {
    text: `We cover King, Snohomish, and Pierce Counties - including ${cityList.join(", ")}. What city are you in?`,
    pending: "check_area",
    links: [{ label: "Service area", href: "/service-area" }],
  };
}

function kbReply(_state: ChatContext, hit: NonNullable<ReturnType<typeof bestAnswer>>): Reply {
  const offer = hit.doc.offerHelp;
  return {
    text: offer ? `${hit.doc.answer}\n\nWant me to send your details so a tech can help?` : hit.doc.answer,
    quickReplies: offer ? [{ label: "Yes, send my details", value: "Book a service" }, CALL] : undefined,
    links: hit.doc.link ? [hit.doc.link] : undefined,
    setEntity: hit.doc.service ? { service: hit.doc.service } : undefined,
    pending: offer ? "start_wizard" : null,
  };
}

const PRICE_CUE = /\b(how much|price|prices|pricing|cost|costs|charge|charges|rate|rates|expensive|cheap|afford|affordable|quote me|ballpark)\b/;
const FEE_CUE = /\bcharge\b.{0,25}\b(come (out|look|by|over)|look at|to look|diagnos|estimates?|quotes?|visit|show up)\b|\b(diagnostic fee|trip (charge|fee)|service (call )?(fee|charge)|call ?out fee|charge (for|to) (an |a )?(estimates?|quotes?|come out|look)|charge to diagnose|estimates? (are )?free|free (estimates?|quotes?)|fee to come)\b/;
const SPEED_CUE = /\b(how (fast|soon|quickly)|how long (will it take|until|before|does it take for)|same day|same-day|come (out |over )?(today|tonight|tomorrow|right away|now|this (morning|afternoon|evening))|(someone|somebody|a plumber|a tech|you) (come|out|here|over) (today|tonight|tomorrow|now|asap)|when can (you|someone|a plumber|a tech)|available (right )?(today|tomorrow|now|tonight)|are you available)\b/;
const WARRANTY_CUE = /\b(guarantee|guaranteed|warranty|warranties|stand behind|comes? back|happens again|breaks again|(repair|fix|work) (fails|failed|does not work|did not work|does not last|breaks)|goes wrong after)\b/;
const COUNTY_RE = /\b(king|snohomish|pierce) county\b/;
const CAREERS_CUE = /\b(hiring|careers?|job openings?|apprentice(ship)?s?|work for (you|jim dandy)|(want|looking for|need|apply for|get) (a |an )?(job|career|employment))\b|^(job|jobs|employment)$/;
const HUMAN_CUE = /\b(manager|supervisor|owner|live (agent|person|chat)|real (person|human)|speak (to|with) (someone|somebody|a person)|call me back|customer service)\b/;
const COMMERCIAL_CUE = /\b(businesses|business|commercial|restaurants?|office|offices|apartment building|property manage(r|ment)|landlord|multi-?family|hoa|retail|warehouse)\b/;
const BOOK_CUE = /\b((need|want|get|send|book|schedule|request) (a |an |me a |someone|somebody|out )?\s*(plumber|tech|technician|appointment|service call|visit|someone out|somebody out)|send (someone|somebody) (out|over)|can (someone|somebody|you) come (out|over)|set up (a |an )?(visit|appointment)|have (someone|somebody|a tech|a plumber) (come|look|check)|book me in|book (me|us) (in|an appointment)|send (someone|somebody|a tech|a plumber|a technician)$|(fine|ok|okay|alright|sure|yes),? (send|book|schedule) (someone|somebody|it|a tech|me in))\b/;

/** Everything that isn't the lead form: intents, knowledge, small talk. */
function answerFreely(state: ChatContext, raw: string, text: string, opts: { inWizard?: boolean } = {}): Reply | null {
  // Only a city named in *this* message counts for area questions - not one
  // remembered from earlier ("any coupons?" is not "do you serve Seattle?").
  const entities = extractEntities(raw, { ...state, activeCity: null });
  // Intent and knowledge run on the cleaned text ("thx" -> "thanks", "wont" -> "will not").
  const match = matchIntent(text, state);
  const kb = bestAnswer(text);
  const question = looksLikeQuestion(raw, text);
  const explicitService = extractEntities(text, { ...state, activeService: null }).serviceSlug;

  if (CAREERS_CUE.test(text)) return resolve(text, state, { ...match, intent: "CAREERS" }) as Reply;
  const county = text.match(COUNTY_RE);
  if (county) {
    const name = `${county[1].charAt(0).toUpperCase()}${county[1].slice(1)} County`;
    const row = serviceCountiesByName.get(name.toLowerCase());
    return { text: `Yes! We cover ${name}${row ? ` - including ${row}` : ""}. What city are you in? I can get a tech scheduled.`, pending: "check_area", links: [{ label: "Service area", href: "/service-area" }] };
  }
  if (WARRANTY_CUE.test(text) && !/\bwater heater warranty|manufacturer\b/.test(text)) {
    const w = bestAnswer("is your work guaranteed what if the problem comes back");
    if (w) return kbReply(state, w);
  }
  if (/\b(water|puddle|wet|damp|drip(ping)?|leak(ing|s)?)\b.{0,20}\b(under|below|beneath|inside) (the |my |our )?(kitchen |bathroom )?(sink|vanity|sink cabinet)\b/.test(text) && !/\b(clog|backed up|backing up|slow|drain(ing)? slow)\b/.test(text)) {
    const d = bestAnswer("water under the sink leak supply line");
    if (d) return kbReply(state, d);
  }
  if (/\bwater heater (is )?(leak|leaking|dripping)|leak(ing)? (from|at|under) (the )?(water heater|hot water tank)/.test(text)) {
    const d = bestAnswer("water heater is leaking what should i do");
    if (d) return kbReply(state, d);
  }
  if (/\b(are you (guys )?open|open (now|today|late|tonight|tomorrow|on (the )?weekends?|on (sundays?|saturdays?|holidays?))|what time do you (open|close)|when do you (open|close)|business hours|office hours|closing time|your hours|(work|open|available) (on )?(christmas|thanksgiving|new years?|holidays?|weekends?|sundays?|saturdays?|nights?))\b/.test(text)) {
    return resolve(text, state, { ...match, intent: "HOURS" }) as Reply;
  }
  if (HUMAN_CUE.test(text) || /^(operator|agent|representative|human|person|a human|a person|real person)$/.test(text)) return resolve(text, state, { ...match, intent: "COMPLAINT_HUMAN" }) as Reply;
  if (FEE_CUE.test(text)) {
    const fee = bestAnswer("do you charge a diagnostic fee");
    if (fee) return kbReply(state, fee);
  }
  if (SPEED_CUE.test(text)) {
    const speed = bestAnswer("how fast can you come same day service");
    if (speed) return kbReply(state, speed);
  }
  if (PRICE_CUE.test(text) && !/\b(financ|coupon|discount)/.test(text)) {
    const slug = explicitService ?? state.activeService ?? entities.symptomSlug;
    const svc = slug && slug !== "emergency" ? serviceBySlug.get(slug) : undefined;
    return {
      text: `${svc ? `For ${svc.label.toLowerCase()}, we` : "We"} don't quote blind over chat - every home is different. A licensed tech diagnoses the problem on-site and gives you a flat, upfront price before any work starts. No hourly meter, no surprises. The diagnostic fee is waived if you go ahead with the repair, and coupons like $50 off repairs over $500 can help too.\n\nWant me to set that up?`,
      quickReplies: [{ label: "Yes, set it up", value: "Book a service" }, { label: "See coupons", value: "Any coupons?" }, { label: "Financing", value: "do you offer financing" }],
      setEntity: svc ? { service: slug as ServiceSlug } : undefined,
      pending: "start_wizard",
    };
  }
  if (/\bwhere (do|does) you (guys )?(work|go|serve|service|operate|cover)\b/.test(text)) return areaReply(state, undefined, false);
  if (COMMERCIAL_CUE.test(text) && !entities.city) {
    return {
      text: "Yes - we work with offices, restaurants, retail, and multi-family properties: scheduled maintenance plans, grease trap and backflow service, and priority 24/7 emergency response with itemized invoicing. Want me to have our commercial team reach out?",
      quickReplies: [{ label: "Yes, contact me", value: "Book a service" }, CALL],
      setEntity: { service: "commercial", audience: "commercial" },
      links: [{ label: "Commercial plumbing", href: "/services/commercial" }],
      pending: "start_wizard",
    };
  }

  // Area questions: "do you service kent?", "do you come to portland", "98012?"
  const areaCue = /\b(service|serve|cover|come (out )?to|work in|go to|available in|near|in my area|travel to|do you do|are you in|out to|servicing|(i am|we are|i live|we live|located|based|live) in|(you|you guys|you all) (in|near|around|out in))\b/.test(text);
  const zip = extractZip(raw);
  if ((entities.city || entities.cityMentionedButUnlisted) && (areaCue || text.split(" ").length <= 3)) {
    return areaReply(state, entities.city, Boolean(entities.cityMentionedButUnlisted));
  }
  if (zip && text.replace(/\D/g, "").length <= 5) return areaReply(state, undefined, false, zip);
  if (/^\d{5}$/.test(text.trim())) {
    return { text: `${text.trim()} doesn't look like a Washington ZIP code - we serve King, Snohomish, and Pierce Counties. Which city are you in?`, pending: "check_area" };
  }
  if (match.intent === "SERVICE_AREA_CITY_CHECK") return areaReply(state, entities.city, Boolean(entities.cityMentionedButUnlisted));

  const knowledgeFirst = new Set(["UNKNOWN", "SPECIFIC_SERVICE", "SERVICE_RECOMMENDATION", "SERVICES", "FAQ", "ABOUT_EXPERIENCE", "WARRANTY_GUARANTEE", "RESIDENTIAL_COMMERCIAL", "HOURS", "GET_ESTIMATE", "REVIEWS_TESTIMONIALS", "CONTACT"]);
  const strongKb = kb && kb.coverage >= 0.6 && kb.score >= 12;
  // A question the knowledge base answers specifically beats a generic intent reply
  // ("do you charge for estimates?" is a fee question, not a request to start one).
  if (kb && question && knowledgeFirst.has(match.intent) && (strongKb || match.intent === "UNKNOWN" || match.confidence < 0.5)) {
    if (!(match.intent === "COUPONS_OFFERS" && !kb.doc.id.startsWith("coupon")) && !(match.intent === "FINANCING" && !kb.doc.id.startsWith("financing"))) {
      return kbReply(state, kb);
    }
  }

  // "do you fix/install X", or a specific statement the knowledge base covers well,
  // gets the specific answer rather than a generic service blurb.
  const capability = /^(do|can|will) (you|u|y'?all|you guys) (do|fix|unclog|install|repair|replace|handle|offer|service|work on|clean|inspect|test|deal with)\b/.test(text);
  const kbEligible = kb && (knowledgeFirst.has(match.intent) || match.intent === "UNKNOWN") && !kb.doc.id.startsWith("coupon-") && kb.doc.id !== "licenses";
  if (kbEligible && (capability || question) && kb.coverage >= 0.5 && kb.score >= 10) return kbReply(state, kb);
  if (kbEligible && !question && kb.doc.offerHelp && kb.coverage >= 0.6 && kb.score >= 14 && subjectCovered(kb.doc, text) && !/^(svc-[a-z-]+-(what|signs))$/.test(kb.doc.id)) return kbReply(state, kb);

  if (match.intent === "SERVICE_RECOMMENDATION" || (match.intent === "SPECIFIC_SERVICE" && !question)) {
    // A service the visitor named outright beats a symptom guess, and a plain
    // symptom is never labelled "Emergency" unless it actually reads like one.
    let slug = (explicitService ?? (entities.symptomCandidates ? match.matchedServiceSlug : entities.symptomSlug) ?? match.matchedServiceSlug ?? entities.serviceSlug) as ServiceSlug | undefined;
    if (slug === "emergency" && !EMERGENCY_RE.test(text)) slug = (kb?.doc.service && kb.doc.service !== "emergency" ? kb.doc.service : undefined) as ServiceSlug | undefined;
    if (!slug && kb) return kbReply(state, kb);
    if (slug) {
      const svc = serviceBySlug.get(slug)!;
      const empathy = vary(EMPATHY[slug] ?? ["We can help with that."], state.turn);
      return {
        text: `${empathy} That's something our ${svc.label} team handles all the time - ${svc.description.charAt(0).toLowerCase()}${svc.description.slice(1)}\n\nWant me to send your details so a tech can take a look?`,
        quickReplies: [{ label: "Yes, send my details", value: "Book a service" }, { label: "How much will it cost?", value: "How much does it cost?" }, CALL],
        setEntity: { service: slug },
        links: [{ label: `${svc.label} details`, href: `/services/${slug}` }],
        pending: "start_wizard",
      };
    }
  }

  if (match.intent === "FINANCING" || /\bfinanc/.test(text)) {
    if (kb && kb.doc.id.startsWith("financing") && kb.coverage >= 0.5) return kbReply(state, kb);
    const fin = bestAnswer("what can i finance financing options");
    if (fin) return kbReply(state, fin);
  }
  if (/\b(combine|stack|two coupons|more than one coupon|multiple coupons)\b/.test(text)) {
    const c = bestAnswer("can i combine coupons");
    if (c) return kbReply(state, c);
  }

  if (match.intent === "COUPONS_OFFERS") {
    const specific = kb && kb.doc.id.startsWith("coupon") && kb.coverage >= 0.5 && /senior|military|veteran|new customer|second opinion|camera|diagnostic|first time|\$50|500/.test(text);
    if (specific) return kbReply(state, kb!);
    return {
      text: `Here are our current offers:\n${coupons.map((c) => `• ${c.title}`).join("\n")}\n\nMention the coupon when you book or when your tech arrives. Want me to set up a visit?`,
      quickReplies: [{ label: "Yes, book a visit", value: "Book a service" }, { label: "Coupon terms", value: "coupons page" }],
      links: [{ label: "All coupons", href: "/coupons" }],
      pending: "start_wizard",
    };
  }

  if (match.intent === "PRICING_COST") {
    const slug = entities.serviceSlug ?? state.activeService;
    const svc = slug ? serviceBySlug.get(slug) : undefined;
    return {
      text: `${svc ? `For ${svc.label.toLowerCase()}, ` : ""}we don't quote blind - every home is different. A licensed tech diagnoses the problem on-site and gives you a flat, upfront price before any work starts. No hourly meter, no surprises. The diagnostic fee is waived if you go ahead with the repair, and coupons like $50 off repairs over $500 can help too.\n\nWant me to set that up?`,
      quickReplies: [{ label: "Yes, set it up", value: "Book a service" }, { label: "See coupons", value: "Any coupons?" }, { label: "Financing", value: "do you offer financing" }],
      setEntity: slug ? { service: slug } : undefined,
      pending: "start_wizard",
    };
  }

  if (match.intent !== "UNKNOWN") {
    // Guard against symptom/emergency misfires from the scorer on non-urgent text.
    if (match.intent === "EMERGENCY" && !EMERGENCY_RE.test(text)) {
      if (kb) return kbReply(state, kb);
    } else {
      return resolve(text, state, match) as Reply;
    }
  }

  if (kb) return kbReply(state, kb);
  if (opts.inWizard) return null;
  return null;
}

function unknownReply(state: ChatContext): Reply {
  const tier = state.consecutiveUnknown;
  if (tier === 0) {
    return {
      text: vary(
        [
          "Hmm, I didn't quite catch that. Could you tell me a bit more - like what's leaking, clogged, or not working?",
          "I want to make sure I help with the right thing. Is this about a repair, pricing, our service area, or booking a visit?",
        ],
        state.turn,
      ),
      quickReplies: MAIN_MENU,
    };
  }
  if (tier === 1) {
    return {
      text: "Let's try it this way - which of these is closest?",
      quickReplies: [
        { label: "Something's leaking", value: "something is leaking" },
        { label: "Clogged drain", value: "my drain is clogged" },
        { label: "No hot water", value: "no hot water" },
        { label: "Sewer problem", value: "sewer problem" },
        { label: "Talk to a person", value: "talk to a person" },
      ],
    };
  }
  return {
    text: `I'm not sure I can answer that one, and I don't want to guess. The team can - call ${business.phone}, or I'll pass your question along and someone will get back to you.`,
    quickReplies: [CALL, { label: "Pass it along", value: "Book a service" }],
    pending: "start_wizard",
  };
}

function greetingReply(state: ChatContext): Reply {
  const name = firstName(state);
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const page = state.pageContext;
  const svc = page.serviceSlug ? serviceBySlug.get(page.serviceSlug) : undefined;
  const opener = vary([`Hi${name ? ` ${name}` : " there"}! 👋`, `Hey${name ? ` ${name}` : ""}! 👋`, `${timeGreeting}${name ? `, ${name}` : ""}! 👋`], state.turn);
  const body = svc
    ? `Have a question about ${svc.label.toLowerCase()}? I can help, or get a tech out to you.`
    : state.turn > 2
      ? "What else can I help you with?"
      : "I'm the Jim Dandy Assistant. What's going on with your plumbing today?";
  return { text: `${opener} ${body}`, quickReplies: MAIN_MENU };
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

export function openingState(state: ChatContext): ChatContext {
  const svc = state.pageContext.serviceSlug ? serviceBySlug.get(state.pageContext.serviceSlug) : undefined;
  const p = state.pageContext;
  const text = svc
    ? `Hi there! 👋 Have a question about ${svc.label.toLowerCase()}? Ask me anything, or I can get a tech out to you.`
    : p.isServiceArea
      ? "Hi! 👋 Wondering if we serve your area? Tell me your city."
      : p.isCoupons
        ? "Hi! 👋 Want help picking the right coupon, or booking a visit?"
        : p.isFinancing
          ? "Hi! 👋 Questions about financing a repair or install? Ask away."
          : p.isCommercial
            ? "Hi! 👋 Looking for commercial plumbing support? I can help."
            : "Hi there! 👋 I'm the Jim Dandy Assistant. Tell me what's going on - or pick an option below.";
  return withBot(state, { text, quickReplies: MAIN_MENU });
}

export function converse(state: ChatContext, input: string, display?: string): BrainResult {
  const raw = input.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!raw) return { state };
  let s: ChatContext = { ...state, turn: state.turn + 1 };
  s = chatReducer(s, { type: "ADD_MESSAGE", message: message("user", display ?? raw) });
  // Probes and arithmetic are recognised before punctuation is stripped.
  if (/(<\s*\/?\s*script|javascript:|drop\s+table|select\s+\*\s+from|union\s+select|'\s*or\s+1\s*=\s*1|;\s*--|\{\{.*\}\}|\$\{)/i.test(raw)) {
    const r = withBot(chatReducer({ ...state, turn: state.turn + 1 }, { type: "ADD_MESSAGE", message: message("user", display ?? raw) }), {
      text: "I'm a plumbing assistant, so I stick to plumbing! 🔧 I can share our current coupons, explain pricing, or get a tech scheduled. What would help?",
      quickReplies: MAIN_MENU,
    });
    return { state: { ...r, pending: null } };
  }
  if (/^\s*(what'?s|what is)?\s*\d+\s*[-+*x\/]\s*\d+\s*\??\s*$/i.test(raw)) {
    const r = withBot(chatReducer({ ...state, turn: state.turn + 1 }, { type: "ADD_MESSAGE", message: message("user", display ?? raw) }), {
      text: "Math isn't really my department - I'm better with pipes than numbers! 😄 Anything plumbing-related I can help with?",
      quickReplies: MAIN_MENU,
    });
    return { state: { ...r, pending: null } };
  }
  const thumbs = /^[\s👍👌✅🙏🤙💯]+$/u.test(raw.replace(/[\u{1F3FB}-\u{1F3FF}\uFE0F]/gu, ""));
  let text = thumbs ? "yes" : preprocess(raw);
  if (!text) text = "?";

  const finish = (reply: Reply, opts: { known?: boolean; action?: BrainAction } = {}): BrainResult => {
    let next = withBot(s, reply);
    next = { ...next, pending: reply.pending !== undefined ? reply.pending : null };
    next = opts.known === false ? chatReducer(next, { type: "INCREMENT_UNKNOWN" }) : chatReducer(next, { type: "RESET_UNKNOWN" });
    return { state: next, action: opts.action };
  };

  // 1. Button commands.
  if (text === "call") return finish({ text: `Calling ${business.phone}... If your device can't place calls, dial ${business.phone} - a live dispatcher answers 24/7.` }, { action: { type: "call" } });
  if (text === "restart wizard") {
    const reset = chatReducer(s, { type: "WIZARD_RESET" });
    return startWizard({ ...reset, lastProblem: null }, "No problem, let's start fresh. ");
  }

  // 2. Safety first - always, even mid-form.
  if (GAS_RE.test(text) || (ROTTEN_EGG_AIR_RE.test(text) && !WATER_CONTEXT_RE.test(text))) {
    s = { ...s, lastProblem: s.lastProblem ?? raw };
    return finish(gasReply());
  }

  // 3. The lead form.
  if (s.wizard.active && s.wizard.step && !["submitting", "success"].includes(s.wizard.step)) {
    const handled = handleWizard(s, raw, text);
    if (handled) return handled;
  }

  // 4. Emergencies outside the form. ("send an urgent request" is a booking, not a new emergency.)
  const urgentBooking = /\b(send|submit|book|schedule|request|make|file|put in)\b.{0,20}\b(urgent|emergency)\b|\b(urgent|emergency) (request|appointment|service call|booking|visit)\b/.test(text);
  if (urgentBooking) {
    s = chatReducer(s, { type: "EMERGENCY_DETECTED" });
    return startWizard(s, "On it - I'll flag this as urgent. ");
  }
  if (EMERGENCY_RE.test(text) && !/\b(what (is|counts as)|is it an|how do i know)\b/.test(text)) {
    s = { ...s, lastProblem: text.length > 12 && !/^(i have an )?emergency$/.test(text) ? problemSentence(raw) : s.lastProblem };
    const absorbed = absorbDetails(s, raw);
    s = absorbed.state;
    return finish({ ...emergencyReply(s), pending: "start_wizard" });
  }

  // 5. Context: "yes" / "no" to whatever was just offered.
  const pending = s.pending;
  if (isYes(text) || /^(yes|yeah|sure|ok|okay|please|yep)\b.{0,25}$/.test(text) && pending) {
    if (pending === "start_wizard" || pending === "resume_wizard") return startWizard(s);
    if (pending === "show_coupons") return finish(answerFreely(s, "any coupons", "any coupons")!);
    if (pending === "check_area") return finish({ text: "Great - which city are you in?", pending: "check_area" });
    if (isYes(text)) return finish({ text: "Great! What can I help you with?", quickReplies: MAIN_MENU });
  }
  if (isNo(text)) {
    return finish({
      text: pending ? vary(["No problem at all. Anything else I can help with?", "Sounds good - I'm here if you need anything else.", "No worries! Is there something else on your mind?"], s.turn) : "Okay! Is there anything else I can help you with?",
      quickReplies: MAIN_MENU,
    });
  }

  // 6. Details volunteered in conversation.
  const absorbed = absorbDetails(s, raw);
  if (absorbed.found.length) {
    s = absorbed.state;
    const leftover = raw.replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "").replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "").replace(/\b(my (name|number|phone|email)( is)?|name is|i am|i'?m|call me|reach me at|you can reach me at|this is|and|at|,)\b/gi, " ").replace(/[^a-z]/gi, " ").trim();
    const mostlyDetails = leftover.split(/\s+/).filter(Boolean).length <= 3;
    if (mostlyDetails) {
      const name = firstName(s);
      const got = absorbed.found.map((f) => (f === "name" ? "your name" : f === "phone" ? "your number" : "your email")).join(" and ");
      return finish({
        text: `${name ? `Nice to meet you, ${name}! ` : "Thanks! "}I've noted ${got}. Want me to send a service request to our dispatch team so someone reaches out?`,
        quickReplies: [{ label: "Yes, send it", value: "Book a service" }, { label: "Not yet", value: "no" }],
        pending: "start_wizard",
      });
    }
  }

  // 7. Messages we can't really parse.
  if (looksNonEnglish(raw)) {
    return finish({
      text: `Sorry - I can only chat in English right now. For help in another language, please call ${business.phone} and our dispatch team will do their best to assist.\n(Lo siento, solo puedo chatear en inglés. Llame al ${business.phone}.)`,
      quickReplies: [CALL],
    });
  }
  if (isAbusive(text)) {
    return finish({
      text: `I'm sorry this has been frustrating. I really do want to help - tell me what's going on, or call ${business.phone} to talk to a person right away.`,
      quickReplies: [CALL, { label: "Start over", value: "What can you do?" }],
    });
  }
  if (looksLikeInjection(text)) {
    return finish({
      text: "I'm a plumbing assistant, so I stick to plumbing! 🔧 I can share our current coupons, explain pricing, or get a tech scheduled. What would help?",
      quickReplies: MAIN_MENU,
    });
  }
  if (looksLikeGibberish(text)) {
    return finish({ text: "Looks like that one got a little scrambled! 🙂 What can I help you with?", quickReplies: MAIN_MENU }, { known: false });
  }

  // 8. Greetings (alone, or in front of a real message).
  if (greetingOnly(text)) return finish(greetingReply(s));
  const { greeted, rest } = stripGreetingPrefix(text);
  const workingRaw = greeted ? raw.replace(/^\W*(hi|hello|hey|heya|hiya|howdy|yo|sup|hola|greetings|good (morning|afternoon|evening|day))\b[\s,!.-]*(there\b)?[\s,!.-]*/i, "") : raw;
  const workingText = greeted ? rest : text;
  const greetPrefix = greeted ? `${vary(["Hi there!", "Hey!", "Hello!"], s.turn)} ` : "";

  // Re-check emergency on the stripped text ("hey my pipe burst").
  if (greeted && EMERGENCY_RE.test(workingText)) {
    s = { ...s, lastProblem: workingRaw };
    return finish({ ...emergencyReply(s), pending: "start_wizard" });
  }

  if (greeted && (!workingText || greetingOnly(workingText))) return finish(greetingReply(s));

  const aboutTopic = workingText.match(/^(i have|i got|got|i have got) (a |an )?(quick |small |few )?questions? (about|regarding|on|for) (my |our |the |your )?(.{3,40})$/);
  if (aboutTopic) {
    const topicSlug = extractEntities(aboutTopic[6], { ...s, activeService: null }).serviceSlug;
    if (topicSlug) s = chatReducer(s, { type: "SET_ENTITY", service: topicSlug });
    return finish({ text: `Sure - what would you like to know about ${aboutTopic[5] && /my|our/.test(aboutTopic[5]) ? "your " : ""}${aboutTopic[6]}?` });
  }

  // 9. Small talk.
  for (const p of [...ACKS, ...SMALL_TALK]) {
    if (p.re.test(workingText)) {
      const r = p.reply(s);
      return finish({ ...r, text: `${greetPrefix}${r.text}` });
    }
  }

  // Quick-reply shortcuts that aren't natural sentences.
  if (/^(coupons page|see all coupons|coupon terms)$/.test(workingText)) {
    return finish({ text: `Here are the full terms for each offer:\n${coupons.map((c) => `• ${c.title} - ${c.terms}`).join("\n")}`, links: [{ label: "Coupons page", href: "/coupons" }] });
  }
  if (/^(reviews page|read reviews)$/.test(workingText)) {
    return finish({ text: `We're rated ${business.rating.value}/5 across ${business.rating.count} Google reviews.`, links: [{ label: "Read reviews", href: "/reviews" }] });
  }
  if (/^(service area|see service area|see full service area)$/.test(workingText)) return finish(areaReply(s, undefined, false));
  if (/^(faq|common questions)$/.test(workingText)) {
    const slug = s.activeService;
    const pool = allFaqs.filter((f) => (slug ? f.source.endsWith(slug) : f.source === "general")).slice(0, 4);
    return finish({
      text: `Here are some common questions${slug ? ` about ${serviceBySlug.get(slug)?.label.toLowerCase()}` : ""} - tap one, or ask your own:`,
      quickReplies: pool.map((f) => ({ label: f.question.length > 38 ? `${f.question.slice(0, 36)}…` : f.question, value: f.question })),
    });
  }
  if (SPEED_CUE.test(workingText) && !/^(book|schedule)/.test(workingText)) {
    const speed = bestAnswer("how fast can you come same day service");
    if (speed) return finish({ ...kbReply(s, speed), text: `${greetPrefix}${speed.doc.answer}`, quickReplies: [{ label: "Yes, send a tech", value: "Book a service" }, CALL] });
  }
  if (/^(continue form|send my details|book a service|book this service|get an estimate|i want to book|schedule|book|yes send my details|yes send it|yes set it up|yes book it|yes book a visit|yes contact me|pass it along|send an urgent request|i am safe send a request|leave my info)$/.test(workingText) || BOOK_CUE.test(workingText) || /^(i would like|i want|i need|can i get|get) (to get )?(an? )?(estimate|quote) (for|on) /.test(workingText)) {
    const named = extractEntities(workingRaw || raw, s).city;
    if (named) s = chatReducer(s, { type: "SET_ENTITY", city: named });
    // Carry details from the request itself into the form.
    const answers = { ...s.wizard.answers } as Record<string, string>;
    if (/\btomorrow|this week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend\b/.test(workingText)) answers.urgency = "this-week";
    if (/\btoday|tonight|this (morning|afternoon|evening)\b/.test(workingText)) answers.urgency = "today";
    const when = workingText.match(/\b(tomorrow( morning| afternoon| evening)?|today|tonight|this (morning|afternoon|evening|week|weekend)|next week|(on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/);
    if (when) answers.timing = when[0];
    const job = (workingRaw || raw).match(/\b(?:for|about|with|on|to fix|to look at|look at|check)\s+((?:my |our |the |a |an )?[a-z][a-z\s'-]{2,60}?)\s*(?:tomorrow|today|tonight|this week|please|asap|[.!?]|$)/i);
    if (job && !/^(tomorrow|today|tonight|an? (appointment|visit)|someone|a plumber)$/i.test(job[1].trim()) && !answers.problem && !s.lastProblem) s = { ...s, lastProblem: job[1].trim() };
    s = { ...s, wizard: { ...s.wizard, answers: answers as ChatContext["wizard"]["answers"] } };
    if (when && !named && !greetPrefix) {
      return startWizard(s, `Sure - let's get you on the schedule for ${when[0].replace(/^on /, "")}. `);
    }
    const intro = named ? `${greetPrefix}Good news - we serve ${named}. Let's get a plumber headed your way. ` : greetPrefix || undefined;
    return startWizard(s, intro);
  }

  // 10. Intents + knowledge.
  const freeReply = answerFreely(s, workingRaw || raw, workingText || text);
  if (freeReply) {
    if (freeReply.startWizard) return startWizard({ ...s, activeService: freeReply.setEntity?.service ?? s.activeService }, `${greetPrefix}${freeReply.text} `);
    // Remember what they described, so the lead form doesn't ask again -
    // statements about a problem only, never questions about price or coupons.
    const probe = extractEntities(workingRaw || raw, { ...s, activeService: null, activeCity: null });
    const describes =
      !looksLikeQuestion(workingRaw || raw, workingText) &&
      !PRICE_CUE.test(workingText) &&
      !/\b(coupon|discount|financ|hours|open|licens|review|hiring|job)\b/.test(workingText) &&
      Boolean(probe.symptomSlug || probe.serviceSlug || probe.symptomCandidates || EMERGENCY_RE.test(workingText) || /\b(leak|clog|drip|broke|broken|backed up|backing up|overflow|smell|flush|drain|burst|noise|not working|stopped working)\b/.test(workingText));
    if (describes && (freeReply.pending === "start_wizard" || freeReply.setEntity?.service) && workingText.split(" ").length >= 2) {
      s = { ...s, lastProblem: problemSentence(workingRaw) };
    }
    // Details in the same message ("...in our Redmond house") pre-fill the form too.
    const ents = extractEntities(workingRaw || raw, s);
    if (ents.city && !s.activeCity) s = chatReducer(s, { type: "SET_ENTITY", city: ents.city });
    if (/\b(house|home|condo|apartment|townhouse|place)\b/.test(workingText) && !COMMERCIAL_CUE.test(workingText) && !s.audience) s = chatReducer(s, { type: "SET_ENTITY", audience: "residential" });
    return finish({ ...freeReply, text: `${greetPrefix}${freeReply.text}` });
  }

  // 11. Honest fallback.
  if (greeted && !workingText) return finish(greetingReply(s));
  return finish(unknownReply(s), { known: false });
}

/** Called by the UI once the lead POST settles. */
export function afterLeadSubmit(state: ChatContext, ok: boolean, serverMessage?: string): ChatContext {
  if (ok) {
    const name = firstName(state);
    const email = (state.wizard.answers as Partial<ChatbotLeadValues>).email;
    let next = chatReducer(state, { type: "WIZARD_RESET" });
    next = { ...next, pending: null, lastProblem: null, emergencyFlag: false, leadsSent: state.leadsSent + 1 };
    return withBot(next, {
      text: `You're all set${name ? `, ${name}` : ""}! ✅ Your request is with our dispatch team and someone will reach out shortly.${email ? ` We've also emailed a copy to ${email}.` : ""}\n\nIf it becomes urgent, call ${business.phone} anytime.`,
      quickReplies: [{ label: "I have another question", value: "What can you do?" }, CALL],
    });
  }
  const next = chatReducer(state, { type: "WIZARD_STEP", step: "error" });
  return withBot(next, {
    text: serverMessage ?? `Something went wrong sending your request. You can retry, or call us directly at ${business.phone}.`,
    quickReplies: [{ label: "Retry", value: "retry submit" }, CALL],
  });
}

export type { PendingOffer };
