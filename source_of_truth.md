# Framerate — Source of Truth

> This document is the canonical reference for the Framerate platform architecture.
> Pass this file to any new LLM chat to prevent deviation or hallucination.

---

## What is Framerate?

Framerate is a **niche AI website builder** that generates websites with **scroll-driven video backgrounds**. The platform generates an image, animates it into a video, and then builds a React website that uses the `scrolly-video` npm package (or a plain `<video>` tag in hero-only mode) to display that video as the site's background.

**The pipeline is always: Image Agent → Video Agent → Code Agent.**

---

## Platform Rules (NON-NEGOTIABLE)

1. **Background is ALWAYS our generated video.** Users cannot bring their own background. If a user asks for a custom background (gradient, 3D scene, particles, etc.), ignore that part of their prompt and use our generated video instead.
2. **No extra packages for backgrounds.** NEVER install `three.js`, `react-three-fiber`, `vanta`, `particles.js`, `lenis`, or any 3D/animation library. The background is handled exclusively by `scrolly-video` (full-page mode) or a native `<video>` tag (hero-only mode).
3. **User prompts are for content/layout/structure only.** Extract content, UI layout, structure, animations, and CSS from user prompts. Strip/ignore any background-related instructions.
4. **No images anywhere, in any mode.** The `<img>` tag, CSS `background-image` URLs, and image placeholders are banned. The only media is our generated video. Visuals are built from typography, color fields, thin borders, inline SVG, and motion.
5. **Design language: minimal, classy, editorial, a little creative.** Never generic-template output. One accent color max, generous whitespace, distinctive typography. Banned: purple-pink gradients, emoji-as-icons, identical repeated feature cards, lorem ipsum.

---

## Two Experience Modes

| Mode | `experiencePref` | Video Behavior | Rest of Page | Package |
|---|---|---|---|---|
| **Full Page** | `"FULL_PAGE"` | Scroll-scrubbed video spans the ENTIRE page (sticky background) | All sections have transparent backgrounds, video visible everywhere | `scrolly-video` |
| **Hero Only** | `"HERO_ONLY"` | Autoplay looping `<video>` in the Hero section only | Normal website with solid backgrounds and standard scrolling below the hero | Native `<video>` tag (no packages) |

`experiencePref` is not stored as a DB column — for follow-ups it is **derived from durable state** inside the code agent: fragment files containing `src/components/ScrollFrames.tsx` → `FULL_PAGE`; project has videos but no ScrollFrames → `HERO_ONLY`; no videos → `STANDARD`.

---

## Flows

### Flow 1: First Prompt (ALWAYS the two wizard questions)

Every accepted first prompt — short or detailed — gets the wizard:

```
User types their first prompt
  → Supervisor (reject-check only) → ask_wizard_3d
  → Question 1: "Where should the background video live?" → Full page / Hero only → experiencePref
  → Question 2: "How hands-on do you want to be?" → Build it for me / I'll guide each step → buildPref
  → sanitize_prompt (strips background/image instructions; wizard's experiencePref wins over detection;
    extracts a user-supplied image URL, validated ≥ ~50KB via HEAD request)
  → then, by buildPref:

  BUILD_FOR_ME (fully autonomous — zero stops):
    → frame_generation → video_generation → select_template (SPEC COMPILER) → code_generation

  GUIDE_VISUALS (human-in-the-loop at every step):
    → ask_media_intent (scene question) → frame_generation + image approval buttons
    → ask_video_intent → video_generation + video approval buttons
    → select_template (SPEC COMPILER) → code_generation
```

**Autonomy is decided EXCLUSIVELY by the wizard's build question.** No prompt-length or
URL heuristics. The wizard is skipped only when the event already carries BOTH
`experiencePref` and `buildPref` (programmatic invocations).

### Flow 2: Follow-up on a Built Site

```
Any prompt on a project that already has a fragment
  → Supervisor detects existing site → routes DIRECTLY to code_generation
  → Media is NEVER regenerated on follow-ups
  → Code agent re-derives videoUrl + mode from the project row + latest fragment
```

**Supervisor guarantees:**
- A `reject` decision is never overridden by length/URL heuristics (guardrails win).
- All structured-output LLM calls (supervisor, sanitizer, skeleton selector, brief compiler) have try/catch fallbacks — a parse failure never crashes a run.

---

## The Spec Compiler (select_template node)

The code agent NEVER sees raw templates or the raw user prompt on new builds. Instead:

1. **Skeleton selection** — an LLM picks one of the brand-neutral **layout skeletons** (structure + motion vocabulary only; zero brand names, copy, or fonts).
2. **Build Brief compilation** — an LLM turns the sanitized user request into a unified JSON brief: site name, tagline, tone, Google Fonts pairing, single accent color, nav style, 4-5 sections with real copy direction, and `must_honor` (verbatim user requirements).
3. **Deterministic rendering** — the brief + skeleton are rendered into ONE clean task input. No instruction layer ever "overrides" another; all conflicts are resolved here, before the code agent runs.

If brief compilation fails, the code agent receives the raw request + skeleton as a labeled fallback.

---

## File Architecture

### Key Files

| File | Purpose |
|---|---|
| `src/inngest/autonomous.ts` | The LangGraph state machine: supervisor, wizard, sanitize_prompt, frame_generation, video_generation, select_template (spec compiler), code_generation, reject. |
| `src/inngest/functions.ts` | The code agent (Inngest agent-kit). Derives videoUrl + mode from durable project state, assembles the system prompt per mode, runs creator → verification → self-healing fixer → deploy. |
| `src/prompt.ts` | `buildCodeAgentSystemPrompt(mode, videoUrl)` — CORE_RULES + DESIGN_SYSTEM + TASTE_MODULE + one mode module (FULL_PAGE / HERO_ONLY / STANDARD) + a mode-specific final checklist. Also FIXER/RESPONSE/TITLE prompts. |
| `src/lib/taste.ts` | Anti-slop design-taste rules adapted from [tasteskill](https://github.com/Leonxlnx/taste-skill) (MIT) for our constraints: TASTE_MODULE (code agent), TASTE_BRIEF_RULES (Build Brief compiler: font rotation, palette bans, copy voice, layout variety), TASTE_CHECKLIST (pre-flight items). Original vendored at `docs/vendor/taste-skill.md`. Skill rules that conflict with the platform (real images, motion/react, Phosphor icons, GSAP) are deliberately overridden. |
| `src/templates/components/ScrollFrames.tsx` | Golden template for the ScrollyVideo component. `VIDEO_URL_HERE` placeholder replaced at seed time. Its CSS is scoped to the lib's `div[data-scrolly-container]` and applies `margin-bottom: -100vh` — the sticky container occupies 100vh of flow, so without this pull-up the page content would start one viewport below the fold. |
| `src/lib/templates/full_page_templates.json` | 3 brand-neutral full-page layout skeletons. |
| `src/lib/templates/hero_templates.json` | 3 brand-neutral hero-only layout skeletons. |

### Code Agent (`functions.ts`) — key mechanics

- **Mode derivation**: event data → project.videoUrls (entries are `{url, blockIndex}` objects, normalized to strings) → fragment file inspection. Never trusts the event alone.
- **Seeding**: new projects get scaffold templates. `ScrollFrames.tsx` is seeded ONLY in FULL_PAGE mode (URL baked in); HERO_ONLY/STANDARD get an App.tsx seed without the ScrollFrames import so the scaffold always compiles.
- **Task input**: new build = Build Brief + "STARTER SCAFFOLD, placeholders MUST be replaced"; iteration = "CHANGE REQUEST" + current files + "modify only what's needed".
- **History hygiene**: only non-empty RESULT messages reach the model; INTERACTIVE button JSON, infra errors, empty progress markers, and the duplicated current prompt are filtered; `<task_summary>` tags stripped; capped to 4 messages × 1500 chars.
- **Verification**: if the creator emits a summary without changing any file, one corrective re-run fires before the result is accepted.
- **Build check order**: fix-paths (src) → eslint --fix → tsc --noEmit → vite build → fix-paths (dist). Deterministic fixes run BEFORE the type check.
- **Fixer**: up to 5 attempts (`x-ai/grok-4.5`); attempt ≥3 triggers the "delete the broken code" nuclear option. Fixer attempts are NEVER charged to the user.
- **Failure honesty**: if the build can't be repaired, the user gets an explicit failure message (no deployment link, no cheery "here's what I built").
- **Protection**: in FULL_PAGE mode, `src/components/ScrollFrames.tsx` is write-blocked and App.tsx writes are rejected if `<ScrollFrames />` is missing or commented out.

---

## Critical CSS/HTML Rules

1. **NEVER set `overflow: hidden`** (or `transform`/`filter`/`perspective`) on `html`, `body`, `#root`, or any ancestor of `<ScrollFrames />`. This breaks the sticky video.
2. **All sections must have transparent backgrounds** in full-page mode so the video shows through.
3. **ZERO overlays over the video** — no scrims, tints, gradients, glassmorphism, or `backdrop-blur` on anything sitting over the video (full-page everywhere; hero-only inside the hero). Readability comes only from the scene-derived text color (`text_scheme`) + a text-shadow on the glyphs. Glass/blur is allowed only on solid-background sections (hero-only below the hero, standard mode).
4. **No `<img>` tags** — we don't have images to load, they will be broken.
5. **The `scrolly-video` component uses `position: sticky`** internally. Don't wrap it in constraining containers.
6. **Relative imports only** in generated sites (`./components/X`) — the `@/` alias is not reliably configured in the sandbox.

---

## Tech Stack (Generated Sites)

- React 19, Vite 6 (Client-Side SPA)
- Tailwind CSS v4 (CSS-based config, NO `tailwind.config.js`)
- Framer Motion v12 (imported from `"framer-motion"`, never `"motion/react"`), Zustand v5, React Router v7 (HashRouter only)
- Lucide React for icons (no brand icons — they don't exist in Lucide)
- `scrolly-video` for scroll-driven video (full-page mode only)

---

## Dev Environment

- **Never run `npm run dev` or `npm run build`** in the main project for testing — the user manages this manually.
- Sandbox environments (E2B) are used for generated sites.
- Inngest handles the agent orchestration pipeline.
- OpenRouter + DeepSeek (`google/gemini-3.1-flash-lite`) for routing/sanitizing/brief-compiling/code generation; Grok for the fixer.
