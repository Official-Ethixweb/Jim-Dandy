import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

/**
 * Jim Dandy chat launcher — UI PREVIEW ONLY.
 * The conversation is a scripted mock (canned bot reply) so the client can see
 * the experience; there is no backend wired up yet.
 */

type Msg = { id: number; from: "bot" | "user"; text: string };

const GREETING =
  "Hi there! 👋 I'm the Jim Dandy virtual assistant. How can I help with your plumbing today?";

const QUICK_REPLIES = [
  "Book a service",
  "I have an emergency",
  "Get a quote",
  "Hours & service area",
];

const CANNED_REPLY =
  "Thanks for reaching out! A Jim Dandy team member will follow up in just a moment. For anything urgent, call us any time at (206) 633-1141.";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ id: 1, from: "bot", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(2);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setShowQuick(false);
    setMessages((prev) => [...prev, { id: idRef.current++, from: "user", text: value }]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id: idRef.current++, from: "bot", text: CANNED_REPLY }]);
    }, 1100);
  };

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[60] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            role="dialog"
            aria-label="Jim Dandy chat assistant"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-[92px] right-0 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-[28px] border border-navy-100 bg-white shadow-2xl"
          >
            {/* header */}
            <div className="relative flex items-center gap-3 bg-[linear-gradient(135deg,#0a2c4e_0%,#002244_60%,#001830_100%)] px-5 py-4 text-white">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[image:var(--btn-primary)] text-navy-900 shadow-[var(--shadow-pill-green)]">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-display text-lg font-bold leading-none">
                  Jim Dandy Assistant
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                    Preview
                  </span>
                </p>
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
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-navy-50/40 px-4 py-4">
              {messages.map((m) => (
                <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                  <p
                    className={
                      m.from === "user"
                        ? "max-w-[80%] rounded-2xl rounded-br-md bg-[image:var(--btn-primary)] px-4 py-2.5 text-sm font-medium text-navy-900 shadow-sm"
                        : "max-w-[85%] rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-2.5 text-sm leading-relaxed text-navy-800 shadow-sm"
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

              {showQuick && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full border border-navy-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy-700 transition-colors hover:border-brand-green-500 hover:bg-brand-green-50 hover:text-navy-900"
                    >
                      {q}
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
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message..."
                aria-label="Type your message"
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        className="group relative grid h-[78px] w-[78px] place-items-center rounded-full bg-[image:var(--btn-primary)] text-navy-900 shadow-[0_14px_32px_-8px_rgba(75,135,28,0.75)] transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.18 }}>
              <X className="h-9 w-9" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.18 }}>
              <MessageCircle className="h-9 w-9" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 grid h-6 w-6 place-items-center rounded-full bg-navy-800 text-[11px] font-bold text-white ring-2 ring-white">
            1
          </span>
        )}
      </button>
    </div>
  );
}
