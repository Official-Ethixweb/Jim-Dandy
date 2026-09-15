import type { ServiceSlug } from "@data/chatbot/knowledge";
import type { IntentName } from "@data/chatbot/intents";
import type { ChatbotLeadValues } from "@lib/schemas/chatLead";
import type { KbLink } from "@data/chatbot/kb";

export type WizardStep =
  | "problem"
  | "urgency"
  | "audience"
  | "city"
  | "timing"
  | "name"
  | "phone"
  | "email"
  | "consent"
  | "notes"
  | "confirm"
  | "submitting"
  | "success"
  | "error";

export type ChatMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
  quickReplies?: { label: string; value: string }[];
  /** Page links shown under a bot message (e.g. "Coupons", "Water Heaters details"). */
  links?: KbLink[];
  timestamp: number;
};

/** Something the assistant just offered, so a bare "yes" / "sure" / "no" means something. */
export type PendingOffer = "start_wizard" | "show_coupons" | "check_area" | "resume_wizard" | null;

/** Details the visitor has shared anywhere in the conversation - pre-fills the lead form. */
export type VisitorProfile = {
  fullName?: string;
  phone?: string;
  email?: string;
  city?: string;
};

export type PageContext = {
  path: string;
  serviceSlug?: ServiceSlug;
  isServiceArea?: boolean;
  isCoupons?: boolean;
  isCommercial?: boolean;
  isFinancing?: boolean;
};

export type ChatContext = {
  sessionId: string;
  pageContext: PageContext;
  lastIntent: IntentName | null;
  activeService: ServiceSlug | null;
  activeCity: string | null;
  audience: "residential" | "commercial" | null;
  emergencyFlag: boolean;
  recentTopics: IntentName[];
  consecutiveUnknown: number;
  wizard: {
    active: boolean;
    paused: boolean;
    step: WizardStep | null;
    answers: Partial<ChatbotLeadValues>;
    invalidAttempts: number;
    /** Set while the visitor is correcting one field from the confirm summary. */
    editing?: boolean;
  };
  messages: ChatMessage[];
  pending: PendingOffer;
  profile: VisitorProfile;
  /** The visitor's own description of their problem, reused as the lead's "problem". */
  lastProblem: string | null;
  turn: number;
  leadsSent: number;
};

export function initialContext(pageContext: PageContext): ChatContext {
  return {
    sessionId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    pageContext,
    lastIntent: null,
    activeService: pageContext.serviceSlug ?? null,
    activeCity: null,
    audience: pageContext.isCommercial ? "commercial" : null,
    emergencyFlag: false,
    recentTopics: [],
    consecutiveUnknown: 0,
    wizard: { active: false, paused: false, step: null, answers: {}, invalidAttempts: 0 },
    messages: [],
    pending: null,
    profile: {},
    lastProblem: null,
    turn: 0,
    leadsSent: 0,
  };
}

export type ChatAction =
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "SET_INTENT"; intent: IntentName }
  | { type: "SET_ENTITY"; service?: ServiceSlug | null; city?: string | null; audience?: "residential" | "commercial" | null }
  | { type: "EMERGENCY_DETECTED" }
  | { type: "EMERGENCY_RESOLVED" }
  | { type: "INCREMENT_UNKNOWN" }
  | { type: "RESET_UNKNOWN" }
  | { type: "WIZARD_START"; step: WizardStep }
  | { type: "WIZARD_ANSWER"; field: keyof ChatbotLeadValues; value: string }
  | { type: "WIZARD_STEP"; step: WizardStep }
  | { type: "WIZARD_PAUSE" }
  | { type: "WIZARD_RESUME" }
  | { type: "WIZARD_INVALID" }
  | { type: "WIZARD_RESET_INVALID" }
  | { type: "WIZARD_RESET" }
  | { type: "RESTART_CONVERSATION"; pageContext: PageContext }
  | { type: "HYDRATE"; context: ChatContext };

const MAX_RECENT_TOPICS = 5;

export function chatReducer(state: ChatContext, action: ChatAction): ChatContext {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };

    case "SET_INTENT": {
      const recentTopics = [action.intent, ...state.recentTopics.filter((t) => t !== action.intent)].slice(
        0,
        MAX_RECENT_TOPICS,
      );
      return { ...state, lastIntent: action.intent, recentTopics };
    }

    case "SET_ENTITY":
      return {
        ...state,
        activeService: action.service !== undefined ? action.service : state.activeService,
        activeCity: action.city !== undefined ? action.city : state.activeCity,
        audience: action.audience !== undefined ? action.audience : state.audience,
      };

    case "EMERGENCY_DETECTED":
      return { ...state, emergencyFlag: true };

    case "EMERGENCY_RESOLVED":
      return { ...state, emergencyFlag: false, wizard: { ...state.wizard, paused: false } };

    case "INCREMENT_UNKNOWN":
      return { ...state, consecutiveUnknown: state.consecutiveUnknown + 1 };

    case "RESET_UNKNOWN":
      return { ...state, consecutiveUnknown: 0 };

    case "WIZARD_START":
      return {
        ...state,
        wizard: { ...state.wizard, active: true, paused: false, step: action.step, invalidAttempts: 0 },
      };

    case "WIZARD_ANSWER":
      return {
        ...state,
        wizard: {
          ...state.wizard,
          answers: { ...state.wizard.answers, [action.field]: action.value },
          invalidAttempts: 0,
        },
      };

    case "WIZARD_STEP":
      return { ...state, wizard: { ...state.wizard, step: action.step, invalidAttempts: 0 } };

    case "WIZARD_PAUSE":
      return { ...state, wizard: { ...state.wizard, paused: true } };

    case "WIZARD_RESUME":
      return { ...state, wizard: { ...state.wizard, paused: false } };

    case "WIZARD_INVALID":
      return { ...state, wizard: { ...state.wizard, invalidAttempts: state.wizard.invalidAttempts + 1 } };

    case "WIZARD_RESET_INVALID":
      return { ...state, wizard: { ...state.wizard, invalidAttempts: 0 } };

    case "WIZARD_RESET":
      return { ...state, wizard: { active: false, paused: false, step: null, answers: {}, invalidAttempts: 0 } };

    case "RESTART_CONVERSATION":
      return initialContext(action.pageContext);

    case "HYDRATE":
      return action.context;

    default:
      return state;
  }
}

// v2: the context shape gained profile/pending/lastProblem; v1 sessions are ignored.
const STORAGE_KEY = "jimdandy:chat:v2";

export function saveContext(ctx: ChatContext): void {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // Private browsing / storage disabled - fail silently, chat still works in-memory.
  }
}

export function loadContext(): ChatContext | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatContext;
    return parsed && Array.isArray(parsed.messages) && parsed.profile ? parsed : null;
  } catch {
    return null;
  }
}

export function clearStoredContext(): void {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
