/**
 * Stripe webhook – Node runtime, raw body once, idempotent via StripeEvent.
 * Proof logging: pid, url, host, sig, env secret fingerprint, verification result.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/src/lib/prisma";
import { STRIPE_ENABLED } from "@/src/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    return await handleWebhook(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe webhook]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleWebhook(request: Request) {
  const isDev = process.env.NODE_ENV !== "production";

  // Proof: which server and request
  let url = "";
  let host = "";
  let xfHost = "";
  let xfProto = "";
  try {
    url = request.url ?? "";
    host = request.headers.get("host") ?? "";
    xfHost = request.headers.get("x-forwarded-host") ?? "";
    xfProto = request.headers.get("x-forwarded-proto") ?? "";
  } catch {
    // ignore
  }
  console.log("[stripe webhook] pid=%s url=%s host=%s xfHost=%s xfProto=%s", process.pid, url, host, xfHost, xfProto);

  if (!STRIPE_ENABLED) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const signature = request.headers.get("stripe-signature");
  const sigPresent = !!signature;
  const sigLen = signature?.length ?? 0;
  console.log("[stripe webhook] sig present=%s len=%s", sigPresent, sigLen);

  if (!signature) {
    console.error("[stripe webhook] 400: Missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[stripe webhook] 400: Missing STRIPE_WEBHOOK_SECRET in env (paste whsec_ from stripe listen, restart dev server)");
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  }

  const secretLen = webhookSecret.length;
  const secretTail = secretLen > 6 ? webhookSecret.slice(-6) : "(too short)";
  console.log("[stripe webhook] env secret len=%s tail=%s", secretLen, secretTail);

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  console.log("[stripe webhook] rawBody length=%s", rawBody?.length ?? 0);

  const stripe = new Stripe(secret);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[stripe webhook] 400: Signature verification failed. err.message=%s", errMsg);
    console.error("[stripe webhook] env secret tail=%s. Your *current* stripe listen secret tail must match this. Re-run stripe-webhook-dev.ps1 and restart Next.", secretTail);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  console.log("[stripe webhook] verified event.type=%s id=%s", event.type, event.id);

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const uid = session.metadata?.uid ?? session.client_reference_id ?? null;
  if (isDev) {
    console.log("[stripe webhook] session.id=%s session.metadata=%o client_reference_id=%s", session.id, session.metadata, session.client_reference_id);
  }
  if (!uid) {
    if (isDev) {
      console.warn("[stripe webhook] checkout.session.completed but no uid. No credit. metadata=%o", session.metadata);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const creditsToAdd = Number(session.metadata?.creditsToAdd ?? 3) || 3;

  const already = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
  });
  if (isDev) {
    console.log("[stripe webhook] idempotency check: already=%s", already ? "true" : "false");
  }
  if (already) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    await prisma.$transaction([
      prisma.stripeEvent.create({ data: { id: event.id } }),
      prisma.user.upsert({
        where: { id: uid },
        create: { id: uid, credits: creditsToAdd },
        update: { credits: { increment: creditsToAdd } },
      }),
    ]);
    const updated = await prisma.user.findUnique({
      where: { id: uid },
      select: { credits: true },
    });
    const newCredits = updated?.credits ?? creditsToAdd;
    console.log("[stripe webhook] credited uid=%s creditsToAdd=%s newCredits=%s", uid, creditsToAdd, newCredits);
  } catch (err) {
    console.error("[stripe webhook] process failed", err);
    if (err instanceof Error && err.stack) {
      console.error("[stripe webhook] stack:", err.stack);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
