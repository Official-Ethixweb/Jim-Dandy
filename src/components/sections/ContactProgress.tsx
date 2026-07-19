import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

type Step = { title: string };

export default function ContactProgress({ steps, current }: { steps: Step[]; current: number }) {
  // Mobile entrance (played once): the connector sweeps left-to-right, then the
  // numbered dots pop in sequentially. md+ renders the original vertical
  // stepper statically.
  const rootRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const node = rootRef.current;
    if (!node) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <span className="mb-4 font-sans text-[15px] font-bold text-navy-800 max-md:hidden">Progress</span>

      {/* Mobile: compact horizontal stepper */}
      <div
        className="relative mx-auto flex w-full max-w-[240px] items-center justify-between py-1 md:hidden"
        role="img"
        aria-label={`Step ${current} of ${steps.length}: ${steps[current - 1]?.title ?? ""}`}
      >
        <span
          className={`absolute left-2 right-2 top-1/2 h-0.5 origin-left -translate-y-1/2 bg-navy-200 transition-transform duration-500 ease-out motion-reduce:transition-none ${
            revealed ? "scale-x-100" : "scale-x-0"
          }`}
          aria-hidden="true"
        />
        {steps.map((item, index) => {
          const stepNum = index + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          return (
            <span
              key={item.title}
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full font-display text-xs font-bold transition-[opacity,transform,background-color,color] duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${
                revealed ? "scale-100 opacity-100" : "scale-[0.85] opacity-0"
              } ${
                isDone
                  ? "bg-[image:var(--btn-primary)] text-navy-900"
                  : isActive
                    ? "bg-navy-800 text-white"
                    : "bg-navy-100 text-navy-400"
              }`}
              style={{ transitionDelay: revealed ? `${100 + index * 150}ms` : "0ms" }}
            >
              {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : stepNum}
            </span>
          );
        })}
      </div>

      {/* md+: original vertical stepper, untouched */}
      <div className="hidden flex-col items-center md:flex">
        {steps.map((item, index) => {
          const stepNum = index + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          const isLast = index === steps.length - 1;

          return (
            <div key={item.title} className="relative flex flex-col items-center gap-3 pb-9 last:pb-0">
              {/* Static dashed connector, per the approved design. */}
              {!isLast && (
                <span
                  className="absolute -bottom-1 left-1/2 top-9 -translate-x-1/2 border-l-2 border-dashed border-navy-200"
                  aria-hidden="true"
                />
              )}

              {/* node (kept above the label so it isn't overlapped) */}
              <div className="relative z-20 grid h-10 w-10 place-items-center">
                <span
                  className={`relative grid h-10 w-10 place-items-center rounded-full font-display text-base font-bold transition-colors duration-300 ${
                    isDone
                      ? "bg-[image:var(--btn-primary)] text-navy-900"
                      : isActive
                        ? "bg-navy-800 text-white"
                        : "bg-navy-100 text-navy-400"
                  }`}
                >
                  {isDone ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : stepNum}
                </span>
              </div>

              <p
                className={`relative z-10 bg-white px-1.5 font-sans text-sm font-semibold transition-colors duration-300 ${
                  isActive || isDone ? "text-navy-800" : "text-navy-400"
                }`}
              >
                {item.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
