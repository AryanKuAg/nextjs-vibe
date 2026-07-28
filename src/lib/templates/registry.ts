// ---------------------------------------------------------------------------
// Template registry — the source of truth for the remixable gallery templates.
//
// A template is a real, hand-built site living in a PUBLIC GitHub repo. When a
// user remixes one, the code agent downloads that repo into the E2B sandbox and
// uses it as the starting code instead of the generic scaffold in src/templates/.
//
// The repo is fetched as a tarball over HTTPS (codeload) rather than cloned with
// git: the E2B image (sandbox-templates/react/e2b.Dockerfile) installs curl but
// NOT git, so `git clone` would fail inside the sandbox.
//
// See ./README.md for the contract every template repo must satisfy.
// ---------------------------------------------------------------------------

export type TemplateMode = "FULL_PAGE" | "HERO_ONLY";

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
  /**
   * Whether the background video plays behind the whole page or only the hero.
   * MUST match how the repo is actually built — this drives the code agent's
   * system prompt and the follow-up router's media handling.
   */
  mode: TemplateMode;
  /**
   * The video this template was designed around. Remixing does NOT generate a
   * video — the user gets the template exactly as built, immediately. This URL
   * is substituted into the repo's TEMPLATE_VIDEO_PLACEHOLDER at build time.
   * Only when the user later asks for a different background does the media
   * pipeline run and swap it. Falls back to DEFAULT_TEMPLATE_VIDEO if unset.
   */
  defaultVideoUrl?: string;
  /** Live demo, also used as the gallery card link. */
  demoUrl: string;
  /** Cover image for the gallery card. */
  imgSrc: string;
}

/** Used when a template does not declare its own defaultVideoUrl. */
export const DEFAULT_TEMPLATE_VIDEO = "https://assets.framerate.space/hero_bg_480p.mp4";

// NOTE: the `repo` values below are placeholders — the template repos do not
// exist yet. Create one repo per template following ./README.md, then replace
// the owner/name here. Nothing else needs to change.
export const TEMPLATE_REGISTRY: TemplateManifest[] = [
  {
    id: "beach-house",
    title: "Beach House",
    repo: "AryanKuAg/beach-house",
    branch: "main",
    mode: "FULL_PAGE",
    demoUrl: "https://sites.framerate.space/template-sites/Beach_House/index.html",
    imgSrc: "https://assets.framerate.space/templates/planet%20robot/template.jpg",
  },
  {
    id: "flower-and-plane",
    title: "Flower and Plane",
    repo: "AryanKuAg/flower-and-plane",
    branch: "main",
    mode: "HERO_ONLY",
    demoUrl: "https://sites.framerate.space/template-sites/flower-and-plane/index.html",
    imgSrc: "https://assets.framerate.space/templates/Theo/Template.png",
  },
  {
    id: "orange-furry-creature",
    title: "Orange Furry Creature",
    repo: "AryanKuAg/orange-furry-creature",
    branch: "main",
    mode: "HERO_ONLY",
    demoUrl: "https://sites.framerate.space/template-sites/orange-furry-creature/index.html",
    imgSrc: "https://assets.framerate.space/templates/Theo/Template.png",
  },
  {
    id: "rotating-earth",
    title: "Rotating Earth",
    repo: "AryanKuAg/rotating-earth",
    branch: "main",
    mode: "FULL_PAGE",
    demoUrl: "https://sites.framerate.space/template-sites/rotating-earth/index.html",
    imgSrc: "https://assets.framerate.space/templates/stone/template.png",
  },
  {
    id: "australia-beach-road",
    title: "Australia Beach Road",
    repo: "AryanKuAg/australia-beach-road",
    branch: "main",
    mode: "HERO_ONLY",
    demoUrl: "https://sites.framerate.space/template-sites/australia-beach-road/index.html",
    imgSrc: "https://assets.framerate.space/mars_template.jpg",
  },
  {
    id: "beach-resort",
    title: "Beach Resort",
    repo: "AryanKuAg/beach-resort",
    branch: "main",
    mode: "FULL_PAGE",
    demoUrl: "https://sites.framerate.space/template-sites/beach_resort/index.html",
    imgSrc: "https://assets.framerate.space/templates/turtle/template.png",
  },
  {
    id: "green-bridge-mountain",
    title: "Green Bridge Mountain",
    repo: "AryanKuAg/green-bridge-mountain",
    branch: "main",
    mode: "FULL_PAGE",
    demoUrl: "https://sites.framerate.space/template-sites/green-bridge-mountain/index.html",
    imgSrc: "https://assets.framerate.space/templates/stone/template.png",
  },
  {
    id: "haunted-house",
    title: "Haunted House",
    repo: "AryanKuAg/haunted-house",
    branch: "main",
    mode: "FULL_PAGE",
    demoUrl: "https://sites.framerate.space/template-sites/haunted-house/index.html",
    imgSrc: "https://assets.framerate.space/mars_template.jpg",
  },
  {
    id: "ai-trip-planner",
    title: "AI Trip Planner",
    repo: "AryanKuAg/ai-trip-planner",
    branch: "main",
    mode: "HERO_ONLY",
    demoUrl: "https://sites.framerate.space/template-sites/ai-trip-planner/index.html",
    imgSrc: "https://assets.framerate.space/templates/turtle/template.png",
  },
  {
    id: "ai-workflow-agents",
    title: "Ai Workflow Agents",
    repo: "AryanKuAg/ai-workflow-agents",
    branch: "main",
    mode: "HERO_ONLY",
    demoUrl: "https://sites.framerate.space/template-sites/ai-workflow-agents/index.html",
    imgSrc: "https://assets.framerate.space/templates/turtle/template.png",
  },
];

/** The token a template repo uses wherever the background video URL belongs. */
export const TEMPLATE_VIDEO_PLACEHOLDER = "__FRAMERATE_VIDEO_URL__";

/**
 * Prompt used when a user remixes a template without describing any changes.
 * Shown verbatim as their chat message, so keep it short and human.
 *
 * It doubles as a sentinel: the code agent compares against this exact constant
 * to recognise "change nothing" and treat a no-op build as success, since the
 * template is already a complete site.
 */
export const TEMPLATE_ASIS_PROMPT = "Remix template";

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

/** The video a fresh remix of this template is built with. */
export const templateVideoUrl = (t: TemplateManifest): string =>
  t.defaultVideoUrl || DEFAULT_TEMPLATE_VIDEO;
