import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const FREE_POINTS = 2;
const PRO_POINTS = 100;
const DURATION = 30 * 24 * 60 * 60; // 30 days
const GENERATION_COST = 1;

export async function consumeCredits() {
  const { userId, has } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const hasProAccess = has({ plan: "pro" });
  const maxPoints = hasProAccess ? PRO_POINTS : FREE_POINTS;

  // Use a simple atomic upsert to avoid RateLimiterPrisma's nested transactions
  // which frequently cause P2028 timeouts in Next.js development.
  const usage = await prisma.usage.upsert({
    where: { key: userId },
    update: { points: { increment: GENERATION_COST } },
    create: { key: userId, points: GENERATION_COST }
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
  const { userId, has } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const hasProAccess = has({ plan: "pro" });
  const maxPoints = hasProAccess ? PRO_POINTS : FREE_POINTS;
  
  const usage = await prisma.usage.findUnique({
    where: { key: userId }
  });

  const consumed = usage ? usage.points : 0;
  
  return {
    consumedPoints: consumed,
    remainingPoints: Math.max(0, maxPoints - consumed),
    isAllowed: consumed < maxPoints,
  };
}
