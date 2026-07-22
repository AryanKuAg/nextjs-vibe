import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // In a production environment, verify the webhook signature here 
    // using DodoPayments webhook utilities or crypto.
    // const secret = process.env.DODO_WEBHOOK_SECRET;

    const payload = JSON.parse(rawBody);
    console.log("Dodo Payments Webhook received:", payload);

    // Common event types indicating successful payment/subscription
    const isSuccessEvent =
      payload.type === "payment.succeeded" ||
      payload.type === "subscription.active" ||
      payload.type === "subscription.renewed" ||
      payload.event === "payment.succeeded" ||
      payload.event === "subscription.active" ||
      payload.event === "subscription.renewed";

    if (isSuccessEvent) {
      // Dodo Payments payloads have metadata either inside `data` or nested inside `data.metadata` / `data.payment_link_metadata`
      const data = payload.data || payload;
      const metadata = data.payment_link_metadata || data.metadata || {};

      const userId = metadata.userId;
      const plan = metadata.plan;

      if (userId && plan) {
        console.log(`[WEBHOOK DEBUG] userId=${userId}, plan="${plan}", plan.toLowerCase()="${plan.toLowerCase()}"`);

        const { syncCredits, PLAN_CREDITS } = await import("@/lib/usage");
        const creditsToSet = PLAN_CREDITS[plan.toLowerCase()] || PLAN_CREDITS.free;
        console.log(`[WEBHOOK DEBUG] PLAN_CREDITS lookup: PLAN_CREDITS["${plan.toLowerCase()}"] = ${creditsToSet}`);
        console.log(`[WEBHOOK DEBUG] Full PLAN_CREDITS:`, JSON.stringify(PLAN_CREDITS));

        const subscriptionId = data.subscription_id || data.id;

        await syncCredits(userId, plan.toLowerCase());
        console.log(`[WEBHOOK DEBUG] syncCredits completed. Credits should now be ${creditsToSet}`);

        // Ensure subscriptionId is saved
        await prisma.usage.update({
          where: { key: userId },
          data: { subscriptionId }
        });
      } else {
        console.error("Missing userId or plan in webhook metadata", metadata);
      }
    } else if (payload.type === "subscription.canceled" || payload.event === "subscription.canceled" || payload.type === "subscription.cancelled" || payload.event === "subscription.cancelled") {
      const data = payload.data || payload;
      const metadata = data.payment_link_metadata || data.metadata || {};
      const userId = metadata.userId;

      if (userId) {
        console.log(`Downgrading user ${userId} due to canceled subscription`);

        // When DodoPayments officially cancels the subscription (which typically 
        // happens at the end of the billing cycle when canceled via the portal),
        // we reset their plan to free and drop their credits to the free tier limit (0).
        await prisma.usage.update({
          where: { key: userId },
          data: {
            plan: "free",
            subscriptionId: null,
            credits: 0 // Reset to free tier
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}
