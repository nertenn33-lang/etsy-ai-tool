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
        const customData = payload.meta.custom_data || {}; // Fallback to empty obj
        const userId = customData.user_id;

        console.log(`[LEMON_WEBHOOK] Event: ${eventName}`);
        console.log(`[LEMON_WEBHOOK] Custom Data:`, JSON.stringify(customData));
        console.log(`[LEMON_WEBHOOK] User ID detected: ${userId}`);

        if (eventName === "order_created" && userId) {
            // Find user by Clerk ID first
            const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });

            if (user) {
                // Grant credits
                await prisma.user.update({
                    where: { clerkUserId: userId },
                    data: {
                        credits: { increment: 3 },
                    },
                });
                console.log(`[LEMON_WEBHOOK] Granted 3 credits to Clerk User ${userId} (DB ID: ${user.id})`);
            } else {
                // Fallback: If for some reason sync failed, create them with Clerk ID
                await prisma.user.upsert({
                    where: { clerkUserId: userId }, // This might fail if clerkUserId is null in DB, but it shouldn't be for new users
                    update: { credits: { increment: 3 } },
                    create: {
                        clerkUserId: userId,
                        email: payload.data.attributes.user_email,
                        credits: 3
                    }
                });
                console.log(`[LEMON_WEBHOOK] Created/Updated Clerk User ${userId} with 3 credits`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("[LEMON_WEBHOOK_ERROR]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
