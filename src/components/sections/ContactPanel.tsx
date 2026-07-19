import { useState } from "react";
import { Star } from "lucide-react";
import ContactForm from "./ContactForm";
import ContactProgress from "./ContactProgress";
import { business } from "@data/site";

const progressSteps = [{ title: "Basic Info" }, { title: "Some More" }, { title: "Let's Finalise" }];

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

export default function ContactPanel() {
  const [step, setStep] = useState(1);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr]">
      <div>
        <ContactForm onStepChange={setStep} />
      </div>

      {/* max-md steps everything down ~25% so the panel doesn't dominate a
          phone screen; md+ keeps the original scale untouched. */}
      <aside className="flex flex-col gap-6 text-navy-800 max-sm:mt-4 max-md:gap-3">
        <div className="flex flex-col gap-3 max-md:gap-1">
          <div className="flex w-full items-center justify-center gap-2.5 border-b-2 border-brand-green-500 pb-2 max-md:gap-2 max-md:pb-1.5">
            <GoogleG className="h-9 w-9 shrink-0 max-md:h-6 max-md:w-6" />
            <div className="flex items-center gap-1.5">
              <span className="font-accent text-2xl font-extrabold text-[#fea500] max-md:text-lg">{business.rating.value}</span>
              <div className="flex" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-[#fea500] text-[#fea500] max-md:h-3.5 max-md:w-3.5" />
                ))}
              </div>
            </div>
          </div>
          {/* Mobile keeps only the Google rating beside the CTA; the heading,
              subtitle, and progress tracker are desktop/tablet elements. */}
          <h3 className="font-display text-[48px] font-black leading-[1.08] text-navy-800 max-md:hidden">
            Jim Dandy To The Rescue!
          </h3>
          <p className="text-lg text-navy-600 max-md:hidden">Fully Licensed &amp; Insured</p>
        </div>

        <div className="max-md:hidden">
          <ContactProgress steps={progressSteps} current={step} />
        </div>
      </aside>
    </div>
  );
}
