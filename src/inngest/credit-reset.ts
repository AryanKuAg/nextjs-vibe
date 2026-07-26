import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { PLAN_CREDITS } from "@/lib/usage";

export const resetMonthlyCredits = inngest.createFunction(
  { id: "reset-monthly-credits", name: "Reset Monthly Credits for Subscribers" },
  { cron: "0 * * * *" }, // Run every hour
  async ({ step }) => {
    // --- Step 1: Monthly credit top-up ---------------------------------------
    // Yearly subscribers only get one webhook per year, so the cron is what
    // delivers their credits every ~30 days. Only "active" subscriptions earn a
    // reset — on_hold / cancelled / expired subs are excluded so lapsed or
    // unpaid subscriptions stop receiving free credits.
    const resetResult = await step.run("reset-credits-for-active-subscribers", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usersToReset = await prisma.usage.findMany({
        where: {
          plan: { not: "free" },
          subscriptionId: { not: null },
          subscriptionStatus: "active",
          lastCreditResetAt: { lte: thirtyDaysAgo },
        },
      });

      console.log(`[Cron] ${usersToReset.length} active subscribers eligible for credit reset.`);

      let resetCount = 0;
      for (const user of usersToReset) {
        const monthlyCredits = PLAN_CREDITS[user.plan] ?? 0;
        await prisma.usage.update({
          where: { key: user.key },
          data: {
            credits: monthlyCredits,
            lastCreditResetAt: new Date(),
          },
        });
        resetCount++;
      }

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
