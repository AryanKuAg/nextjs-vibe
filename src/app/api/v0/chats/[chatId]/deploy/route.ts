import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";
import { toV0JsonResponse } from "@/lib/v0-response";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Publish the current version to Vercel.
 *
 * A chat can only be deployed once it has a Vercel project, so this creates one
 * on the first publish and reuses it afterwards.
 *
 * v0's deploy endpoint returns identifiers only — `{ deploymentId,
 * vercelProjectId }` — and no public URL, because the build runs asynchronously
 * on Vercel after this call returns. The header therefore reports the publish
 * as started rather than linking somewhere that may not exist yet.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId);
  if (!authorized.ok) return authorized.response;

  const chat = await v0.chats.get({ chatId });
  if (chat.error !== undefined) {
    return Response.json(chat.error, { status: chat.response.status });
  }

  if (!chat.data.vercelProjectId) {
    const project = await v0.chats.createVercelProject({ chatId });
    if (project.error !== undefined) {
      return Response.json(project.error, { status: project.response.status });
    }
  }

  const result = await v0.chats.deploy({ chatId });

  return toV0JsonResponse(result);
}
