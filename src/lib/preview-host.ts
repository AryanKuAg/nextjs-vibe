/**
 * Serving previews from their own hostname.
 *
 * A generated site expects to live at the root of an origin. Framed at
 * `/api/v0-preview/<chatId>` it does not: its router reads `location.pathname`,
 * finds a path missing from its own route table, and stops doing client-side
 * navigation — every link becomes a full page load. Its assets have the mirror
 * problem, asking for `/_next/...` at a root this application owns.
 *
 * Giving each chat its own host removes both at once. `<chatId>.preview.example`
 * serves the site from `/`, so nothing has to be rewritten: the router locates
 * itself, root-relative assets resolve to a host that is entirely the preview's,
 * and links navigate client-side because nobody touched them.
 *
 * Configure with V0_PREVIEW_HOST (the wildcard's parent, e.g.
 * `preview.example.com`). Unset, everything falls back to the same-origin path
 * proxy, so this is safe to deploy before the DNS record exists.
 */

/** Wildcard parent, e.g. `preview.example.com`. Empty string when unconfigured. */
export const PREVIEW_HOST = (process.env.NEXT_PUBLIC_V0_PREVIEW_HOST ?? "").trim().toLowerCase();

export function isPreviewHostConfigured() {
  return PREVIEW_HOST.length > 0;
}

/**
 * The chat a request is for, read from its Host header — or null when this is
 * ordinary application traffic.
 */
export function chatIdFromHost(host: string | null | undefined): string | null {
  if (!PREVIEW_HOST || !host) return null;

  // Compared without ports on either side: the Host header carries one in
  // development, and Next matches `has: host` against the hostname alone.
  const normalized = stripPort(host.trim().toLowerCase());
  const suffix = `.${previewHostname()}`;
  if (!normalized.endsWith(suffix)) return null;

  const label = normalized.slice(0, -suffix.length);
  // One label only. `a.b.preview.example` is not a chat we serve, and treating
  // it as one would let a crafted host smuggle dots into the id.
  if (!/^[a-f0-9]+$/.test(label) || label.length % 2 !== 0) return null;

  return decodeLabel(label);
}

/**
 * Chat ids are case-sensitive; hostnames are not. `fTY9KDbggjb` arrives as
 * `fty9kdbggjb` and no longer names a chat, so the label is hex rather than the
 * id itself — lowercase by construction, and survives the round trip intact.
 */
export function previewSubdomain(chatId: string): string {
  let hex = "";
  for (let index = 0; index < chatId.length; index += 1) {
    hex += chatId.charCodeAt(index).toString(16).padStart(2, "0");
  }
  return hex;
}

function decodeLabel(label: string): string | null {
  let chatId = "";
  for (let index = 0; index < label.length; index += 2) {
    const code = Number.parseInt(label.slice(index, index + 2), 16);
    if (!Number.isFinite(code)) return null;
    chatId += String.fromCharCode(code);
  }
  return /^[A-Za-z0-9_-]+$/.test(chatId) ? chatId : null;
}

/** Where the browser should point the iframe, or null to use the path proxy. */
export function previewOriginFor(chatId: string, protocol = "https:"): string | null {
  if (!PREVIEW_HOST) return null;

  return `${protocol}//${previewSubdomain(chatId)}.${PREVIEW_HOST}`;
}

/**
 * Regex for `next.config.ts` host matching. Escaped because a hostname's dots
 * would otherwise match any character, so `preview-example.com` would be
 * accepted in place of `preview.example.com`.
 */
export function previewHostPattern(): string {
  const escaped = previewHostname().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The port is optional so one pattern covers `preview.example.com` in
  // production and `preview.localhost:3000` in development.
  return `(?<previewChatId>[a-f0-9]+)\\.${escaped}(?::\\d+)?`;
}

/** The configured host without its port, which is what matching compares. */
export function previewHostname(): string {
  return stripPort(PREVIEW_HOST);
}

function stripPort(host: string): string {
  return host.replace(/:\d+$/, "");
}
