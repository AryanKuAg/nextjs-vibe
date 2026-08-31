# Template repo contract

Each entry in [`registry.ts`](./registry.ts) points at a public GitHub repo holding one
hand-built site. When a user remixes a template, v0 imports that repo directly
(`chats.createFromRepo`) and the chat opens on it as the starting code.

Nothing here applies to projects built from a plain prompt — that path is unchanged.

## What the pipeline does with your repo

Remixing **skips prompt-building entirely**. The user picked a finished site, so they get
that site: the repo is imported as-is, and the chat is open for follow-up edits.

There is no background-video substitution any more. Templates used to carry a
`__FRAMERATE_VIDEO_URL__` placeholder that the video agent's output was swapped into;
the video agent has been removed, so a template repo now ships exactly the assets it
commits. If your design wants a background clip, commit a real URL for it.

## Requirements

**Repo.** Public, with the branch named in the registry. v0 reads it over the GitHub API,
so nothing is downloaded or unpacked on our side.

**Entry point.** A conventional app root that v0 can recognise and continue working in.

**No `node_modules`, no `dist`, no lockfile conflicts.** Commit `package-lock.json`; the
`.gitignore` should exclude `node_modules` and `dist`.

## Checklist before adding to the registry

- [ ] `npm ci && npm run build` passes from a clean clone
- [ ] `npx tsc --noEmit` passes
- [ ] No `__FRAMERATE_VIDEO_URL__` placeholder left anywhere — nothing substitutes it now
- [ ] Repo is public, and `repo` / `branch` in the registry match it
