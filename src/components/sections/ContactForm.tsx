import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { contactSchema, serviceOptions, type ContactFormValues } from "@lib/schemas/contact";
import ServiceIcon from "@components/ui/ServiceIcon";
import allPlumbingIcon from "@assets/icons/all-plumbing.svg";
import waterHeatersIcon from "@assets/icons/water-heaters.svg";
import sewerServicesIcon from "@assets/icons/sewer-services.svg";
import commercialIcon from "@assets/icons/commercial.svg";

// The approved lead-form chips show the full-colour brand icons (same set as
// the Service Cards), not monochrome strokes. "Other" has no brand icon, so it
// keeps its lucide dots via ServiceIcon.
const BRAND_ICONS: Partial<Record<(typeof serviceOptions)[number]["value"], { src: string }>> = {
  plumbing: allPlumbingIcon,
  heating: waterHeatersIcon,
  sewers: sewerServicesIcon,
  commercial: commercialIcon,
};

const CONSENT_TEXT =
  "By submitting this form and signing up for texts, you consent to receive messages from " +
  "Jim Dandy Sewer & Plumbing at the number provided regarding your request, updates " +
  "about appointments and services or promotions and offers, including messages sent by " +
  "autodialer. Consent is not a condition of purchase. Msg & data rates may apply. Msg " +
  "frequency varies. Unsubscribe at any time by replying STOP. Reply HELP for help.";

type Props = { onStepChange?: (step: number) => void };

export default function ContactForm({ onStepChange }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consentExpanded, setConsentExpanded] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { consent: undefined, serviceNeeded: [] },
  });

  const fullName = watch("fullName");
  const email = watch("email");
  const phone = watch("phone");
  const selectedService = watch("serviceNeeded") ?? [];
  const consent = watch("consent");

  const basicInfoDone = Boolean(fullName && email && phone);
  const serviceDone = selectedService.length > 0;
  const step = isSubmitSuccessful ? 4 : !basicInfoDone ? 1 : !serviceDone ? 2 : 3;

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        throw new Error("Request failed");
      }
      reset();
    } catch {
      setSubmitError("Something went wrong sending your request. Please call us instead - we're happy to help.");
    }
  };

  if (isSubmitSuccessful) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-[32px] bg-brand-green-50 p-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-brand-green-600" aria-hidden="true" />
        <h3 className="font-heading text-2xl font-bold text-navy-800">You're all set!</h3>
        <p className="max-w-sm text-navy-600">
          Thanks for reaching out - a Jim Dandy dispatcher will call or text you shortly to
          confirm your appointment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="fullName" className="font-sans text-sm font-semibold text-navy-700">
            Full Name*
          </label>
          <input
            id="fullName"
            type="text"
            placeholder="Eg. Paul Allen"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className="rounded-2xl border border-navy-200 bg-navy-50/60 px-5 py-3 text-navy-900 shadow-[var(--shadow-inset)] outline-none transition-colors placeholder:text-navy-300 focus:border-brand-green-500 focus:bg-white"
            {...register("fullName")}
          />
          {errors.fullName && (
            <p id="fullName-error" role="alert" className="text-sm text-red-600">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-sans text-sm font-semibold text-navy-700">
            Email*
          </label>
          <input
            id="email"
            type="email"
            placeholder="Eg. paul.allen@email.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="rounded-2xl border border-navy-200 bg-navy-50/60 px-5 py-3 text-navy-900 outline-none transition-colors placeholder:text-navy-300 focus:border-brand-green-500 focus:bg-white"
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="font-sans text-sm font-semibold text-navy-700">
            Phone number*
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="Eg. (206) 555-0134"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className="rounded-2xl border border-navy-200 bg-navy-50/60 px-5 py-3 text-navy-900 outline-none transition-colors placeholder:text-navy-300 focus:border-brand-green-500 focus:bg-white"
            {...register("phone")}
          />
          {errors.phone && (
            <p id="phone-error" role="alert" className="text-sm text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-sans text-sm font-semibold text-navy-700">Service needed*</legend>
        <div className="grid grid-cols-2 gap-3 max-sm:mt-2 sm:grid-cols-3 xl:grid-cols-4">
          {serviceOptions.map((option) => {
            const isActive = selectedService.includes(option.value);
            return (
              <label
                key={option.value}
                className={`relative flex cursor-pointer items-center gap-2.5 rounded-lg border border-l-4 px-4 py-3.5 transition-all duration-150 ease-out active:scale-[0.98] ${
                  isActive
                    ? "border-navy-800 border-l-navy-800 bg-navy-800 shadow-[0_8px_20px_-8px_rgba(0,34,68,0.6)]"
                    : "border-navy-200 border-l-navy-800 bg-white hover:border-navy-300 hover:shadow-md"
                }`}
              >
                <input
                  type="checkbox"
                  value={option.value}
                  className="sr-only"
                  {...register("serviceNeeded")}
                />
                {isActive && (
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-brand-green-500 text-navy-900 shadow-[var(--shadow-pill-green)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
                {BRAND_ICONS[option.value] ? (
                  <img
                    src={BRAND_ICONS[option.value]!.src}
                    alt=""
                    aria-hidden="true"
                    className={`h-6 w-6 shrink-0 object-contain ${
                      /* On the navy active chip the icon's navy body would vanish,
                         so trace its alpha edge in white - same treatment as the
                         Service Cards' dark hover state. */
                      isActive
                        ? "[filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_1.5px_#fff)]"
                        : ""
                    }`}
                  />
                ) : (
                  <ServiceIcon
                    name={option.icon}
                    className={`h-6 w-6 shrink-0 ${isActive ? "text-brand-green-400" : "text-navy-800"}`}
                    aria-hidden="true"
                  />
                )}
                <span className={`min-w-0 text-nowrap text-sm font-semibold ${isActive ? "text-white" : "text-navy-800"}`}>
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
        {errors.serviceNeeded && (
          <p role="alert" className="text-sm text-red-600">
            {errors.serviceNeeded.message}
          </p>
        )}

        <AnimatePresence initial={false}>
          {selectedService.includes("other") && (
            <motion.div
              key="other-detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 pt-1">
                <label htmlFor="otherServiceDetail" className="font-sans text-sm font-semibold text-navy-700">
                  What do you need help with?
                </label>
                <input
                  id="otherServiceDetail"
                  type="text"
                  placeholder="Eg. Gas line inspection"
                  aria-invalid={!!errors.otherServiceDetail}
                  aria-describedby={errors.otherServiceDetail ? "otherServiceDetail-error" : undefined}
                  className="rounded-2xl border border-navy-200 bg-navy-50/60 px-5 py-3 text-navy-900 shadow-[var(--shadow-inset)] outline-none transition-colors placeholder:text-navy-300 focus:border-brand-green-500 focus:bg-white"
                  {...register("otherServiceDetail")}
                />
                {errors.otherServiceDetail && (
                  <p id="otherServiceDetail-error" role="alert" className="text-sm text-red-600">
                    {errors.otherServiceDetail.message}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 max-md:items-center">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 rounded border-navy-300 text-brand-green-600 focus-visible:outline-brand-green-500 max-md:mt-0"
            checked={consent === true}
            onChange={(e) => setValue("consent", e.target.checked as true, { shouldValidate: true })}
          />
          <span className="text-sm font-semibold text-navy-700">Communication consent</span>
        </label>

        {/* Desktop keeps the full text; mobile collapses it to a two-line
            preview behind a Read more toggle. Same copy in both. */}
        <p className="hidden text-xs leading-relaxed text-navy-400 md:block">{CONSENT_TEXT}</p>

        <div className="md:hidden">
          <motion.div
            initial={false}
            animate={{ height: consentExpanded ? "auto" : 40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden"
          >
            <p className="text-xs leading-relaxed text-navy-400">{CONSENT_TEXT}</p>
            {/* premium fade-out over the clipped preview */}
            <motion.span
              initial={false}
              animate={{ opacity: consentExpanded ? 0 : 1 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent"
              aria-hidden="true"
            />
          </motion.div>
          <button
            type="button"
            onClick={() => setConsentExpanded((v) => !v)}
            aria-expanded={consentExpanded}
            className="mt-1 py-1 text-xs font-bold text-brand-green-600 underline underline-offset-2 hover:text-navy-700"
          >
            {consentExpanded ? "Read less" : "Read more"}
          </button>
        </div>
        {errors.consent && (
          <p role="alert" className="text-sm text-red-600">
            {errors.consent.message}
          </p>
        )}
      </div>

      {submitError && <SubmitErrorBanner message={submitError} />}
      <SubmitState isSubmitting={isSubmitting} />
    </form>
  );
}

function SubmitState({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="relative inline-flex w-[280px] max-w-full items-center justify-center gap-2 self-center rounded-full border border-brand-green-600/40 bg-[image:var(--btn-primary)] px-10 py-4 font-display text-[21px] font-normal leading-none text-navy-900 shadow-[var(--shadow-btn-green)] hover:bg-[image:var(--btn-primary-hover)] hover:shadow-[var(--shadow-btn-green-hover)] transition-all duration-200 ease-brand hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {/* Figma primary keeps a soft white sheen off the top-left over the green
          gradient; this is what Button.astro renders and the form button lacked. */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full opacity-40 mix-blend-overlay"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9), transparent 60%)" }}
        aria-hidden="true"
      />
      <AnimatePresence mode="wait" initial={false}>
        {isSubmitting ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Sending...
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Schedule Online
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function SubmitErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
      <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}
