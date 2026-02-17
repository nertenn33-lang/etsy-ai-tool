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

            // PRIORITISED ID LOGIC: client_reference_id first, then metadata.userId
            const userId = session.client_reference_id || session.metadata?.userId || session.metadata?.uid;

            // GUARANTEED CREDIT LOGIC: Number(creditsToAdd || 3)
            const creditsToAdd = Number(session.metadata?.creditsToAdd || 3);

            if (userId) {
                console.log(`[Webhook] Processing success for user: ${userId}, credits: ${creditsToAdd}`);

                // We use upsert to be safe, but targeting the logic requested: update credits by incrementing 3
                const customerDetails = session.customer_details;
                const customerEmail = customerDetails?.email;

                await prisma.user.upsert({
                    where: { id: userId },
                    create: {
                        id: userId,
                        credits: creditsToAdd + 1, // Sign-up bonus + purchase
                        email: customerEmail || undefined, // Capture email if new user
                    },
                    update: {
                        credits: {
                            increment: creditsToAdd,
                        },
                        // If user has no email yet (anonymous), link this paying email to them!
                        // This enables the "Link Stripe Email" flow.
                        email: customerEmail ? customerEmail : undefined,
                    },
                });
                console.log(`[Webhook] Successfully updated credits for ${userId}`);
            } else {
                console.error("[Webhook] ERROR: No identifier (client_reference_id or userId) found in session metadata.", session.id);
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
