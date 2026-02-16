import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { prisma } from "@/src/lib/prisma";
import Stripe from "stripe";

// bodyParser is handled automatically in App Router by using req.text()

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    // Strictly trim the webhook secret
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
        console.error('WEBHOOK_SIG_ERROR:', err.message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
        console.log(`[Webhook] Event Received: ${event.type}`);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            // Extract identifier. Metadata or client_reference_id
            // Note: We use the 'id' field in Prisma as per schema.
            const userId = session.client_reference_id || session.metadata?.userId || session.metadata?.uid;

            // Expected 3 credits + ensure specific Number(3) logic as requested
            const creditsToAdd = Number(3);

            if (userId) {
                console.log(`[Webhook] Processing success for user: ${userId}, credits: ${creditsToAdd}`);

                // We use increment. If user doesn't exist, we create them with 3+1 (bonus).
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
                console.error("[Webhook] ERROR: No identifier (uid/userId/client_reference_id) found in session.");
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("[Webhook] Error processing event:", err.message);
        return NextResponse.json(
            { error: "Webhook handler failed", details: err.message },
            { status: 500 }
        );
    }
}
