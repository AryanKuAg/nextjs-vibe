import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import DodoPayments from "dodopayments";

// Fallback logic in case the SDK format differs due to versioning
// Dodo Payments currently uses standard `payment_links` endpoint
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const email = user.emailAddresses[0]?.emailAddress;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const { plan } = await req.json();

    const planToProduct: Record<string, string | undefined> = {
      basic: process.env.DODO_PRODUCT_BASIC,
      plus: process.env.DODO_PRODUCT_PLUS,
      pro: process.env.DODO_PRODUCT_PRO,
    };

    const productId = planToProduct[plan.toLowerCase()];

    if (!productId) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    // Initialize DodoPayments client
    const dodo = new DodoPayments({
      bearerToken: apiKey,
      environment: "test_mode",
    });

    // Create a payment session/link
    const session = await dodo.checkoutSessions.create({
      ...(email && {
        customer: {
          email,
          name: name || undefined,
        }
      }),
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        }
      ],
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`, 
      metadata: {
        userId,
        plan
      }
    });

    // If session.checkout_url exists, return it
    if (session && session.checkout_url) {
        return NextResponse.json({ url: session.checkout_url });
    }
    
    // Fallback if Dodo returns a different payload
    const fallbackSession = session as unknown as Record<string, unknown>;
    return NextResponse.json({ url: fallbackSession.url || fallbackSession.payment_link });

  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
