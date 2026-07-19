import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

type Step = { title: string };

export default function ContactProgress({ steps, current }: { steps: Step[]; current: number }) {
  // Mobile-only entrance: steps pop in sequentially the first time the tracker
  // scrolls into view. Desktop/tablet (and reduced-motion users) render
  // instantly with no animation.
  const rootRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isMobile || reducedMotion) {
      setRevealed(true);
      return;
    }
    setAnimate(true);
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
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <span className="mb-4 font-sans text-[15px] font-bold text-navy-800 max-md:mb-2 max-md:text-[13px]">Progress</span>
      <div className="flex flex-col items-center">
        {steps.map((item, index) => {
          const stepNum = index + 1;
          const isDone = stepNum < current;
          const isActive = stepNum === current;
          const isLast = index === steps.length - 1;

          return (
            <div key={item.title} className="relative flex flex-col items-center gap-3 pb-9 last:pb-0 max-md:gap-2 max-md:pb-6">
              {/* Static dashed connector, per the approved design. It fades in
                  alongside the first steps on mobile. */}
              {!isLast && (
                <span
                  className={`absolute -bottom-1 left-1/2 top-9 -translate-x-1/2 border-l-2 border-dashed border-navy-200 max-md:top-7 ${
                    animate ? `transition-opacity duration-300 ${revealed ? "opacity-100" : "opacity-0"}` : ""
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* node + label pop in together, staggered 150ms per step */}
              <div
                  className={`relative z-20 grid h-10 w-10 place-items-center max-md:h-8 max-md:w-8 ${
                    animate
                      ? `transition-[opacity,transform] duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                          revealed ? "scale-100 opacity-100" : "scale-[0.85] opacity-0"
                        }`
                      : ""
                  }`}
                  style={animate ? { transitionDelay: `${index * 150}ms` } : undefined}
                >
                  <span
                    className={`relative grid h-10 w-10 place-items-center rounded-full font-display text-base font-bold transition-colors duration-300 max-md:h-8 max-md:w-8 max-md:text-sm ${
                      isDone
                        ? "bg-[image:var(--btn-primary)] text-navy-900"
                        : isActive
                          ? "bg-navy-800 text-white"
                          : "bg-navy-100 text-navy-400"
                    }`}
                  >
                    {isDone ? <Check className="h-5 w-5 max-md:h-4 max-md:w-4" strokeWidth={3} aria-hidden="true" /> : stepNum}
                  </span>
                </div>

                <p
                  className={`relative z-10 bg-white px-1.5 font-sans text-sm font-semibold transition-colors duration-300 max-md:text-xs ${
                    isActive || isDone ? "text-navy-800" : "text-navy-400"
                  } ${
                    animate
                      ? `transition-[opacity,transform,color] duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                          revealed ? "scale-100 opacity-100" : "scale-[0.85] opacity-0"
                        }`
                      : ""
                  }`}
                  style={animate ? { transitionDelay: `${index * 150}ms` } : undefined}
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
