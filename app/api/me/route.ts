import { NextResponse } from "next/server";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();

    // 1. Authenticated User
    if (userId) {
      // Authenticated User
      const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });

      // If not found (sync lag?), return 0 credits or valid default
      if (!user) {
        return NextResponse.json({ uid: userId, credits: 0 });
      }

      return NextResponse.json({
        uid: user.id,
        credits: user.credits,
      });
    } else {
      // 2. Guest User (Fallback)
      const { uid, cookieValueToSet } = await getOrCreateUid();

      // Return 1 credit for guests too if they are new, via upsert
      const user = await prisma.user.upsert({
        where: { id: uid },
        create: { id: uid, credits: 1 },
        update: {},
      });

      const response = NextResponse.json({
        uid: user.id,
        credits: user.credits,
      });

      if (cookieValueToSet) {
        response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
      }
      return response;
    }

  } catch (err) {
    const code = err && typeof (err as { code?: string }).code === "string" ? (err as { code: string }).code : "";
    console.error("[GET /api/me] Failed to load user.", code ? `code=${code}` : "", err);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}
