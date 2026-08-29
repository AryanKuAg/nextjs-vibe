import "server-only";

import { lookup } from "node:dns/promises";

import { PREVIEW_HOST, previewHostname, previewSubdomain } from "@/lib/preview-host";

/**
 * Decides, server-side, whether previews may use their own hostname.
 *
 * Configuring `NEXT_PUBLIC_V0_PREVIEW_HOST` is not the same as the DNS record
 * existing. When it did not, the browser was handed `<id>.preview.example`,
 * spent eight seconds failing to resolve it, showed its own "server IP address
 * could not be found" page inside the preview pane, and only then fell back.
 * The user saw a broken site that was never broken.
 *
 * So the wildcard is resolved here first, and the client is only ever given a
 * hostname that exists. It also removes a hydration mismatch for free: the
 * server decides, so both renders agree.
 */

/** Long enough to not re-resolve constantly, short enough that adding the record takes effect. */
const CHECK_TTL_MS = 5 * 60 * 1000;

let cached: { reachable: boolean; checkedAt: number } | null = null;

async function isPreviewHostReachable(): Promise<boolean> {
  if (!PREVIEW_HOST) return false;

  if (cached && Date.now() - cached.checkedAt < CHECK_TTL_MS) return cached.reachable;

  let reachable = false;
  try {
    // Any label under the wildcard answers if the record exists. Localhost is
    // special-cased: `*.localhost` is resolved by the browser, not by DNS, so a
    // lookup here would fail even though the browser would be fine.
    const hostname = previewHostname();
    if (hostname.endsWith("localhost")) {
      reachable = true;
    } else {
      await lookup(`preview-probe.${hostname}`);
      reachable = true;
    }
  } catch {
    reachable = false;
    console.warn(
      `[v0] ${PREVIEW_HOST} has no wildcard DNS record — previews will use the ` +
        "same-origin proxy. Create *." + previewHostname() + " to enable per-site hosts.",
    );
  }

  cached = { reachable, checkedAt: Date.now() };
  return reachable;
}

/** The origin this chat's preview should be framed at, or null for the path proxy. */
export async function previewOriginForChat(chatId: string): Promise<string | null> {
  if (!(await isPreviewHostReachable())) return null;

  const protocol = previewHostname().endsWith("localhost") ? "http:" : "https:";
  return `${protocol}//${previewSubdomain(chatId)}.${PREVIEW_HOST}`;
}
