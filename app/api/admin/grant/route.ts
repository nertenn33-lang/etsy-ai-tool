import { NextResponse } from "next/server";
import { getOrCreateUid } from "@/src/lib/uid";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret");
        const targetEmail = searchParams.get("email");

        // Simple protection
        if (secret !== "antigravity_admin_999") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!targetEmail) {
            // Fallback to current session/cookie if no email provided? 
            // Or enforce email. User said "mailimi yazınca".
            // Let's keep existing behavior as fallback OR error.
            // Let's support BOTH: if email param, use it. Else use cookie.
            const { uid } = await getOrCreateUid();
            await prisma.user.upsert({
                where: { id: uid },
                create: { id: uid, credits: 999 },
                update: { credits: 999 },
            });
            return NextResponse.json({ success: true, message: `Credits set to 999 for anonymous user ${uid}` });
        }

        // Grant via Email
        const user = await prisma.user.upsert({
            where: { email: targetEmail },
            create: {
                email: targetEmail,
                credits: 999,
                // We need a dummy ID if creating fresh.
                // In simple mode, we rely on CUID defaults in schema? 
                // Schema says @default(cuid()) so we don't strictly need to pass ID if using prisma client correctly,
                // BUT `upsert` create block often requires required fields. 
                // User model: id String @id @default(cuid()) is good.
                // However, if we are using the helper that might not auto-gen if we don't pass undefined?
                // Prisma usually handles default(cuid) automatically if omitted.
            },
            update: { credits: 999 },
        });

        return NextResponse.json({
            success: true,
            message: `Credits set to 999 for email ${targetEmail}`,
            user,
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
