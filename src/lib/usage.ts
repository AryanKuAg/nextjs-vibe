import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const PLAN_CREDITS: Record<string, number> = {
  free: 0,
  basic: 500,
  plus: 2000,
  pro: 3500,
};

export { MODEL_COSTS, FOLLOW_UP_COSTS } from "@/lib/pricing";


/**
 * Ensures the user has enough credits without deducting them.
 */
export async function checkCredits(amount: number, overrideUserId?: string) {
  let userId = overrideUserId;
  
  if (!userId) {
    const authResult = await auth();
    userId = authResult.userId ?? undefined;
  }
  
  if (!userId) throw new Error("User not authenticated");

  const usage = await prisma.usage.findUnique({ where: { key: userId } });
  
  if (!usage) {
    // Check if user exists, if not create with free credits
    await prisma.usage.create({
      data: { key: userId, credits: PLAN_CREDITS.free, plan: "free" }
    });
    if (PLAN_CREDITS.free < amount) {
      throw new Error("You do not have enough credits for this generation");
    }
    return;
  }

  if (usage.credits < amount) {
    throw new Error("You do not have enough credits for this generation");
  }
}

/**
 * Atomic credit deduction.
 * Ensures the user has enough credits before subtracting.
 */
export async function consumeCredits(amount: number, overrideUserId?: string) {
  let userId = overrideUserId;
  
  if (!userId) {
    const authResult = await auth();
    userId = authResult.userId ?? undefined;
  }
  
  if (!userId) throw new Error("User not authenticated");

  // We use updateMany with a condition on credits to ensure atomicity
  const result = await prisma.usage.updateMany({
    where: {
      key: userId,
      credits: { gte: amount }
    },
    data: {
      credits: { decrement: amount }
    }
  });

  if (result.count === 0) {
    // Check if user exists, if not create with free credits first then try again
    const exists = await prisma.usage.findUnique({ where: { key: userId } });
    if (!exists) {
      await prisma.usage.create({
        data: { key: userId, credits: PLAN_CREDITS.free, plan: "free" }
      });
      return consumeCredits(amount, userId); // Retry once
    }
    throw new Error("You have run out of credits");
  }

  const updated = await prisma.usage.findUnique({ where: { key: userId } });
  return { remainingCredits: updated?.credits ?? 0 };
}

/**
 * Refund credits in case of failures.
 */
export async function refundCredits(amount: number, overrideUserId?: string) {
  let userId = overrideUserId;
  
  if (!userId) {
    const authResult = await auth();
    userId = authResult.userId ?? undefined;
  }
  
  if (!userId) return;

  await prisma.usage.update({
    where: { key: userId },
    data: { credits: { increment: amount } }
  });
}

/**
 * Re-initialize or sync credits based on a plan.
 * Used after successful subscription or admin action.
 */
export async function syncCredits(userId: string, plan: string) {
  const credits = PLAN_CREDITS[plan] || PLAN_CREDITS.free;
  await prisma.usage.upsert({
    where: { key: userId },
    update: { credits, plan },
    create: { key: userId, credits, plan }
  });
}

export async function getUsageStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("User not authenticated");

  let usage = await prisma.usage.findUnique({
    where: { key: userId }
  });

  if (!usage) {
    usage = await prisma.usage.create({
      data: { key: userId, credits: PLAN_CREDITS.free, plan: "free" }
    });
  }

  return {
    remainingCredits: usage.credits,
    totalCredits: PLAN_CREDITS[usage.plan] || PLAN_CREDITS.free,
    plan: usage.plan,
    isAllowed: usage.credits > 0
  };
}

export async function getPortalSession() {
  const { userId } = await auth();
  if (!userId) throw new Error("User not authenticated");

  const usage = await prisma.usage.findUnique({
    where: { key: userId }
  });

  if (!usage?.subscriptionId) {
    throw new Error("No active subscription");
  }

  const DodoPayments = (await import("dodopayments")).default;
  const dodo = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: process.env.NODE_ENV === "development" ? "test_mode" : "live_mode",
  });

  const subscription = await dodo.subscriptions.retrieve(usage.subscriptionId);
  if (!subscription.customer?.customer_id) {
    throw new Error("Could not find customer ID on subscription");
  }

  const portal = await dodo.customers.customerPortal.create(subscription.customer.customer_id);
  return { url: portal.link };
}
