/**
 * Redirect to Lemon Squeezy Checkout with Custom Data
 */
import { NextResponse } from "next/server";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";

export async function POST(request: Request) {
  try {
    const { uid, cookieValueToSet } = await getOrCreateUid();
    const userId = uid;

    // Lemon Squeezy Product URL
    // In a real app, you might want to fetch this from an env var or config
    // Standard Lemon Squeezy URL (Temporary fix for custom domain propagation)
    const checkoutUrl = "https://rankonetsy.lemonsqueezy.com/checkout/buy/08ce9b6a-b949-494a-966e-5b7e98a53b02";

    // Append custom data for session binding
    const redirectUrl = `${checkoutUrl}?checkout[custom][user_id]=${userId}`;

    const response = NextResponse.json(
      { url: redirectUrl },
      { status: 200 },
    );

    if (cookieValueToSet) {
      response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
    }

    return response;
  } catch (err: any) {
    console.error('[CHECKOUT_ERROR]:', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 },
    );
  }
}
