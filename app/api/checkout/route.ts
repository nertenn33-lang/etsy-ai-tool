/**
 * Redirect to Lemon Squeezy Checkout with Custom Data
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  console.log("[CHECKOUT_POST] Started");
  console.log("LEMONSQUEEZY_VARIANT_ID:", process.env.LEMONSQUEEZY_VARIANT_ID);

  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verified Custom Domain (buy.rankonetsy.com)
    const baseUrl = "https://buy.rankonetsy.com/checkout/buy/37ce293d-bf78-454c-97cf-a4361405b1e7";
    const successUrl = "https://www.rankonetsy.com/app?success=true";

    // Construct final URL with params
    // Important: encodeURIComponent ensures the query string inside the query string is valid
    // We add both success_url and redirect_url to be safe, as requested
    const encodedSuccessUrl = encodeURIComponent(successUrl);
    // CRITICAL: Inject Clerk userId into custom_data
    const checkoutUrl = `${baseUrl}?checkout[custom][user_id]=${userId}&checkout[success_url]=${encodedSuccessUrl}&checkout[redirect_url]=${encodedSuccessUrl}`;

    console.log("[CHECKOUT_POST] URL generated:", checkoutUrl);

    const response = NextResponse.json(
      { url: checkoutUrl },
      { status: 200 },
    );

    return response;
  } catch (err: any) {
    console.error('[CHECKOUT_ERROR]:', err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
