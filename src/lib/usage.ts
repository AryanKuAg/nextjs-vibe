import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  basic: 1500,
  plus: 2500,
  pro: 3500,
};
const GENERATION_COST = 1;

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Get current max points based on user's plan
  const existingUsage = await prisma.usage.findUnique({ where: { key: userId } });
  const plan = existingUsage?.plan || "free";
  const maxPoints = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Use a simple atomic upsert
  const usage = await prisma.usage.upsert({
    where: { key: userId },
    update: { points: { increment: GENERATION_COST } },
    create: { key: userId, points: GENERATION_COST, plan: "free" }
  });

  if (usage.points > maxPoints) {
    // If they exceeded, revert the increment to prevent infinite debt and throw
    await prisma.usage.update({
      where: { key: userId },
      data: { points: { decrement: GENERATION_COST } }
    });
    throw new Error("You have run out of credits");
  }

  return { consumedPoints: usage.points };
}

export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usage = await prisma.usage.findUnique({
    where: { key: userId }
  });

  const plan = usage?.plan || "free";
  const maxPoints = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const consumed = usage ? usage.points : 0;
  
  return {
    consumedPoints: consumed,
    remainingPoints: Math.max(0, maxPoints - consumed),
    maxPoints: maxPoints,
    isAllowed: consumed < maxPoints,
    plan: plan
  };
}
