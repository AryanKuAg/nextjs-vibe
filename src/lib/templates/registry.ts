// ---------------------------------------------------------------------------
// Template registry — the source of truth for the gallery templates.
//
// A template is a real, hand-built site living in a PUBLIC GitHub repo. It is
// something a customer previews and downloads, not something the builder starts
// from: builds are made from a prompt. `/api/templates/[templateId]/download`
// streams the repo's zip, so the archive is the whole integration.
//
// See ./README.md for the contract every template repo must satisfy.
// ---------------------------------------------------------------------------

/** R2 bucket `framerate`, served publicly at assets.framerate.space. */
const ASSETS = "https://assets.framerate.space";

export interface TemplateManifest {
  /** Stable slug. Persisted on Project.templateId — never rename in place. */
  id: string;
  /** Display name shown in the gallery. */
  title: string;
  /** Public GitHub repo as "owner/name". */
  repo: string;
  /** Branch to download. */
  branch: string;
  /** Optional path within the repo if it is a monorepo (e.g. "sites/vaultone"). */
  subdir?: string;
  /** Live demo, also used as the gallery card link. */
  demoUrl: string;
  /**
   * Cover for the signed-out landing page grid — the taller, full-bleed crop
   * ("landing page images/" in the bucket).
   */
  landingImgSrc: string;
  /**
   * Cover for the signed-in dashboard gallery and the See-more modal — the
   * 16:9 card crop ("homescreen images/" in the bucket).
   */
  homescreenImgSrc: string;
  /** Whether the card is rendered with a taller height in the masonry grid */
  isTall?: boolean;
}

export const TEMPLATE_REGISTRY: TemplateManifest[] = [

  {
    id: "backyard-pool",
    title: "Backyard Pool",
    repo: "AryanKuAg/backyard-pool",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/backyard-pool/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Backyard%20Pool.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Backyard%20Pool.webp`,
    isTall: false,
  },
  { // its stuck on the loading screen
    id: "coast-house",
    title: "Coast House",
    repo: "AryanKuAg/coast-house",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/coast-house/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Coast%20House.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Coast%20House.webp`,
    isTall: false,
  },
  {
    id: "coworking-space",
    title: "Coworking Space",
    repo: "AryanKuAg/coworking-space",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/coworking-space/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Coworking%20Space.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Coworking%20Space.webp`,
    isTall: false,
  },
  {
    id: "greece-view",
    title: "Greece View",
    repo: "AryanKuAg/greece-view",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/greece-view/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Greece%20View.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Greece%20View.webp`,
    isTall: false,
  },
  {
    id: "home-theatre",
    title: "Home Theatre",
    repo: "AryanKuAg/home-theatre",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/home-theatre/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Home%20Theatre.webp`,
    // The homescreen crop of this one was uploaded as "image 84.webp" — same
    // Atelier Noir hero, just never renamed in the bucket.
    homescreenImgSrc: `${ASSETS}/homescreen%20images/image%2084.webp`,
    isTall: false,
  },
  {
    id: "luxury-apartments",
    title: "Luxury Apartments",
    repo: "AryanKuAg/luxury-apartments",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/luxury-apartments/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Luxury%20Apartments.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Luxury%20Apartments.webp`,
    isTall: false,
  },
  { // has issues
    id: "luxury-kitchen",
    title: "Luxury Kitchen",
    repo: "AryanKuAg/luxury-kitchen",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/luxury-kitchen/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Luxury%20Kitchen.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Luxury%20Kitchen.webp`,
    isTall: false,
  },
  {
    id: "maldives-resort",
    title: "Maldives Resort",
    repo: "AryanKuAg/maldives-resort",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/maldives-resort/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Maldives%20Resort.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Maldives%20Resort.webp`,
    isTall: false,
  },
  {
    id: "mediterranean-house",
    title: "Mediterranean House",
    repo: "AryanKuAg/mediterranean-house",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/mediterranean-house/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Mediterranean%20House.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Mediterranean%20House.webp`,
    isTall: false,
  },
  { // its css is not loading
    id: "retro-miami",
    title: "Retro Miami",
    repo: "AryanKuAg/retro-miami",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/retro-miami/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Retro%20Miami.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Retro%20Miami.webp`,
    isTall: false,
  },
  {
    id: "villa-jacuzzi",
    title: "Villa Jacuzzi",
    repo: "AryanKuAg/villa-jacuzzi",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/villa-jacuzzi/index.html",
    landingImgSrc: `${ASSETS}/landing%20page%20images/Villa%20Jacuzzi.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/Villa%20Jacuzzi.webp`,
    isTall: false,
  },
  {
    id: "northline-atelier",
    title: "Northline Atelier",
    repo: "AryanKuAg/northline-atelier",
    branch: "main",
    demoUrl: "https://sites.framerate.space/template-sites/northline-atelier/index.html",
    // Both crops of this site sit in the bucket under "American Mansion" —
    // the shot is the Northline Atelier hero.
    landingImgSrc: `${ASSETS}/landing%20page%20images/American%20Mansion.webp`,
    homescreenImgSrc: `${ASSETS}/homescreen%20images/American%20Mansion.webp`,
    isTall: false,
  },
];

export const getTemplate = (id: string | null | undefined): TemplateManifest | null => {
  if (!id) return null;
  return TEMPLATE_REGISTRY.find((t) => t.id === id) ?? null;
};

/**
 * Tarball URL for a template repo. codeload serves a gzipped tar of any public
 * repo/branch with no auth and no git binary required.
 */
export const templateTarballUrl = (t: TemplateManifest): string =>
  `https://codeload.github.com/${t.repo}/tar.gz/refs/heads/${t.branch}`;

/**
 * Zip URL for a template repo, from the same codeload endpoint.
 *
 * What the download route streams to the customer. It stays server-side so the
 * archive arrives from this application rather than from the repository it
 * happens to be kept in.
 */
export const templateZipUrl = (t: TemplateManifest): string =>
  `https://codeload.github.com/${t.repo}/zip/refs/heads/${t.branch}`;
