import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log(`[AUTH_SYNC] Syncing user: ${userId}`);
        const result = await prisma.user.upsert({
            where: { clerkUserId: userId },
            update: {}, // No-op
            create: {
                clerkUserId: userId,
                email: user.emailAddresses[0]?.emailAddress,
                name: `${user.firstName} ${user.lastName}`.trim(),
                credits: 1 // Explicitly set 1 credit
            }
        });
        console.log(`[AUTH_SYNC] User synced. Credits: ${result.credits}`);
        return NextResponse.json({ success: true, credits: result.credits });
    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
