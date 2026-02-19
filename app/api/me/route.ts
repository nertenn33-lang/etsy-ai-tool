import { NextResponse } from "next/server";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    let user;

    if (userId) {
      // Authenticated User
      user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
      // If not found (sync lag?), fallback to creating or guest? 
      // Better to just return what we have or null. 
      // Ideally AuthSync handles creation.
      // But let's be safe.
      if (!user) {
        // Maybe they haven't synced yet.
        return NextResponse.json({ uid: userId, credits: 0 }); // Or 1?
      }
    } else {
      // Guest User
      const { uid, cookieValueToSet } = await getOrCreateUid();

      // Return 1 credit for guests too if they are new, via upsert
      user = await prisma.user.upsert({
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

    // Authenticated Response
    return NextResponse.json({
      uid: user.id,
      credits: user.credits,
    });

    const response = NextResponse.json({
      uid: user.id,
      credits: user.credits,
    });

    if (cookieValueToSet) {
      response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
    }

    return response;
  } catch (err) {
    const code = err && typeof (err as { code?: string }).code === "string" ? (err as { code: string }).code : "";
    console.error("[GET /api/me] Failed to load user.", code ? `code=${code}` : "", err);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}
