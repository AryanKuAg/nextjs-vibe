import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";
import { toV0JsonResponse } from "@/lib/v0-response";

export const dynamic = "force-dynamic";

/** Aborts the run at v0's next safe point and marks the message finished. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> },
) {
  const { chatId, messageId } = await params;
  const authorized = await authorizeChat(chatId);
  if (!authorized.ok) return authorized.response;

  const result = await v0.messages.stop({ chatId, messageId });

  return toV0JsonResponse(result);
}
