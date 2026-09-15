/**
 * The assistant's knowledge base: short, answerable documents built from the
 * site's own content (src/data/site.ts, src/data/coupons.ts), plus a handful
 * of standard, widely-published plumbing safety steps.
 *
 * Rule: nothing here may state a business fact (price, policy, timeline,
 * brand) that is not already on the website. Questions the site does not
 * answer should fall through to "the team can confirm" rather than get an
 * invented answer.
 */
import {
  business,
  services,
  serviceExtras,
  serviceGuides,
  faqs,
  financing,
  differentiators,
  howItWorks,
  aboutMilestones,
  careers,
  serviceAreaCities,
  serviceCounties,
} from "@data/site";
import { coupons } from "@data/coupons";

export type KbLink = { label: string; href: string };

export type KbDoc = {
  id: string;
  /** Questions / phrasings this document answers - weighted above the answer text. */
  questions: string[];
  /** Extra retrieval terms that don't read naturally in a question. */
  keywords?: string[];
  answer: string;
  /** Optional service this doc belongs to, so follow-ups ("how much?") keep context. */
  service?: (typeof services)[number]["slug"];
  link?: KbLink;
  /** When true, a booking offer is appended - the question implies they have the problem. */
  offerHelp?: boolean;
};

const svcLink = (slug: string, label: string): KbLink => ({ label: `${label} details`, href: `/services/${slug}` });

const docs: KbDoc[] = [];

// --- General FAQs ----------------------------------------------------------
faqs.forEach((f, i) =>
  docs.push({
    id: `faq-${i}`,
    questions: /guarantee/i.test(f.question)
      ? [f.question, "what if the problem comes back", "what happens if the leak comes back", "what if it breaks again", "what if something goes wrong after the repair", "do you stand behind your work", "do you guarantee the work"]
      : [f.question],
    answer: f.answer,
  }),
);

// --- Per-service content -----------------------------------------------------
for (const s of services) {
  const extra = serviceExtras[s.slug];
  const guide = serviceGuides[s.slug];
  const link = svcLink(s.slug, s.label);

  docs.push({
    id: `svc-${s.slug}-what`,
    questions: [`what is included in ${s.label}`, `do you do ${s.label}`, `${s.label} service`, `tell me about ${s.label}`],
    keywords: [...s.benefits, s.description],
    answer: `${s.description} That includes:\n${s.benefits.map((b) => `• ${b}`).join("\n")}`,
    service: s.slug,
    link,
    offerHelp: true,
  });

  docs.push({
    id: `svc-${s.slug}-signs`,
    questions: [`signs i need ${s.label}`, `when do i need ${s.label}`, `how do i know if i need ${s.label}`],
    keywords: s.signs as unknown as string[],
    answer: `Common signs it's time to call us about ${s.label.toLowerCase()}:\n${s.signs.map((x) => `• ${x}`).join("\n")}`,
    service: s.slug,
    link,
    offerHelp: true,
  });

  if (extra) {
    docs.push({
      id: `svc-${s.slug}-process`,
      questions: [`how does your ${s.label} process work`, `what happens during ${s.label}`, `what to expect ${s.label}`],
      keywords: extra.process.map((p) => `${p.title} ${p.description}`),
      answer: `Here's how it works:\n${extra.process.map((p, i) => `${i + 1}. ${p.title} - ${p.description}`).join("\n")}`,
      service: s.slug,
      link,
    });
    extra.faqs.forEach((f, i) =>
      docs.push({ id: `svc-${s.slug}-faq-${i}`, questions: [f.question], answer: f.answer, service: s.slug, link }),
    );
  }

  if (guide) {
    docs.push({
      id: `svc-${s.slug}-prevent`,
      questions: [`how to prevent ${s.label}`, `${guide.prevention.title}`, `tips for ${s.label}`, `how do i avoid ${s.label} problems`],
      keywords: guide.prevention.tips,
      answer: `${guide.prevention.intro}\n${guide.prevention.tips.map((t) => `• ${t}`).join("\n")}`,
      service: s.slug,
      link,
    });
    docs.push({
      id: `svc-${s.slug}-learn`,
      questions: [guide.education.title],
      keywords: guide.education.body,
      answer: guide.education.body.join(" "),
      service: s.slug,
      link,
    });
    guide.extraFaqs.forEach((f, i) =>
      docs.push({ id: `svc-${s.slug}-guide-${i}`, questions: [f.question], answer: f.answer, service: s.slug, link }),
    );
  }
}

// --- Why choose us -----------------------------------------------------------
differentiators.forEach((d, i) =>
  docs.push({
    id: `why-${i}`,
    questions: [d.title, `do you ${d.title.toLowerCase()}`, ...(/background/i.test(d.title) ? ["are your plumbers background checked", "are your techs vetted", "can i trust your technicians in my home"] : [])],
    answer: d.description,
  }),
);
docs.push({
  id: "why-all",
  questions: ["why should i choose you", "why should i trust you guys", "can i trust you", "why should i pick you over other plumbers", "why jim dandy", "what makes you different", "why hire you", "why go with you", "are you better than other plumbers"],
  answer: `A few reasons people choose ${business.shortName}:\n${differentiators.map((d) => `• ${d.title}: ${d.description}`).join("\n")}`,
});

// --- Coupons -----------------------------------------------------------------
coupons.forEach((c, i) =>
  docs.push({
    id: `coupon-${i}`,
    questions: [c.title, `do you have a ${c.title.toLowerCase()}`],
    keywords: [c.description, c.terms],
    answer: `${c.title}: ${c.description} (${c.terms})`,
    link: { label: "All coupons", href: "/coupons" },
  }),
);
docs.push({
  id: "coupon-diagnostic",
  questions: ["do you charge a diagnostic fee", "is there a service call fee", "trip charge", "do you charge to come out", "is the diagnosis free"],
  keywords: ["diagnostic fee", "service call", "trip fee", "call out fee"],
  answer: `There's a standard diagnostic visit, and right now that fee is waived when you go ahead with the recommended repair (emergency after-hours dispatch fees may still apply). Either way, you get a flat, upfront price before any work begins.`,
  link: { label: "All coupons", href: "/coupons" },
});

// --- Financing ---------------------------------------------------------------
docs.push({
  id: "financing-what",
  questions: ["what can i finance", "financing options", "do you have payment plans", "can i pay monthly"],
  answer: `${financing.intro}\nIt's best suited to larger jobs:\n${financing.financeable.map((f) => `• ${f.label} - ${f.description}`).join("\n")}`,
  link: { label: "Financing", href: "/financing" },
});
docs.push({
  id: "financing-how",
  questions: ["how does financing work", "how do i apply for financing", "financing process"],
  answer: financing.steps.map((s, i) => `${i + 1}. ${s.title} - ${s.description}`).join("\n"),
  link: { label: "Financing", href: "/financing" },
});
financing.faqs.forEach((f, i) =>
  docs.push({ id: `financing-faq-${i}`, questions: [f.question], answer: f.answer, link: { label: "Financing", href: "/financing" } }),
);

// --- Company -----------------------------------------------------------------
docs.push({
  id: "how-it-works",
  questions: ["how does it work", "what happens when i call", "what is the process", "what happens after i book", "how do you work"],
  answer: howItWorks.map((s) => `${s.step}. ${s.title} - ${s.description}`).join("\n"),
});
docs.push({
  id: "history",
  questions: ["how long have you been in business", "how long have you been around", "company history", "when were you founded", "how old is the company", "are you a family business", "are you local"],
  answer: `${business.name} has served the Puget Sound region since ${business.founded} - ${business.yearsInBusiness} years.\n${aboutMilestones.map((m) => `• ${m.year}: ${m.description}`).join("\n")}`,
  link: { label: "About us", href: "/about" },
});
docs.push({
  id: "certifications",
  questions: ["are you bbb accredited", "any awards", "certifications", "are you a phcc member", "angi"],
  answer: `We're a BBB Accredited Business, an Angi Super Service Award winner, and a PHCC member. Every technician is a licensed Washington State plumber (licenses ${business.licenses.join(" and ")}).`,
});
docs.push({
  id: "licenses",
  questions: ["what is your license number", "license numbers", "contractor license"],
  answer: `Our Washington State license numbers are ${business.licenses.join(" and ")} - they're posted in the footer of every page, and you're welcome to verify them with the state.`,
});
docs.push({
  id: "careers",
  questions: ["are you hiring", "jobs", "careers", "can i work for you", "apprenticeship", "plumber job openings"],
  keywords: careers.roles.map((r) => `${r.title} ${r.description}`),
  answer: `${careers.intro}\nRoles we hire for:\n${careers.roles.map((r) => `• ${r.title} - ${r.description}`).join("\n")}`,
  link: { label: "Careers", href: "/careers" },
});
docs.push({
  id: "service-area",
  questions: ["what areas do you serve", "service area", "which cities do you cover", "where do you work"],
  answer: `We dispatch same-day across the Puget Sound region:\n${serviceCounties.map((c) => `• ${c.name}: ${c.cities}`).join("\n")}\nCities include ${serviceAreaCities.join(", ")}.`,
  link: { label: "Service area", href: "/service-area" },
});
docs.push({
  id: "reviews",
  questions: ["reviews", "are you any good", "what do customers say", "ratings"],
  answer: `We're rated ${business.rating.value} out of 5 across ${business.rating.count} Google reviews. Customers tend to mention the upfront pricing, same-day response, and techs who explain everything before starting.`,
  link: { label: "Read reviews", href: "/reviews" },
});
docs.push({
  id: "same-day",
  questions: ["how fast can you come", "can you come today", "same day service", "how soon can someone come out", "when can you get here", "how long until a tech arrives", "can you come tomorrow"],
  answer: `Same-day appointments are available for most jobs, and emergencies are dispatched right away - most are seen within the hour. We also call with a 30-minute heads-up before we arrive. For the fastest slot, call ${business.phone}, or I can send your details to dispatch now.`,
  offerHelp: true,
});
docs.push({
  id: "weekends",
  questions: ["are you open on weekends", "do you work sundays", "saturday service", "holidays", "open at night", "after hours"],
  answer: `Regular office hours are ${business.hours.split(" · ")[0]}, and emergency service runs 24/7 - nights, weekends, and holidays included. A real dispatcher answers ${business.phone} any time.`,
});

// --- Services listed on the live site (jimdandysewerandplumbing.com/services) --
// Jim Dandy's current site has dedicated pages for these; the new site folds
// them into the six service categories, so they're answered here by name.
const legacyServices: { id: string; questions: string[]; keywords?: string[]; answer: string; service: NonNullable<KbDoc["service"]> }[] = [
  { id: "sump-pump", questions: ["sump pump not working", "do you install sump pumps", "sump pump repair", "sump pump replacement"], keywords: ["sump", "pump", "basement water"], answer: "Yes - we repair and replace sump pumps. If yours has stopped running and there's water in the pit, keep an eye on it and avoid sending water down basement drains until a tech can take a look.", service: "all-plumbing" },
  { id: "water-softener", questions: ["do you install water softeners", "water softener install", "water softener repair", "hard water"], keywords: ["softener", "hard water", "scale"], answer: "Yes - water softener installation and service is part of our plumbing work. A tech can look at your water and setup and recommend the right option.", service: "all-plumbing" },
  { id: "water-filtration", questions: ["can you install a water filter", "water filtration system", "whole house water filter", "reverse osmosis"], keywords: ["filter", "filtration", "reverse osmosis", "drinking water"], answer: "Yes - we install and service water filtration systems, from under-sink units to whole-home setups.", service: "all-plumbing" },
  { id: "garbage-disposal", questions: ["garbage disposal leaking", "garbage disposal repair", "install a new garbage disposal", "replace garbage disposal"], keywords: ["disposal", "garburator", "insinkerator"], answer: "Yes - we repair, replace, and install garbage disposals. A leak from the body of the unit usually means it needs replacing; a leak at the connections can often be repaired.", service: "all-plumbing" },
  { id: "toilets", questions: ["toilet repair", "install a new toilet", "replace my toilet", "toilet leaking at the base", "toilet wobbles"], keywords: ["toilet", "flapper", "wax ring"], answer: "Yes - toilet repairs and installs are everyday work for us: running or leaking toilets, loose or rocking bowls, worn flappers and fill valves, and full replacements.", service: "all-plumbing" },
  { id: "boiler", questions: ["do you work on boilers", "boiler repair", "boiler service"], keywords: ["boiler", "hydronic"], answer: "Yes - boiler service is part of our water heating work, for homes and commercial buildings. A licensed tech can diagnose it on-site.", service: "water-heaters" },
  { id: "repiping", questions: ["i want to repipe my house", "whole house repipe", "replace old galvanized pipes", "polybutylene pipes"], keywords: ["repipe", "repiping", "galvanized", "polybutylene"], answer: "Yes - we do whole-home and partial repiping. If you have failing galvanized or polybutylene pipe, recurring leaks, discolored water, or dropping pressure, repiping is often more economical than repeated patches. Financing is available for qualified customers.", service: "all-plumbing" },
  { id: "hydro-jetting", questions: ["what is hydro jetting", "do you do hydro jetting", "hydrojet my drains"], keywords: ["hydro", "jetting", "jet", "high pressure"], answer: "Hydro-jetting uses high-pressure water to scour grease, roots, and scale off the inside of a drain or sewer line - it removes the buildup instead of just poking a hole through it the way a snake does. We often pair it with a camera inspection to confirm the line is clear.", service: "drains-clogs" },
  { id: "camera-inspection", questions: ["can you do a sewer scope inspection", "sewer camera inspection", "we are buying a house can you inspect the sewer line", "video inspection of my drain"], keywords: ["scope", "camera", "video", "inspection", "home purchase"], answer: "Yes - we run a video camera through the line and show you the footage, so you can see roots, sags, cracks, or buildup for yourself before any work is recommended. It's a smart step before buying a home, too. Right now there's a free camera inspection when you book a drain or sewer cleaning.", service: "sewer-services" },
  { id: "trenchless", questions: ["what is trenchless sewer repair", "do you do trenchless", "pipe bursting", "pipe lining"], keywords: ["trenchless", "lining", "bursting", "no digging"], answer: "Trenchless repair fixes or replaces a sewer line without digging a long trench through your yard - either by lining the existing pipe from the inside or by bursting it and pulling a new pipe through. It isn't possible for every line; a camera inspection tells us whether yours qualifies.", service: "sewer-services" },
  { id: "dishwasher-drain", questions: ["dishwasher not draining", "dishwasher backs up into the sink", "water left in the dishwasher"], keywords: ["dishwasher"], answer: "A dishwasher that won't drain is often a clog in its drain hose or air gap, or in the kitchen drain line (and disposal) it shares. If the kitchen sink is also slow or backing up, the problem is likely in the line itself - our drain team can clear it.", service: "drains-clogs" },
  { id: "hidden-leak", questions: ["i think i have a leak somewhere", "my water bill doubled", "water bill is really high", "how do i find a hidden leak", ], keywords: ["leak", "water bill", "hidden", "under sink", "damp", "wet"], answer: "A jump in your water bill, damp spots, a musty smell, warm spots on the floor, or hearing water running when everything is off are all signs of a hidden leak. Quick check: turn off every fixture and watch the meter - if it still moves, water is escaping somewhere. We use leak-detection equipment to pinpoint it without tearing up your home.", service: "all-plumbing" },
];
for (const d of legacyServices) {
  const svc = services.find((x) => x.slug === d.service)!;
  docs.push({ ...d, link: svcLink(d.service, svc.label), offerHelp: true });
}

docs.push({
  id: "under-sink-leak",
  questions: ["water under the sink leak", "there is water under my kitchen sink", "puddle under the bathroom sink", "leaking under the sink", "cabinet under sink is wet"],
  keywords: ["under sink", "supply line", "p-trap", "compression fitting", "cabinet"],
  answer: "Water under a sink usually comes from a loose or worn supply line, a leaking shut-off valve, a drain trap that's worked loose, or the faucet base. Put a bowl under it, dry the cabinet, and close the two small shut-off valves under the sink if the water is coming from the supply side. It's typically a quick fix for our techs - and worth doing before the cabinet floor warps.",
  service: "all-plumbing",
  offerHelp: true,
});
docs.push({
  id: "dripping-fixture",
  questions: ["shower valve dripping", "my faucet is dripping", "faucet will not stop dripping", "leaky faucet", "shower head keeps dripping"],
  keywords: ["cartridge", "washer", "drip", "faucet", "shower valve", "tap"],
  answer: "A faucet or shower valve that keeps dripping usually needs a new cartridge, washer, or seal - it's a quick, common repair. It's worth doing soon: a steady drip wastes a surprising amount of water and can wear out the valve seat. Our techs carry common parts to fix most on the first visit.",
  service: "all-plumbing",
  offerHelp: true,
});
docs.push({
  id: "main-line-clearing",
  questions: ["do you unclog main sewer lines", "main line clog", "clear my main drain line", "main sewer line cleaning"],
  keywords: ["main line", "mainline", "lateral", "cleanout"],
  answer: "Yes - we clear main sewer and drain lines, not just individual fixtures. We locate the blockage, clear it (hydro-jetting for grease and roots), and run a camera to confirm the line is truly open. If several drains back up at once, the main line is the likely culprit.",
  service: "sewer-services",
  offerHelp: true,
});
docs.push({
  id: "toilet-shutoff",
  questions: ["how do i turn off the water to my toilet", "toilet shut off valve", "stop water to the toilet"],
  answer: "Look for the small oval handle on the pipe coming out of the wall or floor behind the toilet, and turn it clockwise until it stops. If it's stuck, don't force it - lift the float inside the tank to stop it filling, and shut off the main valve if water is still flowing.",
  service: "all-plumbing",
});
docs.push({
  id: "plunger",
  questions: ["can i use a plunger", "should i plunge the toilet", "how to unclog a toilet myself"],
  answer: "For a simple toilet clog, a flange-style plunger is fine - firm, steady pushes rather than hard jabs. If it doesn't clear, it keeps coming back, or other drains are slow too, the clog is deeper in the line and needs proper clearing (and skip the chemical drain cleaners).",
  service: "drains-clogs",
  offerHelp: true,
});
docs.push({
  id: "franchise",
  questions: ["are you a franchise", "are you locally owned", "are you a national chain", "is jim dandy local"],
  answer: `No - ${business.shortName} is a local, multi-generation Puget Sound company that's been serving the area since ${business.founded}, not a franchise or national chain.`,
  link: { label: "About us", href: "/about" },
});
docs.push({
  id: "text-us",
  questions: ["can i text you", "do you take texts", "text message", "can i send a text"],
  answer: `Yes - you can call or text ${business.phone}. For emergencies, calling is fastest: a live dispatcher answers 24/7.`,
});
docs.push({
  id: "coupon-combine",
  questions: ["can i use two coupons", "can i combine coupons", "can i stack discounts", "use more than one coupon"],
  answer: "Most of our coupons can't be combined with other offers - each one lists its own terms. Your technician will help you find the one that saves you the most on your specific job.",
  link: { label: "Coupon terms", href: "/coupons" },
});
docs.push({
  id: "water-heater-age",
  questions: ["water heater is 15 years old should i replace it", "how long do water heaters last", "when should i replace my water heater", "old water heater"],
  answer: "Tank water heaters are worth watching closely once they pass about 8 years - that's when annual inspections matter most. Rusty water, rumbling or popping, leaks at the base, or running out of hot water fast are all signs replacement is near. A tech can check yours and give you an honest repair-versus-replace recommendation, and financing is available for replacements.",
  service: "water-heaters",
  offerHelp: true,
});
docs.push({
  id: "water-heater-smell",
  questions: ["hot water smells like rotten eggs", "hot water smells bad", "sulfur smell from hot water"],
  answer: "A rotten-egg smell only from the hot water usually comes from a reaction inside the water heater tank (often involving the anode rod), not from gas. It's fixable - a tech can flush the tank and replace the anode if needed. (If you smell rotten eggs in the air near a gas appliance instead, treat it as a gas leak: leave and call 911 or your gas company from outside.)",
  service: "water-heaters",
  offerHelp: true,
});
docs.push({
  id: "pilot-light",
  questions: ["the pilot light on my water heater keeps going out", "pilot light will not stay lit", "water heater pilot out"],
  answer: "A pilot that won't stay lit is commonly a worn thermocouple, a dirty pilot tube, or a draft problem. Don't keep relighting it if you smell gas - leave and call your gas company. Otherwise, a tech can diagnose and repair it, usually in one visit.",
  service: "water-heaters",
  offerHelp: true,
});
docs.push({
  id: "tankless-error",
  questions: ["our tankless unit shows an error code", "tankless water heater error", "tankless not heating"],
  answer: "Tankless units show error codes for things like ignition, venting, scale buildup, or water flow issues. Note the code, check that the gas and water valves are open, and try a power reset. If it comes back, our water heater techs service tankless systems and can flush scale or repair the fault.",
  service: "water-heaters",
  offerHelp: true,
});

// --- Standard safety / what-to-do-now guidance -------------------------------
// General, widely published first steps. Always ends by routing to a pro.
docs.push({
  id: "diy-shutoff",
  questions: ["how do i shut off my water", "where is my main water shut off valve", "turn off water to the house", "how to stop water", "what should i do while i wait for the plumber"],
  keywords: ["main valve", "shut off", "turn off water", "water main"],
  answer: `To shut off your water: the main valve is usually where the water line enters the house - often in a basement, crawlspace, garage, or near the water heater - or at the meter box by the street. Turn a round wheel handle clockwise until it stops; for a lever handle, turn it so it sits crosswise to the pipe. Then open a faucet on the lowest floor to drain pressure. If it's leaking or won't turn, call ${business.phone} and our dispatcher will talk you through it.`,
  service: "emergency",
});
docs.push({
  id: "diy-toilet-overflow",
  questions: ["toilet is overflowing what do i do", "how to stop toilet overflowing", "toilet keeps running over"],
  answer: `First, stop the water: turn the small valve behind the toilet (near the floor) clockwise, or lift the float inside the tank so it stops filling. Don't flush again. If it's sewage coming up, or several drains are backing up at once, that's a main-line problem - call ${business.phone} right away.`,
  service: "drains-clogs",
  offerHelp: true,
});
docs.push({
  id: "diy-frozen",
  questions: ["my pipes are frozen", "frozen pipe what do i do", "how to thaw frozen pipes", "pipe froze", "frozen outdoor spigot", "frozen hose bib"],
  keywords: ["spigot", "hose bib", "outdoor faucet", "freeze", "frozen"],
  answer: `If a pipe is frozen: open the faucet it feeds, and gently warm the pipe from the faucet end back with a hair dryer or warm towels. Never use an open flame or torch. Know where your main shut-off is - if the pipe has split, water will pour out as it thaws. If you see a crack or any leaking, shut off the main and call ${business.phone}.`,
  service: "emergency",
  offerHelp: true,
});
docs.push({
  id: "diy-water-heater-leak",
  questions: ["water heater is leaking what should i do", "water leaking from bottom of water heater", "hot water tank leaking"],
  answer: `If your water heater is leaking: turn it off first - set a gas unit to "pilot" or off, or switch off the breaker for an electric one. Then close the cold-water valve on the pipe feeding the top of the tank. Keep kids and pets clear of hot water. A leaking tank usually needs attention soon, so call ${business.phone} or let me send your details to the team.`,
  service: "water-heaters",
  offerHelp: true,
});
docs.push({
  id: "diy-sewer-backup",
  questions: ["sewage backing up what do i do", "sewer backup what should i do", "sewage in basement", "is it safe to use my toilet if the sewer is backed up", "can i flush if the sewer is backed up"],
  answer: `If sewage is backing up: stop using water in the house - no flushing, showers, laundry, or dishwasher - so you don't add to it. Keep people and pets away from the water, and don't try to clean contaminated water without gloves. This is an emergency we handle 24/7: call ${business.phone}.`,
  service: "sewer-services",
  offerHelp: true,
});
docs.push({
  id: "diy-drain-chemicals",
  questions: ["should i use drano", "is liquid plumber safe", "can i use drain cleaner", "should i pour bleach down the drain", "what is the best drain cleaner"],
  keywords: ["drano", "liquid plumr", "chemical", "bleach", "caustic"],
  answer: serviceGuides["drains-clogs"]?.extraFaqs.find((f) => f.question.toLowerCase().includes("chemical"))?.answer ?? "We don't recommend caustic drain chemicals - they can damage pipes and rarely remove the real cause of a clog.",
  service: "drains-clogs",
});
docs.push({
  id: "diy-disposal",
  questions: ["garbage disposal jammed", "garbage disposal not working", "disposal humming"],
  answer: `For a jammed or humming garbage disposal: switch it off (and unplug it or turn off the breaker) before anything else - never put your hand inside. Many units have a red reset button on the bottom, and a hex key slot underneath to free a jam. If it still won't run, or it's leaking, our techs can repair or replace it.`,
  service: "all-plumbing",
  offerHelp: true,
});
docs.push({
  id: "diy-sewer-smell",
  questions: ["sewer smell in my house", "drain smells bad", "rotten egg smell from drain", "bathroom smells like sewage"],
  answer: `A sewer smell often comes from a floor drain or rarely-used sink whose water trap has dried out - run water in it for a minute. If the smell persists, or you notice gurgling or slow drains, it can point to a vent or sewer line problem worth a camera inspection. (If it smells like gas rather than sewage, leave the house and call 911 or your gas company from outside.)`,
  service: "sewer-services",
  offerHelp: true,
});
docs.push({
  id: "diy-low-pressure",
  questions: ["low water pressure", "why is my water pressure low", "weak water pressure"],
  answer: `If it's just one faucet or shower, unscrew the aerator or showerhead and rinse out mineral buildup. If pressure is low throughout the house, it can point to a partially closed main valve, a failing pressure regulator, a hidden leak, or aging pipes - that's worth having a licensed tech look at.`,
  service: "all-plumbing",
  offerHelp: true,
});

// --- Things people ask that the site doesn't specify -------------------------
docs.push({
  id: "unknown-payment",
  questions: ["what payment methods do you accept", "do you take credit cards", "can i pay with cash", "do you accept checks", "venmo", "insurance claim"],
  keywords: ["credit card", "debit", "cash", "check", "payment method", "insurance"],
  answer: `I don't want to guess on payment details - the office can confirm exactly what's accepted for your job. Call ${business.phone}. For larger jobs, financing is also available for qualified customers.`,
});
docs.push({
  id: "unknown-exact-price",
  questions: ["how much does a water heater cost", "price to unclog a drain", "how much for sewer replacement", "cost to fix a leak", "how much do you charge per hour", "hourly rate", "price list"],
  keywords: ["cost", "price", "how much", "rate"],
  answer: `Every job is different, so we don't quote blind over chat - a licensed tech diagnoses it and gives you a flat, upfront price before any work begins. No hourly meter, no surprise line items. Current coupons can take money off too (like $50 off repairs over $500).`,
  offerHelp: true,
});

export const knowledgeBase: readonly KbDoc[] = docs;
