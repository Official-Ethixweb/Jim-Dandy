import { Check } from "lucide-react";
import { motion } from "framer-motion";

type Step = { title: string };

export default function ContactProgress({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-navy-800">
        Progress
      </span>
      <div className="flex flex-col items-center">
        {steps.map((item, index) => {
          const stepNum = index + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          const isLast = index === steps.length - 1;

          return (
            <div key={item.title} className="relative flex flex-col items-center gap-3 pb-9 last:pb-0">
              {/* connecting line to the next step */}
              {!isLast && (
                <span
                  className="absolute left-1/2 top-9 -bottom-1 w-[3px] -translate-x-1/2 overflow-hidden rounded-full bg-navy-100"
                  aria-hidden="true"
                >
                  {/* filled portion (grows once this step is complete) */}
                  <motion.span
                    className="absolute inset-x-0 top-0 origin-top rounded-full bg-[linear-gradient(180deg,#9bd36f_0%,#69be28_100%)]"
                    initial={false}
                    animate={{ height: isDone ? "100%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />

                  {/* flowing shimmer down a completed segment */}
                  {isDone && (
                    <motion.span
                      className="absolute inset-x-0 h-8 rounded-full bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.85),transparent)]"
                      initial={{ top: "-40%" }}
                      animate={{ top: "110%" }}
                      transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}
                    />
                  )}

                  {/* indeterminate "in progress" pulse travelling down the active step's line */}
                  {isActive && (
                    <motion.span
                      className="absolute inset-x-0 h-6 rounded-full bg-[linear-gradient(180deg,transparent,#69be28,transparent)]"
                      initial={{ top: "-30%" }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity }}
                    />
                  )}
                </span>
              )}

              {/* node (kept above the label so its glow/ring isn't clipped) */}
              <div className="relative z-20 grid h-10 w-10 place-items-center">
                {isActive && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-navy-800"
                    initial={{ opacity: 0.3, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.55 }}
                    transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
                    aria-hidden="true"
                  />
                )}

                <motion.span
                  className={`relative grid h-10 w-10 place-items-center rounded-full font-display text-base font-bold ${
                    isDone
                      ? "bg-[linear-gradient(135deg,#9bd36f_0%,#69be28_55%,#4b871c_100%)] text-navy-900"
                      : isActive
                        ? "bg-navy-800 text-white"
                        : "bg-navy-100 text-navy-400"
                  }`}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.12 : 1,
                    boxShadow: isActive
                      ? "0 0 0 5px rgba(0,34,68,0.12), 0 0 22px 2px rgba(0,34,68,0.32)"
                      : isDone
                        ? "0 0 0 4px rgba(105,190,40,0.2), 0 0 18px 2px rgba(105,190,40,0.4)"
                        : "0 0 0 0px rgba(0,0,0,0)",
                  }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  {isDone ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 16 }}
                    >
                      <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                    </motion.span>
                  ) : (
                    stepNum
                  )}
                </motion.span>
              </div>

              <motion.p
                className={`relative z-10 bg-white px-1.5 font-sans text-sm font-semibold transition-colors duration-300 ${
                  isActive || isDone ? "text-navy-800" : "text-navy-400"
                }`}
                initial={false}
                animate={{ scale: isActive ? 1.04 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {item.title}
              </motion.p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
