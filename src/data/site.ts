export const business = {
  name: "Jim Dandy Sewer & Plumbing",
  shortName: "Jim Dandy",
  phone: "(206) 633-1141",
  phoneHref: "tel:+12066331141",
  email: "Contact@JimDandySewer.com",
  address: {
    line1: "6202 214th St SW",
    line2: "Mountlake Terrace, WA 98043",
    full: "6202 214th St SW, Mountlake Terrace, WA 98043, United States",
  },
  hours: "Mon–Fri 7am–7pm · 24/7 Emergency",
  founded: 1908,
  yearsInBusiness: new Date().getFullYear() - 1908,
  licenses: ["JIMDADE791MG", "JIMDADS879B3"],
  rating: { value: 4.8, count: 177 },
  scheduleUrl: "/contact",
  financingUrl: "/coupons",
  social: {
    facebook: "https://www.facebook.com/",
    google: "https://share.google/L2jpUnfSMJK7ZRCk8",
    x: "https://x.com/",
  },
} as const;

export type NavLink = {
  label: string;
  href: string;
  children?: { label: string; href: string; description: string }[];
};

export const services = [
  {
    slug: "emergency",
    label: "Emergency",
    icon: "alert-triangle",
    description: "24/7 response for burst pipes, floods, and sewer backup.",
    intro:
      "A burst pipe or sewage backup doesn't wait for business hours, and neither do we. A real dispatcher answers day or night and gets a licensed tech routed to your door - most calls seen the same day, emergencies within the hour.",
    benefits: [
      "24/7 live phone dispatch - no answering machines",
      "Emergency techs stocked to fix most issues on the first visit",
      "Upfront pricing quoted before any work begins",
      "Water shut-off and damage-control guidance the moment you call",
    ],
    signs: [
      "A burst or actively leaking pipe",
      "Sewage backing up into a tub, sink, or floor drain",
      "No water pressure anywhere in the house",
      "Water heater leaking or making popping/banging noises",
    ],
  },
  {
    slug: "drains-clogs",
    label: "Drains & Clogs",
    icon: "filter",
    description: "Slow, gurgling, or fully blocked — we clear it fast and get water moving again.",
    intro:
      "Slow or backed-up drains are almost never just a surface clog. We clear the line and then run a camera to confirm the real cause is gone - not just pushed further down the pipe - so the same drain doesn't back up again in a month.",
    benefits: [
      "Camera inspection included on repeat or stubborn clogs",
      "Hydro-jetting for grease, roots, and scale buildup",
      "Kitchen, bathroom, floor, and main line drains",
      "Same-day appointments available",
    ],
    signs: [
      "Water draining slowly in a sink, tub, or shower",
      "Gurgling sounds from drains or toilets",
      "Recurring clogs in the same fixture",
      "Sewer odor near a floor drain or cleanout",
    ],
  },
  {
    slug: "sewer-services",
    label: "Sewer Services",
    icon: "search",
    description: "From root intrusion to line replacement, we diagnose and fix it right the first time.",
    intro:
      "Sewer line problems used to mean tearing up the yard. In most cases we can now diagnose with a video camera and repair or fully replace the line trenchlessly - less mess, less time, and no re-landscaping bill on top of the plumbing bill.",
    benefits: [
      "Video camera inspection with footage shown to you before any work",
      "Trenchless pipe lining and pipe bursting where the site allows",
      "Root intrusion, bellies, and collapsed pipe repair",
      "Coordination with the city on permits and locates",
    ],
    signs: [
      "Multiple drains backing up at the same time",
      "Sewage smell in the yard or basement",
      "Unusually lush or soggy patches of lawn",
      "Toilets gurgling when the washing machine drains",
    ],
  },
  {
    slug: "water-heaters",
    label: "Water Heaters",
    icon: "flame",
    description: "Installs, repairs, and replacements for gas and electric units — hot water, restored fast.",
    intro:
      "From a same-day tank swap to a full tankless conversion, we size the unit to your household and install it to code - then walk you through the warranty and maintenance so it actually lasts as long as it's rated for.",
    benefits: [
      "Tank and tankless install, repair, and replacement",
      "Same-day replacement for most standard tank units",
      "Gas, electric, and hybrid heat-pump systems",
      "Manufacturer warranty registration handled for you",
    ],
    signs: [
      "Lukewarm water or running out of hot water fast",
      "Rusty or metallic-tasting hot water",
      "Popping, rumbling, or banging from the tank",
      "Water pooling at the base of the water heater",
    ],
  },
  {
    slug: "all-plumbing",
    label: "All Plumbing",
    icon: "wrench",
    description: "Leaky faucets, running toilets, low pressure — no job too small for our licensed team.",
    intro:
      "Not every plumbing job is an emergency - sometimes it's a leaky faucet, a fixture install, or a repipe you've been putting off. Our licensed techs handle the full range of residential plumbing with the same upfront pricing and workmanship guarantee.",
    benefits: [
      "Faucet, toilet, and fixture installs or repairs",
      "Whole-home and partial repiping",
      "Leak detection and slab leak repair",
      "Gas line inspection, repair, and installation",
    ],
    signs: [
      "A dripping faucet or running toilet",
      "Low water pressure at one or more fixtures",
      "Visible corrosion on exposed pipes",
      "Planning a remodel that touches plumbing",
    ],
  },
  {
    slug: "commercial",
    label: "Commercial",
    icon: "building-2",
    description: "Reliable plumbing support for offices, restaurants, and properties that can't afford downtime.",
    intro:
      "Downtime costs money. We work with property managers, restaurants, and multi-family buildings on scheduled maintenance plans and back them with the same 24/7 emergency response we offer residential customers - so a plumbing issue never turns into a closed sign.",
    benefits: [
      "Preventive maintenance contracts for multi-unit properties",
      "Grease trap, backflow, and code-compliance service",
      "Priority emergency response for commercial accounts",
      "Detailed invoicing for property management and accounting",
    ],
    signs: [
      "Recurring drain or grease trap backups",
      "An upcoming backflow or code inspection",
      "Aging plumbing in a building you manage",
      "Need for an after-hours service contract",
    ],
  },
] as const;

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  {
    label: "Services",
    href: "/services",
    children: services.map((s) => ({
      label: s.label,
      href: `/services/${s.slug}`,
      description: s.description,
    })),
  },
  { label: "Commercial", href: "/commercial" },
  { label: "Coupons", href: "/coupons" },
  { label: "Service Area", href: "/service-area" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const footerServiceLinks = [
  { label: "Emergency", href: "/services/emergency" },
  { label: "Drains & Clogs", href: "/services/drains-clogs" },
  { label: "Sewer Services", href: "/services/sewer-services" },
  { label: "Water Heaters", href: "/services/water-heaters" },
  { label: "All Plumbing", href: "/services/all-plumbing" },
  { label: "Commercial", href: "/commercial" },
];

export const footerSitemapLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Commercial", href: "/commercial" },
  { label: "Coupons", href: "/coupons" },
  { label: "Service Area", href: "/service-area" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const howItWorks = [
  {
    step: "1",
    title: "Call or Schedule Online",
    description: "Tell us what's happening. Same-day booking for emergencies.",
  },
  {
    step: "2",
    title: "We Diagnose & Quote Upfront",
    description: "A licensed tech diagnoses and prices the job before touching anything.",
  },
  {
    step: "3",
    title: "Problem Solved",
    description: "We fix it right. No surprise bills. That's been our standard since 1908.",
  },
] as const;

export const reviews = [
  {
    name: "Aleen Pineda",
    timeAgo: "7 months ago",
    rating: 5,
    text: "The team at Jim Dandy were super! I got my issues corrected before winter and 100% would recommend them. Jeremy did a great job, was kind, communicative, and very knowledgeable!",
  },
  {
    name: "Marcus Webb",
    timeAgo: "3 months ago",
    rating: 5,
    text: "Called at 11pm with a burst pipe and had a tech at the door within the hour. Upfront pricing, no games. This is who I'm calling from now on.",
  },
  {
    name: "Priya Shah",
    timeAgo: "1 month ago",
    rating: 5,
    text: "Replaced our water heater same day. Clean work, explained everything, and the price matched the quote exactly. Genuinely great experience.",
  },
  {
    name: "David Ortiz",
    timeAgo: "5 months ago",
    rating: 5,
    text: "Sewer line inspection and trenchless repair - they showed me the camera footage before recommending anything. Zero pressure, honest assessment.",
  },
  {
    name: "Hannah Lee",
    timeAgo: "2 weeks ago",
    rating: 5,
    text: "118 years in business shows. Professional from the first call to the final invoice. Highly recommend Jim Dandy for anything plumbing related.",
  },
] as const;

export const serviceAreaCities = [
  "Seattle",
  "Bellevue",
  "Redmond",
  "Kirkland",
  "Renton",
  "Tacoma",
  "Burien",
  "Mountlake Terrace",
  "Shoreline",
  "Everett",
  "Edmonds",
  "Lynnwood",
  "Bothell",
  "Federal Way",
  "Auburn",
  "Kent",
];

export const faqs = [
  {
    question: "Do you offer 24/7 emergency plumbing service?",
    answer:
      "Yes. A real dispatcher answers any hour of the day, and we send a licensed technician out the same day for burst pipes, sewer backups, and other urgent issues - nights, weekends, and holidays included.",
  },
  {
    question: "Are your plumbers licensed, bonded, and insured?",
    answer:
      "Every technician is a licensed Washington State plumber, and Jim Dandy carries full bonding and insurance. Our license numbers are posted in the footer of every page - feel free to verify them with the state.",
  },
  {
    question: "How much will my repair cost?",
    answer:
      "We diagnose the problem on-site and give you flat-rate, upfront pricing before any work begins. You'll never be billed by the hour or surprised by the final invoice.",
  },
  {
    question: "Do you offer financing?",
    answer:
      "Yes. Approved customers can finance larger repairs and installations - water heaters, sewer replacement, and repiping - with flexible monthly payment plans. Ask your technician or use the \"Get Financed\" link to apply.",
  },
  {
    question: "What areas do you service?",
    answer:
      "We dispatch same-day across the Puget Sound region, including Seattle, Bellevue, Redmond, Kirkland, Renton, Tacoma, and the surrounding King, Snohomish, and Pierce County communities. See our full service area for the complete list.",
  },
  {
    question: "Is your work guaranteed?",
    answer:
      "Yes. Every repair is backed by our workmanship guarantee - if something isn't right after we leave, call us and we'll make it right at no extra charge.",
  },
] as const;

export const certifications = [
  { label: "Accredited Business", org: "BBB" },
  { label: "Angi Super Service Award", org: "2024" },
  { label: "PHCC Member", org: "PHCC" },
  { label: "Accredited Business", org: "BBB" },
];

/**
 * The six promises that set Jim Dandy apart, sourced from the live site's
 * value props. `icon` maps to a key in the TrustFeatures icon table.
 */
export const differentiators = [
  {
    icon: "shield",
    title: "Licensed, Bonded & Insured",
    description:
      "Every technician is a licensed Washington State plumber, fully bonded and insured. License numbers are posted on every page.",
  },
  {
    icon: "receipt",
    title: "Upfront, Flat-Rate Pricing",
    description:
      "You approve a written price before we touch a thing. No hourly meter, no surprise line items on the final invoice.",
  },
  {
    icon: "store",
    title: "One Call Covers It All",
    description:
      "Residential and commercial, a dripping faucet to a full sewer replacement - one licensed team handles the entire job.",
  },
  {
    icon: "timer",
    title: "30-Minute Arrival Notice",
    description:
      "We call ahead with a 30-minute heads-up before we arrive, so you're never left waiting inside an all-day window.",
  },
  {
    icon: "user-check",
    title: "Background-Checked Techs",
    description:
      "The person at your door is vetted, uniformed, and trained - someone you can trust in your home or business.",
  },
  {
    icon: "handshake",
    title: "Warranty-Backed Workmanship",
    description:
      "If something isn't right after we leave, we come back and make it right at no extra charge. That's the guarantee.",
  },
] as const;

/**
 * Per-service editorial content that powers the redesigned detail pages:
 * a deeper overview paragraph, a step-by-step process, and focused FAQs.
 * Keyed by the service slug in `services`.
 */
export const serviceExtras: Record<
  string,
  {
    tagline: string;
    overviewTitle: string;
    overview: string[];
    process: { title: string; description: string }[];
    faqs: { question: string; answer: string }[];
  }
> = {
  emergency: {
    tagline: "24/7 Live Dispatch",
    overviewTitle: "When Minutes Matter, We Answer",
    overview: [
      "Plumbing emergencies don't keep business hours. A burst supply line can put gallons of water into your walls every minute, and a sewage backup only gets worse the longer it sits.",
      "That's why a real dispatcher - never a machine - answers Jim Dandy's line at any hour. We route the nearest licensed tech to your door, walk you through shutting off the water while you wait, and arrive stocked to fix most emergencies on the first visit.",
    ],
    process: [
      { title: "Call a Live Dispatcher", description: "A real person answers day or night and gets your address into the dispatch queue immediately." },
      { title: "Stop the Damage", description: "We guide you through shutting off water or gas over the phone while a tech is en route." },
      { title: "Same-Hour Arrival", description: "The nearest licensed technician arrives - most emergencies within the hour - and diagnoses on the spot." },
      { title: "Fixed & Upfront", description: "You get a flat price before work begins, and we repair most issues in a single visit." },
    ],
    faqs: [
      { question: "How fast can you actually get here?", answer: "For true emergencies we dispatch the nearest available technician immediately - most Puget Sound customers are seen within the hour, and we give you a 30-minute arrival notice before we pull up." },
      { question: "Do you charge extra for nights and weekends?", answer: "After-hours emergency dispatch may carry a service fee, but you'll always know the full price before any work starts. No surprises added to the invoice later." },
      { question: "What should I do while I wait?", answer: "Shut off your main water valve if you can reach it safely, clear the area, and stay on with our dispatcher - we'll talk you through limiting the damage until the tech arrives." },
    ],
  },
  "drains-clogs": {
    tagline: "Camera-Verified Clearing",
    overviewTitle: "Clear the Clog, Confirm the Cause",
    overview: [
      "A plunger or store-bought chemical might get things flowing for a week, but recurring clogs are almost always a symptom of something deeper - grease, root intrusion, or scale narrowing the pipe.",
      "We clear the line, then run a camera to confirm the real cause is gone rather than just pushed further down. For grease and roots, hydro-jetting scours the pipe wall back to full diameter so the same drain doesn't back up again next month.",
    ],
    process: [
      { title: "Pinpoint the Blockage", description: "We locate exactly where and why the line is clogged - not just the fixture that's backing up." },
      { title: "Clear It Completely", description: "Cabling for standard clogs, high-pressure hydro-jetting for grease, roots, and heavy scale." },
      { title: "Camera Confirmation", description: "On stubborn or repeat clogs we run a camera so you can see the line is genuinely clear." },
      { title: "Prevent the Repeat", description: "We flag any root intrusion or pipe damage we spot, so a clog doesn't become a backup." },
    ],
    faqs: [
      { question: "Why does my drain keep clogging in the same spot?", answer: "Repeat clogs usually mean grease buildup, root intrusion, or a pipe defect narrowing the line. A camera inspection shows the true cause so we can fix it once instead of clearing it monthly." },
      { question: "What is hydro-jetting?", answer: "Hydro-jetting uses high-pressure water to scour the full inside diameter of the pipe - cutting through grease, sludge, and roots that a cable alone just punches a hole in." },
      { question: "Is a camera inspection included?", answer: "We include a camera inspection on repeat or stubborn clogs, and offer it as an add-on any time you want to see the condition of your line before it becomes a problem." },
    ],
  },
  "sewer-services": {
    tagline: "Trenchless Specialists",
    overviewTitle: "Fix the Line, Save the Yard",
    overview: [
      "Sewer trouble used to mean an excavator and a torn-up lawn. Today, most main-line problems can be diagnosed with a video camera and repaired trenchlessly - no re-landscaping bill stacked on top of the plumbing bill.",
      "We show you the camera footage before recommending anything, then repair or fully replace the line with pipe lining or pipe bursting wherever the site allows. When digging is truly the only option, we coordinate permits and locates and put your yard back the way we found it.",
    ],
    process: [
      { title: "Video Camera Inspection", description: "We snake a camera down the line and show you exactly what's wrong - roots, a belly, or a collapse." },
      { title: "Honest Diagnosis", description: "You see the footage and get a clear repair-or-replace recommendation with a flat price." },
      { title: "Trenchless Repair", description: "Pipe lining or bursting restores the line with minimal digging wherever the site allows." },
      { title: "Verified & Cleaned Up", description: "A final camera pass confirms the fix, and we handle permits, locates, and site cleanup." },
    ],
    faqs: [
      { question: "What is trenchless sewer repair?", answer: "Trenchless methods - pipe lining and pipe bursting - rebuild or replace your sewer through small access points instead of a full-length trench, so your driveway, lawn, and landscaping stay intact." },
      { question: "How do I know if my sewer line needs replacing?", answer: "Multiple drains backing up at once, sewage smell in the yard, soggy lawn patches, or gurgling toilets are common signs. A camera inspection tells us whether a spot repair or full replacement is the right call." },
      { question: "Will you tear up my yard?", answer: "In most cases, no. Trenchless repair needs only small access pits. If a section must be dug, we coordinate the permits and restore the area when we're done." },
    ],
  },
  "water-heaters": {
    tagline: "Same-Day Replacement",
    overviewTitle: "Hot Water, Sized and Installed Right",
    overview: [
      "A water heater that's rusting, rumbling, or running cold rarely fails at a convenient time. We keep standard tank units on the truck for same-day replacement and size every install to your household's real demand.",
      "Prefer to go tankless? We handle full conversions - gas, electric, and hybrid heat-pump systems - install to code, and register the manufacturer warranty for you so the unit lasts as long as it's rated for.",
    ],
    process: [
      { title: "Assess Your Demand", description: "We match tank size or tankless capacity to how much hot water your home actually uses." },
      { title: "Upfront Quote", description: "You get a flat price covering the unit, code-compliant install, and haul-away of the old heater." },
      { title: "Same-Day Install", description: "Most standard tank swaps are done the same day; tankless conversions are scheduled promptly." },
      { title: "Warranty Handled", description: "We register your manufacturer warranty and walk you through simple maintenance to protect it." },
    ],
    faqs: [
      { question: "Tank or tankless - which is right for me?", answer: "Tankless units save space and deliver endless hot water but cost more upfront; a quality tank is cheaper to install and simpler to service. We'll size both to your home and give you an honest recommendation." },
      { question: "Can you replace my water heater today?", answer: "For most standard tank units, yes - we stock common sizes and can often complete a same-day replacement, including haul-away of the old unit." },
      { question: "How long should a water heater last?", answer: "A well-maintained tank typically lasts 8-12 years; tankless units often run 20+ years. Rusty water, popping sounds, or pooling at the base usually mean it's time to plan a replacement." },
    ],
  },
  "all-plumbing": {
    tagline: "Full-Service Plumbing",
    overviewTitle: "One Licensed Team for the Whole House",
    overview: [
      "Not every job is a 2 a.m. emergency. Sometimes it's a faucet that's been dripping for months, a remodel that touches the water lines, or a repipe you've been putting off.",
      "Our licensed techs handle the full range of residential plumbing - fixtures, leak detection, repiping, gas lines, and more - with the same upfront pricing and workmanship guarantee we bring to every call.",
    ],
    process: [
      { title: "Tell Us What's Going On", description: "Describe the issue or project and we'll book the right technician and time window." },
      { title: "On-Site Diagnosis", description: "We inspect, explain what we find in plain language, and quote a flat price before starting." },
      { title: "Done Right the First Time", description: "Licensed, code-compliant work - from a single fixture to a whole-home repipe." },
      { title: "Backed by Our Guarantee", description: "Every repair is covered by our workmanship guarantee, so it stays fixed." },
    ],
    faqs: [
      { question: "Do you handle small jobs like a single faucet?", answer: "Absolutely. No job is too small - a running toilet, a dripping faucet, or a fixture swap gets the same licensed, guaranteed service as a major repair." },
      { question: "Can you repipe an older home?", answer: "Yes. We do partial and whole-home repiping, replacing aging galvanized or failing pipe with modern materials, and we'll walk you through the plan and price before we begin." },
      { question: "Do you work on gas lines?", answer: "We inspect, repair, and install gas lines for appliances, water heaters, and remodels - always to code and permitted where required." },
    ],
  },
  commercial: {
    tagline: "Built for Business Uptime",
    overviewTitle: "Plumbing That Keeps You Open",
    overview: [
      "For a restaurant, a storefront, or a multi-family building, a plumbing failure isn't an inconvenience - it's lost revenue and a closed sign. Downtime is the real cost.",
      "We partner with property managers and business owners on scheduled maintenance built around your operating hours, and back it with the same 24/7 emergency response and priority dispatch that keep commercial accounts running.",
    ],
    process: [
      { title: "Walkthrough & Plan", description: "We assess your building's plumbing and build a maintenance schedule around your hours." },
      { title: "Preventive Maintenance", description: "Grease traps, backflow, drains, and water heaters serviced before they become failures." },
      { title: "Priority Emergency Response", description: "Commercial accounts jump the queue when something urgent happens - day or night." },
      { title: "Clear Documentation", description: "Detailed, itemized invoices built for property management and accounting workflows." },
    ],
    faqs: [
      { question: "Do you offer maintenance contracts?", answer: "Yes. We build preventive maintenance plans for restaurants, retail, offices, and multi-family properties - scheduled around your business hours to avoid disrupting operations." },
      { question: "Can you handle after-hours commercial emergencies?", answer: "Commercial accounts get priority 24/7 dispatch. A live dispatcher answers any hour and routes a licensed tech so a plumbing issue never becomes a closed sign." },
      { question: "Do you service grease traps and backflow?", answer: "We handle grease trap pumping and service, backflow testing and certification, and the code-compliance documentation your jurisdiction requires." },
    ],
  },
};

/** Milestones for the About page timeline. */
export const aboutMilestones = [
  { year: "1908", title: "Seattle's Original Plumbers", description: "Jim Dandy opens its doors, serving a young, growing Seattle with honest plumbing and sewer work." },
  { year: "1950s", title: "Postwar Puget Sound Boom", description: "As the suburbs expand, Jim Dandy grows with them - repiping new neighborhoods across King and Snohomish Counties." },
  { year: "1990s", title: "Trenchless Technology", description: "We invest in video inspection and trenchless repair, fixing sewer lines without tearing up the yard." },
  { year: "Today", title: "118 Years and Counting", description: "Fully licensed, bonded, and insured, dispatching same-day across the Puget Sound region 24/7." },
];

/** Counties in the coverage footprint, for the Service Area page. */
export const serviceCounties = [
  { name: "King County", cities: "Seattle, Bellevue, Redmond, Kirkland, Renton, Kent, Auburn, Federal Way, Burien" },
  { name: "Snohomish County", cities: "Everett, Edmonds, Lynnwood, Bothell, Mountlake Terrace, Shoreline" },
  { name: "Pierce County", cities: "Tacoma and the surrounding South Sound communities" },
];

/**
 * Deep, educational content per service that powers the expanded detail pages.
 * Keyed by service slug. Additive to `serviceExtras`.
 */
export const serviceGuides: Record<
  string,
  {
    education: { title: string; body: string[] };
    prevention: { title: string; intro: string; tips: string[] };
    extraFaqs: { question: string; answer: string }[];
  }
> = {
  emergency: {
    education: {
      title: "Why Plumbing Emergencies Escalate So Fast",
      body: [
        "A failing supply line can release several gallons of water a minute. Left unchecked, that water wicks into drywall, subfloor, and framing within the hour - and standing water can begin growing mold in as little as 24 to 48 hours.",
        "The single most valuable thing you can do before help arrives is shut off the water. Knowing where your main shut-off valve is - and that it actually turns - can be the difference between a quick repair and a full restoration claim. When you call, our dispatcher will walk you through it step by step.",
      ],
    },
    prevention: {
      title: "Prevent the Next Emergency",
      intro: "Most emergencies give quiet warnings first. A few habits dramatically lower your odds of a 2 a.m. flood.",
      tips: [
        "Locate and label your main water shut-off - and test that it turns freely twice a year.",
        "Replace rubber washing-machine and supply hoses with braided stainless steel every 5-7 years.",
        "Insulate exposed pipes in crawlspaces and garages before the first hard freeze.",
        "Never ignore a small, recurring leak - it's often the first sign of a larger failure.",
        "Have your water heater inspected annually, especially once it passes the 8-year mark.",
      ],
    },
    extraFaqs: [
      { question: "What actually counts as a plumbing emergency?", answer: "Burst or actively leaking pipes, sewage backing up into your home, no water anywhere in the house, a leaking water heater, or a gas smell all warrant an immediate call. When in doubt, call - our dispatcher will help you decide whether it can wait until morning." },
      { question: "Should I shut off the water heater too?", answer: "If your water heater is leaking or you've shut off the main water supply, turn the heater to 'pilot' (gas) or off at the breaker (electric) to prevent it from heating an empty tank. Our dispatcher can confirm the right step for your unit over the phone." },
    ],
  },
  "drains-clogs": {
    education: {
      title: "What's Really Clogging Your Drain",
      body: [
        "Most clogs are years in the making. Kitchen lines narrow as grease and food residue cool and harden on the pipe wall. Bathroom drains collect a stubborn braid of hair and soap scum. And in older homes, tree roots find their way into the tiniest joint and keep growing.",
        "That's why 'snaking' a line often isn't a real fix - a cable can punch a hole through a grease plug and restore flow for a week or two, but the buildup is still there. Camera-verified cleaning and hydro-jetting remove the cause, not just the symptom.",
      ],
    },
    prevention: {
      title: "Keep Your Drains Flowing",
      intro: "Simple kitchen and bathroom habits prevent the vast majority of clogs we're called out to clear.",
      tips: [
        "Never pour grease or cooking oil down the drain - let it cool and throw it away.",
        "Fit every sink, tub, and shower with a mesh strainer to catch hair and food.",
        "Flush drains with hot water weekly, and an enzyme cleaner monthly, to keep lines clear.",
        "Only ever flush toilet paper - 'flushable' wipes are the number-one cause of clogs.",
        "Skip caustic store-bought drain chemicals; they damage pipes and rarely fix the real cause.",
      ],
    },
    extraFaqs: [
      { question: "Are chemical drain cleaners safe to use?", answer: "We don't recommend them. Caustic drain chemicals can corrode older pipes, damage seals, and often just eat a channel through the clog while leaving the buildup behind - then a technician has to work around the leftover chemicals. Mechanical clearing is safer and more thorough." },
      { question: "How often should drains be professionally cleaned?", answer: "For most homes, a preventive cleaning every 18-24 months keeps things flowing. Homes with mature trees, a garbage disposal used heavily, or a history of backups benefit from an annual service plus a periodic camera check." },
    ],
  },
  "sewer-services": {
    education: {
      title: "How Sewer Lines Fail - and How We Find It",
      body: [
        "Your sewer lateral is the single pipe carrying everything from your home to the city main, and it's usually buried several feet underground. When it fails, it's rarely dramatic at first - a slow-draining house, an occasional gurgle, a faint smell in the yard.",
        "The usual culprits are root intrusion at the joints, a 'belly' where the line has sagged and collects waste, or the pipe material itself breaking down - clay, cast iron, and old Orangeburg pipe all have a shelf life. A video camera inspection shows us exactly which it is, so you're never paying to guess.",
      ],
    },
    prevention: {
      title: "Protect Your Sewer Line",
      intro: "Sewer replacement is one of the biggest plumbing bills a homeowner can face. A little foresight goes a long way.",
      tips: [
        "If your home is 40+ years old, get a baseline camera inspection - especially before buying or remodeling.",
        "Plant trees and large shrubs well away from the path of your sewer lateral.",
        "Never flush wipes, hygiene products, or 'flushable' cat litter - they snag and build up.",
        "Act on early warning signs: multiple slow drains, gurgling toilets, or a soggy patch of lawn.",
        "Consider trenchless lining for an aging-but-intact pipe before it fails outright.",
      ],
    },
    extraFaqs: [
      { question: "How long does a sewer line last?", answer: "It depends on the material. Modern PVC can last 100 years; cast iron and clay typically run 50-60; Orangeburg (a tar-paper pipe common mid-century) often fails in 30-50. A camera inspection tells us the real condition regardless of age." },
      { question: "Is trenchless repair always an option?", answer: "Not always - it depends on the pipe's condition, its layout, and access. Where the existing line is intact enough to host a liner, or straight enough to burst, trenchless saves your yard. If it isn't, we'll show you the footage and explain exactly why." },
    ],
  },
  "water-heaters": {
    education: {
      title: "Getting the Most From Your Water Heater",
      body: [
        "Sediment is the silent killer of tank water heaters. Minerals settle to the bottom of the tank, insulate the burner from the water, and force the unit to work harder - which shows up as popping sounds, higher energy bills, and a shorter lifespan.",
        "A little maintenance changes the math. An annual flush, a healthy anode rod, and the right temperature setting can add years to a tank and keep a tankless unit running at peak efficiency. When it is time to replace, sizing the unit to your real demand matters more than buying the biggest tank on the shelf.",
      ],
    },
    prevention: {
      title: "Extend Your Water Heater's Life",
      intro: "A few minutes of maintenance a year protects one of the hardest-working appliances in your home.",
      tips: [
        "Flush the tank once a year to clear sediment and restore efficiency.",
        "Have the anode rod checked every few years - replacing it prevents tank corrosion.",
        "Set the thermostat to 120°F: hot enough to be safe and comfortable, cool enough to save energy.",
        "Test the temperature-and-pressure (T&P) relief valve annually for safe operation.",
        "Watch for rusty water, pooling at the base, or popping sounds - all signs to call before it fails.",
      ],
    },
    extraFaqs: [
      { question: "What temperature should I set my water heater to?", answer: "120°F is the sweet spot recommended by most manufacturers and the Department of Energy - hot enough to prevent bacteria and comfortable for use, while reducing scald risk and energy waste. We'll set it correctly during any install or service." },
      { question: "Why is my water heater making popping or rumbling noises?", answer: "That's almost always sediment at the bottom of the tank boiling and shifting. It signals lost efficiency and added strain on the unit. A flush often quiets it - but on an older tank, the noise can also be an early warning that replacement is near." },
    ],
  },
  "all-plumbing": {
    education: {
      title: "Small Leaks, Big Consequences",
      body: [
        "A faucet dripping once per second wastes over 3,000 gallons a year. A running toilet can quietly waste far more. But the real damage from leaks is rarely the water bill - it's the slow rot of cabinets, subfloor, and framing behind and beneath fixtures where you can't see it.",
        "Catching plumbing issues early is almost always cheaper than reacting to them. From leak detection and fixture repair to whole-home repiping, our licensed techs handle the full range of residential work with the same upfront pricing and guarantee we bring to emergencies.",
      ],
    },
    prevention: {
      title: "Smart Home Plumbing Habits",
      intro: "A handful of simple checks each season keeps small problems from becoming expensive ones.",
      tips: [
        "Check under sinks and around toilets for moisture or warping every few months.",
        "Watch your water bill - an unexplained jump is often the first sign of a hidden leak.",
        "Know where every shut-off valve is: main, water heater, toilets, and under-sink stops.",
        "Replace worn faucet washers and toilet flappers promptly instead of living with a drip.",
        "Address low water pressure early; it can point to buildup, a leak, or failing pipe.",
      ],
    },
    extraFaqs: [
      { question: "How do I know if I have a hidden leak?", answer: "Warning signs include a spike in your water bill, a musty smell, warm spots on the floor (for slab leaks), stained ceilings or walls, or the sound of running water when everything is off. We use leak-detection equipment to pinpoint it without tearing up your home." },
      { question: "When should I think about repiping?", answer: "If you have failing galvanized steel or polybutylene pipe, recurring leaks, discolored water, or steadily dropping pressure, repiping is often more economical than repeated patches. We'll assess your system and give you an honest repair-versus-repipe recommendation." },
    ],
  },
  commercial: {
    education: {
      title: "Why Commercial Plumbing Is a Different Game",
      body: [
        "A commercial building's plumbing works harder and answers to more rules than any home. High-volume fixtures, grease-laden kitchen lines, backflow assemblies, and code-mandated inspections all have to keep working while your doors stay open.",
        "The cost of a failure isn't just the repair - it's lost revenue, unhappy tenants, and a potential health-code problem. That's why smart operators treat plumbing as scheduled maintenance, not a fire drill. We build a plan around your building and your hours so problems get caught before they cost you a day.",
      ],
    },
    prevention: {
      title: "Keep Your Building Running",
      intro: "Preventive maintenance is the cheapest plumbing you'll ever buy. Here's what keeps commercial systems healthy.",
      tips: [
        "Schedule grease trap service on a set cadence - before it triggers a backup or a citation.",
        "Keep backflow assemblies tested and certified on your jurisdiction's annual schedule.",
        "Hydro-jet high-use kitchen and floor drains proactively rather than waiting for a clog.",
        "Train staff on what can and can't go down drains and toilets to prevent avoidable damage.",
        "Log and document service so inspections and property records are always audit-ready.",
      ],
    },
    extraFaqs: [
      { question: "How often should a grease trap be serviced?", answer: "It depends on volume and trap size, but many food-service operations need service every 1-3 months to stay ahead of backups and code requirements. We'll assess your kitchen and recommend a cadence, then keep it on schedule for you." },
      { question: "Do you provide documentation for inspections?", answer: "Yes. Every commercial service comes with clear, itemized invoicing and service records built for property management, accounting, and code inspectors - not handwritten receipts." },
    ],
  },
};

/** Additional testimonials shown on the dedicated Reviews page (with the homepage set). */
export const extraReviews = [
  { name: "Gregory Nolan", timeAgo: "4 months ago", rating: 5, text: "Had a main line back up on a Sunday. Jim Dandy answered on the second ring, had a tech out in under an hour, and showed me the camera footage before quoting. Fair price, zero drama. Lifelong customer now.", city: "Shoreline" },
  { name: "Teresa Okafor", timeAgo: "6 months ago", rating: 5, text: "They repiped our 1950s house over three days and left it cleaner than they found it. Every person we dealt with was professional and patient with our questions. Worth every penny.", city: "Bellevue" },
  { name: "Sam Whitaker", timeAgo: "2 months ago", rating: 5, text: "Tankless water heater conversion done right. They sized it properly, walked me through the warranty, and the price matched the quote exactly. Highly recommend.", city: "Kirkland" },
  { name: "Denise Carrillo", timeAgo: "8 months ago", rating: 5, text: "Our restaurant's floor drains were backing up during dinner service. They came after hours, jetted the lines, and set us up on a maintenance plan so it never happens again. Absolute pros.", city: "Seattle" },
  { name: "Owen Bradley", timeAgo: "3 weeks ago", rating: 5, text: "Trenchless sewer replacement without wrecking my landscaping - I honestly didn't think that was possible. The crew was on time every day and communicated the whole way through.", city: "Renton" },
  { name: "Marisol Vega", timeAgo: "5 months ago", rating: 4, text: "Great work on a stubborn kitchen clog that two other plumbers couldn't fix. Camera inspection found the real problem. Only reason for four stars is they ran a little late, but they called ahead.", city: "Lynnwood" },
  { name: "Curtis Hammond", timeAgo: "1 year ago", rating: 5, text: "118 years in business and it shows. Old-school honesty with modern equipment. They fixed a slab leak the same day and the price was exactly what they said. Can't ask for more.", city: "Everett" },
] as const;

/** Financing page content. Deliberately generic pending client's lender details. */
export const financing = {
  intro:
    "Some plumbing problems can't wait for the perfect time - and the right repair shouldn't have to. Qualified customers can spread the cost of larger jobs over affordable monthly payments, so you can fix it right now and pay over time.",
  financeable: [
    { label: "Water Heater Replacement", description: "Tank and tankless installs, including full conversions." },
    { label: "Sewer Repair & Replacement", description: "Trenchless lining, pipe bursting, and full line replacement." },
    { label: "Whole-Home Repiping", description: "Replacing aging galvanized or failing pipe throughout the house." },
    { label: "Major Drain & Leak Work", description: "Hydro-jetting, slab leak repair, and larger diagnostic jobs." },
  ],
  steps: [
    { title: "Get Your Quote", description: "Your technician diagnoses the issue and gives you a flat, upfront price - no obligation." },
    { title: "Apply in Minutes", description: "Ask about financing and complete a quick application through our lending partners." },
    { title: "Get a Fast Decision", description: "Most applicants receive a decision quickly, with a range of monthly payment options." },
    { title: "Fix It Now, Pay Over Time", description: "Approve the work and spread the cost across manageable monthly payments." },
  ],
  faqs: [
    { question: "What can I finance?", answer: "Financing is best suited to larger investments - water heater replacement, sewer repair or replacement, whole-home repiping, and major leak or drain work. Ask your technician whether your job qualifies." },
    { question: "How do I apply?", answer: "It's simple: let your technician or our office know you'd like to explore financing, and we'll guide you through a short application with one of our lending partners. It only takes a few minutes." },
    { question: "Will checking my options affect my credit?", answer: "Terms and credit requirements are set by the lending partner, and many offer a prequalification step. We'll point you to the current options so you can review the details before committing." },
    { question: "Can I combine financing with a coupon?", answer: "Some promotions can be combined and some can't. Ask your technician - we'll always help you find the most affordable path for your specific job." },
  ],
};

/** Careers page content. Generic and honest - no invented job postings. */
export const careers = {
  intro:
    "For over a century, Jim Dandy has been the name Puget Sound trusts for honest plumbing. Behind that reputation is a team of licensed professionals who take pride in their craft - and we're always looking for good people to join it.",
  values: [
    { title: "Craftsmanship First", description: "We do the job right, not just fast. If you take pride in clean, code-compliant work, you'll fit in here." },
    { title: "Honest, Every Time", description: "Upfront pricing and straight talk aren't a marketing line - they're how we treat customers and each other." },
    { title: "Invested in You", description: "From apprentices to master plumbers, we support training, licensing, and real career growth." },
    { title: "Family Since 1908", description: "We're a local, multi-generation company - not a faceless franchise. People here know your name." },
  ],
  benefits: [
    "Competitive, experience-based pay",
    "Fully stocked, well-maintained service trucks",
    "Ongoing training and licensing support",
    "Clear path from apprentice to journeyman to master",
    "Steady, year-round work across the Puget Sound region",
    "A respectful, no-nonsense team culture",
  ],
  roles: [
    { title: "Licensed Plumbers", description: "Residential and commercial service, repair, and installation. WA license required." },
    { title: "Apprentices & Trainees", description: "Learn the trade alongside seasoned pros with a real path to journeyman." },
    { title: "Sewer & Drain Technicians", description: "Camera inspection, hydro-jetting, and trenchless repair specialists." },
    { title: "Office & Dispatch", description: "The friendly, organized people who keep our crews - and customers - moving." },
  ],
};

/** Extra pages, surfaced in the mobile nav and footer (never on the fixed-width desktop pill). */
export const secondaryNavLinks = [
  { label: "Reviews", href: "/reviews" },
  { label: "Gallery", href: "/gallery" },
  { label: "Financing", href: "/financing" },
  { label: "Careers", href: "/careers" },
];
