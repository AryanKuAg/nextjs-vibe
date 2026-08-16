import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";
import { toV0JsonResponse } from "@/lib/v0-response";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ chatId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  const result = await v0.chats.getFiles({ chatId });

  return toV0JsonResponse(result);
}
