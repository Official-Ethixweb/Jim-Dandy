import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { contactSchema, serviceOptions, type ContactFormValues } from "@lib/schemas/contact";
import { CONSENT_TEXT } from "@lib/schemas/shared";
import { business } from "@data/site";
import { trackLeadConversion } from "@lib/analytics";
import TurnstileWidget, { turnstileConfigured } from "@components/security/TurnstileWidget";

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

type Props = { onStepChange?: (step: number) => void };

export default function ContactForm({ onStepChange }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consentExpanded, setConsentExpanded] = useState(false);
  // Our own success flag, set only after the server confirms the lead was
  // delivered. react-hook-form's isSubmitSuccessful is true whenever the
  // submit handler doesn't throw - which previously showed "You're all set!"
  // on a 500 or a dropped connection, for a lead nobody received.
  const [sent, setSent] = useState(false);
  // Spam signals, kept outside react-hook-form so they never appear in the
  // validation schema or surface an error to a real user.
  const honeypotRef = useRef<HTMLInputElement>(null);
  const mountedAtRef = useRef<number>(Date.now());
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
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
  const step = sent ? 4 : !basicInfoDone ? 1 : !serviceDone ? 2 : 3;

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitError(null);
    let res: Response;
    try {
      res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          sourcePage: window.location.pathname,
          company: honeypotRef.current?.value ?? "",
          elapsedMs: Date.now() - mountedAtRef.current,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
    } catch {
      setSubmitError(`We couldn't reach our server - check your connection and try again, or call us at ${business.phone}.`);
      return;
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: { path: string[]; message: string }[];
      };
      // Server-side validation that the browser missed: attach each message to
      // its field so it renders exactly like a client-side error.
      const fieldIssues = (data.issues ?? []).filter((issue) => issue.path[0] && issue.path[0] in values);
      fieldIssues.forEach((issue) =>
        setError(issue.path[0] as keyof ContactFormValues, { type: "server", message: issue.message }),
      );
      setSubmitError(
        fieldIssues.length ? "Please check the highlighted fields." : (data.error ?? `Something went wrong sending your request. Please call us at ${business.phone}.`),
      );
      return;
    }

    // Conversion fires here and nowhere else - after the server confirmed the
    // lead. Firing on click would report leads the client never received.
    trackLeadConversion("contact_form", {
      services: values.serviceNeeded,
    });
    reset();
    setSent(true);
  };

  if (sent) {
    return (
      <div role="status" className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-[32px] bg-brand-green-50 p-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-brand-green-600" aria-hidden="true" />
        <h3 className="font-heading text-2xl font-bold text-navy-800">You're all set!</h3>
        <p className="max-w-sm text-navy-600">
          Thanks for reaching out - a Jim Dandy dispatcher will call or text you shortly to
          confirm your appointment. We've also emailed you a confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {/* Honeypot. Off-screen rather than display:none (which some bots skip),
          and removed from the tab order and the accessibility tree so no real
          user - sighted, keyboard, or screen-reader - can ever reach it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="company">Company (leave this field empty)</label>
        <input
          id="company"
          type="text"
          ref={honeypotRef}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

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
                className={`relative flex cursor-pointer items-center gap-2 rounded-lg border border-l-4 px-3 py-3.5 transition-all duration-150 ease-out active:scale-[0.98] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-green-500 sm:gap-2.5 sm:px-4 ${
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
                <span className={`min-w-0 text-sm font-semibold leading-tight sm:text-nowrap ${isActive ? "text-white" : "text-navy-800"}`}>
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
            className="-my-2 mt-0 py-3 text-xs font-bold text-brand-green-600 underline underline-offset-2 hover:text-navy-700"
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

      {turnstileConfigured && (
        <TurnstileWidget onToken={setTurnstileToken} className="self-center" />
      )}

      {submitError && <SubmitErrorBanner message={submitError} />}
      <SubmitState isSubmitting={isSubmitting} />
    </form>
  );
}

function SubmitState({ isSubmitting }: { isSubmitting: boolean }) {
  // Until React takes over, nothing cancels the browser's own submit: pressing
  // the button did a plain GET to the same URL and put the name/email/phone the
  // visitor typed into the query string, losing the lead. The server-rendered
  // markup therefore ships disabled and only the mounted component enables it.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <button
      type="submit"
      disabled={!hydrated || isSubmitting}
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
