/**
 * Self-check: compare provided tail (last 6 chars of whsec) with env STRIPE_WEBHOOK_SECRET tail.
 * POST body: { tail: "xxxxxx" }. Returns { match: true | false }.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const provided = typeof body?.tail === "string" ? body.tail.trim().slice(-6) : "";
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const envTail = secret && secret.length > 6 ? secret.slice(-6) : null;
    const match = !!provided && !!envTail && provided === envTail;
    return NextResponse.json({ match });
  } catch {
    return NextResponse.json({ match: false });
  }
}
