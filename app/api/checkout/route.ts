/**
 * Create Stripe Checkout session with strictly trimmed credentials.
 */
import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import {
  LANDING_MODE,
  STRIPE_ENABLED,
} from "@/src/lib/config";

export async function POST(request: Request) {
  try {
    const { uid, cookieValueToSet } = await getOrCreateUid();

    // No-Auth Mode: We rely on the `uid` cookie.
    // If the user has restored their session via email, `uid` will point to their permanent ID.
    const userId = uid;

    // Strictly trim Price ID
    const priceId = (process.env.STRIPE_PRICE_ID || "").trim();
    if (!priceId) {
      return NextResponse.json({ error: "Configuration Error: Missing Price ID" }, { status: 500 });
    }

    const { origin } = new URL(request.url);

    // Create session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "3 Credits Pack",
            },
            unit_amount: 999,
          },
        },
      ],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      client_reference_id: userId,
      metadata: { uid, userId, creditsToAdd: "3" },
    });

    const response = NextResponse.json(
      { url: session.url ?? undefined },
      { status: 200 },
    );

    if (cookieValueToSet) {
      response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
    }

    return response;
  } catch (err: any) {
    console.error('[STRIPE_ERROR]:', err.message);
    return NextResponse.json(
      { error: err.message }, // Clear error returned to browser
      { status: 500 },
    );
  }
}
