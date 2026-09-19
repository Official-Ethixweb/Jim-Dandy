import { business, serviceAreaCities } from "@data/site";

export type SeoProps = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
};

/**
 * Derived from `site` in astro.config.mjs via Astro's built-in SITE env var, so
 * the production origin is declared in exactly one place. The fallback only
 * applies if `site` is ever removed from the config, which would also break the
 * sitemap integration.
 */
const SITE_URL = (import.meta.env.SITE as string | undefined)?.replace(/\/$/, "")
  ?? "https://www.jimdandysewerandplumbing.com";
const SITE_NAME = business.name;
/** Service pages end with "| Jim Dandy" to keep the title inside the ~60-char
 *  SERP limit once geography is included, so the brand-suffix check has to
 *  recognise the short form too or it would append the full name a second time. */
const SITE_SHORT_NAME = business.shortName;

/** Stable node ids, so every graph on the site points at one business entity
 *  and one organization rather than re-declaring them per page. */
const BUSINESS_ID = `${SITE_URL}/#business`;
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function resolveCanonical(path: string) {
  return new URL(path, SITE_URL).toString();
}

/**
 * Only these routes render actual review content (`<ReviewsSection />` or the
 * reviews listing). `aggregateRating` is asserted nowhere else, because a star
 * rating in the markup of a page with no visible reviews - /terms, /404 - is a
 * schema/content mismatch Google treats as spam.
 */
export function pathShowsReviews(path: string) {
  return path === "/" || path === "/about" || path === "/reviews" || path.startsWith("/services");
}

/**
 * `sameAs` must only ever contain real profile URLs. The social entries in
 * site.ts are partly unfilled placeholders pointing at bare domain roots
 * ("https://www.facebook.com/"), and claiming those as the business's profiles
 * is false structured data - so anything without a real path is dropped. Fill
 * in the real URLs in site.ts and they appear here automatically.
 */
export function isRealProfileUrl(url: string) {
  try {
    return new URL(url).pathname.replace(/\/$/, "").length > 0;
  } catch {
    return false;
  }
}

function realProfileUrls() {
  return Object.values(business.social).filter(isRealProfileUrl);
}

/** The cities actually advertised on /service-area, stated explicitly.
 *  A GeoCircle was previously used instead, and its radius excluded Everett
 *  and Tacoma - both of which the site says are served. */
function areaServed() {
  return serviceAreaCities.map((city) => ({
    "@type": "City",
    name: `${city}, WA`,
  }));
}

export function localBusinessSchema({ includeRating = false } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Plumber",
    "@id": BUSINESS_ID,
    name: business.name,
    image: `${SITE_URL}/shared/seo/og-default.jpg`,
    url: SITE_URL,
    telephone: business.phoneHref.replace("tel:", ""),
    email: business.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.line1,
      addressLocality: "Mountlake Terrace",
      addressRegion: "WA",
      postalCode: "98043",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 47.7906,
      longitude: -122.3079,
    },
    // Office hours exactly as shown on the page ("Mon-Fri 7am-7pm"). The 24/7
    // emergency line is a separate contact point rather than weekend-only
    // opening hours, which contradicted the visible hours and left weekday
    // nights out. Confirm both against the Google Business Profile.
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "19:00",
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "emergency",
      telephone: business.phoneHref.replace("tel:", ""),
      areaServed: "US-WA",
      availableLanguage: "en",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    },
    ...(includeRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: business.rating.value,
            reviewCount: business.rating.count,
          },
        }
      : {}),
    sameAs: realProfileUrls(),
    foundingDate: `${business.founded}`,
    areaServed: areaServed(),
  };
}

/**
 * Organization and WebSite describe the publisher and the site itself, as
 * opposed to the physical place of business. Emitted once, on the homepage.
 *
 * TODO: add `logo` once a square raster logo is exported to /public. The only
 * logo in the repo is a wide lockup under src/assets, and pointing `logo` at
 * the OG banner instead would be inaccurate.
 */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: business.name,
    url: SITE_URL,
    telephone: business.phoneHref.replace("tel:", ""),
    email: business.email,
    foundingDate: `${business.founded}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.line1,
      addressLocality: "Mountlake Terrace",
      addressRegion: "WA",
      postalCode: "98043",
      addressCountry: "US",
    },
    sameAs: realProfileUrls(),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

/**
 * Service schema for a service detail page. `provider` references the single
 * business node by @id rather than restating it, and the offer catalog is
 * built from the same `benefits` list the page renders visibly.
 */
export function serviceSchema(service: {
  name: string;
  label: string;
  slug: string;
  description: string;
  benefits: readonly string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.label,
    description: service.description,
    url: resolveCanonical(`/services/${service.slug}`),
    provider: { "@id": BUSINESS_ID },
    areaServed: areaServed(),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${service.label} - What's Included`,
      itemListElement: service.benefits.map((benefit) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: benefit },
      })),
    },
  };
}

export function faqSchema(items: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: resolveCanonical(item.path),
    })),
  };
}

export { SITE_URL, SITE_NAME, SITE_SHORT_NAME, BUSINESS_ID, ORG_ID };
