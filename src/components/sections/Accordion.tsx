import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

type Item = { question: string; answer: string };

export default function Accordion({ items }: { items: Item[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const idPrefix = useId();

  return (
    <div className="flex flex-col gap-4">
      {items.map((faq, index) => {
        const isOpen = openIndex === index;
        const panelId = `${idPrefix}-panel-${index}`;
        return (
          <div
            key={faq.question}
            className={`overflow-hidden rounded-3xl border transition-colors duration-200 ${
              isOpen ? "border-navy-800 bg-white shadow-card" : "border-navy-200 bg-white"
            }`}
          >
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left sm:px-8"
              >
                <span className="font-display text-lg font-bold text-navy-800 sm:text-xl">
                  {faq.question}
                </span>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
                    isOpen ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-600"
                  }`}
                >
                  {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 text-base leading-relaxed text-navy-600 sm:px-8">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
