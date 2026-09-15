import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MessageCircle, Send, X, RotateCcw } from "lucide-react";
import { business, services } from "@data/site";
import type { QuickReply } from "@lib/chatbot/resolver";
import { initialContext, loadContext, saveContext, clearStoredContext, type ChatContext, type PageContext } from "@lib/chatbot/context";
import type { BrainAction } from "@lib/chatbot/brain";
import { sanitizeInput, isThrottled } from "@lib/chatbot/security";
import { pushEvent, CHAT_EVENTS } from "@lib/chatbot/analytics";
import { trackLeadConversion } from "@lib/analytics";
import TurnstileWidget, { turnstileConfigured } from "@components/security/TurnstileWidget";
// AVATAR RESTORE: uncomment this import when bringing the photo back.
// import chatbotAvatar from "@assets/photos/chatbot-avatar-face.webp";

type Props = { currentPath?: string };

/**
 * The conversation brain and its knowledge base are ~30KB gzipped, and most
 * visitors never open the chat - so they load on first intent (hovering,
 * focusing, or tapping the launcher) instead of with every page.
 */
type Brain = typeof import("@lib/chatbot/brain");
let brainPromise: Promise<Brain> | null = null;
const loadBrain = () => (brainPromise ??= import("@lib/chatbot/brain"));

function derivePageContext(currentPath: string): PageContext {
  const path = currentPath || "/";
  const serviceMatch = path.match(/^\/services\/([a-z0-9-]+)/);
  const serviceSlug = serviceMatch ? services.find((s) => s.slug === serviceMatch[1])?.slug : undefined;
  return {
    path,
    serviceSlug,
    isServiceArea: path.startsWith("/service-area"),
    isCoupons: path.startsWith("/coupons"),
    isCommercial: path.startsWith("/commercial") || path.startsWith("/services/commercial"),
    isFinancing: path.startsWith("/financing"),
  };
}

/**
 * Full-screen chat everywhere the site shows its mobile layout: below 1024px
 * (the `lg` breakpoint, where the sticky call bar appears and the header is
 * already a hamburger), plus short screens - a phone held sideways is
 * ~340-430px tall. Only desktop-width screens get the floating card. The
 * launcher's `phone:` variant in global.css mirrors this.
 *
 * A phone showing the "Desktop site" lays the page out ~980px wide or more, so
 * the width query can miss it - a touch-only device whose physical screen is
 * phone-sized counts as a phone too.
 */
const MOBILE_QUERY = "(max-width: 1023.98px), (max-height: 540px)";
const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";
const isPhone = () =>
  window.matchMedia(MOBILE_QUERY).matches || (window.matchMedia(TOUCH_QUERY).matches && Math.min(screen.width, screen.height) < 600);

/** The part of the page actually on screen, from the visual viewport. */
type VisibleArea = { left: number; top: number; width: number; height: number; scale: number };

export default function ChatWidget({ currentPath = "/" }: Props) {
  const pageContext = useMemo(() => derivePageContext(currentPath), [currentPath]);
  const [open, setOpen] = useState(false);
  const [context, setContextState] = useState<ChatContext>(() => {
    const stored = loadContext();
    if (stored) return { ...stored, pageContext };
    return initialContext(pageContext);
  });
  const [brain, setBrain] = useState<Brain | null>(null);
  // The brain is pure and works on the latest state; replies arrive after a
  // short typing delay, so a ref avoids acting on a stale render's state.
  const contextRef = useRef(context);
  const setContext = useCallback((next: ChatContext) => {
    contextRef.current = next;
    setContextState(next);
  }, []);

  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewport, setViewport] = useState<VisibleArea | null>(null);
  // Set after hydration - the full-screen chat renders into <body>.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendTimestamps = useRef<number[]>([]);
  const prefersReducedMotion = useReducedMotion();
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const warmUp = useCallback(() => {
    void loadBrain().then((b) => setBrain(b));
  }, []);

  // Once the brain is here, a fresh conversation gets its page-aware opener.
  useEffect(() => {
    if (brain && contextRef.current.messages.length === 0) setContext(brain.openingState(contextRef.current));
  }, [brain, setContext]);

  useEffect(() => {
    if (context.messages.length) saveContext(context);
  }, [context]);

  useEffect(() => {
    setPortalTarget(document.body);
    const queries = [window.matchMedia(MOBILE_QUERY), window.matchMedia(TOUCH_QUERY)];
    const update = () => setIsMobile(isPhone());
    update();
    queries.forEach((mq) => mq.addEventListener("change", update));
    return () => queries.forEach((mq) => mq.removeEventListener("change", update));
  }, []);

  // Full-screen on phones: lock the page behind, hide the other floating
  // launcher, and fit the panel to the *visual* viewport - the part of the
  // page actually on screen. That keeps the input above the on-screen keyboard,
  // and keeps the whole chat on screen when the page is pinch-zoomed in or
  // (Desktop site) zoomed out.
  useEffect(() => {
    const fullscreen = open && isMobile;
    document.documentElement.toggleAttribute("data-chat-open", open);
    if (!fullscreen) {
      setViewport(null);
      return;
    }
    const { body } = document;
    const scrollY = window.scrollY;
    const previous = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const vv = window.visualViewport;
    const sync = () =>
      setViewport(vv ? { left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height, scale: vv.scale || 1 } : null);
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      Object.assign(body.style, previous);
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
    };
  }, [open, isMobile]);

  useEffect(() => () => document.documentElement.removeAttribute("data-chat-open"), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [context.messages, typing, prefersReducedMotion, viewport?.height]);

  const close = useCallback(() => {
    setOpen(false);
    pushEvent(CHAT_EVENTS.CLOSED, {});
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      // Keep keyboard focus inside the dialog while it is open.
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled])"));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    // Desktop: focus the input. Phones: don't - popping the keyboard over a
    // freshly opened full-screen chat hides the greeting and quick replies.
    if (open && !isMobile) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 260);
      return () => window.clearTimeout(t);
    }
  }, [open, isMobile]);

  const lastBotMessage = [...context.messages].reverse().find((m) => m.from === "bot");
  useEffect(() => {
    if (liveRegionRef.current && lastBotMessage) liveRegionRef.current.textContent = lastBotMessage.text;
  }, [lastBotMessage]);

  const submitLead = async (action: Extract<BrainAction, { type: "submit_lead" }>) => {
    pushEvent(CHAT_EVENTS.WIZARD_SUBMITTED, {});
    const payload = { ...action.payload, sourcePage: window.location.pathname, ...(turnstileToken ? { turnstileToken } : {}) };
    try {
      const res = await fetch("/api/chat-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        pushEvent(CHAT_EVENTS.WIZARD_ERROR, { status: res.status });
        setContext(brain!.afterLeadSubmit(contextRef.current, false, data.error));
        return;
      }
      pushEvent(CHAT_EVENTS.WIZARD_SUCCESS, {});
      // Conversion only after the server confirmed the lead was delivered.
      trackLeadConversion("chat_widget", { service: payload.serviceNeeded, urgency: payload.urgency });
      setContext(brain!.afterLeadSubmit(contextRef.current, true));
    } catch {
      pushEvent(CHAT_EVENTS.WIZARD_ERROR, { status: "network" });
      setContext(brain!.afterLeadSubmit(contextRef.current, false, `We couldn't reach our server - check your connection and tap Retry, or call ${business.phone}.`));
    }
  };

  const send = (text: string, display?: string) => {
    const value = sanitizeInput(text);
    if (!value || typing || !brain) return;
    if (isThrottled(sendTimestamps.current)) return;
    sendTimestamps.current = [...sendTimestamps.current.slice(-4), Date.now()];
    setDraft("");
    pushEvent(CHAT_EVENTS.MESSAGE_SENT, {});

    const result = brain.converse(contextRef.current, value, display);
    // Show the visitor's message immediately, then the reply after a short,
    // length-aware "typing" pause so it reads like a conversation.
    const userOnly = { ...result.state, messages: result.state.messages.slice(0, contextRef.current.messages.length + 1) };
    setContext(userOnly);
    const replyLength = result.state.messages.slice(contextRef.current.messages.length).reduce((n, m) => n + m.text.length, 0);
    const delay = prefersReducedMotion ? 150 : Math.min(1100, 350 + replyLength * 2.2);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setContext(result.state);
      if (result.state.emergencyFlag && !userOnly.emergencyFlag) pushEvent(CHAT_EVENTS.EMERGENCY_DETECTED, { page: pageContext.path });
      if (result.state.wizard.active && !userOnly.wizard.active) pushEvent(CHAT_EVENTS.WIZARD_STARTED, {});
      if (result.action?.type === "call") window.location.href = business.phoneHref;
      if (result.action?.type === "submit_lead") void submitLead(result.action);
    }, delay);
  };

  const handleQuickReply = (reply: QuickReply) => {
    pushEvent(CHAT_EVENTS.QUICK_REPLY_CLICKED, { label: reply.label });
    send(reply.value, reply.label);
  };

  const handleToggle = () => {
    if (open) return close();
    warmUp();
    setOpen(true);
    pushEvent(CHAT_EVENTS.OPENED, {});
  };

  const handleRestart = () => {
    if (contextRef.current.wizard.active) pushEvent(CHAT_EVENTS.WIZARD_ABANDONED, {});
    clearStoredContext();
    pushEvent(CHAT_EVENTS.RESTARTED, {});
    setTyping(false);
    const fresh = initialContext(pageContext);
    setContext(brain ? brain.openingState(fresh) : fresh);
  };

  const latest = context.messages[context.messages.length - 1];
  const latestQuickReplies = latest?.from === "bot" ? latest.quickReplies : undefined;
  const showQuickReplies = !typing && latestQuickReplies && latestQuickReplies.length > 0;
  const busy = typing || !brain || context.wizard.step === "submitting";

  const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const };
  const fullscreen = open && isMobile;

  // Counter any page zoom so the chat reads at its normal size. `zoom` scales
  // the panel's own box too, so the box is given in on-screen units.
  const sheetStyle: CSSProperties | undefined = !viewport
    ? undefined
    : Math.abs(viewport.scale - 1) < 0.01
      ? { left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height }
      : {
          left: viewport.left * viewport.scale,
          top: viewport.top * viewport.scale,
          width: viewport.width * viewport.scale,
          height: viewport.height * viewport.scale,
          zoom: 1 / viewport.scale,
        };

  const dialogProps = { ref: panelRef, role: "dialog", "aria-modal": true, "aria-label": "Jim Dandy chat assistant" } as const;

  const panelContent = (
          <>
            {/* header */}
            <div
              className="relative flex shrink-0 items-center gap-3 bg-[linear-gradient(135deg,#0a2c4e_0%,#002244_60%,#001830_100%)] px-5 py-4 text-white"
              style={fullscreen ? { paddingTop: "max(1rem, env(safe-area-inset-top))" } : undefined}
            >
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
                <p className="truncate font-display text-lg font-bold leading-none">Jim Dandy Assistant</p>
                <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-white/70">
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Close chat"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-navy-50/40 px-4 py-4">
              {context.messages.map((m) => (
                <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex flex-col items-start gap-1.5"}>
                  <p
                    className={
                      m.from === "user"
                        ? `whitespace-pre-line break-words rounded-2xl rounded-br-md bg-[image:var(--btn-primary)] px-4 py-2.5 font-medium text-navy-900 shadow-sm ${fullscreen ? "max-w-[85%] text-[15px]" : "max-w-[80%] text-sm"}`
                        : `whitespace-pre-line break-words rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-2.5 leading-relaxed text-navy-800 shadow-sm ${fullscreen ? "max-w-[90%] text-[15px]" : "max-w-[85%] text-sm"}`
                    }
                  >
                    {m.text}
                  </p>
                  {m.from === "bot" && m.links && m.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-1">
                      {m.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700"
                        >
                          {l.label}
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {!brain && context.messages.length === 0 && (
                <div className="flex justify-start" aria-label="Assistant is loading">
                  <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-navy-300" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              )}

              {typing && (
                <div className="flex justify-start" aria-label="Assistant is typing">
                  <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-navy-300" style={{ animationDelay: `${i * 0.15}s` }} />
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
                      className={`rounded-full border border-navy-200 bg-white px-3.5 py-2 font-semibold text-navy-700 transition-colors hover:border-brand-green-500 hover:bg-brand-green-50 hover:text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-500 ${fullscreen ? "min-h-10 text-[13px]" : "text-xs"}`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Challenge, shown only while the wizard is waiting on the final
                confirm - and only when Turnstile is configured at all. The
                token rides along with the lead POST. */}
            {turnstileConfigured && context.wizard.active && context.wizard.step === "confirm" && (
              <div className="shrink-0 border-t border-navy-100 bg-white px-3 pt-3">
                <TurnstileWidget onToken={setTurnstileToken} />
              </div>
            )}

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex shrink-0 items-center gap-2 border-t border-navy-100 bg-white px-3 py-3"
              style={fullscreen ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" } : undefined}
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={context.wizard.active ? "Type your answer..." : "Type your message..."}
                aria-label="Type your message"
                maxLength={500}
                enterKeyHint="send"
                autoComplete="off"
                /* 16px on phones: iOS zooms the whole page into any smaller input on focus. */
                className={`min-w-0 flex-1 rounded-full border border-navy-200 bg-navy-50/60 px-4 py-2.5 text-navy-900 outline-none transition-colors placeholder:text-navy-300 focus:border-brand-green-500 focus:bg-white ${fullscreen ? "text-base" : "text-sm"}`}
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={busy || !draft.trim()}
                className={`grid shrink-0 place-items-center rounded-full bg-[image:var(--btn-primary)] text-navy-900 shadow-[var(--shadow-pill-green)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 ${fullscreen ? "h-11 w-11" : "h-10 w-10"}`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </>
  );

  return (
    <div className="floating-launcher fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom)+max(var(--sticky-cta-lift,0px),var(--footer-lift,0px)))] right-4 z-[60] transition-[bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-[calc(1.5rem+max(var(--sticky-cta-lift,0px),var(--footer-lift,0px)))] sm:right-6">
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="false" className="sr-only" />

      {/* Tablets and desktops: a floating card above the launcher. */}
      <AnimatePresence>
        {open && !isMobile && (
          <motion.div
            key="panel"
            {...dialogProps}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={transition}
            className="absolute bottom-[100px] right-0 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-[28px] border border-navy-100 bg-white shadow-2xl"
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phones: full screen, rendered straight into <body> so no ancestor's
          stacking context, and nothing else fixed on the page, can sit on top
          of it or shrink it. The backdrop covers the whole page - including
          behind browser toolbars that float over content - while the panel
          fits the part of the screen actually visible. */}
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {open &&
              isMobile && [
                <motion.div
                  key="backdrop"
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  className="fixed inset-0 z-[1000] min-h-lvh bg-white"
                />,
                <motion.div
                  key="sheet"
                  {...dialogProps}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={transition}
                  style={sheetStyle}
                  className="fixed left-0 top-0 z-[1001] flex h-[100dvh] w-full flex-col overflow-hidden bg-white"
                >
                  {panelContent}
                </motion.div>,
              ]}
          </AnimatePresence>,
          portalTarget,
        )}

      {/* launcher - hidden behind the full-screen chat on phones */}
      {/* AVATAR RESTORE (launcher): to bring the photo back exactly as before,
          replace the closed-state MessageCircle icon with:
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
        onClick={handleToggle}
        onPointerEnter={warmUp}
        onPointerDown={warmUp}
        onFocus={warmUp}
        aria-expanded={open}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        className={`group relative grid h-[86px] w-[86px] place-items-center rounded-full bg-[image:var(--btn-primary)] text-navy-900 shadow-[0_14px_32px_-8px_rgba(75,135,28,0.75)] phone:h-[69px] phone:w-[69px] phone:shadow-[0_11px_26px_-6px_rgba(75,135,28,0.75)] transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 ${fullscreen ? "invisible" : ""}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}>
              <X className="h-9 w-9 phone:h-[29px] phone:w-[29px]" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}>
              {/* Inner navy disc sized like the old photo circle (h-20 inside
                  the h-[86px] button; 20% smaller on phones) so the brand-green
                  button still shows as a thin ring around it. */}
              <span className="grid h-20 w-20 select-none place-items-center rounded-full bg-navy-900 phone:h-16 phone:w-16">
                <MessageCircle className="h-9 w-9 text-white phone:h-[29px] phone:w-[29px]" aria-hidden="true" />
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
