# Template repo contract

Each entry in [`registry.ts`](./registry.ts) points at a public GitHub repo holding one
hand-built site. When a user remixes a template, the code agent downloads that repo into
the E2B sandbox and uses it as the starting code instead of the generic scaffold in
`src/templates/`.

Nothing here applies to projects built from a plain prompt — that path is unchanged.

## What the pipeline does with your repo

Remixing **skips the wizard and the media pipeline entirely** — no scene question, no
image generation, no video generation. The user picked a finished site, so they get that
site. Only a later "change the background" follow-up runs the media agents.

1. `curl -fsSL https://codeload.github.com/<owner>/<repo>/tar.gz/refs/heads/<branch>` → untar into `/tmp/framerate-template`
2. `cp -a <root>/. /home/user/` — overlays the repo onto the pre-warmed sandbox
3. `npm install` in `/home/user` — installs whatever your `package.json` declares
4. Replaces every occurrence of `__FRAMERATE_VIDEO_URL__` under `src/` with the template's
   `defaultVideoUrl` (or `DEFAULT_TEMPLATE_VIDEO` if it declares none)
5. Runs the code agent against your files if the user also typed a prompt
6. `npx tsc --noEmit` → `npx vite build` → deploy to R2

Steps 3 and 6 are why remixing is slower than the scaffold path. That is expected.

## Requirements

**Stack.** Vite + React + TypeScript + Tailwind, client-side only. No Next.js, no SSR.
The sandbox runs `npm run dev -- --port 3000` from the repo root, so `package.json` must
have a `dev` script that starts Vite and a `build` script that runs `vite build`.

**Entry point.** `index.html` at the repo root and `src/App.tsx` as the root component —
the build and the agent both assume these paths.

**Video placeholder.** Wherever the background video URL belongs, write the literal string
`__FRAMERATE_VIDEO_URL__`. Every occurrence under `src/` is substituted at remix time with
the template's `defaultVideoUrl` from the registry. Commit a real URL nowhere — an
un-substituted placeholder is how you find out the wiring broke.

Set `defaultVideoUrl` in the registry to the video the template was actually designed
around. That video is what every remix ships with, so the built site should look like the
gallery cover. When a user later says "change the background to a snowy mountain", the
media pipeline generates a new video and the code agent swaps this URL for it.

```tsx
<video src="__FRAMERATE_VIDEO_URL__" autoPlay loop muted playsInline />
```

For a `FULL_PAGE` template using scroll-scrubbed video, the same token goes into whatever
component you use (`scrolly-video`, a canvas scrubber, your own). **Do not** copy
`src/templates/components/ScrollFrames.tsx` from this app — template repos own their
background implementation outright, and the platform's golden-ScrollFrames sync is
deliberately skipped for template projects.

**Local dev.** Because the placeholder is not a valid URL, keep a dev fallback so the repo
runs standalone:

```tsx
const VIDEO = "__FRAMERATE_VIDEO_URL__".startsWith("__")
  ? "https://assets.framerate.space/hero_bg_480p.mp4"
  : "__FRAMERATE_VIDEO_URL__";
```

**`mode` must be truthful.** `FULL_PAGE` means the video is behind the entire page and
sections are transparent; `HERO_ONLY` means the video lives in the hero and sections below
have solid backgrounds. This drives the code agent's system prompt — a mismatch produces
follow-up edits that fight the design.

**Dependencies.** Anything in `package.json` gets installed, so extra packages work. Keep
the list small: every dependency is install time on the user's first build. Packages
already baked into the sandbox image (React, Tailwind, framer-motion, lucide-react,
zustand, react-router-dom, radix primitives) cost nothing.

**No `node_modules`, no `dist`, no lockfile conflicts.** Commit `package-lock.json`; the
`.gitignore` should exclude `node_modules` and `dist`.

## Checklist before adding to the registry

- [ ] `npm ci && npm run build` passes from a clean clone
- [ ] `npx tsc --noEmit` passes (the pipeline runs it and will trigger the fixer agent if not)
- [ ] `__FRAMERATE_VIDEO_URL__` appears wherever the video URL belongs, and nowhere else
- [ ] No `ScrollFrames.tsx` copied from the platform scaffold
- [ ] `mode` in the registry matches how the site is actually built
- [ ] Repo is public
