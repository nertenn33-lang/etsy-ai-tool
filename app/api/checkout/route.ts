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
    // Custom Domain Enabled (buy.rankonetsy.com)
    const baseUrl = "https://buy.rankonetsy.com/checkout/buy/37ce293d-bf78-454c-97cf-a4361405b1e7";
    const successUrl = "https://www.rankonetsy.com/app?success=true";

    // Construct final URL with params
    const checkoutUrl = `${baseUrl}?checkout[custom][user_id]=${userId}&checkout[success_url]=${successUrl}`;

    const response = NextResponse.json(
      { url: checkoutUrl },
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
