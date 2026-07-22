import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { PLAN_CREDITS } from "@/lib/usage";

export const resetMonthlyCredits = inngest.createFunction(
  { id: "reset-monthly-credits", name: "Reset Monthly Credits for Subscribers" },
  { cron: "0 * * * *" }, // Run every hour
  async ({ step }) => {
    const result = await step.run("reset-credits-for-eligible-users", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find all users who have an active subscription, are on a paid plan,
      // and haven't had their credits reset in 30 days.
      const usersToReset = await prisma.usage.findMany({
        where: {
          plan: { not: "free" },
          subscriptionId: { not: null },
          lastCreditResetAt: {
            lte: thirtyDaysAgo,
          },
        },
      });

      console.log(`[Cron] Found ${usersToReset.length} users eligible for credit reset.`);

      let resetCount = 0;
      for (const user of usersToReset) {
        const monthlyCredits = PLAN_CREDITS[user.plan] || 0;
        
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

    return result;
  }
);
