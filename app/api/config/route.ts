import { NextResponse } from "next/server";
import { STRIPE_ENABLED } from "@/src/lib/config";

/**
 * Public config for UI (e.g. show Buy Credits vs "Coming soon").
 */
export async function GET() {
  return NextResponse.json({ stripeEnabled: STRIPE_ENABLED });
}
