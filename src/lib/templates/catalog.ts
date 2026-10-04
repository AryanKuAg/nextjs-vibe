// ---------------------------------------------------------------------------
// Template pages (/templates/*): what each gallery template is, for people and
// search engines deciding whether it fits.
//
// The registry stays the source of truth for which templates exist, their
// demo, repo and covers; this file only adds the words. Every description was
// written from the template's live demo, so keep it in step when a demo
// changes: a page describing sections the demo doesn't have is worse than none.
// ---------------------------------------------------------------------------

import type { UseCaseSlug } from "@/lib/use-cases";

import { TEMPLATE_REGISTRY, type TemplateManifest } from "./registry";

interface TemplateCopy {
  /** The fictional brand the demo is built for. */
  brand: string;
  /** Short label for cards and the page's meta line. */
  category: string;
  /** <title> and H1 suffix, phrased the way people search: "[type] website template". */
  seoTitle: string;
  /** Under 160 characters: meta description and card copy. */
  summary: string;
  overview: [string, ...string[]];
  /** What is actually on the demo, top to bottom. */
  sections: string[];
  bestFor: string[];
  useCases: UseCaseSlug[];
  /** Read from the template repo's package.json. */
  framework: "next" | "vite";
  scrollVideo: boolean;
}

export const CATALOG_UPDATED = "2026-10-04";

const COPY: Record<string, TemplateCopy> = {
  "backyard-pool": {
    brand: "Fieldwork",
    category: "Pool & outdoor living",
    seoTitle: "Pool & Outdoor Living Website Template",
    summary:
      "A cinematic website template for pool builders and outdoor living studios: a three-scene scroll film, services and a project enquiry call to action.",
    overview: [
      "Backyard Pool is the site for Fieldwork, a fictional studio that designs pools, patios, outdoor kitchens and gardens. It opens on a three-part film that you scrub with the scroll, each scene landing on a single line: design your dream pool, swim into every season, built for backyard life.",
      "It is built for businesses whose work is best understood outdoors and in motion. Instead of a gallery of finished pools, the visitor moves through the space as it takes shape, then meets one clear next step: start your project.",
    ],
    sections: [
      "A loading screen that holds the first frame until the film is ready",
      "A three-scene, scroll-scrubbed hero film with a progress counter",
      "A service line covering pools, patios, kitchens and gardens",
      "\"Start your project\" and \"Let's talk\" calls to action",
    ],
    bestFor: [
      "Pool builders and installers",
      "Landscape and garden designers",
      "Outdoor kitchen and patio specialists",
      "Home improvement contractors",
    ],
    useCases: ["interior-design", "architecture"],
    framework: "next",
    scrollVideo: true,
  },
  "coast-house": {
    brand: "Arcadia",
    category: "Luxury villa rentals",
    seoTitle: "Luxury Villa Rental Website Template",
    summary:
      "A luxury villa rental website template with a residence collection, nightly rates, guest capacity and an enquiry flow, set on the coasts of Greece, Spain and Italy.",
    overview: [
      "Coast House is the site for Arcadia, a fictional collection of private coastal villas in Paros, Mallorca, Ibiza and on the Amalfi Coast. Its centerpiece is the collection: each residence shows its location, a nightly from-price, guests and suites, and three signature features, such as \"Infinity pool · Private chef · Sea access.\"",
      "After the collection comes the stay experience, written as a softer kind of service, and an enquiry call to action. It is the most information-rich template in the gallery, which makes it a strong starting point for rental businesses that need real listing detail as well as mood.",
    ],
    sections: [
      "A hero with the line \"Stay somewhere unforgettable\"",
      "A residence collection with location, nightly from-price, guests and suites",
      "Three signature features for each villa",
      "\"The stay experience,\" with six service highlights",
      "\"View residence\" and \"Enquire\" calls to action",
    ],
    bestFor: [
      "Villa rental agencies",
      "Boutique hospitality brands",
      "Vacation rental managers",
      "Luxury travel concierges",
    ],
    useCases: ["hotels-and-resorts", "real-estate"],
    framework: "next",
    scrollVideo: false,
  },
  "coworking-space": {
    brand: "Local Office",
    category: "Coworking & flexible offices",
    seoTitle: "Coworking Space Website Template",
    summary:
      "A coworking space website template for flexible offices: a scroll-driven film of the building and its neighborhood, with an \"Explore spaces\" call to action.",
    overview: [
      "Coworking Space is the site for Local Office, a fictional flexible-workspace operator at 11 West 24th Street in Manhattan. A film you move through with the scroll carries four short chapters, from \"Work in the heart of NYC\" to \"Your next move starts here.\"",
      "Coworking is sold on location and energy as much as on desks and meeting rooms, so the template leads with the city around the building and keeps one action in view throughout: explore spaces.",
    ],
    sections: [
      "A loading screen with the building's street address",
      "A four-chapter scroll film about the space and the neighborhood",
      "A repeated \"Explore spaces\" call to action",
      "Location framing for a single building",
    ],
    bestFor: [
      "Coworking operators",
      "Flexible office providers",
      "Commercial landlords leasing suites",
      "Business and innovation centers",
    ],
    useCases: ["real-estate"],
    framework: "next",
    scrollVideo: true,
  },
  "greece-view": {
    brand: "Atelier Viaggio",
    category: "Luxury travel",
    seoTitle: "Luxury Travel Agency Website Template",
    summary:
      "A luxury travel website template for private journeys: an editorial hero on a Greek island terrace, journeys, the experience and a contact call to action.",
    overview: [
      "Greece View is the site for Atelier Viaggio, a fictional company that designs private journeys. It opens on a Cycladic terrace, with bougainvillea and a lemon tree framing the sea, under an editorial serif headline: \"Travel, without the ordinary.\"",
      "The navigation is deliberately short: journeys, the experience, contact. It suits travel brands that sell on itinerary and taste rather than on search filters, and want the first screen to feel like the trip itself.",
    ],
    sections: [
      "An editorial hero with a serif headline over a Mediterranean scene",
      "An \"Explore journeys\" call to action",
      "Navigation for journeys, the experience and contact",
      "A scroll-to-explore film with location coordinates",
    ],
    bestFor: [
      "Luxury travel agencies",
      "Tour operators and destination management companies",
      "Boutique hotels in Greece and the Mediterranean",
      "Yacht and island-hopping charters",
    ],
    useCases: ["hotels-and-resorts"],
    framework: "vite",
    scrollVideo: true,
  },
  "home-theatre": {
    brand: "Atelier Noir",
    category: "Home cinema & AV",
    seoTitle: "Home Theater Website Template",
    summary:
      "A dark, cinematic website template for home theater and AV installers: a scroll film that sets the room, a bold promise and a \"Build your theatre\" call to action.",
    overview: [
      "Home Theatre is the site for Atelier Noir, a fictional studio that designs and builds private cinemas. It opens in darkness, \"preparing the room,\" before the headline lands: \"Your cinema. Built at home.\"",
      "The whole template is about one sensation, the lights going down. That makes it a natural fit for AV integrators, acoustic designers and smart-home studios whose work is hard to photograph and easy to feel.",
    ],
    sections: [
      "A \"Preparing the room\" loading sequence",
      "A hero headline with a single promise: immersive sound, perfect picture",
      "A scroll film of a private cinema",
      "A \"Build your theatre\" call to action",
    ],
    bestFor: [
      "Home theater installers",
      "AV and smart-home integrators",
      "Acoustic designers",
      "Luxury home technology retailers",
    ],
    useCases: ["interior-design", "portfolio"],
    framework: "next",
    scrollVideo: true,
  },
  "luxury-apartments": {
    brand: "Horizon House",
    category: "Luxury residential development",
    seoTitle: "Luxury Real Estate Development Website Template",
    summary:
      "A website template for launching luxury residences: an unveiling film of an oceanfront tower in Miami Beach, the residences, the experience and enquiries.",
    overview: [
      "Luxury Apartments is the site for Horizon House, a fictional collection of oceanfront residences in Miami Beach. The hero shows the tower still wrapped, with a helicopter lifting the cover, under the line \"A new icon rises.\"",
      "It is a launch site, built to create anticipation for a building before anyone moves in, with the residences, the experience of living there, and enquiries kept close at hand. That makes it a fit for developers and sales teams running pre-construction campaigns.",
    ],
    sections: [
      "An unveiling hero film of the tower",
      "Residences, with a starting price",
      "\"The experience,\" a lifestyle section",
      "An enquiries call to action",
      "Location coordinates and a scroll-to-reveal cue",
    ],
    bestFor: [
      "Property developers",
      "Pre-construction sales teams",
      "Luxury brokerages",
      "Condo and branded-residence launches",
    ],
    useCases: ["real-estate", "architecture"],
    framework: "vite",
    scrollVideo: true,
  },
  "luxury-kitchen": {
    brand: "Form / Matter",
    category: "Kitchen & interior design",
    seoTitle: "Kitchen Design Studio Website Template",
    summary:
      "A website template for kitchen and interior design studios: a slow material film, four chapters on craft and materials, and a \"Start your project\" enquiry.",
    overview: [
      "Luxury Kitchen is the site for Form / Matter, a fictional studio that makes bespoke kitchens and living spaces. Three lines set the tone as the film plays: designed around the way you live, built for everyday rituals, made to last a lifetime.",
      "A menu opens onto four chapters: crafted to fit, materials that last, spaces worth living in, and start your project. It is built for studios whose selling point is material and craft, and who want enquiries rather than a shopping cart.",
    ],
    sections: [
      "A material-led hero film with three short statements",
      "A full-screen menu with four chapters",
      "Crafted to fit, materials that last, and spaces worth living in",
      "\"Explore collections\" and \"Start your project\" calls to action",
    ],
    bestFor: [
      "Kitchen designers and makers",
      "Joinery and cabinetry studios",
      "Interior design practices",
      "Showrooms selling bespoke interiors",
    ],
    useCases: ["interior-design"],
    framework: "next",
    scrollVideo: true,
  },
  "maldives-resort": {
    brand: "Nala Maldives",
    category: "Island resort",
    seoTitle: "Island Resort & Hotel Website Template",
    summary:
      "An island resort and hotel website template: a scroll-to-enter film of a Maldives pool villa, the stay, the island, a journal and a \"Book your stay\" button.",
    overview: [
      "Maldives Resort is the site for Nala, a fictional private-island hideaway in the South Malé Atoll, forty minutes from Malé. It opens on a pool villa facing the lagoon, with the line \"Stay close to the water.\"",
      "Navigation covers the stay, the island and a journal, and \"Book your stay\" sits in the header from the first frame. The film is entered by scrolling, so the arrival plays out at the guest's own pace.",
    ],
    sections: [
      "A scroll-to-enter film of a villa on the lagoon",
      "A persistent \"Book your stay\" button",
      "Navigation for the stay, the island and a journal",
      "A \"Find your villa\" call to action",
      "Travel time and location details",
    ],
    bestFor: [
      "Island and beach resorts",
      "Boutique hotels",
      "Villa collections",
      "Hospitality groups opening a new property",
    ],
    useCases: ["hotels-and-resorts"],
    framework: "vite",
    scrollVideo: true,
  },
  "mediterranean-house": {
    brand: "Solena",
    category: "Single-property showcase",
    seoTitle: "Luxury Property Listing Website Template",
    summary:
      "A single-property website template for a luxury home: a three-scene scroll film of a house on the Ionian coast and a \"Discover the house\" call to action.",
    overview: [
      "Mediterranean House is the site for Solena, a single private residence on the Ionian coast of Greece. It is built around one film in three scenes that the visitor wanders through by scrolling, under the line \"Live closer to the sun.\"",
      "One house, one site: it shows how a premium listing can have its own address and its own atmosphere, shaped by light, stone, sea and open air, instead of sharing a portal page with a hundred others.",
    ],
    sections: [
      "A three-scene scroll film of the house",
      "A headline and a one-sentence story of the place",
      "Location framing: a private residence on the Ionian coast",
      "A \"Discover the house\" call to action",
    ],
    bestFor: [
      "Luxury listing agents",
      "Private sellers of a signature home",
      "Architects presenting a finished house",
      "Holiday-home owners",
    ],
    useCases: ["real-estate", "architecture"],
    framework: "next",
    scrollVideo: true,
  },
  "retro-miami": {
    brand: "Vice City",
    category: "Entertainment launch",
    seoTitle: "Neon Retro Website Template",
    summary:
      "A neon, retro website template for entertainment launches: a reversible scroll film of Miami at night, a bold tagline and an \"Enter the city\" call to action.",
    overview: [
      "Retro Miami is the site for Vice City, a fictional neon crime fantasy set in Miami after dark. Bold type and a black-and-neon palette sit over a film you can scroll forwards and back, with a live percentage counter.",
      "It is the loudest template in the gallery on purpose: a reference for launches where energy matters more than information, such as games, films, music releases, nightlife and events.",
    ],
    sections: [
      "A \"Loading the night\" intro",
      "The hero tagline: \"Own the night. Rule the city.\"",
      "A reversible scroll film with a progress percentage",
      "An \"Enter the city\" call to action",
    ],
    bestFor: [
      "Game studios and trailers",
      "Film and TV promotions",
      "Music releases and tours",
      "Nightlife and event brands",
    ],
    useCases: ["portfolio"],
    framework: "next",
    scrollVideo: true,
  },
  "villa-jacuzzi": {
    brand: "Elsewhere",
    category: "Private estate collection",
    seoTitle: "Luxury Vacation Estate Website Template",
    summary:
      "A private estate collection website template: four film chapters across Mallorca, Amalfi and Paros with coordinates, and an \"Explore private estates\" call to action.",
    overview: [
      "Villa Jacuzzi is the site for Elsewhere, a fictional collection of private estates. The story runs in four numbered chapters, each tied to a place and its coordinates: Mallorca, the Amalfi Coast, Paros, and finally the collection itself.",
      "The writing is short and confident (\"Designed for disappearing. No crowds. No schedules.\"), which suits brands selling privacy and place, whether they rent estates by the week or sell them outright.",
    ],
    sections: [
      "A film-led hero: \"A world away\"",
      "Four numbered chapters with destinations and coordinates",
      "Navigation for estates, destinations and inquiries",
      "An \"Explore private estates\" call to action",
    ],
    bestFor: [
      "Luxury vacation rental collections",
      "Estate agents for second homes",
      "Private members' travel clubs",
      "Hospitality brands with several properties",
    ],
    useCases: ["hotels-and-resorts", "real-estate"],
    framework: "next",
    scrollVideo: true,
  },
  "northline-atelier": {
    brand: "Northline Atelier",
    category: "Architecture & custom homes",
    seoTitle: "Architecture Firm Website Template",
    summary:
      "An architecture firm website template for custom-home studios: an approach statement, the process, selected homes with location and year, and a contact section.",
    overview: [
      "Northline Atelier is the site for a fictional design-build studio, established in 2008, that creates custom homes across the United States. It opens with \"Homes built around the way you live\" and then explains its approach: the first move is listening.",
      "The selected-work section captions each home with place, type and year (Canyon House, Topanga, California, ground-up, 2024), and the process is spelled out as Brief → Site → Structure → Atmosphere. It is the most complete studio portfolio in the gallery.",
    ],
    sections: [
      "A hero statement and scroll film",
      "An approach section with a material study",
      "The process: Brief → Site → Structure → Atmosphere",
      "Selected homes with location, type and year",
      "A \"Begin a conversation\" contact section",
    ],
    bestFor: [
      "Architecture practices",
      "Design-build firms",
      "Custom home builders",
      "Renovation specialists",
    ],
    useCases: ["architecture", "portfolio"],
    framework: "next",
    scrollVideo: true,
  },
};

export interface TemplatePage extends TemplateManifest, TemplateCopy {
  /** Libraries the downloaded code uses, for the page's "Built with" list. */
  stack: string[];
}

function stackOf(copy: TemplateCopy): string[] {
  const base =
    copy.framework === "next"
      ? ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4"]
      : ["Vite", "React", "Tailwind CSS 4"];
  return copy.scrollVideo ? [...base, "scrolly-video"] : base;
}

/**
 * Templates with a page: in the registry, written up here, and with a live
 * demo and cover to show. Registry order, which is also the gallery's.
 */
export const TEMPLATE_PAGES: TemplatePage[] = TEMPLATE_REGISTRY.flatMap((template) => {
  const copy = COPY[template.id];
  if (!copy || !template.demoUrl || !template.homescreenImgSrc) return [];
  return [{ ...template, ...copy, stack: stackOf(copy) }];
});

export function getTemplatePage(id: string): TemplatePage | undefined {
  return TEMPLATE_PAGES.find((template) => template.id === id);
}

/** Templates for an industry page, its cover template first. */
export function templatesForUseCase(slug: UseCaseSlug, coverId?: string): TemplatePage[] {
  return TEMPLATE_PAGES.filter((template) => template.useCases.includes(slug)).sort(
    (a, b) => Number(b.id === coverId) - Number(a.id === coverId),
  );
}

/** Other templates that share an industry with this one, closest first. */
export function relatedTemplates(template: TemplatePage, limit = 3): TemplatePage[] {
  return TEMPLATE_PAGES.filter((other) => other.id !== template.id)
    .map((other) => ({
      other,
      shared: other.useCases.filter((slug) => template.useCases.includes(slug)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map(({ other }) => other);
}
