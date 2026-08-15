import type { MessagesResolveStreamData } from "v0";

import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";
import { V0_MODEL_CONFIGURATION } from "@/lib/v0-model";
import { AGENT_COSTS, checkCredits, consumeCredits, refundCredits } from "@/lib/usage";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Answer a question v0 asked mid-run — picked options, an approved plan, a
 * granted permission. It continues the same turn, so it is charged like one:
 * resolving a task resumes the agent and costs another code run.
 */
export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId);
  if (!authorized.ok) return authorized.response;

  const body = (await request.json().catch(() => null)) as
    | MessagesResolveStreamData["body"]
    | null;

  if (!body?.task) {
    return Response.json({ message: "A task response is required." }, { status: 400 });
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
    result = await v0.messages.resolveStream({
      chatId,
      task: body.task,
      modelConfiguration: V0_MODEL_CONFIGURATION,
    });
  } catch (error) {
    await refundCredits(AGENT_COSTS.CODE, userId).catch(() => {});
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to resolve task." },
      { status: 502 },
    );
  }

  return result.toResponse();
}
