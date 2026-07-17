import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import ServiceIcon from "@components/ui/ServiceIcon";
import { business, services } from "@data/site";

type Props = {
  city: string;
  x: number;
  y: number;
  side: "left" | "right";
  onClose: () => void;
};

const highlightServices = services.slice(0, 4);

export default function PopupCard({ city, x, y, side, onClose }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  const desktopSide =
    side === "left"
      ? "lg:left-[var(--m-x)] lg:-ml-4 lg:-translate-x-full"
      : "lg:left-[var(--m-x)] lg:ml-4 lg:translate-x-0";

  return (
    <motion.div
      ref={cardRef}
      role="dialog"
      aria-label={`Services available in ${city}`}
      className={[
        "fixed inset-x-3 bottom-3 z-50 w-auto max-w-none rounded-t-3xl",
        "sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-[var(--m-x)] sm:top-[var(--m-y)] sm:mt-4 sm:w-[300px] sm:max-w-[300px] sm:-translate-x-1/2 sm:rounded-3xl",
        "lg:top-[var(--m-y)] lg:mt-0 lg:-translate-y-1/2",
        desktopSide,
      ].join(" ")}
      style={{ ["--m-x" as string]: `calc(${x}% + 50px)`, ["--m-y" as string]: `${y}%` }}
      initial={{ opacity: 0, scale: 0.9, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 16 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative overflow-hidden rounded-[inherit] border border-white/20 bg-navy-900/80 p-5 shadow-2xl backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(160px circle at 15% 0%, rgba(105,190,40,0.25), transparent 70%)" }}
          aria-hidden="true"
        />

        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative flex items-center gap-2 pr-8">
          <MapPin className="h-5 w-5 shrink-0 text-brand-green-400" aria-hidden="true" />
          <h3 className="font-display text-xl font-bold text-white">{city}</h3>
        </div>

        <ul className="relative mt-4 flex flex-col gap-2.5">
          {highlightServices.map((service) => (
            <li key={service.slug} className="flex items-center gap-2.5 text-sm text-white/85">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-green-500/15 text-brand-green-400">
                <ServiceIcon name={service.icon} className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {service.label}
            </li>
          ))}
        </ul>

        <p className="relative mt-4 text-xs font-semibold uppercase tracking-wide text-brand-green-400">
          24/7 Service Available
        </p>

        <a
          href={business.scheduleUrl}
          className="relative mt-4 block rounded-full bg-[image:var(--btn-primary)] px-5 py-3 text-center font-display text-base font-bold text-navy-900 shadow-[var(--shadow-btn-green)] hover:bg-[image:var(--btn-primary-hover)] hover:shadow-[var(--shadow-btn-green-hover)] transition-transform hover:-translate-y-0.5"
        >
          Book Service
        </a>

        <span
          className={`absolute hidden h-3 w-3 rotate-45 border border-white/20 bg-navy-900/80 sm:block lg:hidden ${
            "left-1/2 -top-1.5 -translate-x-1/2 border-b-0 border-r-0"
          }`}
          aria-hidden="true"
        />
        <span
          className={`absolute hidden h-3 w-3 rotate-45 border border-white/20 bg-navy-900/80 lg:block ${
            side === "left"
              ? "-right-1.5 top-1/2 -translate-y-1/2 border-b-0 border-l-0"
              : "-left-1.5 top-1/2 -translate-y-1/2 border-r-0 border-t-0"
          }`}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  );
}
