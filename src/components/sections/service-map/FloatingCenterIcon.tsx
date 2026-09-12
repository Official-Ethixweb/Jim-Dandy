import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  x: number;
  y: number;
  isInView: boolean;
  reduceMotion: boolean;
  isActive: boolean;
  onHoverChange: (hovering: boolean) => void;
  onSelect: () => void;
};

// Distance from the top of the 56px pin badge down to the tip of the MapPin
// glyph: the 36px icon is centred in the badge (10px), and lucide's point sits
// at 22/24 of the viewBox (33px). Anchoring on the tip - rather than centring
// the whole stack - is what makes the pin read as marking the exact spot.
const PIN_TIP_FROM_TOP = 43;

export default function FloatingCenterIcon({
  x,
  y,
  isInView,
  reduceMotion,
  isActive,
  onHoverChange,
  onSelect,
}: Props) {
  return (
    <motion.div
      className="absolute z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-center sm:gap-2"
      style={{ left: `${x}%`, top: `calc(${y}% - ${PIN_TIP_FROM_TOP}px)` }}
      initial={{ opacity: 0, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        onFocus={() => onHoverChange(true)}
        onBlur={() => onHoverChange(false)}
        aria-label="View services in Seattle"
        aria-expanded={isActive}
        className="cursor-pointer touch-manipulation rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green-400"
        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -7, 0], rotate: [0, -4, 4, 0] }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative grid h-11 w-11 place-items-center rounded-full sm:h-14 sm:w-14">
            {/* Glow is a static shadow revealed by opacity - animating
                box-shadow itself repaints the badge every frame. */}
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 22px 6px rgba(105,190,40,0.5)" }}
              animate={reduceMotion ? { opacity: 0.35 } : { opacity: [0, 1, 0] }}
              transition={
                reduceMotion
                  ? { duration: 0.8 }
                  : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              }
              aria-hidden="true"
            />
            <MapPin className="h-7 w-7 text-white sm:h-9 sm:w-9" aria-hidden="true" />
          </div>
        </motion.div>
      </motion.button>
      <div>
        <p className="whitespace-nowrap font-display text-base font-bold text-white sm:text-xl lg:text-[28px]">Puget Sound Region</p>
        {/* Redundant with the section subtitle directly above the map on
            mobile, and the tightest thing that was colliding with the Tacoma
            marker on short/narrow map cards - dropped there, kept from sm up
            where the map has room. */}
        <p className="hidden whitespace-nowrap text-xs font-medium text-white/80 sm:block sm:text-base">
          King · Snohomish · Pierce Counties
        </p>
      </div>
    </motion.div>
  );
}
