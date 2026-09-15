import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  label: string;
  x: number;
  y: number;
  index: number;
  isInView: boolean;
  isActive: boolean;
  isHovered: boolean;
  waveKey: number;
  waveDelay: number;
  reduceMotion: boolean;
  onHoverChange: (hovering: boolean) => void;
  onSelect: () => void;
};

// Baked into a static style and revealed via opacity, so emphasis never
// animates box-shadow (a full repaint per frame) - only compositor props.
const GLOW_SHADOW = "0 0 0 4px rgba(105,190,40,0.22), 0 0 16px 4px rgba(105,190,40,0.65)";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Marker({
  label,
  x,
  y,
  index,
  isInView,
  isActive,
  isHovered,
  waveKey,
  waveDelay,
  reduceMotion,
  onHoverChange,
  onSelect,
}: Props) {
  const [waveGlow, setWaveGlow] = useState(false);
  const waveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const glowTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFirstWave = useRef(true);

  useEffect(() => {
    if (isFirstWave.current) {
      isFirstWave.current = false;
      return;
    }
    if (reduceMotion) return;
    clearTimeout(waveTimeout.current);
    clearTimeout(glowTimeout.current);
    waveTimeout.current = setTimeout(() => {
      setWaveGlow(true);
      glowTimeout.current = setTimeout(() => setWaveGlow(false), 700);
    }, waveDelay * 1000);
    return () => {
      clearTimeout(waveTimeout.current);
      clearTimeout(glowTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveKey]);

  const emphasized = isActive || isHovered || waveGlow;

  return (
    <motion.button
      type="button"
      className="absolute z-20 flex -translate-x-1/2 -translate-y-full touch-manipulation min-h-11 flex-col items-center justify-end gap-1.5 rounded-lg px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green-400"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0.4, y: 10 }}
      animate={
        isInView
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 0, scale: 0.4, y: 10 }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.15 + index * 0.1, ease: EASE }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      onClick={onSelect}
      aria-label={`View services in ${label}`}
      aria-expanded={isActive}
    >
      <AnimatePresence>
        {isHovered && !isActive && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-full bg-navy-900/90 px-3 py-1 text-xs font-semibold text-white shadow-lg"
          >
            Click to view services
          </motion.span>
        )}
      </AnimatePresence>

      <motion.span
        className={`whitespace-nowrap text-xs font-semibold transition-colors duration-200 ${
          emphasized ? "text-white" : "text-navy-200"
        }`}
        style={{ transformOrigin: "50% 100%" }}
        animate={
          reduceMotion
            ? undefined
            : { y: emphasized ? -2 : 0, scale: emphasized ? 1.07 : 1 }
        }
        transition={{ duration: 0.25, ease: EASE }}
      >
        {label}
      </motion.span>

      <span className="relative grid h-2.5 w-2.5 place-items-center">
        {isActive && !reduceMotion && (
          <>
            <motion.span
              className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-green-400"
              initial={{ scale: 0.28, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-green-400"
              initial={{ scale: 0.28, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
            />
          </>
        )}
        <motion.span
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ boxShadow: GLOW_SHADOW }}
          animate={{ opacity: emphasized ? 1 : 0, scale: emphasized ? 1.2 : 1 }}
          transition={{ duration: 0.25, ease: EASE }}
        />
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-brand-green-500"
          animate={{ scale: emphasized ? 1.2 : 1 }}
          transition={{ duration: 0.25, ease: EASE }}
        />
      </span>
    </motion.button>
  );
}
