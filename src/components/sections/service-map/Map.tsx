import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import GridBackground from "./GridBackground";
import Marker from "./Marker";
import PopupCard from "./PopupCard";
import AnimatedConnection from "./AnimatedConnection";
import TravelingDot from "./TravelingDot";
import CoverageWave from "./CoverageWave";
import FloatingCenterIcon from "./FloatingCenterIcon";
import RegionHighlight from "./RegionHighlight";
import type { CityPin } from "./types";

const HUB: CityPin = { label: "Seattle", x: 40, y: 46 };

const CITIES: CityPin[] = [
  { label: "Everett", x: 52, y: 9 },
  { label: "Kirkland", x: 66, y: 28 },
  { label: "Bellevue", x: 78, y: 44 },
  { label: "Renton", x: 70, y: 68 },
  { label: "Tacoma", x: 18, y: 86 },
];

const ALL_PINS: CityPin[] = [HUB, ...CITIES];

function distance(a: CityPin, b: CityPin) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const maxDistance = Math.max(...CITIES.map((c) => distance(HUB, c)));
const WAVE_TRAVEL_SECONDS = 2.2;
const WAVE_INTERVAL_MS = 6000;

export default function Map() {
  const reduceMotion = Boolean(useReducedMotion());
  const outerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(outerRef, { once: true, amount: 0.4 });

  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [waveKey, setWaveKey] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setWaveKey((k) => k + 1), WAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: nx * 10, y: ny * 10 });
  };

  const handleMouseLeave = () => setParallax({ x: 0, y: 0 });

  const activePin = useMemo(() => ALL_PINS.find((p) => p.label === activeCity) ?? null, [activeCity]);
  const activeSide: "left" | "right" = activePin && activePin.x > 55 ? "left" : "right";

  return (
    <div ref={outerRef} className="relative">
      <div
        className="relative aspect-[16/9] w-full overflow-hidden rounded-[32px] bg-navy-900 sm:aspect-[2/1]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <GridBackground
          isInView={isInView}
          parallaxX={parallax.x}
          parallaxY={parallax.y}
          reduceMotion={reduceMotion}
        />

        <div
          className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            background: "radial-gradient(400px circle at 50% 45%, rgba(105,190,40,0.18), transparent 70%)",
            transform: reduceMotion ? undefined : `translate(${parallax.x * 0.6}px, ${parallax.y * 0.6}px)`,
          }}
          aria-hidden="true"
        />

        <RegionHighlight x={activePin?.x ?? HUB.x} y={activePin?.y ?? HUB.y} visible={Boolean(activePin)} />

        <CoverageWave x={HUB.x} y={HUB.y} waveKey={waveKey} reduceMotion={reduceMotion} />

        <div className="absolute inset-0 translate-x-[50px]">
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
                emphasized={hoveredCity === city.label || activeCity === city.label}
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
          <FloatingCenterIcon x={HUB.x} y={HUB.y} isInView={isInView} reduceMotion={reduceMotion} />
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
            onClose={() => setActiveCity(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
