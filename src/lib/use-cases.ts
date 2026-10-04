/**
 * Industry pages (/use-cases/*). Each is written for one audience, so no two
 * pages share an intro, a benefit or an example prompt — the difference
 * between a page that answers a search and a doorway page that only matches it.
 *
 * The templates a page shows come from each template's own `useCases` list in
 * ./templates/catalog, so the two can't disagree. Prices and credit costs are
 * read from ./pricing for the same reason.
 */

import { AGENT_COSTS, PLANS } from "@/lib/pricing";

const ENTRY_PLAN = PLANS[0];
const ENTRY_CREDITS = Number(ENTRY_PLAN.features[0].replace(/\D/g, ""));

export type UseCaseSlug =
  | "real-estate"
  | "hotels-and-resorts"
  | "architecture"
  | "interior-design"
  | "portfolio";

export interface UseCase {
  slug: UseCaseSlug;
  /** Short label for cards and links. */
  name: string;
  /** The page's H1. */
  heading: string;
  /** <title>, before the brand suffix. */
  metaTitle: string;
  /** Meta description: under 160 characters. */
  description: string;
  /** Card copy on the hub and the homepage. */
  summary: string;
  /** The first paragraph answers the query on its own, in 40–60 words. */
  intro: [string, ...string[]];
  benefitsHeading: string;
  benefits: { title: string; body: string }[];
  sectionsHeading: string;
  sections: string[];
  examplePrompt: string;
  /** Template shown on this page's card and social preview. */
  coverTemplateId: string;
  guideSlugs: string[];
  faq: { question: string; answer: string }[];
}

export const USE_CASES_UPDATED = "2026-10-04";

export const USE_CASES: UseCase[] = [
  {
    slug: "real-estate",
    name: "Real estate",
    heading: "AI website builder for real estate",
    metaTitle: "AI Website Builder for Real Estate",
    description:
      "Build a cinematic property website from a prompt: launch sites for developments, single-listing showcases and rental collections. Templates included.",
    summary: "Launch sites for developments, single-listing showcases and rental collections.",
    intro: [
      "Framerate builds real estate websites from a written brief. Describe the property, the buyer and the mood, and its AI designs and codes a responsive site with scroll-driven film, residence listings and an enquiry path, ready to publish or export as code. It suits new developments, single listings and rental collections.",
      "Property is sold on feeling before floor plans. A cinematic site lets a buyer move through the light, the view and the approach to the front door before they book a viewing, which a listing portal's photo grid can't do.",
    ],
    benefitsHeading: "Why cinematic sites work for property",
    benefits: [
      {
        title: "Sell the place, not the paperwork",
        body: "Scroll-scrubbed film takes a visitor from the street to the terrace in one gesture, so the atmosphere does the persuading before the specifications do.",
      },
      {
        title: "Launch before the building exists",
        body: "Pre-construction projects need a mood before they have photographs. A site built around renders and one strong line, like the Luxury Apartments template's \"A new icon rises,\" builds a waitlist while the scaffolding is still up.",
      },
      {
        title: "Give a premium listing its own address",
        body: "Instead of sharing a portal page with a hundred other homes, a signature property can have a site of its own, and the next one starts from a new prompt.",
      },
      {
        title: "Keep the code",
        body: "Publish straight from Framerate, or download the site's code and host it on your brokerage's own domain.",
      },
    ],
    sectionsHeading: "What a property website should include",
    sections: [
      "A hero film or image sequence that establishes location and light",
      "Residences or listings with size, bedrooms and a starting price",
      "The neighborhood: what is within walking distance, and how it feels",
      "Floor plans or a gallery for each home",
      "Amenities, with the two or three that matter most at the top",
      "A viewing or enquiry form with one clear next step",
      "Sales office location and contact details",
    ],
    examplePrompt:
      "A launch website for Horizon House, 40 oceanfront residences in Miami Beach priced from $4 million. Open on an aerial film of the tower at golden hour, then the residences with sizes and prices, the amenities deck, the neighborhood, and a private viewing request form. Editorial serif headlines, a sand and ink palette.",
    coverTemplateId: "luxury-apartments",
    guideSlugs: [
      "why-3d-websites-convert-better",
      "roi-of-interactive-websites",
      "how-much-does-a-3d-website-cost",
      "3d-landing-page-optimization",
    ],
    faq: [
      {
        question: "Can I build a website for a single property listing?",
        answer:
          "Yes. Describe one home and Framerate builds a dedicated showcase for it, like the Mediterranean House template: a scroll-through film of the house, the story of the place, and a way to enquire. Each listing can be its own site.",
      },
      {
        question: "Does it work for pre-construction and new developments?",
        answer:
          "Developments are a natural fit, because they need atmosphere before they have photographs. Start from renders or a reference image, and lead with the residences, pricing, and a waitlist or viewing request.",
      },
      {
        question: "Can I change the site after it is built?",
        answer:
          "Yes. Ask for changes in plain words, such as \"add a floor plan section for the penthouse,\" and the preview updates. You can also download the code and keep working on it in your own editor.",
      },
    ],
  },
  {
    slug: "hotels-and-resorts",
    name: "Hotels & resorts",
    heading: "AI website builder for hotels and resorts",
    metaTitle: "Hotel & Resort Website Builder with AI",
    description:
      "Create a cinematic hotel, resort or villa-rental website from a prompt, with scroll-driven film, rooms and villas, and a clear path to book. Templates included.",
    summary: "Resorts, boutique hotels, villa collections and travel brands that sell on arrival.",
    intro: [
      "Framerate builds hotel and resort websites from a short description. Tell it about the property, the guests and the feeling of arriving, and its AI designs a responsive site with scroll-driven film, rooms or villas, experiences and a booking call to action, ready to publish or export as code.",
      "Guests choose a stay the way they choose a film: on atmosphere. The first screen of a resort website has one job, which is to make someone want to be there, and moving image does that faster than any amount of copy.",
    ],
    benefitsHeading: "Why cinematic sites work for hospitality",
    benefits: [
      {
        title: "Arrival comes before the booking",
        body: "Open on the approach: the first view of the water, the villa at dusk. The Maldives Resort template starts on a pool villa facing the lagoon and lets scrolling carry the guest inward.",
      },
      {
        title: "Rooms and villas that sell themselves",
        body: "Each residence gets its own moment, with guests, suites, signature features and a nightly from-price, as in the Coast House template.",
      },
      {
        title: "Every screen leads to booking",
        body: "Keep one action in reach throughout, whether that is \"Book your stay,\" an enquiry form, or a link to the booking engine you already use.",
      },
      {
        title: "Seasonal changes in a sentence",
        body: "Update an offer, swap a section or add a new villa by describing the change, rather than briefing an agency and waiting.",
      },
    ],
    sectionsHeading: "What a hotel or resort website should include",
    sections: [
      "A hero film that captures arrival and setting",
      "Rooms, suites or villas with capacity, highlights and from-prices",
      "Experiences: dining, spa, excursions and what guests remember",
      "The location, how to get there, and what is nearby",
      "A booking call to action on every screen",
      "A journal or gallery for seasonal stories",
      "Contact details and policies",
    ],
    examplePrompt:
      "A website for Nala, a private island resort in the South Malé Atoll, forty minutes from Malé. Open with a film of a pool villa facing the lagoon at sunrise, then the villas with guests and nightly prices, dining and the house reef, the journey there, and a \"Book your stay\" button that stays in reach. A calm, sun-bleached palette with a modern serif.",
    coverTemplateId: "maldives-resort",
    guideSlugs: [
      "interactive-3d-storytelling-for-brands",
      "cinematic-web-design-trends-2026",
      "improving-core-web-vitals-on-3d-sites",
      "why-3d-websites-convert-better",
    ],
    faq: [
      {
        question: "Can the site connect to my booking engine?",
        answer:
          "Every booking button can link to the booking engine you already use: give the builder its URL in a follow-up prompt. Framerate builds the website, and reservations stay in your existing system.",
      },
      {
        question: "Will a video-led site be slow on phones?",
        answer:
          "It doesn't have to be. The templates use scroll-scrubbed video rather than a 3D engine, and keep all text as real HTML, so the page is readable while media loads. Our guide to Core Web Vitals on 3D sites covers the details.",
      },
      {
        question: "Can I build a site for a villa collection rather than one hotel?",
        answer:
          "Yes. Coast House and Villa Jacuzzi are both built for collections: each property gets its own section with location, capacity and highlights, and one brand ties them together.",
      },
    ],
  },
  {
    slug: "architecture",
    name: "Architecture",
    heading: "AI website builder for architects",
    metaTitle: "AI Website Builder for Architects & Studios",
    description:
      "Build an architecture portfolio site from a prompt: selected projects, your process and a way to start a conversation, with scroll-driven film.",
    summary: "Studio portfolios that walk visitors through projects the way a site visit would.",
    intro: [
      "Framerate builds architecture websites from a written brief. Describe your practice, your projects and how you work, and its AI designs a responsive portfolio with project pages, your process and an enquiry path, using scroll-driven film to move through spaces the way a visit would.",
      "Architecture is experienced in sequence: approach, threshold, light, room. Most portfolio sites flatten that into a grid of photographs. A scroll-driven site restores the sequence and lets a visitor walk through a project at their own pace.",
    ],
    benefitsHeading: "Why scroll-driven sites suit architecture",
    benefits: [
      {
        title: "Show the walk-through, not only the photo",
        body: "Scrubbing a film with the scroll moves a visitor from site to structure to atmosphere, which is how the Northline Atelier template presents its Brief → Site → Structure → Atmosphere process.",
      },
      {
        title: "Selected work, properly captioned",
        body: "Each project carries its location, type and year, such as \"Canyon House, Topanga, California, ground-up, 2024,\" so clients and press can reference it accurately.",
      },
      {
        title: "Your process, in your words",
        body: "Write about how you work in plain language and Framerate turns it into an approach section that reads like your studio rather than a theme.",
      },
      {
        title: "A site for a single project",
        body: "Spin up a focused site for one house, a competition entry or an exhibition from a single prompt.",
      },
    ],
    sectionsHeading: "What an architecture website should include",
    sections: [
      "A statement of how the practice works",
      "Selected projects with location, type and year",
      "Process, from brief and site to structure and atmosphere",
      "A page per project, with drawings, photographs and film",
      "Studio, team and recognition",
      "A simple way to begin a conversation",
    ],
    examplePrompt:
      "A portfolio site for a small architecture studio that designs custom homes in California and New York. Open with a slow film moving from a canyon site to a finished concrete house, then our approach, three selected homes with location, type and year, and a \"Begin a conversation\" contact section. A quiet, material palette: stone, timber and shadow.",
    coverTemplateId: "northline-atelier",
    guideSlugs: [
      "how-to-create-a-3d-portfolio-website",
      "spatial-computing-and-web-design",
      "best-fonts-for-cinematic-3d-websites",
      "future-of-scroll-driven-web-design",
    ],
    faq: [
      {
        question: "Can I use my own project photography and renders?",
        answer:
          "Attach a reference image when you describe the site to set its look. To use your own photography and films throughout, download the code and add your media, or give the builder links to your files in a follow-up prompt.",
      },
      {
        question: "Is it a good fit for a one-person practice?",
        answer:
          `Often a better one than for a large firm. A sole practitioner needs a site that looks considered without a web designer on retainer, and plans start at $${ENTRY_PLAN.monthlyPrice} a month.`,
      },
      {
        question: "Can search engines read my project pages?",
        answer:
          "Yes. Project names, locations and descriptions are real text on the page, not baked into video, so search engines and AI assistants can read and cite them.",
      },
    ],
  },
  {
    slug: "interior-design",
    name: "Interior design",
    heading: "AI website builder for interior designers",
    metaTitle: "AI Website Builder for Interior Designers",
    description:
      "Create a cinematic website for an interior design, kitchen or home studio from a prompt. Show materials, process and finished rooms. Templates included.",
    summary: "Kitchen, interiors, home-cinema and outdoor studios whose work is felt, not listed.",
    intro: [
      "Framerate builds interior design websites from a short brief. Describe your studio, the rooms you make and the clients you serve, and its AI designs a responsive site with scroll-driven film of your spaces, collections, process and a project enquiry form, ready to publish or export as code.",
      "Clients hire an interior designer for taste, and taste is hard to prove with a list of services. A site that moves across a kitchen as morning light reaches the stone, or settles into a home cinema as the lights go down, shows it instead.",
    ],
    benefitsHeading: "Why cinematic sites work for interiors",
    benefits: [
      {
        title: "Materials you can almost touch",
        body: "Slow, scroll-controlled film suits texture: oiled oak, honed stone, brushed brass. The Luxury Kitchen template is built around exactly that.",
      },
      {
        title: "Collections, not a services list",
        body: "Group your work into collections such as kitchens, living spaces and outdoor rooms, and give each one a short story and a call to action.",
      },
      {
        title: "From specialist to full studio",
        body: "The same approach works for kitchen makers, home-cinema installers like the Home Theatre template's Atelier Noir, and outdoor designers like Backyard Pool's Fieldwork.",
      },
      {
        title: "Edit by asking",
        body: "Add a new project, rewrite a section or change the palette by describing it. There is no theme editor to learn.",
      },
    ],
    sectionsHeading: "What an interior design website should include",
    sections: [
      "A hero film of a signature room or material",
      "Collections or services: kitchens, living spaces, outdoor rooms",
      "Your process, from first consultation to installation",
      "Selected projects with detail and before-and-after shots",
      "The materials and makers you work with",
      "A project enquiry form that asks for budget and timeline",
    ],
    examplePrompt:
      "A website for Form / Matter, a studio that designs bespoke kitchens and living spaces. Open with a slow film across a stone island in morning light, then three collections, the materials we use, our process from first visit to installation, and a \"Start your project\" enquiry form. Warm neutrals and grotesk headlines.",
    coverTemplateId: "luxury-kitchen",
    guideSlugs: [
      "the-psychology-of-interactive-web-design",
      "best-fonts-for-cinematic-3d-websites",
      "convert-2d-image-to-3d-website",
      "ai-generated-backgrounds-for-websites",
    ],
    faq: [
      {
        question: "Does Framerate work for kitchen and joinery studios?",
        answer:
          "Yes. The Luxury Kitchen template was built for a bespoke kitchen studio, with collections, materials and a project enquiry flow you can adapt to cabinetry, joinery or bathrooms.",
      },
      {
        question: "Can I show before-and-after projects?",
        answer:
          "Ask for it in your prompt, for example \"a project section with before and after images for each kitchen,\" and the builder adds it. Refine the layout with follow-up messages.",
      },
      {
        question: "How many changes can I make?",
        answer:
          `Each prompt to the builder uses ${AGENT_COSTS.CODE} credits, so the ${ENTRY_PLAN.title} plan's ${ENTRY_CREDITS} monthly credits cover about ${Math.floor(ENTRY_CREDITS / AGENT_COSTS.CODE)} prompts: a first build and plenty of refinements.`,
      },
    ],
  },
  {
    slug: "portfolio",
    name: "Portfolios",
    heading: "AI 3D portfolio website builder",
    metaTitle: "3D Portfolio Website Builder with AI",
    description:
      "Build a cinematic 3D portfolio website from a prompt. For designers, studios and creatives who want motion and atmosphere without writing the code.",
    summary: "Portfolios for designers, studios and creatives who want motion without the code.",
    intro: [
      "Framerate builds portfolio websites from a description of your work. Tell it what you make, who you make it for and the mood you want, and its AI designs a responsive portfolio with scroll-driven motion, project pages and a contact section that you can refine by chat, publish, or export as code.",
      "A portfolio is the first piece of your work a client sees. Motion and depth signal craft before anyone reads a word, but building them by hand means weeks of WebGL and animation code. Framerate gets you there from a paragraph.",
    ],
    benefitsHeading: "Why a cinematic portfolio stands out",
    benefits: [
      {
        title: "Atmosphere as a first impression",
        body: "Lead with a scene, not a headshot: a neon city for a game artist, a quiet material study for a product designer. Retro Miami and Northline Atelier show how far apart two cinematic styles can be.",
      },
      {
        title: "Projects with room to breathe",
        body: "Give each case study its own section or page, with role, client, year and the story behind the work.",
      },
      {
        title: "No code required, all of the code available",
        body: "Describe changes in plain words, then download the source when you want full control.",
      },
      {
        title: "Easy to keep current",
        body: "Add your latest project in a sentence instead of reopening a site builder you haven't touched in a year.",
      },
    ],
    sectionsHeading: "What a portfolio website should include",
    sections: [
      "A hero scene that says what you do in one line",
      "Selected projects with role, client and year",
      "Case-study pages with process and outcomes",
      "About: background, skills and tools",
      "Clients, press or awards",
      "Contact, with email and social links",
    ],
    examplePrompt:
      "A portfolio for a motion designer who works on music videos and game trailers. Open on a neon city at night that moves as you scroll, then six projects with role, client and year, a short about section, and a contact block with email and Instagram. Bold condensed type, black with one electric accent.",
    coverTemplateId: "retro-miami",
    guideSlugs: [
      "how-to-create-a-3d-portfolio-website",
      "best-fonts-for-cinematic-3d-websites",
      "how-to-build-a-3d-website",
      "scroll-driven-3d-animations-tutorial",
    ],
    faq: [
      {
        question: "Is there a portfolio template?",
        answer:
          "Not a dedicated one yet. Most creatives start from a prompt. Northline Atelier, a studio portfolio, and Retro Miami, a bold launch site, are useful style references you can download and adapt.",
      },
      {
        question: "Do I need to know Three.js or WebGL?",
        answer:
          "No. You describe the site in plain language and the motion is built for you. The exported code is standard React and Next.js if you want to take it further.",
      },
      {
        question: "Can recruiters and search engines read it?",
        answer:
          "Yes. Project titles and descriptions are real text on the page, so search engines, screen readers and AI assistants can read them; nothing important is locked inside an image or a video.",
      },
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((useCase) => useCase.slug === slug);
}
