import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

type Props = { x: number; y: number; isInView: boolean; reduceMotion: boolean };

// Distance from the top of the 56px pin badge down to the tip of the MapPin
// glyph: the 36px icon is centred in the badge (10px), and lucide's point sits
// at 22/24 of the viewBox (33px). Anchoring on the tip - rather than centring
// the whole stack - is what makes the pin read as marking the exact spot.
const PIN_TIP_FROM_TOP = 43;

export default function FloatingCenterIcon({ x, y, isInView, reduceMotion }: Props) {
  return (
    <motion.div
      className="absolute z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-center"
      style={{ left: `${x}%`, top: `calc(${y}% - ${PIN_TIP_FROM_TOP}px)` }}
      initial={{ opacity: 0, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div>
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -7, 0], rotate: [0, -4, 4, 0] }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="grid h-14 w-14 place-items-center rounded-full"
            animate={
              reduceMotion
                ? undefined
                : {
                    boxShadow: [
                      "0 0 0px 0px rgba(105,190,40,0.0)",
                      "0 0 22px 6px rgba(105,190,40,0.5)",
                      "0 0 0px 0px rgba(105,190,40,0.0)",
                    ],
                  }
            }
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <MapPin className="h-9 w-9 text-white" aria-hidden="true" />
          </motion.div>
        </motion.div>
      </div>
      <div>
        <p className="whitespace-nowrap font-display text-xl font-bold text-white sm:text-[28px]">Puget Sound Region</p>
        <p className="whitespace-nowrap text-xs font-medium text-white/80 sm:text-base">
          King · Snohomish · Pierce Counties
        </p>
      </div>
    </motion.div>
  );
}
