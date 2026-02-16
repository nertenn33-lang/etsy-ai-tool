import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { prisma } from "@/src/lib/prisma";
import Stripe from "stripe";

// Disable body parsing for webhook verification
export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("Missing STRIPE_WEBHOOK_SECRET");
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
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            // Extract userId from metadata
            const userId = session.metadata?.userId || session.metadata?.uid;
            // Force 3 credits as per business logic
            const creditsToAdd = 3;

            if (userId && creditsToAdd > 0) {
                console.log(`[Webhook] Adding ${creditsToAdd} credits to user ${userId}`);

                await prisma.user.upsert({
                    where: { id: userId },
                    create: {
                        id: userId,
                        credits: creditsToAdd + 3, // Sign-up bonus + purchase
                    },
                    update: {
                        credits: {
                            increment: creditsToAdd,
                        },
                    },
                });
            } else {
                console.warn("[Webhook] Missing userId or creditsToAdd in metadata", session.metadata);
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
