import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Zip of the current source, streamed straight from v0 to the browser. */
export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  const result = await v0.chats.downloadFiles({ chatId });

  if (result.error !== undefined) {
    return Response.json(result.error, { status: result.response.status });
  }

  return new Response(result.response.body, {
    status: result.response.status,
    headers: {
      "content-type": result.response.headers.get("content-type") ?? "application/zip",
      "cache-control": "no-store",
    },
  });
}
