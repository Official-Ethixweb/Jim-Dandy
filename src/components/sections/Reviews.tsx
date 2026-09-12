import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { business, reviews } from "@data/site";

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

type Review = (typeof reviews)[number];

function ReviewCard({ review, hidden, fluid }: { review: Review; hidden?: boolean; fluid?: boolean }) {
  return (
    <article
      className={`flex h-full ${fluid ? "w-full" : "w-[320px] sm:w-[360px]"} shrink-0 flex-col gap-4 rounded-3xl border-b-4 border-navy-800 bg-[#f7f7f7] p-6 shadow-review`}
      aria-hidden={hidden || undefined}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="leading-tight">
            <p className="font-sans text-lg font-semibold text-navy-900">{review.name}</p>
            <p className="text-sm text-navy-400">{review.timeAgo}</p>
          </div>
          <GoogleG className="h-6 w-6 shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex" aria-hidden="true">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-[#fea500] text-[#fea500]" />
            ))}
          </div>
          <BadgeCheck className="h-4 w-4 text-navy-400" aria-label="Verified review" />
        </div>
      </div>
      <p className="flex-1 text-base leading-relaxed text-navy-700 line-clamp-3">{review.text}</p>
      <a
        href={business.social.google}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={hidden ? -1 : undefined}
        className="-my-3 self-start py-3 text-left text-sm font-semibold text-navy-500 hover:text-navy-700"
      >
        Read more on Google
      </a>
    </article>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -48 : 48 }),
};

/** Mobile-only: one review at a time, browsed manually with arrows - no auto-scroll. */
function MobileSlider() {
  const reduceMotion = Boolean(useReducedMotion());
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);

  const go = (delta: number) =>
    setState(([i]) => [(i + delta + reviews.length) % reviews.length, delta]);

  return (
    <div className="sm:hidden">
      <div className="relative overflow-hidden" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReviewCard review={reviews[index]} fluid />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous review"
          className="grid h-11 w-11 place-items-center rounded-full border border-navy-200 bg-white text-navy-700 transition-colors hover:border-brand-green-500 hover:text-navy-900 active:bg-brand-green-50"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next review"
          className="grid h-11 w-11 place-items-center rounded-full border border-navy-200 bg-white text-navy-700 transition-colors hover:border-brand-green-500 hover:text-navy-900 active:bg-brand-green-50"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function Reviews() {
  return (
    <>
      <MobileSlider />

      {/* Desktop (sm+): the original infinite marquee, unchanged. */}
      <div className="group/marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] max-sm:hidden">
        <div className="flex w-max animate-[marquee_36s_linear_infinite] gap-6 group-hover/marquee:[animation-play-state:paused]">
          {reviews.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
          {reviews.map((review) => (
            <ReviewCard key={`${review.name}-dup`} review={review} hidden />
          ))}
        </div>
      </div>
    </>
  );
}
