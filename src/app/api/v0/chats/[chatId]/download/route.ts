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
 * Repacked rather than passed through: the vendor's zip carries its own app
 * icon and a `generator` tag in the layout, and this download is a paid feature
 * customers open and read.
 *
 * The repacked zip is STREAMED back rather than buffered into one Response
 * body. Serverless hosts cap a buffered response — Vercel at 4.5 MB, returning
 * a 413 the browser shows as a failed download — and while a site's source is
 * usually a few hundred KB of text, v0 puts generated images in `public/` and
 * that is the sort of thing that crosses the line without warning. A streamed
 * body has no such cap, so the size of the customer's own site stops being
 * something this route can fail on.
 */
async function download(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  // `parseAs` matters: left on its default the SDK reads the body itself to
  // build `result.data`, and the response handed back is already spent — so
  // reading it here threw "Body is unusable" and every download 500'd. Asking
  // for an arrayBuffer puts the bytes in `data` and leaves nothing to re-read.
  const result = await v0.chats.downloadFiles({ chatId }, { parseAs: "arrayBuffer" });

  if (result.error !== undefined) {
    // Deliberately not `result.error`: the upstream body names the vendor, and
    // this one is handed to the browser verbatim.
    return Response.json(
      { error: "Could not download this build's files." },
      { status: result.response.status },
    );
  }

  // Typed `unknown` by the SDK — the endpoint's 200 is a ZIP archive, and
  // `parseAs` above decides the runtime shape.
  const source = result.data as ArrayBuffer;

  return new Response(await debrandedZipStream(source), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "cache-control": "no-store",
    },
  });
}

async function debrandedZipStream(source: ArrayBuffer): Promise<ReadableStream<Uint8Array>> {
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

  // JSZip's own streaming interface, adapted to a web ReadableStream. `pause`
  // and `resume` are what make backpressure real: without them JSZip would
  // deflate the whole archive into memory as fast as it can and the stream
  // would only be a formality.
  const chunks = zip.generateInternalStream({ type: "uint8array", compression: "DEFLATE" });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks
        .on("data", (chunk: Uint8Array) => {
          controller.enqueue(chunk);
          // Stop producing until the consumer asks for more.
          chunks.pause();
        })
        .on("end", () => controller.close())
        .on("error", (error: Error) => controller.error(error));

      chunks.resume();
    },
    pull() {
      chunks.resume();
    },
    cancel() {
      chunks.pause();
    },
  });
}

/**
 * The client's download hook issues a GET; this route answered only POST, so
 * every download came back 405. Both are exported rather than swapping one for
 * the other, so anything already calling it keeps working.
 */
export const GET = download;
export const POST = download;
