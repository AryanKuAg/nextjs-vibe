import type { ChatsRestoreMessageData } from "v0";

import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";
import { toV0JsonResponse } from "@/lib/v0-response";

export const dynamic = "force-dynamic";

/** Rewind the chat to an earlier message, discarding everything after it. */
export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  const body = (await request.json().catch(() => null)) as ChatsRestoreMessageData["body"] | null;

  if (typeof body?.messageId !== "string" || !body.messageId) {
    return Response.json({ message: "A message ID is required." }, { status: 400 });
  }

  const result = await v0.chats.restoreMessage({ chatId, messageId: body.messageId });

  return toV0JsonResponse(result);
}
