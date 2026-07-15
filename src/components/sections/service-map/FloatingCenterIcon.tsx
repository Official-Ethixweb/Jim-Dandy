import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

type Props = { x: number; y: number; isInView: boolean; reduceMotion: boolean };

export default function FloatingCenterIcon({ x, y, isInView, reduceMotion }: Props) {
  return (
    <motion.div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="sm:-translate-x-[150px]">
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
      <div className="hidden sm:block sm:-translate-x-[150px]">
        <p className="text-balance font-display text-2xl font-bold text-white sm:text-[28px]">Puget Sound Region</p>
        <p className="text-balance text-sm font-medium text-white/80 sm:text-base">
          King · Snohomish · Pierce Counties
        </p>
      </div>
    </motion.div>
  );
}
