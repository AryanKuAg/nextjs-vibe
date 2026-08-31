import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import DodoPayments from "dodopayments";

import { dodoEnvironment } from "@/lib/dodo-env";

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

    const { plan, billing, returnUrl } = await req.json();

    // Set in the browser by the DataFast script in the root layout. Forwarding it
    // as checkout metadata is what lets DataFast tie the resulting payment back to
    // the marketing channel that brought the visitor in. Absent for visitors who
    // block the script or arrive without it, so it stays optional.
    const datafastVisitorId = req.cookies.get("datafast_visitor_id")?.value;

    const planToProduct: Record<string, string | undefined> = billing === "yearly"
      ? {
        plus: process.env.DODO_PRODUCT_PLUS_YEARLY,
        pro: process.env.DODO_PRODUCT_PRO_YEARLY,
        max: process.env.DODO_PRODUCT_MAX_YEARLY,
      }
      : {
        plus: process.env.DODO_PRODUCT_PLUS,
        pro: process.env.DODO_PRODUCT_PRO,
        max: process.env.DODO_PRODUCT_MAX,
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
      environment: dodoEnvironment(),
    });



    // Dodo redirects the customer back before its webhook has necessarily landed,
    // so flag the return trip — the app polls for the new plan instead of showing
    // stale credits.
    const baseReturn =
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/`;
    const returnWithFlag = (() => {
      try {
        const url = new URL(baseReturn);
        url.searchParams.set("checkout", "success");
        return url.toString();
      } catch {
        return baseReturn;
      }
    })();

    // Revenue attribution: DataFast's script sets this first-party cookie on the
    // browser, and Dodo forwards whatever is in `metadata` to the DataFast
    // webhook, which is where the payment gets tied back to the visit that
    // produced it. Omitted rather than sent empty when missing — a visitor with
    // the script blocked has no id, and a blank one would attribute to nothing.
    const datafastVisitorId = req.cookies.get("datafast_visitor_id")?.value;

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
      return_url: returnWithFlag,
      metadata: {
        userId,
        plan,
        billing: billing === "yearly" ? "yearly" : "monthly",
        ...(datafastVisitorId && { datafast_visitor_id: datafastVisitorId }),
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
