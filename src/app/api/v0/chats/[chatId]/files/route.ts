import type { ChatsUpdateFilesData } from "v0";

import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";
import { toV0JsonResponse } from "@/lib/v0-response";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ chatId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId);
  if (!authorized.ok) return authorized.response;

  const result = await v0.chats.getFiles({ chatId });

  return toV0JsonResponse(result);
}

/** Hand-edits from the code pane. Not charged — no model runs. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId);
  if (!authorized.ok) return authorized.response;

  const body = (await request.json().catch(() => null)) as ChatsUpdateFilesData["body"] | null;

  if (!Array.isArray(body?.files) || body.files.length === 0) {
    return Response.json({ message: "At least one file update is required." }, { status: 400 });
  }

  const result = await v0.chats.updateFiles({ chatId, files: body.files });

  return toV0JsonResponse(result);
}
