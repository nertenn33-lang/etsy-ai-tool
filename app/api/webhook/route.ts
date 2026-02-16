import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { prisma } from "@/src/lib/prisma";
import Stripe from "stripe";

// Disable body parsing logic is handled automatically in App Router by using req.text() or req.json()

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

    if (!webhookSecret) {
        console.error("[Webhook] CRITICAL: Missing STRIPE_WEBHOOK_SECRET");
        return NextResponse.json(
            { error: "Server misconfiguration" },
            { status: 500 }
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret
        );
    } catch (err: any) {
        console.error(`[Webhook] Signature verification failed: ${err.message}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
        console.log(`[Webhook] Event Received: ${event.type}`);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            // Extract uid/userId. Metadata or client_reference_id
            const userId = session.client_reference_id || session.metadata?.userId || session.metadata?.uid;

            // Expected 3 credits
            const creditsToAdd = parseInt(session.metadata?.creditsToAdd || "3", 10);

            if (userId) {
                console.log(`[Webhook] Processing success for user: ${userId}, credits: ${creditsToAdd}`);

                // We use increment to be safe. If user doesn't exist (unlikely), we create them with 3+1 (bonus).
                await prisma.user.upsert({
                    where: { id: userId },
                    create: {
                        id: userId,
                        credits: creditsToAdd + 1, // 3 + 1 Free Credit
                    },
                    update: {
                        credits: {
                            increment: creditsToAdd,
                        },
                    },
                });
                console.log(`[Webhook] Successfully updated credits for ${userId}`);
            } else {
                console.error("[Webhook] ERROR: No userId found in session metadata or client_reference_id.", session.id);
            }
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("[Webhook] Error processing event:", err);
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        );
    }
}
