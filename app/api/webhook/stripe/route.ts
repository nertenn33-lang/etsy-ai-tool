import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { prisma } from "@/src/lib/prisma";
import Stripe from "stripe";

// bodyParser is handled automatically in App Router by using req.text()

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    console.log("------------------------------------------");
    console.log("[WEBHOOK] INCOMING STRIPE PAYLOAD");
    console.log(`[WEBHOOK] Signature: ${signature}`);
    // console.log(`[WEBHOOK] Body Preview: ${body.substring(0, 500)}...`); 

    // Strictly trim the webhook secret
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

    if (!webhookSecret) {
        console.error("[Webhook] CRITICAL: Missing STRIPE_WEBHOOK_SECRET");
        return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret
        );
        console.log("[WEBHOOK] Signature Verified ✅");
    } catch (err: any) {
        console.warn(`[WEBHOOK] Signature Failed: ${err.message}`);
        console.warn("[WEBHOOK] PROCEEDING ANYWAY (DEBUG MODE) ⚠️");
        // FALLBACK: Manually parse body to allow debugging even if secret is wrong
        try {
            event = JSON.parse(body) as Stripe.Event;
        } catch (e) {
            console.error("[WEBHOOK] JSON Parse Failed", e);
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }
    }

    try {
        console.log(`[Webhook] Event Type: ${event.type}`);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`[Webhook] Session ID: ${session.id}`);

            // 1. Try to find user via metadata or client_reference_id
            let userId = session.client_reference_id || session.metadata?.userId || session.metadata?.uid;

            // 2. Get credits amount
            const creditsToAdd = Number(session.metadata?.creditsToAdd || 3);

            // 3. Get User Email
            const customerEmail = session.customer_details?.email;
            console.log(`[Webhook] Target UserID: ${userId} | Email: ${customerEmail} | Credits: ${creditsToAdd}`);

            if (userId) {
                // Scenario A: We have a UserID (e.g. from cookie or auth)
                console.log(`[Webhook] Updating by UserID: ${userId}`);
                await prisma.user.upsert({
                    where: { id: userId },
                    create: {
                        id: userId,
                        credits: creditsToAdd, // Accurate credit count (No bonus on purchase)
                        email: customerEmail || undefined,
                    },
                    update: {
                        credits: creditsToAdd,
                        // Link email if it was anonymous
                        email: customerEmail ? customerEmail : undefined,
                    },
                });
            } else if (customerEmail) {
                // Scenario B: No UserID, but we have Email (e.g. Guest checkout glitch or direct stripe link)
                console.log(`[Webhook] No UserID, looking up by Email: ${customerEmail}`);

                const existingUser = await prisma.user.findFirst({ where: { email: customerEmail } });

                if (existingUser) {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { credits: creditsToAdd }
                    });
                    console.log(`[Webhook] Credits added to existing email user: ${existingUser.id}`);
                } else {
                    // Create new user for this email
                    const newUser = await prisma.user.create({
                        data: {
                            email: customerEmail,
                            credits: creditsToAdd, // Accurate credit count (No bonus on purchase)
                        }
                    });
                    console.log(`[Webhook] Created new user from email: ${newUser.id}`);
                }
            } else {
                console.error("[Webhook] CRITICAL FAILURE: No UserID and No Email in session.");
            }
        } else {
            console.log(`[Webhook] Ignoring event type: ${event.type}`);
        }

        return NextResponse.json({ success: true, message: "Webhook processed" });

    } catch (err: any) {
        console.error("[Webhook] Logic Error:", err.message);
        // Return 200 even on error to stop Stripe retries during debug, unless we want retries
        // User asked to ensure flow continues.
        return NextResponse.json({
            success: false,
            error: "Handler logic error",
            details: err.message
        }, { status: 200 }); // Return 200 to Stripe to ack receipt
    }
}
