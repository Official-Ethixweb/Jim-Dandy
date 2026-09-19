import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

type Props = {
  target: number;
  duration?: number;
  className?: string;
  decimals?: number;
};

/**
 * Counts up to `target` the first time it scrolls into view.
 *
 * The server-rendered HTML always carries the real number: this used to ship
 * "0", so search engines, link previews, slow phones and anyone who scrolled
 * past quickly saw "0 / 5 - 0 Google Reviews". The count-up only runs when the
 * number starts off-screen (so nobody watches a real value reset to 0) and
 * never with reduced motion.
 */
export default function AnimatedCounter({ target, duration = 1.4, className, decimals = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = target.toFixed(decimals);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return; // already visible: keep the real value

    let stop: (() => void) | undefined;
    el.textContent = (0).toFixed(decimals);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const controls = animate(0, target, {
          duration,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: (v) => (el.textContent = v.toFixed(decimals)),
          onComplete: () => (el.textContent = final),
        });
        stop = () => controls.stop();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
      el.textContent = final;
    };
  }, [target, duration, decimals, final]);

  return (
    <span ref={ref} className={className}>
      {final}
    </span>
  );
}
