import { refundCredits } from "@/lib/usage";

/**
 * Returns credits to the user when a run fails after they were charged.
 *
 * Credits for code generation are taken up front by the tRPC procedure that
 * dispatches the run, so a failure part-way through would otherwise leave the
 * user paying for nothing — and the failure message invites them to try again,
 * charging them a second time.
 *
 * The amount is carried on the triggering event as `refundOnFailure`, stamped
 * only by the caller that actually charged. This is what stops a double refund:
 * the autonomous agent reaches the code agent through `step.invoke`, whose
 * payload has no such field, so a code-agent failure nested inside an autonomous
 * run refunds once (at the autonomous level) rather than twice.
 *
 * The image agent charges itself *after* delivering, so there is nothing to
 * refund for it — a failed image was never billed.
 */
export async function refundChargedCredits(
  // The `inngest/function.failed` event, which wraps the original trigger.
  event: { data?: { event?: { data?: Record<string, unknown> } } },
  step: { run: (id: string, fn: () => Promise<unknown>) => Promise<unknown> }
): Promise<void> {
  const triggerData = event?.data?.event?.data;
  const amount = triggerData?.refundOnFailure;
  const userId = triggerData?.userId;

  if (typeof amount !== "number" || amount <= 0) return;
  if (typeof userId !== "string" || !userId) return;

  await step.run("refund-credits", async () => {
    await refundCredits(amount, userId);
    console.log(`[Refund] Returned ${amount} credits to ${userId} after a failed run.`);
    return { refunded: amount };
  });
}
