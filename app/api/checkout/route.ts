/**
 * Create Stripe Checkout session. Metadata: uid, creditsToAdd (webhook reads from here).
 * TEST: Stripe checkout metadata uid + creditsToAdd geliyor
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import {
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
  try {
    // UID is server-authoritative only: from cookie via getOrCreateUid(). Do not accept uid from client body.
    const { uid, cookieValueToSet } = await getOrCreateUid();

    logCheckoutEnvOnce();

    if (!isStripeEnabled()) {
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
      return NextResponse.json({ error: config.message }, { status: 503 });
    }

    const appUrl = getAppUrlForStripe();
    if (!appUrl) {
      console.warn("[checkout] NEXT_PUBLIC_APP_URL / APP_URL not set; redirect URLs may fail");
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL (required for checkout redirect URLs)" },
        { status: 503 },
      );
    }

    const secret = process.env.STRIPE_SECRET_KEY!;
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        { quantity: 1, price: process.env.STRIPE_PRICE_ID! },
      ],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      client_reference_id: uid,
      metadata: { uid, creditsToAdd: "3" },
    });

    const response = NextResponse.json(
      { url: session.url ?? undefined },
      { status: 200 },
    );
    if (cookieValueToSet) {
      response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
    }
    return response;
  } catch (err) {
    console.error("[POST /api/checkout]", err);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 },
    );
  }
}
