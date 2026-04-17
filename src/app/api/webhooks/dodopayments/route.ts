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
        console.log(`Updating usage for user ${userId} to plan ${plan}`);
        
        const subscriptionId = data.subscription_id || data.id;

        await prisma.usage.upsert({
          where: { key: userId },
          update: { 
            plan: plan.toLowerCase(),
            points: 0, // Reset points on new billing cycle / new upgrade
            subscriptionId: subscriptionId
          },
          create: {
            key: userId,
            plan: plan.toLowerCase(),
            points: 0,
            subscriptionId: subscriptionId
          }
        });
      } else {
        console.error("Missing userId or plan in webhook metadata", metadata);
      }
    } else if (payload.type === "subscription.canceled" || payload.event === "subscription.canceled") {
      const data = payload.data || payload;
      const metadata = data.payment_link_metadata || data.metadata || {};
      const userId = metadata.userId;

      if (userId) {
        console.log(`Downgrading user ${userId} due to canceled subscription`);
        await prisma.usage.update({
          where: { key: userId },
          data: {
            plan: "free",
            subscriptionId: null
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
