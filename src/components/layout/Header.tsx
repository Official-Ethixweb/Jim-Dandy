import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { business, navLinks, secondaryNavLinks } from "@data/site";
import Logo from "./Logo";
import ServiceIcon from "@components/ui/ServiceIcon";

type Props = { currentPath?: string };

function isLinkActive(href: string, currentPath: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function Header({ currentPath = "/" }: Props) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroLight, setHeroLight] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const servicesMenuId = useId();
  const mobileMenuId = useId();

  // The home hero sits under the header; while it does, the header wears a
  // white/glass theme and flips back to navy once the user scrolls past it.
  // Pages without a .hero-section (all non-home pages) stay navy throughout.
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero-section");
    const update = () => {
      setIsScrolled(window.scrollY > 24);
      if (!hero || !headerRef.current) {
        setHeroLight(false);
        return;
      }
      // Measure the nav row, not the whole header, so the mobile menu's own
      // height never skews the comparison.
      const row = headerRef.current.querySelector(".container-page") ?? headerRef.current;
      setHeroLight(hero.getBoundingClientRect().bottom > row.getBoundingClientRect().height);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Recompute once the hero has its final height (e.g. after the video/layout
    // settles) so the initial theme is correct without needing a scroll.
    const ro = hero ? new ResizeObserver(update) : null;
    if (hero) ro!.observe(hero);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
        setIsServicesOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openServices = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsServicesOpen(true);
  };
  const scheduleCloseServices = () => {
    closeTimer.current = setTimeout(() => setIsServicesOpen(false), 150);
  };

  const solid = isScrolled || isMobileOpen;
  // Force navy while the mobile menu (navy panel) is open, even inside the hero.
  const light = heroLight && !isMobileOpen;

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 w-full transition-[background-color,box-shadow] duration-300 ease-out ${
        light
          ? "bg-white/90 backdrop-blur-[18px] shadow-[inset_0_-1px_0_0_rgba(105,190,40,0.28),0_10px_30px_-10px_rgba(105,190,40,0.35)]"
          : solid
            ? "bg-navy-800 backdrop-blur-md shadow-[0_2px_0_0_#69be28,0_10px_28px_-4px_rgba(105,190,40,0.55)]"
            : "bg-navy-800"
      }`}
    >
      {/* Subtle green brand glow, fading in only on the light/glass theme. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${light ? "opacity-100" : "opacity-0"}`}
        style={{
          background:
            "radial-gradient(120% 240% at 18% 0%, rgba(105,190,40,0.14), transparent 55%), radial-gradient(120% 240% at 82% 0%, rgba(105,190,40,0.10), transparent 55%)",
        }}
      ></div>

      <div className="container-page relative z-10 flex items-center justify-between gap-4 py-4 lg:py-[14px]">
        <Logo />

        <div
          className="relative hidden shrink-0 xl:block"
          style={{ width: 712, aspectRatio: "3475 / 530" }}
        >
          <img
            src="/NEW/Nav%20Bar%20Top%20White.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          />

          <a
            href={business.phoneHref}
            className="absolute z-10 flex translate-y-[2px] items-center justify-center gap-2 whitespace-nowrap font-display text-3xl font-bold text-navy-900 transition-transform hover:-translate-y-0.5"
            style={{ left: "57%", top: "8%", width: "42%", height: "50%" }}
          >
            <Phone className="h-7 w-7 shrink-0" aria-hidden="true" />
            {business.phone}
          </a>

          <nav
            aria-label="Primary"
            className="absolute flex items-center justify-center gap-0.5"
            style={{ left: "1%", top: "55%", width: "97%", height: "44%" }}
          >
          {navLinks.map((link) =>
            link.children ? (
              // No positioning context here on purpose: the dropdown then resolves
              // against the nav pill wrapper, letting it span the bar end-to-end
              // instead of floating centred under the button.
              <div
                key={link.label}
                onMouseEnter={openServices}
                onMouseLeave={scheduleCloseServices}
              >
                <button
                  type="button"
                  aria-expanded={isServicesOpen}
                  aria-haspopup="true"
                  aria-controls={servicesMenuId}
                  onClick={() => setIsServicesOpen((v) => !v)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 font-sans text-sm font-medium transition-colors hover:bg-white/60 ${
                    isLinkActive(link.href, currentPath)
                      ? "text-black underline underline-offset-4"
                      : "text-black/80 hover:text-black"
                  }`}
                >
                  {link.label}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isServicesOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence>
                  {isServicesOpen && (
                    <motion.div
                      id={servicesMenuId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-x-0 top-full z-20 mt-2 rounded-3xl border border-navy-100 bg-white p-5 shadow-2xl"
                      role="menu"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        {link.children.map((child) => (
                          <a
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className="flex items-start gap-3 rounded-2xl p-3 transition-colors hover:bg-navy-50"
                          >
                            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-600">
                              <ServiceIcon
                                name={
                                  (child.label === "Emergency" && "alert-triangle") ||
                                  (child.label === "Drains & Clogs" && "filter") ||
                                  (child.label === "Sewer Services" && "search") ||
                                  (child.label === "Water Heaters" && "flame") ||
                                  (child.label === "Commercial" && "building-2") ||
                                  "wrench"
                                }
                                className="h-5 w-5"
                              />
                            </span>
                            <span>
                              <span className="block font-display text-lg font-bold leading-none text-navy-800">
                                {child.label}
                              </span>
                              <span className="mt-1 block text-sm leading-snug text-navy-400">
                                {child.description}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={link.href}
                href={link.href}
                aria-current={isLinkActive(link.href, currentPath) ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-2 font-sans text-sm font-medium transition-colors hover:bg-white/60 ${
                  isLinkActive(link.href, currentPath)
                    ? "text-black underline underline-offset-4"
                    : "text-black/80 hover:text-black"
                }`}
              >
                {link.label}
              </a>
            ),
          )}
          </nav>
        </div>

        <button
          type="button"
          className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-300 xl:hidden ${
            light ? "text-navy-800" : "text-white"
          }`}
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileOpen}
          aria-controls={mobileMenuId}
          onClick={() => setIsMobileOpen((v) => !v)}
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            id={mobileMenuId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/10 bg-navy-800 xl:hidden"
          >
            <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-4">
              {navLinks.map((link) =>
                link.children ? (
                  <div key={link.label}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 font-sans text-base font-medium text-white"
                      aria-expanded={openMobileGroup === link.label}
                      aria-controls={`mobile-group-${link.label}`}
                      onClick={() =>
                        setOpenMobileGroup((v) => (v === link.label ? null : link.label))
                      }
                    >
                      {link.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          openMobileGroup === link.label ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {openMobileGroup === link.label && (
                        <motion.div
                          id={`mobile-group-${link.label}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pl-3"
                        >
                          {link.children.map((child) => (
                            <a
                              key={child.href}
                              href={child.href}
                              className="block rounded-xl px-3 py-2.5 font-sans text-sm text-white/80"
                            >
                              {child.label}
                            </a>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    aria-current={isLinkActive(link.href, currentPath) ? "page" : undefined}
                    className={`rounded-xl px-3 py-3 font-sans text-base font-medium text-white ${
                      isLinkActive(link.href, currentPath) ? "underline underline-offset-4" : ""
                    }`}
                  >
                    {link.label}
                  </a>
                ),
              )}
              {secondaryNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isLinkActive(link.href, currentPath) ? "page" : undefined}
                  className={`rounded-xl px-3 py-3 font-sans text-base font-medium text-white ${
                    isLinkActive(link.href, currentPath) ? "underline underline-offset-4" : ""
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-4">
                <a
                  href={business.phoneHref}
                  className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-3 font-display text-lg font-bold text-white"
                >
                  <Phone className="h-4 w-4 text-brand-green-400" aria-hidden="true" />
                  {business.phone}
                </a>
                <a
                  href={business.scheduleUrl}
                  className="rounded-full bg-[image:var(--btn-primary)] px-6 py-3 text-center font-display text-lg font-bold text-navy-900 shadow-[var(--shadow-btn-green)] hover:bg-[image:var(--btn-primary-hover)] hover:shadow-[var(--shadow-btn-green-hover)]"
                >
                  Schedule Online
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
