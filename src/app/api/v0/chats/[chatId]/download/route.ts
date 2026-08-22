import JSZip from "jszip";

import {
  NEUTRAL_ICON_SVG,
  isSourceIconPath,
  sourceIconPathFor,
  stripGeneratorMetadata,
} from "@/lib/debrand";
import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Zip of the current source.
 *
 * Repacked rather than streamed through: the vendor's zip carries its own app
 * icon and a `generator` tag in the layout, and this download is a paid feature
 * customers open and read. Site sources are small — a few hundred KB of text
 * next to the node_modules they do not include — so buffering to rewrite them
 * costs little.
 */
export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  const result = await v0.chats.downloadFiles({ chatId });

  if (result.error !== undefined) {
    // Deliberately not `result.error`: the upstream body names the vendor, and
    // this one is handed to the browser verbatim.
    return Response.json(
      { error: "Could not download this build's files." },
      { status: result.response.status },
    );
  }

  const source = await result.response.arrayBuffer();

  return new Response(await debrandZip(source), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "cache-control": "no-store",
    },
  });
}

async function debrandZip(source: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(source);

  const paths = Object.entries(zip.files)
    .filter(([, entry]) => !entry.dir)
    .map(([path]) => path);

  // Removed rather than overwritten: these come in a mix of formats, and
  // writing SVG bytes into an `icon.png` would leave a file that no longer
  // decodes. One replacement is added below instead.
  for (const path of paths.filter(isSourceIconPath)) {
    zip.remove(path);
  }

  for (const path of paths.filter((path) => /(?:^|\/)layout\.[jt]sx?$/i.test(path))) {
    const layout = await zip.file(path)!.async("string");
    const stripped = stripGeneratorMetadata(layout);

    if (stripped !== layout) zip.file(path, stripped);
  }

  zip.file(sourceIconPathFor(paths), NEUTRAL_ICON_SVG);

  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
