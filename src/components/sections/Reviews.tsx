import { useEffect, useRef, useState } from "react";
import { Pause, Play, Star } from "lucide-react";
import { business } from "@data/site";
import { featuredReviews, reviewAge, type Review } from "@data/reviews";

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_TONES = ["bg-navy-800", "bg-brand-green-600", "bg-[#2a4158]", "bg-[#1f6f8b]"];

function ReviewCard({ review, index, hidden }: { review: Review; index: number; hidden?: boolean }) {
  return (
    <article
      className="flex w-[300px] shrink-0 flex-col gap-4 rounded-3xl border border-navy-100 bg-white p-6 shadow-card sm:w-[360px]"
      aria-hidden={hidden || undefined}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-sans text-base font-bold text-white ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
          aria-hidden="true"
        >
          {initials(review.name)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-sans text-lg font-semibold text-navy-900">{review.name}</p>
          <p className="text-sm text-navy-500">{reviewAge(review.date)}</p>
        </div>
        <GoogleG className="h-6 w-6 shrink-0" />
      </div>
      <div className="flex" role="img" aria-label={`${review.rating} out of 5 stars`}>
        {Array.from({ length: review.rating }).map((_, i) => (
          <Star key={i} className="h-5 w-5 fill-[#fea500] text-[#fea500]" aria-hidden="true" />
        ))}
      </div>
      <p className="line-clamp-5 flex-1 text-base leading-relaxed text-navy-700">{review.text}</p>
    </article>
  );
}

/**
 * Moving review cards: an endless marquee of real Google reviews.
 * - Two rows drifting in opposite directions on desktop, one on phones.
 * - Pauses on hover, on touch, and while keyboard focus is inside; a visible
 *   Pause/Play button covers everyone else (WCAG 2.2.2).
 * - With reduced motion it becomes a normal swipeable row instead.
 */
export default function Reviews() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const half = Math.ceil(featuredReviews.length / 2);
  const rows = [featuredReviews.slice(0, half), featuredReviews.slice(half)];

  if (reduced) {
    return (
      <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4" tabIndex={0} aria-label="Customer reviews">
        {featuredReviews.map((r, i) => (
          <div key={r.name + r.date} className="snap-start">
            <ReviewCard review={r} index={i} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={rootRef}
        className="review-marquee relative flex flex-col gap-4 overflow-hidden pb-9 pt-3 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
        data-paused={paused || undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && rootRef.current?.setAttribute("data-hover", "")}
        onPointerLeave={() => rootRef.current?.removeAttribute("data-hover")}
        onTouchStart={() => rootRef.current?.setAttribute("data-hover", "")}
        onTouchEnd={() => window.setTimeout(() => rootRef.current?.removeAttribute("data-hover"), 2500)}
      >
        {rows.map((row, r) => (
          <div key={r} className={`review-row flex w-max gap-6 ${r === 1 ? "review-row-reverse max-sm:hidden" : ""}`}>
            {[0, 1].map((copy) =>
              row.map((review, i) => (
                <ReviewCard key={`${copy}-${review.name}-${review.date}`} review={review} index={i + r} hidden={copy === 1} />
              )),
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="inline-flex min-h-11 items-center gap-2 self-center rounded-full border border-navy-200 bg-white px-4 text-sm font-semibold text-navy-700 transition-colors hover:border-brand-green-500 hover:text-navy-900"
      >
        {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        {paused ? "Play reviews" : "Pause reviews"}
      </button>
      <span className="sr-only">
        Showing {featuredReviews.length} of {business.rating.count} Google reviews, rated {business.rating.value} out of 5.
      </span>
    </div>
  );
}
