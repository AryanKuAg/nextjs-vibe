import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { prisma } from "@/lib/db";

// Normalizes both the `payload.type` and legacy `payload.event` shapes.
function getEventType(payload: Record<string, unknown>): string {
  return String(payload.type || payload.event || "");
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Verify the webhook signature. Without this, anyone who knows the URL
    //    could POST a fake "payment.succeeded" and grant themselves credits.
    //    Verification is skipped only when the secret is unset, so deploying
    //    before configuring it never breaks live payments — but set it in prod.
    const secret = process.env.DODO_WEBHOOK_SECRET;
    if (secret) {
      try {
        const wh = new Webhook(secret);
        wh.verify(rawBody, {
          "webhook-id": req.headers.get("webhook-id") ?? "",
          "webhook-signature": req.headers.get("webhook-signature") ?? "",
          "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
        });
      } catch (err) {
        console.error("[Webhook] Signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("[Webhook] DODO_WEBHOOK_SECRET not set — skipping signature verification (INSECURE; set it in prod)");
    }

    const payload = JSON.parse(rawBody);
    const eventType = getEventType(payload);
    const data = payload.data || payload;
    const metadata = data.payment_link_metadata || data.metadata || {};

    const userId: string | undefined = metadata.userId;
    const plan: string | undefined = metadata.plan?.toLowerCase();
    const billing: string | undefined =
      metadata.billing === "yearly" ? "yearly" : metadata.billing === "monthly" ? "monthly" : undefined;
    const subscriptionId: string | undefined = data.subscription_id || data.id;
    const nextBillingDate: Date | undefined = data.next_billing_date
      ? new Date(data.next_billing_date)
      : undefined;

    console.log(`[Webhook] event=${eventType} userId=${userId} plan=${plan} billing=${billing}`);

    // Every branch below needs a userId to act on.
    if (!userId) {
      console.error("[Webhook] Missing userId in metadata", metadata);
      // Still 200 so Dodo doesn't retry a payload we can't ever process.
      return NextResponse.json({ received: true });
    }

    // 2. Successful payment / activation / renewal → (re)grant plan credits.
    const isSuccessEvent =
      eventType === "payment.succeeded" ||
      eventType === "subscription.active" ||
      eventType === "subscription.renewed";

    if (isSuccessEvent) {
      if (!plan) {
        console.error("[Webhook] Success event without plan in metadata", metadata);
        return NextResponse.json({ received: true });
      }

      const { syncCredits } = await import("@/lib/usage");
      // Sets credits + plan + lastCreditResetAt = now (upserts the row).
      await syncCredits(userId, plan);

      await prisma.usage.update({
        where: { key: userId },
        data: {
          subscriptionId,
          subscriptionStatus: "active",
          ...(billing ? { billing } : {}),
          ...(nextBillingDate ? { expire: nextBillingDate } : {}),
        },
      });

      return NextResponse.json({ received: true });
    }

    // 3. Payment failed / subscription paused → stop granting cron credits,
    //    but keep the subscription record so the user can recover (fix card).
    if (eventType === "subscription.on_hold" || eventType === "subscription.failed" || eventType === "payment.failed") {
      await prisma.usage.updateMany({
        where: { key: userId },
        data: { subscriptionStatus: eventType === "payment.failed" ? "on_hold" : eventType.replace("subscription.", "") },
      });
      return NextResponse.json({ received: true });
    }

    // 4. Cancellation → keep access until the paid period ends (expire), then the
    //    cron downgrades to free. Do NOT zero credits immediately: a yearly user
    //    who cancels in month 2 has already paid for the whole year.
    if (eventType === "subscription.cancelled" || eventType === "subscription.canceled") {
      await prisma.usage.updateMany({
        where: { key: userId },
        data: {
          subscriptionStatus: "cancelled",
          ...(nextBillingDate ? { expire: nextBillingDate } : {}),
        },
      });
      return NextResponse.json({ received: true });
    }

    // 5. Subscription fully expired → downgrade to free immediately.
    if (eventType === "subscription.expired") {
      await prisma.usage.updateMany({
        where: { key: userId },
        data: {
          plan: "free",
          billing: null,
          subscriptionId: null,
          subscriptionStatus: "expired",
          credits: 0,
          expire: null,
        },
      });
      return NextResponse.json({ received: true });
    }

    // Unhandled event — acknowledge so Dodo doesn't retry.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
