import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, Send, X, RotateCcw } from "lucide-react";
import { business, services } from "@data/chatbot/knowledge";
import { matchIntent } from "@lib/chatbot/intent-engine";
import { resolve, type ChatResponse, type QuickReply } from "@lib/chatbot/resolver";
import {
  chatReducer,
  initialContext,
  loadContext,
  saveContext,
  clearStoredContext,
  type ChatContext,
  type ChatMessage,
  type PageContext,
  type WizardStep,
} from "@lib/chatbot/context";
import { STEP_PROMPT, STEP_QUICK_REPLIES, STEP_FIELD, nextStep, validateStep } from "@data/chatbot/flows";
import { sanitizeInput, isThrottled } from "@lib/chatbot/security";
import { pushEvent, CHAT_EVENTS } from "@lib/chatbot/analytics";
import { serviceNeededFromSlug, type ChatbotLeadValues } from "@lib/schemas/chatLead";
// AVATAR RESTORE: uncomment this import when bringing the photo back.
// import chatbotAvatar from "@assets/photos/chatbot-avatar-face.webp";

type Props = { currentPath?: string };

function derivePageContext(currentPath: string): PageContext {
  const path = currentPath || "/";
  const serviceMatch = path.match(/^\/services\/([a-z0-9-]+)/);
  const serviceSlug = serviceMatch ? services.find((s) => s.slug === serviceMatch[1])?.slug : undefined;
  return {
    path,
    serviceSlug,
    isServiceArea: path.startsWith("/service-area"),
    isCoupons: path.startsWith("/coupons"),
    isCommercial: path.startsWith("/commercial"),
    isFinancing: path.startsWith("/financing"),
  };
}

function makeMessage(from: "bot" | "user", text: string, quickReplies?: QuickReply[]): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    text,
    quickReplies,
    timestamp: Date.now(),
  };
}

function greetingResponse(ctx: ChatContext): ChatResponse {
  return resolve("hello", ctx, {
    intent: "GREETING",
    confidence: 1,
    ambiguous: false,
    entities: {},
  });
}

export default function ChatWidget({ currentPath = "/" }: Props) {
  const pageContext = useMemo(() => derivePageContext(currentPath), [currentPath]);
  const [open, setOpen] = useState(false);
  const [context, dispatch] = useReducer(chatReducer, undefined, () => {
    const stored = loadContext();
    if (stored && stored.pageContext) {
      return { ...stored, pageContext };
    }
    const ctx = initialContext(pageContext);
    const greeting = greetingResponse(ctx);
    return {
      ...ctx,
      messages: [makeMessage("bot", greeting.text, greeting.quickReplies)],
    };
  });
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendTimestamps = useRef<number[]>([]);
  const prefersReducedMotion = useReducedMotion();
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveContext(context);
  }, [context]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [context.messages, typing, prefersReducedMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 260);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const lastBotMessage = [...context.messages].reverse().find((m) => m.from === "bot");
  useEffect(() => {
    if (liveRegionRef.current && lastBotMessage) {
      liveRegionRef.current.textContent = lastBotMessage.text;
    }
  }, [lastBotMessage]);

  const addBotMessage = (response: ChatResponse) => {
    dispatch({ type: "ADD_MESSAGE", message: makeMessage("bot", response.text, response.quickReplies) });
    if (response.setEntity) {
      dispatch({ type: "SET_ENTITY", ...response.setEntity });
    }
    if (response.emergency) {
      dispatch({ type: "EMERGENCY_DETECTED" });
      pushEvent(CHAT_EVENTS.EMERGENCY_DETECTED, { page: pageContext.path });
    }
    if (response.startWizard) {
      dispatch({ type: "WIZARD_START", step: response.startWizard });
      pushEvent(CHAT_EVENTS.WIZARD_STARTED, {});
    }
  };

  const handleWizardAnswer = (rawValue: string) => {
    const step = context.wizard.step as WizardStep;
    const result = validateStep(step, rawValue);
    if (!result.ok) {
      dispatch({ type: "WIZARD_INVALID" });
      const attempts = context.wizard.invalidAttempts + 1;
      const escapeHatch = attempts >= 2;
      addBotMessage({
        text: escapeHatch
          ? `${result.error} If it's easier, you can always call ${business.phone} instead.`
          : result.error,
        quickReplies: escapeHatch
          ? [{ label: `Call ${business.phone}`, value: "call" }, { label: "Try again", value: "retry" }]
          : STEP_QUICK_REPLIES[step],
      });
      return;
    }

    const field = STEP_FIELD[step];
    if (field) dispatch({ type: "WIZARD_ANSWER", field, value: result.value });
    pushEvent(CHAT_EVENTS.WIZARD_STEP, { step });

    const upcoming = nextStep(step);
    dispatch({ type: "WIZARD_STEP", step: upcoming });

    if (upcoming === "confirm") {
      const answers = { ...context.wizard.answers, [field ?? "notes"]: result.value } as Partial<ChatbotLeadValues>;
      const summary = [
        answers.problem ? `Issue: ${answers.problem}` : null,
        answers.urgency ? `Urgency: ${answers.urgency}` : null,
        answers.audience ? `Type: ${answers.audience}` : null,
        answers.city ? `City: ${answers.city}` : null,
        answers.timing ? `Timing: ${answers.timing}` : null,
        answers.fullName ? `Name: ${answers.fullName}` : null,
        answers.phone ? `Phone: ${answers.phone}` : null,
        answers.email ? `Email: ${answers.email}` : null,
        answers.notes ? `Notes: ${answers.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      addBotMessage({
        text: `Here's what I've got:\n${summary}\n\nSend this to the team?`,
        quickReplies: [{ label: "Send it", value: "confirm send" }, { label: "Start over", value: "restart wizard" }],
      });
      return;
    }

    addBotMessage({ text: STEP_PROMPT[upcoming], quickReplies: STEP_QUICK_REPLIES[upcoming] });
  };

  const submitWizard = async () => {
    dispatch({ type: "WIZARD_STEP", step: "submitting" });
    addBotMessage({ text: STEP_PROMPT.submitting });
    pushEvent(CHAT_EVENTS.WIZARD_SUBMITTED, {});

    const answers = context.wizard.answers as Partial<ChatbotLeadValues>;
    const payload: ChatbotLeadValues = {
      fullName: answers.fullName ?? "",
      email: answers.email ?? "",
      phone: answers.phone ?? "",
      serviceNeeded: context.activeService ? serviceNeededFromSlug(context.activeService) : "other",
      problem: answers.problem ?? "",
      urgency: (answers.urgency as ChatbotLeadValues["urgency"]) ?? "flexible",
      audience: (answers.audience as ChatbotLeadValues["audience"]) ?? "residential",
      city: answers.city ?? "",
      timing: answers.timing,
      notes: answers.notes,
      consent: true,
      source: "chat",
    };

    try {
      const res = await fetch("/api/chat-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      dispatch({ type: "WIZARD_STEP", step: "success" });
      pushEvent(CHAT_EVENTS.WIZARD_SUCCESS, {});
      addBotMessage({
        text: "You're all set! A Jim Dandy dispatcher will follow up shortly to confirm the details.",
      });
      dispatch({ type: "WIZARD_RESET" });
    } catch {
      dispatch({ type: "WIZARD_STEP", step: "error" });
      pushEvent(CHAT_EVENTS.WIZARD_ERROR, {});
      addBotMessage({
        text: `Something went wrong sending your request. You can retry, or call us directly at ${business.phone}.`,
        quickReplies: [{ label: "Retry", value: "retry submit" }, { label: `Call ${business.phone}`, value: "call" }],
      });
    }
  };

  const send = (text: string) => {
    const value = sanitizeInput(text);
    if (!value) return;
    if (isThrottled(sendTimestamps.current)) return;
    sendTimestamps.current = [...sendTimestamps.current.slice(-4), Date.now()];

    dispatch({ type: "ADD_MESSAGE", message: makeMessage("user", value) });
    setDraft("");
    pushEvent(CHAT_EVENTS.MESSAGE_SENT, {});

    if (value.toLowerCase() === "call") {
      window.location.href = business.phoneHref;
      return;
    }

    if (value.toLowerCase() === "retry submit") {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        submitWizard();
      }, 500);
      return;
    }

    if (value.toLowerCase() === "confirm send") {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        submitWizard();
      }, 400);
      return;
    }

    if (value.toLowerCase() === "restart wizard") {
      dispatch({ type: "WIZARD_RESET" });
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        addBotMessage({ text: "No problem - want to start over from the top?", quickReplies: [{ label: "Get an estimate", value: "Get an estimate" }] });
      }, 400);
      return;
    }

    setTyping(true);
    window.setTimeout(
      () => {
        setTyping(false);

        if (context.wizard.active && context.wizard.step && !["confirm", "submitting", "success", "error"].includes(context.wizard.step)) {
          const emergencyCheck = matchIntent(value, context);
          if (emergencyCheck.intent === "EMERGENCY") {
            dispatch({ type: "EMERGENCY_DETECTED" });
            dispatch({ type: "WIZARD_PAUSE" });
            pushEvent(CHAT_EVENTS.EMERGENCY_DETECTED, { page: pageContext.path });
            addBotMessage(resolve(value, context, emergencyCheck));
            return;
          }
          handleWizardAnswer(value);
          return;
        }

        const match = matchIntent(value, context);
        dispatch({ type: "SET_INTENT", intent: match.intent });
        pushEvent(CHAT_EVENTS.INTENT_MATCHED, { intent: match.intent, ambiguous: match.ambiguous });

        if (context.emergencyFlag && match.intent !== "EMERGENCY" && match.intent !== "UNKNOWN") {
          dispatch({ type: "EMERGENCY_RESOLVED" });
        }

        if (match.intent === "UNKNOWN") {
          dispatch({ type: "INCREMENT_UNKNOWN" });
        } else {
          dispatch({ type: "RESET_UNKNOWN" });
        }
        if (match.intent === "COMPLAINT_HUMAN") {
          pushEvent(CHAT_EVENTS.HUMAN_ESCALATION, {});
        }

        const response = resolve(value, context, match);
        addBotMessage(response);
      },
      500 + Math.random() * 400,
    );
  };

  const handleQuickReply = (reply: QuickReply) => {
    pushEvent(CHAT_EVENTS.QUICK_REPLY_CLICKED, { label: reply.label });
    send(reply.value);
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    pushEvent(next ? CHAT_EVENTS.OPENED : CHAT_EVENTS.CLOSED, {});
    if (!next) launcherRef.current?.focus();
  };

  const handleRestart = () => {
    if (context.wizard.active) pushEvent(CHAT_EVENTS.WIZARD_ABANDONED, {});
    clearStoredContext();
    pushEvent(CHAT_EVENTS.RESTARTED, {});
    const ctx = initialContext(pageContext);
    const greeting = greetingResponse(ctx);
    dispatch({
      type: "HYDRATE",
      context: { ...ctx, messages: [makeMessage("bot", greeting.text, greeting.quickReplies)] },
    });
  };

  const latestQuickReplies = context.messages.length > 0 ? context.messages[context.messages.length - 1].quickReplies : undefined;
  const showQuickReplies = !typing && latestQuickReplies && latestQuickReplies.length > 0;

  const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom)+var(--sticky-cta-lift,0px))] right-4 z-[60] transition-[bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-[calc(1.5rem+var(--sticky-cta-lift,0px))] sm:right-6">
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="false" className="sr-only" />

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Jim Dandy chat assistant"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={transition}
            className="absolute bottom-[100px] right-0 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-[28px] border border-navy-100 bg-white shadow-2xl"
          >
            {/* header */}
            <div className="relative flex items-center gap-3 bg-[linear-gradient(135deg,#0a2c4e_0%,#002244_60%,#001830_100%)] px-5 py-4 text-white">
              {/* AVATAR RESTORE (header): swap the MessageCircle icon back to
                  the original photo by replacing the icon line with:
                  <span className="h-10 w-10 overflow-hidden rounded-full">
                    <img
                      src={chatbotAvatar.src}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-full w-full object-cover [transform:scale(1.18)_translateY(-4px)]"
                    />
                  </span>
              */}
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[image:var(--btn-primary)] shadow-[var(--shadow-pill-green)]">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-navy-900">
                  <MessageCircle className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-display text-lg font-bold leading-none">Jim Dandy Assistant</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green-400" />
                  </span>
                  Typically replies instantly
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                aria-label="Restart conversation"
                title="Restart conversation"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleOpen}
                aria-label="Close chat"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-navy-50/40 px-4 py-4">
              {context.messages.map((m) => (
                <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                  <p
                    className={
                      m.from === "user"
                        ? "max-w-[80%] whitespace-pre-line rounded-2xl rounded-br-md bg-[image:var(--btn-primary)] px-4 py-2.5 text-sm font-medium text-navy-900 shadow-sm"
                        : "max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-2.5 text-sm leading-relaxed text-navy-800 shadow-sm"
                    }
                  >
                    {m.text}
                  </p>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full bg-navy-300"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              )}

              {showQuickReplies && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {latestQuickReplies!.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => handleQuickReply(q)}
                      className="rounded-full border border-navy-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy-700 transition-colors hover:border-brand-green-500 hover:bg-brand-green-50 hover:text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-500"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-center gap-2 border-t border-navy-100 bg-white px-3 py-3"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message..."
                aria-label="Type your message"
                maxLength={500}
                className="min-w-0 flex-1 rounded-full border border-navy-200 bg-navy-50/60 px-4 py-2.5 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-300 focus:border-brand-green-500 focus:bg-white"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[image:var(--btn-primary)] text-navy-900 shadow-[var(--shadow-pill-green)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* launcher */}
      {/* AVATAR RESTORE (launcher): to bring the photo back exactly as before,
          replace the closed-state MessageCircle icon with:
              {/ * Branded avatar sits inside the green ring with an even rim.
                  The slight zoom + upward shift centres the face in the circle. * /}
              <span className="block h-20 w-20 select-none overflow-hidden rounded-full">
                <img
                  src={chatbotAvatar.src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-full w-full object-cover [transform:scale(1.18)_translateY(-7px)]"
                />
              </span>
      */}
      <button
        ref={launcherRef}
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        className="group relative grid h-[86px] w-[86px] place-items-center rounded-full bg-[image:var(--btn-primary)] text-navy-900 shadow-[0_14px_32px_-8px_rgba(75,135,28,0.75)] transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}>
              <X className="h-9 w-9" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}>
              {/* Inner navy disc sized like the old photo circle (h-20 inside
                  the h-[86px] button) so the brand-green button still shows
                  as a thin ring around it. */}
              <span className="grid h-20 w-20 select-none place-items-center rounded-full bg-navy-900">
                <MessageCircle className="h-9 w-9 text-white" aria-hidden="true" />
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
