import { NextResponse } from "next/server";
import { getOrCreateUid } from "@/src/lib/uid";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret");

        // Simple protection
        if (secret !== "antigravity_admin_999") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { uid } = await getOrCreateUid();

        const user = await prisma.user.upsert({
            where: { id: uid },
            create: { id: uid, credits: 999 },
            update: { credits: 999 },
        });

        return NextResponse.json({
            success: true,
            message: `Credits set to 999 for user ${uid}`,
            user,
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
