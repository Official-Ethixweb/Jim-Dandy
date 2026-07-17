import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Accessibility,
  AlignJustify,
  BookOpen,
  Contrast,
  Ear,
  Link2,
  Minus,
  MousePointer2,
  Pause,
  Plus,
  RotateCcw,
  Type,
  X,
} from "lucide-react";

/**
 * Accessibility menu — UI PREVIEW ONLY.
 * The toggles animate so the client can see the control set; they are not yet
 * wired to real page adjustments.
 */

type Option = { key: string; label: string; icon: typeof Type };

const OPTIONS: Option[] = [
  { key: "bigger-text", label: "Bigger Text", icon: Type },
  { key: "contrast", label: "High Contrast", icon: Contrast },
  { key: "highlight-links", label: "Highlight Links", icon: Link2 },
  { key: "readable-font", label: "Readable Font", icon: BookOpen },
  { key: "big-cursor", label: "Big Cursor", icon: MousePointer2 },
  { key: "reduce-motion", label: "Reduce Motion", icon: Pause },
  { key: "text-spacing", label: "Text Spacing", icon: AlignJustify },
  { key: "screen-reader", label: "Screen Reader", icon: Ear },
];

const STEPS = ["A-", "Default", "A+", "A++"];

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [textStep, setTextStep] = useState(1);

  const flip = (key: string) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  const reset = () => {
    setToggles({});
    setTextStep(1);
  };
  const activeCount = Object.values(toggles).filter(Boolean).length + (textStep !== 1 ? 1 : 0);

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 z-[60] sm:bottom-6 sm:left-6">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Accessibility options"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-[72px] left-0 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-[360px] origin-bottom-left flex-col overflow-hidden rounded-[28px] border border-navy-100 bg-white shadow-2xl"
          >
            {/* header */}
            <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#0a2c4e_0%,#002244_60%,#001830_100%)] px-5 py-4 text-white">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-brand-green-400">
                <Accessibility className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-display text-lg font-bold leading-none">
                  Accessibility
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                    Preview
                  </span>
                </p>
                <p className="mt-1 text-xs text-white/70">Adjust this site to your needs</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close accessibility menu"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* text size stepper */}
              <div className="rounded-2xl border border-navy-100 bg-navy-50/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Text Size</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease text size"
                    onClick={() => setTextStep((s) => Math.max(0, s - 1))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy-200 bg-white text-navy-700 transition-colors hover:border-brand-green-500 hover:text-navy-900"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div className="flex flex-1 items-center gap-1">
                    {STEPS.map((label, i) => (
                      <span
                        key={label}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${i <= textStep ? "bg-brand-green-500" : "bg-navy-200"}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Increase text size"
                    onClick={() => setTextStep((s) => Math.min(STEPS.length - 1, s + 1))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy-200 bg-white text-navy-700 transition-colors hover:border-brand-green-500 hover:text-navy-900"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-navy-600">{STEPS[textStep]}</p>
              </div>

              {/* toggle grid */}
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {OPTIONS.map(({ key, label, icon: Icon }) => {
                  const on = !!toggles[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => flip(key)}
                      className={`flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors ${
                        on
                          ? "border-brand-green-500 bg-brand-green-50"
                          : "border-navy-100 bg-white hover:border-navy-300"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <Icon className={`h-5 w-5 ${on ? "text-brand-green-600" : "text-navy-500"}`} aria-hidden="true" />
                        <span
                          className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-brand-green-500" : "bg-navy-200"}`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
                          />
                        </span>
                      </span>
                      <span className="text-xs font-semibold leading-tight text-navy-800">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* reset */}
              <button
                type="button"
                onClick={reset}
                disabled={activeCount === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 transition-colors hover:border-navy-300 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset all{activeCount > 0 ? ` (${activeCount})` : ""}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close accessibility menu" : "Open accessibility menu"}
        className="grid h-[60px] w-[60px] place-items-center rounded-full bg-[image:var(--btn-secondary)] text-white shadow-[var(--shadow-btn-navy)] ring-2 ring-white/10 transition-all duration-200 hover:-translate-y-1 hover:bg-[image:var(--btn-secondary-hover)] hover:shadow-[var(--shadow-btn-navy-hover)] active:translate-y-0"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.18 }}>
              <X className="h-7 w-7" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span key="a11y" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.18 }}>
              <Accessibility className="h-8 w-8" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
