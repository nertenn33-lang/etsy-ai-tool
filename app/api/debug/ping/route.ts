/**
 * Sanity health endpoint: proves which Next server (PID) is handling requests
 * and whether STRIPE_WEBHOOK_SECRET is loaded. Use GET /api/debug/ping.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = request.url;
  let portGuess: number | null = null;
  try {
    const u = new URL(url);
    portGuess = u.port ? parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 80;
    if (Number.isNaN(portGuess)) portGuess = null;
  } catch {
    // ignore
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const envHasWebhookSecret = !!webhookSecret && webhookSecret.length > 0;
  const secretTail = webhookSecret && webhookSecret.length > 6 ? webhookSecret.slice(-6) : null;

  return NextResponse.json({
    ok: true,
    pid: process.pid,
    portGuess,
    envHasWebhookSecret,
    secretTail,
    now: new Date().toISOString(),
  });
}
