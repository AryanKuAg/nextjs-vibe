import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { PLAN_CREDITS } from "@/lib/usage";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A boundary that lands within this window of the previous grant is the one that
 * *produced* that grant, not a new period. Comfortably below the 28-day shortest
 * calendar month, and comfortably above any time-of-day skew between the stored
 * grant timestamp and the billing anchor.
 */
const MIN_PERIOD_MS = 20 * DAY_MS;

/** Calendar-month shift that clamps instead of overflowing (Jan 31 → Feb 28). */
function shiftMonths(anchor: Date, months: number): Date {
  const day = anchor.getUTCDate();
  const d = new Date(anchor);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTargetMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return d;
}

/**
 * The credit period boundary a subscriber is currently owed, or null if they
 * aren't due yet.
 *
 * Boundaries are counted back in calendar months from the billing anchor
 * (`expire`, i.e. next_billing_date), so a yearly subscriber gets exactly twelve
 * grants per paid year on their billing day — a fixed 30-day interval would drift
 * forward and hand out ~12.2.
 *
 * Returns the *most recent* due boundary rather than the oldest, so a subscriber
 * whose anchor is stale catches up in one grant instead of one per missed month.
 */
export function dueCreditBoundary(
  expire: Date | null,
  lastCreditResetAt: Date,
  now: Date
): Date | null {
  const threshold = new Date(lastCreditResetAt.getTime() + MIN_PERIOD_MS);

  // No billing anchor stored (shouldn't happen for a live subscription) — fall
  // back to a fixed 30-day cadence, still anchored to the last grant so it can't
  // drift further.
  if (!expire) {
    const due = new Date(lastCreditResetAt.getTime() + 30 * DAY_MS);
    return now >= due ? due : null;
  }

  // Walk back from the anchor to the newest boundary at or before now. The cap
  // is a safety net against a wildly out-of-range anchor.
  for (let monthsBack = 0; monthsBack < 600; monthsBack++) {
    const boundary = shiftMonths(expire, -monthsBack);
    if (boundary > now) continue;
    return boundary > threshold ? boundary : null;
  }

  return null;
}

export const resetMonthlyCredits = inngest.createFunction(
  { id: "reset-monthly-credits", name: "Reset Monthly Credits for Subscribers" },
  { cron: "0 * * * *" }, // Run every hour
  async ({ step }) => {
    // --- Step 1: Monthly credit top-up ---------------------------------------
    // Yearly subscribers only get one webhook per year, so the cron is what
    // delivers their credits each month. Only "active" subscriptions earn a
    // reset — on_hold / failed / expired subs are excluded so lapsed or unpaid
    // subscriptions stop receiving free credits.
    const resetResult = await step.run("reset-credits-for-active-subscribers", async () => {
      const now = new Date();
      // Coarse pre-filter only: no calendar month is shorter than 28 days, so
      // nobody due can be excluded here. The exact decision is per-subscriber.
      const cutoff = new Date(now.getTime() - 27 * DAY_MS);

      const candidates = await prisma.usage.findMany({
        where: {
          plan: { not: "free" },
          subscriptionId: { not: null },
          lastCreditResetAt: { lte: cutoff },
          OR: [
            { subscriptionStatus: "active" },
            // Cancelled but still inside the period they already paid for. A
            // yearly subscriber who cancels in month 2 has paid for all twelve
            // months, so their monthly top-ups must continue until `expire`.
            // on_hold / failed / expired stay excluded — those haven't been paid.
            { subscriptionStatus: "cancelled", expire: { gt: now } },
          ],
        },
      });

      let resetCount = 0;
      for (const user of candidates) {
        const boundary = dueCreditBoundary(user.expire, user.lastCreditResetAt, now);
        if (!boundary) continue;

        const monthlyCredits = PLAN_CREDITS[user.plan] ?? 0;
        await prisma.usage.update({
          where: { key: user.key },
          data: {
            credits: monthlyCredits,
            // Stamped with the period boundary, not "now" — stamping the run time
            // would push each cycle later by up to an hour and accumulate into an
            // extra grant over a year.
            lastCreditResetAt: boundary,
          },
        });
        resetCount++;
      }

      console.log(
        `[Cron] ${candidates.length} subscribers checked, ${resetCount} credit resets applied.`
      );

      return { resetCount };
    });

    // --- Step 2: Downgrade cancelled subs whose paid period has ended ---------
    // Cancellation keeps access until `expire` (period end); after that we drop
    // the user to the free tier.
    const downgradeResult = await step.run("downgrade-expired-cancellations", async () => {
      const now = new Date();

      const usersToDowngrade = await prisma.usage.findMany({
        where: {
          subscriptionStatus: "cancelled",
          expire: { not: null, lte: now },
        },
      });

      console.log(`[Cron] ${usersToDowngrade.length} cancelled subscriptions past their period end.`);

      let downgradeCount = 0;
      for (const user of usersToDowngrade) {
        await prisma.usage.update({
          where: { key: user.key },
          data: {
            plan: "free",
            billing: null,
            subscriptionId: null,
            subscriptionStatus: "expired",
            credits: 0,
            expire: null,
          },
        });
        downgradeCount++;
      }

      return { downgradeCount };
    });

    return { ...resetResult, ...downgradeResult };
  }
);
