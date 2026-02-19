import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";

export async function POST() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.user.upsert({
            where: { clerkUserId: userId },
            update: {}, // No-op if exists, just confirm presence
            create: {
                clerkUserId: userId,
                email: user.emailAddresses[0]?.emailAddress,
                name: `${user.firstName} ${user.lastName}`.trim(),
                credits: 1 // Free credit on first sync
            }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
