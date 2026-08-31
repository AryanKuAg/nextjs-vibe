import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";
import { V0_MODEL_CONFIGURATION } from "@/lib/v0-model";
import { toV0JsonResponse } from "@/lib/v0-response";
import { AGENT_COSTS, checkCredits, consumeCredits, refundCredits } from "@/lib/usage";

/** v0 streams for as long as the build takes; don't let the platform cut it. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ chatId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  const searchParams = new URL(request.url).searchParams;
  const limit = Number(searchParams.get("limit") ?? 20);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return Response.json({ message: "limit must be between 1 and 100." }, { status: 400 });
  }

  const cursor = searchParams.get("cursor");
  const result = await v0.messages.list({
    chatId,
    limit,
    ...(cursor ? { cursor } : {}),
  });

  return toV0JsonResponse(result);
}

/**
 * A follow-up turn. Charged per user message — v0 may take many internal steps
 * to answer it, and those must not bill again.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;

  if (typeof body?.message !== "string" || !body.message.trim()) {
    return Response.json({ message: "Enter a message." }, { status: 400 });
  }

  const { userId } = authorized.chat;

  try {
    await checkCredits(AGENT_COSTS.CODE);
    await consumeCredits(AGENT_COSTS.CODE, userId);
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "You have run out of credits." },
      { status: 402 },
    );
  }

  let result;
  try {
    result = await v0.messages.sendStream({
      chatId,
      message: body.message.trim(),
      // Whatever model the client asked for is discarded here: v0 Mini is the
      // only tier this app runs on, and this is the seam that enforces it.
      modelConfiguration: V0_MODEL_CONFIGURATION,
    });
  } catch (error) {
    await refundCredits(AGENT_COSTS.CODE, userId).catch(() => {});
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to send message." },
      { status: 502 },
    );
  }

  return result.toResponse();
}
