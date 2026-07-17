import { Check } from "lucide-react";

type Step = { title: string };

export default function ContactProgress({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mb-4 font-sans text-[15px] font-bold text-navy-800">Progress</span>
      <div className="flex flex-col items-center">
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
