import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/src/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("x-signature");
        const secret = process.env.WEBHOOK_SECRET || "rankonetsy_super_secret_123";

        if (!signature || !secret) {
            return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
        }

        // Verify Signature
        const hmac = crypto.createHmac("sha256", secret);
        const digest = hmac.update(rawBody).digest("hex");

        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        const customData = payload.meta.custom_data;
        const userId = customData?.user_id;

        console.log(`[LEMON_WEBHOOK] Event: ${eventName}, User: ${userId}`);

        if (eventName === "order_created" && userId) {
            // Find user
            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (user) {
                // Grant credits (Assume 3 for now as per pack)
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        credits: { increment: 3 },
                    },
                });
                console.log(`[LEMON_WEBHOOK] Granted 3 credits to ${userId}`);
            } else {
                // If user doesn't exist yet (guest mode first purchase?), create them
                // In our current flow, guest users explicitly have a cookie ID, so they "exist" conceptually but maybe not in DB if they never analyzed?
                // Actually getOrCreateUid makes sure they have an ID, but not necessarily a DB record if we rely on lazy creation.
                // However, `getOrCreateUid` just generates a string.
                // We should upsert to be safe.
                await prisma.user.upsert({
                    where: { id: userId },
                    update: { credits: { increment: 3 } },
                    create: {
                        id: userId,
                        email: payload.data.attributes.user_email, // Save email from Lemon Squeezy
                        credits: 3 // 3 credits for the purchase
                    }
                });
                console.log(`[LEMON_WEBHOOK] Created/Updated user ${userId} with 3 credits`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("[LEMON_WEBHOOK_ERROR]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
