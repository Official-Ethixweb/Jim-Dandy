import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import GridBackground from "./GridBackground";
import Marker from "./Marker";
import PopupCard from "./PopupCard";
import AnimatedConnection from "./AnimatedConnection";
import TravelingDot from "./TravelingDot";
import CoverageWave from "./CoverageWave";
import RadarPulse from "./RadarPulse";
import AmbientDots from "./AmbientDots";
import FloatingCenterIcon from "./FloatingCenterIcon";
import RegionHighlight from "./RegionHighlight";
import type { CityPin } from "./types";

// The hub sits at the map's horizontal centre so the pin, the point the
// connection lines radiate from, the coverage wave and the radial glow all
// coincide - previously each sat somewhere different.
const HUB: CityPin = { label: "Seattle", x: 50, y: 46 };

const CITIES: CityPin[] = [
  { label: "Everett", x: 42, y: 25 },
  { label: "Kirkland", x: 68, y: 31 },
  { label: "Bellevue", x: 84, y: 50 },
  { label: "Renton", x: 72, y: 72 },
  { label: "Tacoma", x: 18, y: 86 },
];

const ALL_PINS: CityPin[] = [HUB, ...CITIES];

function distance(a: CityPin, b: CityPin) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const maxDistance = Math.max(...CITIES.map((c) => distance(HUB, c)));
const WAVE_TRAVEL_SECONDS = 2.2;
const WAVE_INTERVAL_MS = 6000;
const PARALLAX_SPRING = { stiffness: 40, damping: 18 };

export default function Map() {
  const reduceMotion = Boolean(useReducedMotion());
  const outerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(outerRef, { once: true, amount: 0.4 });

  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [waveKey, setWaveKey] = useState(0);

  // Parallax lives in motion values wired straight into transforms, so
  // mousemove never re-renders the React tree (it used to setState per event).
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const springX = useSpring(parallaxX, PARALLAX_SPRING);
  const springY = useSpring(parallaxY, PARALLAX_SPRING);
  const glowX = useTransform(springX, (v) => v * 0.6);
  const glowY = useTransform(springY, (v) => v * 0.6);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setWaveKey((k) => k + 1), WAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    parallaxX.set(((e.clientX - rect.left) / rect.width - 0.5) * 10);
    parallaxY.set(((e.clientY - rect.top) / rect.height - 0.5) * 10);
  };

  const handleMouseLeave = () => {
    parallaxX.set(0);
    parallaxY.set(0);
  };

  // Stable identity and city-aware: an exiting popup's listeners can only
  // close their own city, never the popup that replaced it. Stability also
  // keeps PopupCard's document listeners from re-registering (and re-stealing
  // focus) on every Map re-render.
  const closeCity = useCallback((city: string) => {
    setActiveCity((prev) => (prev === city ? null : prev));
  }, []);

  const activePin = useMemo(() => ALL_PINS.find((p) => p.label === activeCity) ?? null, [activeCity]);
  const activeSide: "left" | "right" = activePin && activePin.x > 55 ? "left" : "right";

  // Hovering the hub pin lights up every route at once - a quick read of
  // "we dispatch to all of these from here".
  const hubEmphasized = hoveredCity === HUB.label || activeCity === HUB.label;

  return (
    <div ref={outerRef} className="relative">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[32px] bg-navy-900 sm:aspect-[2/1]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <GridBackground isInView={isInView} parallaxX={springX} parallaxY={springY} />

        <AmbientDots isInView={isInView} reduceMotion={reduceMotion} />

        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(400px circle at 50% 45%, rgba(105,190,40,0.18), transparent 70%)",
            x: glowX,
            y: glowY,
          }}
          aria-hidden="true"
        />

        <RegionHighlight x={activePin?.x ?? HUB.x} y={activePin?.y ?? HUB.y} visible={Boolean(activePin)} />

        <RadarPulse x={HUB.x} y={HUB.y} reduceMotion={reduceMotion} />

        <CoverageWave x={HUB.x} y={HUB.y} waveKey={waveKey} reduceMotion={reduceMotion} />

        {/* No x-offset here: a fixed 50px shift is a different share of the map
            at every width, which is what stopped the hub from ever being centred
            (it landed at 44% on desktop but 54% on mobile). */}
        <div className="absolute inset-0">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {CITIES.map((city, i) => (
              <AnimatedConnection
                key={city.label}
                from={HUB}
                to={city}
                isInView={isInView}
                delay={reduceMotion ? 0 : 0.6 + i * 0.15}
                emphasized={hubEmphasized || hoveredCity === city.label || activeCity === city.label}
              />
            ))}
          </svg>

          {!reduceMotion &&
            CITIES.map((city, i) => (
              <TravelingDot
                key={city.label}
                from={HUB}
                to={city}
                isInView={isInView}
                delay={0.6 + i * 0.15}
              />
            ))}

          {CITIES.map((city, i) => (
            <Marker
              key={city.label}
              label={city.label}
              x={city.x}
              y={city.y}
              index={i}
              isInView={isInView}
              isActive={activeCity === city.label}
              isHovered={hoveredCity === city.label}
              waveKey={waveKey}
              waveDelay={(distance(HUB, city) / maxDistance) * WAVE_TRAVEL_SECONDS}
              reduceMotion={reduceMotion}
              onHoverChange={(hovering) => setHoveredCity(hovering ? city.label : null)}
              onSelect={() => setActiveCity((prev) => (prev === city.label ? null : city.label))}
            />
          ))}

          {/* Lives inside the same translated space as the connections/markers so
              the pin's point lands exactly on the hub the lines converge at. */}
          <FloatingCenterIcon
            x={HUB.x}
            y={HUB.y}
            isInView={isInView}
            reduceMotion={reduceMotion}
            isActive={activeCity === HUB.label}
            onHoverChange={(hovering) => setHoveredCity(hovering ? HUB.label : null)}
            onSelect={() => setActiveCity((prev) => (prev === HUB.label ? null : HUB.label))}
          />
        </div>
      </div>

      <AnimatePresence>
        {activePin && (
          <PopupCard
            key={activePin.label}
            city={activePin.label}
            x={activePin.x}
            y={activePin.y}
            side={activeSide}
            onClose={closeCity}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
