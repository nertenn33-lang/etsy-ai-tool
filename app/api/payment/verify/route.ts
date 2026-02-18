import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe";
import { prisma } from "@/src/lib/prisma";
import { uidCookieOptions } from "@/src/lib/uid";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { session_id } = body;

        if (!session_id || typeof session_id !== 'string') {
            return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
        }

        console.log(`[PaymentVerify] Verifying session: ${session_id}`);

        // 1. Retrieve the session from Stripe
        // We need the line_items or amount to verify it wasn't hacked, 
        // but for now we trust the existence of the session and its payment_status
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
        }

        const customerEmail = session.customer_details?.email;
        const clientReferenceId = session.client_reference_id;

        console.log(`[PaymentVerify] Email: ${customerEmail} | ClientRef: ${clientReferenceId}`);

        if (!customerEmail) {
            return NextResponse.json({ error: "No email found in session" }, { status: 400 });
        }

        // 2. Find the user by Email (Priority) or ID
        let user = await prisma.user.findFirst({
            where: { email: customerEmail }
        });

        // 2b. If not found by email, try Client Ref (though Webhook should have handled this)
        if (!user && clientReferenceId) {
            user = await prisma.user.findUnique({
                where: { id: clientReferenceId }
            });
        }

        // 3. Fallback: If still no user, something is wrong with Webhook, OR we are too fast.
        // We can create/upsert here to be safe and "Self-Healing".
        if (!user) {
            console.log("[PaymentVerify] User not found (Webhook slow?), creating...");
            user = await prisma.user.create({
                data: {
                    email: customerEmail,
                    credits: 3, // Validated 'paid' status, so safe to grant
                    id: clientReferenceId || undefined // Try to keep ID if possible
                }
            });
        } else {
            // Force sync credits just in case
            // If webhook hasn't fired, we trust the 'paid' status here too.
            if (user.credits < 3) {
                console.log("[PaymentVerify] Correcting credits to 3");
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { credits: 3 }
                });
            }
        }

        const response = NextResponse.json({
            success: true,
            credits: user.credits,
            uid: user.id
        });

        // 4. CRITICAL: Force Switch the Cookie to this User
        // This fixes the "Session Binding" if the browser lost the cookie.
        response.cookies.set("uid", user.id, uidCookieOptions);
        console.log(`[PaymentVerify] Cookie forced set to: ${user.id}`);

        return response;

    } catch (err: any) {
        console.error("[PaymentVerify] Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
