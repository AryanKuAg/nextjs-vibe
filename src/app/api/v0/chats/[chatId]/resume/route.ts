import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Re-attach to a run that is already in flight.
 *
 * This is what makes a build survive a page reload: the turn was started
 * server-side (or by a tab that has since closed), and the browser picks the
 * stream back up from wherever it has got to. No credits here — the message
 * this resumes was charged when it was sent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const authorized = await authorizeChat(chatId, request);
  if (!authorized.ok) return authorized.response;

  const result = await v0.chats.resume({ chatId });

  return result.toResponse();
}
