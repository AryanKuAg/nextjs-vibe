import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { refundChargedCredits } from "./refund";
import { PROJECT_STAGE } from "@/lib/project-stage";

const CLEANUP_ID = "run-cancelled-cleanup";

/**
 * Cleans up after a run that Inngest cancelled rather than failed.
 *
 * `onFailure` is sugar for a handler on `inngest/function.failed`, and a
 * cancellation is not a failure — so none of the agents' onFailure work runs
 * when a run is cancelled by `timeouts.finish`. Nothing else covered that gap,
 * which is why a run that overran its budget left the user charged for a site
 * they never got and the project parked on an active stage, spinning on
 * "Building website" long after the run had stopped existing.
 *
 * Timeouts are the case this exists for, but the same handler covers a REST or
 * bulk cancellation. Manual stops are deliberately left alone — see below.
 */
export const runCancelledFunction = inngest.createFunction(
  { id: CLEANUP_ID, retries: 2 },
  { event: "inngest/function.cancelled" },
  async ({ event, step }) => {
    // This handler is an Inngest function too, so cancelling it emits the very
    // event it listens on. The payload of that echo carries no projectId and
    // would fall out below anyway, but a bulk cancel is not the moment to be
    // relying on that.
    if (String(event.data?.function_id ?? "").endsWith(CLEANUP_ID)) {
      return { skipped: "own cancellation" };
    }

    const trigger = event.data?.event?.data as
      | { projectId?: string; refundOnFailure?: number }
      | undefined;

    const projectId = trigger?.projectId;
    if (!projectId) return { skipped: "not a project run" };

    // Only the outermost run cleans up. `refundOnFailure` is stamped by the
    // caller that actually charged, so a nested code-agent run — reached through
    // `step.invoke` from the autonomous graph, whose payload has no such field —
    // has no message to write and no credits to return: its parent is being
    // cancelled by the same timeout and owns both. Without this, a cancelled
    // autonomous run would post the apology twice.
    if (typeof trigger?.refundOnFailure !== "number") {
      return { skipped: "nested run — the parent owns the cleanup" };
    }

    // A user pressing Stop cancels through the same path, and `cancelGeneration`
    // has already written its own message and deliberately does not refund. That
    // write races this handler by a few milliseconds, so settle before reading —
    // otherwise a manual stop reads as a timeout and gets an apology and a
    // refund it should never have had.
    await step.sleep("let-manual-stop-settle", "10s");

    const outcome = await step.run("unjam-ui", async () => {
      const latest = await prisma.message.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: { role: true },
      });

      // An assistant message already closes out this turn: the user stopped it
      // by hand, or the run delivered before the cancellation landed. Either way
      // the UI is not jammed and nothing is owed.
      if (latest?.role === "ASSISTANT") return { unjammed: false };

      await prisma.message.create({
        data: {
          projectId,
          content:
            "This build ran past its time limit and was stopped before it finished. " +
            "Your credits have been returned — please try again, and consider a " +
            "simpler prompt if it happens twice.",
          role: "ASSISTANT",
          type: "ERROR",
        },
      });

      // Back to a resting stage so the status line stops claiming work is in
      // flight. SCENE to match what the code agent's failure path picks, and
      // scoped to the active stages so a project already resting on SITE — from
      // a build that landed before the cancellation — is not dragged backwards.
      await prisma.project
        .updateMany({
          where: {
            id: projectId,
            currentStage: {
              in: [
                PROJECT_STAGE.THINKING,
                PROJECT_STAGE.GENERATING_SCENE,
                PROJECT_STAGE.BUILDING_SITE,
              ],
            },
          },
          data: { currentStage: PROJECT_STAGE.SCENE },
        })
        .catch(() => { });

      return { unjammed: true };
    });

    // Only refund what this handler actually stranded. If the turn was already
    // closed out we did not take anything from the user here — and a manual stop
    // is charged on purpose, so refunding it would hand back credits for work
    // the user chose to abandon.
    if (!outcome.unjammed) return { projectId, skipped: "already resolved" };

    // After the message, so a refund that throws cannot leave the UI stuck.
    await refundChargedCredits(event, step);

    return { projectId, cleaned: true };
  }
);
