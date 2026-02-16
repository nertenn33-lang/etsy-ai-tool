/**
 * Create Stripe Checkout session. Metadata: uid, creditsToAdd (webhook reads from here).
 * TEST: Stripe checkout metadata uid + creditsToAdd geliyor
 */
import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import {
  LANDING_MODE,
  STRIPE_ENABLED,
  getAppUrlForStripe,
} from "@/src/lib/config";

function isStripeEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return process.env.STRIPE_ENABLED?.trim()?.toLowerCase() !== "false";
  }
  return process.env.STRIPE_ENABLED?.trim()?.toLowerCase() === "true";
}

const STRIPE_PRICE_ID_MESSAGE =
  "Missing STRIPE_PRICE_ID. Create a one-time $9.99 Price in Stripe Dashboard and paste its price_... id into .env.local";

function validateStripeConfig(): { ok: true } | { ok: false; message: string } {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return { ok: false, message: "Missing STRIPE_SECRET_KEY" };
  }
  if (!process.env.STRIPE_PRICE_ID?.trim()) {
    return { ok: false, message: STRIPE_PRICE_ID_MESSAGE };
  }
  return { ok: true };
}

let checkoutEnvLogged = false;
function logCheckoutEnvOnce() {
  if (checkoutEnvLogged) return;
  checkoutEnvLogged = true;
  const sk = !!process.env.STRIPE_SECRET_KEY?.trim();
  const price = !!process.env.STRIPE_PRICE_ID?.trim();
  const appUrl = !!process.env.NEXT_PUBLIC_APP_URL?.trim() || !!process.env.APP_URL?.trim();
  console.warn(
    "[checkout] env: STRIPE_SECRET_KEY %s, STRIPE_PRICE_ID %s, NEXT_PUBLIC_APP_URL/APP_URL %s",
    sk ? "ok" : "MISSING",
    price ? "ok" : "MISSING",
    appUrl ? "ok" : "MISSING"
  );
}

export async function POST(request: Request) {
  console.time("[Checkout Total Time]");
  try {
    console.log("[Checkout Agent] Method: POST, Timestamp:", new Date().toISOString());

    // UID is server-authoritative only: from cookie via getOrCreateUid(). Do not accept uid from client body.
    console.time("[UID Fetch]");
    const { uid, cookieValueToSet } = await getOrCreateUid();
    console.timeEnd("[UID Fetch]");
    console.log(`[Checkout Agent] UID: ${uid}`);

    logCheckoutEnvOnce();

    if (LANDING_MODE) {
      console.warn("[Checkout Agent] LANDING_MODE is ON. Rejecting.");
      const response = NextResponse.json(
        { error: "Payments temporarily offline. Join the waitlist to be notified when we're back." },
        { status: 503 }
      );
      if (cookieValueToSet) {
        response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
      }
      return response;
    }

    if (!isStripeEnabled()) {
      console.warn("[Checkout Agent] Stripe is DISABLED in config.");
      const message =
        process.env.NODE_ENV === "production"
          ? "Stripe disabled."
          : "Stripe disabled. Set STRIPE_ENABLED=true in .env.local and restart.";
      const response = NextResponse.json({ error: message }, { status: 501 });
      if (cookieValueToSet) {
        response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
      }
      return response;
    }

    const config = validateStripeConfig();
    if (!config.ok) {
      console.error("[Checkout Agent] Config Validation FAILED:", config.message);
      return NextResponse.json({ error: config.message }, { status: 500 });
    }

    // Verify environment variables (trimmed)
    const strKey = (process.env.STRIPE_SECRET_KEY || "").trim();
    const priceId = (process.env.STRIPE_PRICE_ID || "").trim();

    console.log("[Checkout Agent] Verifying Stripe Object...");
    console.log(`[Checkout Agent] stripe instance type: ${typeof stripe}`);
    console.log(`[Checkout Agent] stripe.checkout type: ${typeof stripe?.checkout}`);

    if (!stripe || !stripe.checkout) {
      throw new Error("Stripe library failed to initialize correctly. stripe or stripe.checkout is undefined.");
    }

    const { origin } = new URL(request.url);
    console.log(`[Checkout Agent] Origin detected: ${origin}`);

    console.log("[Checkout Agent] Starting Stripe Session Creation...");
    console.time("[Stripe API Call]");
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
      client_reference_id: uid,
      metadata: { uid, userId: uid, creditsToAdd: "3" }, // Added userId
    });
    console.timeEnd("[Stripe API Call]");

    console.log("[Checkout Agent] Session created successfully. ID:", session.id);
    console.log("[Checkout Agent] Session URL:", session.url ? "Exists" : "MISSING");

    const response = NextResponse.json(
      { url: session.url ?? undefined },
      { status: 200 },
    );
    if (cookieValueToSet) {
      response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
    }
    console.timeEnd("[Checkout Total Time]");
    return response;
  } catch (err: any) {
    try { console.timeEnd("[Stripe API Call]"); } catch { }
    try { console.timeEnd("[Checkout Total Time]"); } catch { }

    console.error('[STRIPE_ERROR]:', err.message);
    console.error("[Checkout Agent] Full Error Context:", err);
    console.error("[Checkout Agent] Error Stack:", err.stack);

    return NextResponse.json(
      { error: err.message }, // Return raw error message to client for debugging
      { status: 500 },
    );
  }
}
