# Framerate Pipeline Audit & Refactor Plan

> Analysis only — no code changed. Target runtime model: **google/gemini-3.1-flash-lite** (cheap, literal-minded, recency-biased). Every finding below is evaluated against the question: *"will a lightweight model get this right on the first try?"*

---

## Verdict

The pasted AI analysis (contradictory mega-prompt + reasoning leak) is **correct but incomplete**. Those are 2 of **7 critical defects**. The single biggest cause of "generic template" output is not the prompt concatenation itself — it's that **the very first build is told it is *modifying an existing project* and must "keep the existing design completely intact"**, because the golden template files are seeded before the agent runs. A cheap model's laziest valid interpretation of that instruction is *change nothing*, and the build check passes because the seeded template compiles. Result: user gets the untouched WISA/generic scaffold.

---

## CRITICAL findings

### C1. First build is framed as an "iteration" — the root of generic output
[functions.ts:437-450](src/inngest/functions.ts#L437-L450) — `initialFiles` is **always non-empty** on a new project (templates are seeded at [functions.ts:146-170](src/inngest/functions.ts#L146-L170)), so `hasExistingFiles` is always `true`. The prompt then injects:

> *"You are modifying an existing project… Do NOT rewrite the entire application. Keep the existing design, components, and structure completely intact."*

This directly contradicts base `PROMPT` rule 4 ("You MUST completely overwrite the default boilerplate") and the entire template spec. For DeepSeek Flash this is a coin flip, and "do nothing" is the cheaper branch. Combined with **H2** (no verification that files actually changed), the untouched template deploys as a "success".

### C2. Follow-up chat path breaks the video architecture entirely
[messages/procedures.ts:90-102](src/modules/messages/server/procedures.ts#L90-L102) fires `code-agent/run` with:
- `videoUrl: videoUrls?.[0]` — but `videoUrls` entries are **objects** `{ url, blockIndex }` (written at [functions.ts:1395](src/inngest/functions.ts#L1395)), so the ScrollyVideo patch interpolates `src="[object Object]"`.
- **No `experiencePref`** → a HERO_ONLY project receives the FULL_PAGE patch on every follow-up (the branch at [functions.ts:453](src/inngest/functions.ts#L453) treats `undefined` as full-page). The agent is then ordered to make all backgrounds transparent on a site designed with solid sections.
- **No `isFollowUp`** → `previousFiles` is skipped.
- When `videoUrl` is falsy/garbled, `PROTECTED_FILES` is empty ([functions.ts:319](src/inngest/functions.ts#L319)) and the App.tsx `<ScrollFrames />` integrity check is skipped — follow-ups can silently delete the video background.

### C3. Templates contradict the base prompt head-on
The code agent receives base PROMPT (system) + mode patch + template + user prompt, with direct conflicts a small model must arbitrate:

| Base prompt / patch says | Template says |
|---|---|
| "MUST use `@/` alias, NEVER relative paths" ([prompt.ts:137](src/prompt.ts#L137)) | All 4 templates: "Do NOT use the `@/` alias. Always relative paths" |
| "ALWAYS import from `framer-motion`, NEVER `motion/react`" | `full_scroll_synapsex`: "Framer Motion imported from `motion/react`" |
| Patch: "NEVER install or use `lenis`" | `full_scroll_synapsex`: "Use the `lenis` library for smooth scrolling" |
| Fixer script strips `bootstrap-icons` imports (known failure) | `full_scroll_synapsex`: "Bootstrap Icons CDN for the Apple icon" |
| ScrollyVideo is `position: sticky`, don't wrap/position it | `full_scroll_synapsex`: "Canvas background (ScrollFrames): `fixed inset-0 z-[1]`" + scroll-driven blur/scale on it |
| "NEVER set overflow-x hidden on html/body" | `full_scroll_synapsex`: "html, body: … overflow-x hidden" |
| React 19 + Tailwind v4, no config file | `hero_password_manager`: "react-dom (v18)", "Tailwind CSS 3 with default config" |
| Use Framer Motion | `wisa` + `urban_jungle`: GSAP ScrollTrigger everywhere |

Also data corruption inside `hero_password_manager` (likely from the `fix-*.js` scripts): `https: //fonts.googleapis.com` (space in URL → font never loads), `rgba(25,\n 40,\n 55,\n 0.35)` mangled across lines, `box-sizing: border-box;\n }`. A literal model copies these verbatim. `urban_jungle` requires `/Dirtyline-36daysoftype-2022.woff2` which **does not exist in the sandbox**. `wisa`'s description still advertises "image frames on an HTML Canvas" — the exact approach the patch orders it to ignore.

### C4. Branded template specs are concatenated with the user's prompt
[autonomous.ts:722-728](src/inngest/autonomous.ts#L722-L728): `finalPrompt = full WISA/SynapseX/password-manager brand spec + "Additional user instructions:\n" + user prompt`. A cheap model blends the two brands ("Championing The Pitch Of Legends" headline on a crypto wallet site). Templates are written as *build specs for a specific fake brand*, not as layout skeletons — content, copy, brand names, logos, and fonts should come from the user's request, only structure/motion vocabulary from the template.

### C5. Priority is expressed as "patch OVERRIDES the above" — but the patch comes FIRST
[functions.ts:455](src/inngest/functions.ts#L455) **prepends** the patch, so "overrides any conflicting instructions above" is literally wrong — the conflicting template text comes *after* it, and recency bias makes later text win in small models. Final layer order today: `patch → template+user → project state + "keep everything intact"`. Priorities are never resolved structurally; the model is asked to arbitrate.

### C6. The >800-char rule overrides the supervisor's REJECT decision
[autonomous.ts:177](src/inngest/autonomous.ts#L177): any prompt over 800 chars is forced into `sanitize_prompt` **even when `next_agent === "reject"`**. A long off-topic or prompt-injection message bypasses the guardrail (the video-URL branch checks for reject; the length branch doesn't).

### C7. `frame_extraction` route crashes the graph
The supervisor's structured-output enum and instructions include `frame_extraction` ([autonomous.ts:134](src/inngest/autonomous.ts#L134), [autonomous.ts:150](src/inngest/autonomous.ts#L150)), but the conditional-edges map ([autonomous.ts:791-800](src/inngest/autonomous.ts#L791-L800)) has no such branch and the `next_agent` Annotation type doesn't include it. If the model ever picks it (it's told to, for "continuous sequence" requests), the run throws at routing time.

---

## HIGH findings

### H1. Conversation history contamination (the confirmed "reasoning leak")
[functions.ts:223-245](src/inngest/functions.ts#L223-L245) loads the last 5 DB messages **raw**, unfiltered by type:
- INTERACTIVE messages inject JSON blobs as assistant turns: `{"text":"How would you like to use the 3D experience?","buttons":[…]}`
- Empty `""` progress messages, infra-error messages ("The code agent encountered a critical infrastructure error…"), rejection messages
- The user's current prompt appears **twice** (latest DB message + `currentPrompt`)
- `finalSummary` fallback saves raw `<task_summary>`-bearing prose as message content

### H2. No verification the creator actually built anything
Success = "a `<task_summary>` string appeared" + "build passes". The seeded template compiles, so a model that emits only a summary (no tool calls) "succeeds". There is no check that `src/App.tsx` (or anything) differs from the seed.

### H3. Sanitizer only runs for >800-char prompts
Prompts between ~50 and 800 chars skip background-stripping and `experiencePref` detection entirely ([autonomous.ts:177-183](src/inngest/autonomous.ts#L177-L183)). A 500-char prompt with "add a three.js starry background" flows through unsanitized; `experiencePref` stays `null` → silently defaults to FULL_PAGE at template selection and in the code agent.

### H4. Detailed follow-ups trigger a full media regen + rebuild
A >800-char *modification* request re-enters `sanitize_prompt` → `frame_generation` → `video_generation` → `select_template`, generating a brand-new image and video and concatenating a full template spec onto what was a change request — destroying the existing site.

### H5. The product's design language is not encoded anywhere
Your requirement — *minimal, classy, a little creative, never generic, absolutely no images* — exists only as fragments:
- FULL_PAGE patch rules 11–12: minimal + no-images ✅
- HERO_ONLY patch: says "visually stunning with proper colors, cards, grids" (anti-minimal); has no-images ✅
- STANDARD mode ([functions.ts:508-514](src/inngest/functions.ts#L508-L514)): "full creative freedom, any colors, backgrounds" — **no no-images rule at all**, no minimal directive
- Base PROMPT: zero typography/spacing/restraint guidance → the model falls back to its default: generic purple-gradient Tailwind slop

### H6. There is exactly ONE hero-mode template
Every HERO_ONLY site descends from a password-manager spec.

### H7. HERO_ONLY seeding is broken by construction
`ScrollFrames.tsx` is skipped in HERO_ONLY ([functions.ts:157](src/inngest/functions.ts#L157)), but the seeded [App.tsx](src/templates/App.tsx#L2) still imports it → the seed doesn't even compile until the agent rewrites App.tsx. The seeded sections (transparent, video-behind styling) are also wrong for hero-only.

### H8. Structured-output calls without fallbacks
`select_template` has a try/catch fallback; **supervisor and sanitizer do not**. One malformed structured output from DeepSeek Flash kills the whole run. Also `z.string().optional()` on `rejection_reason` is a known schema pain point for some providers — prefer `.nullable().default(null)`.

### H9. Build-check ordering wastes fixer runs (and user credits)
[functions.ts:570-698](src/inngest/functions.ts#L570-L698): order is `eslint --fix → tsc --noEmit → fix-paths.js → vite build`. Problems fix-paths repairs (brand icons, `@/` paths, bootstrap-icons) still fail `tsc` first → fixer agent spins up unnecessarily, and **each fixer attempt charges the user** ([functions.ts:803-807](src/inngest/functions.ts#L803-L807)).

### H10. Success messaging on failure
Response/title agents run regardless of `isBuildSuccessful`; after 5 failed fix attempts the user still gets a cheerful "Here's what I built for you!" with no deployment.

---

## MEDIUM findings

- **M1.** ScrollFrames golden template injects a **global** `canvas, video { width:100vw !important; height:100vh !important }` style — it will stretch any decorative canvas/video the agent adds anywhere on the page.
- **M2.** `finalPrompt.replace("{{VIDEO_URL}}", …)` replaces only the first occurrence.
- **M3.** `checkCancellation` string-matches message content (`"Generation was manually stopped."`) and runs a DB query on every router iteration — brittle.
- **M4.** Fixer runs on `x-ai/grok-4.5` while the stated goal is cheap-first. May be intentional (stronger fixer), but the *real* cost win is making the fixer unnecessary (C1/C3/H9).
- **M5.** The brand-icon SVG injection appends untyped `(props) =>` components to `.tsx` files after `tsc` already passed — if the sandbox `build` script is Vite's default `tsc -b && vite build`, the injected code can fail the type check it was meant to survive.
- **M6.** The BATCHING RULE forces the small model to emit ONE gigantic `editFiles` JSON call — the highest-probability JSON-escape failure mode (the prompt's own "CRITICAL JSON RULE" admits this crashes). For a light model, 2–4 smaller batched calls are far safer than one 15-file call.
- **M7.** `previousFiles` vs `initialFiles` logic is redundant (initialFiles already loads the latest fragment).

---

## REFACTOR PLAN (no implementation yet)

### Phase 0 — Hard bug fixes (small, independent, do first)
1. **C2**: pass `videoUrls[last].url` (string), persist `experiencePref` on the `Project` row and pass it + `isFollowUp: true` on the follow-up event; make `PROTECTED_FILES`/App.tsx integrity checks work off the project's stored video state, not the event field.
2. **C6**: only apply the >800-char sanitize override when `final_agent !== "reject"`.
3. **C7**: remove `frame_extraction` from the enum + supervisor instructions (or add the edge).
4. **H8**: wrap supervisor + sanitizer structured calls in try/catch with safe defaults (`code_generation`/pass-through prompt/FULL_PAGE); switch `.optional()` → `.nullable()`.
5. **H9**: run `fix-paths.js` + eslint **before** `tsc`; stop charging credits for fixer attempts (platform's failure, not the user's).
6. **H10**: branch the final user message on `isBuildSuccessful` (honest failure copy, no deployment link).
7. **M2**: `replaceAll` for `{{VIDEO_URL}}`.

### Phase 1 — The Spec Compiler (kills the mega-prompt problem)
Replace `select_template`'s string concatenation with a **compile_spec** node:
- **Input**: sanitized user prompt + chosen *layout skeleton* + mode + platform constraints.
- **One LLM call** (DeepSeek Flash, structured output, fallback on parse failure) producing a **Build Brief** JSON: `siteName`, `tagline`, `sections[] {id, purpose, contentOutline, layoutHints, motion}`, `typography {headingFont, bodyFont}` (Google Fonts only), `palette {text, accent}` (backgrounds are video/transparent by contract), `navStyle`.
- **Deterministic assembly** of the code-agent input from the brief. The code agent never sees the raw user prompt, the raw template, or any "X overrides Y" language — conflicts are resolved *before* it runs. This is the "pre-computation node" your pasted analysis recommended, made concrete.

### Phase 2 — One prompt per mode + template rewrite
- Restructure `prompt.ts` into `CORE_RULES` (env, tools, TS/Tailwind/import rules) + three **mode modules** (`FULL_PAGE`, `HERO_ONLY`, `STANDARD`). System prompt = core + exactly one module. Delete every "ignore the above / overrides above" sentence — a weak model should never arbitrate precedence.
- Encode the **design system** in core, for ALL modes: minimal/classy type scale, generous whitespace, restraint rules, one accent color max, a banned-cliché list (purple-to-pink gradients, emoji-bullet feature cards, "Lorem"), asymmetry/editorial-layout creativity cues, and **"no `<img>` anywhere, ever"** (currently missing from STANDARD).
- Rewrite all 4 templates as **brand-neutral layout skeletons**: structure + motion vocabulary only. Remove brand names, copy, logos, external font files, lenis, `motion/react`, bootstrap-icons, React 18/Tailwind 3 references, `fixed inset-0` canvas positioning, and the corrupted CSS strings. Add 2–3 hero-mode skeletons (currently one).
- End the assembled prompt with a short **final checklist** (recency-weighted: ScrollFrames first child, transparent sections, no img, no overflow on ancestors, HashRouter, task_summary format) — small models obey the last 20 lines best.

### Phase 3 — History & state hygiene (the reasoning-leak fix)
- `previousMessages`: include only `USER` + `ASSISTANT RESULT` with non-empty content; exclude `INTERACTIVE`, synthetic errors, and the row duplicating the current prompt; strip `<task_summary>` tags; cap total chars.
- First run vs iteration: branch the context injection on an explicit new-build flag. New build → *"These are starter scaffold files. You MUST replace their placeholder content per the Build Brief; keep the ScrollFrames wiring."* Iteration → the current "modify only what's needed" text.
- **Post-run verification (fixes H2)**: after the creator network finishes, diff written files against the seed; if nothing meaningfully changed, re-run once with a corrective message before declaring success.

### Phase 4 — Routing polish
- Run the sanitizer for **all** new-build prompts (it's one cheap call) so `experiencePref` and background-stripping are consistent (fixes H3).
- Route follow-ups by project state (fragment exists → code-only path) so detailed follow-ups never regen media (fixes H4).
- Relax the BATCHING RULE to "group related files, max ~4 files per call" (M6); remove the global `canvas, video` style from ScrollFrames (M1); make HERO_ONLY seed a compiling App.tsx without the ScrollFrames import (H7).

### Suggested order
Phase 0 (hours) → Phase 2's prompt/template rewrite and Phase 1's compiler together (they're one coherent change to what the code agent sees) → Phase 3 → Phase 4. Phases 1+2 are where "first-try correctness on a cheap model" is actually won: short, single-voice, conflict-free input + recency-weighted checklist + neutral skeletons.
