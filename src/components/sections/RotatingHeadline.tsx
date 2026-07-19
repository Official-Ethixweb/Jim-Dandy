import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TextType from "@components/ui/TextType";

type Line = { question: string; answer: string };

const lines: Line[] = [
  { question: "Plumbing problems?", answer: "Jim Dandy to the rescue!" },
  { question: "Burst pipe emergency?", answer: "We're there in a flash!" },
  { question: "Clogged drains again?", answer: "Jim Dandy clears the way!" },
  { question: "No hot water today?", answer: "Dandy turns up the heat!" },
  { question: "Sewer backup nightmare?", answer: "Dandy digs you out!" },
];

const texts = lines.map((line) => `${line.question}\n${line.answer}`);

export default function RotatingHeadline({ className }: { className?: string }) {
  const [minHeight, setMinHeight] = useState<number>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const container = measureRef.current;
      if (!container) return;
      const heights = Array.from(container.children).map((el) => (el as HTMLElement).offsetHeight);
      setMinHeight(Math.max(...heights));
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <h1 className={className}>
      <span className="relative block" style={minHeight ? { minHeight } : undefined}>
        {reducedMotion ? (
          <span className="block">
            {lines[0].question}
            <br />
            {lines[0].answer.split(/(Jim Dandy|Dandy)/).map((part, i) =>
              part === "Jim Dandy" || part === "Dandy" ? (
                <span key={i} className="text-brand-green-500">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </span>
        ) : (
          <TextType
            as="span"
            className="block"
            text={texts}
            typingSpeed={55}
            deletingSpeed={25}
            pauseDuration={1600}
            initialDelay={300}
            loop
            showCursor
            cursorCharacter="|"
            cursorClassName="text-brand-green-400"
            highlightWords={["Jim", "Dandy"]}
            highlightClassName="text-brand-green-500"
          />
        )}

        <span ref={measureRef} className="invisible absolute inset-x-0 top-0" aria-hidden="true">
          {lines.map((line, i) => (
            <span key={i} className="block">
              {line.question}
              <br />
              {line.answer}
            </span>
          ))}
        </span>
      </span>
    </h1>
  );
}
