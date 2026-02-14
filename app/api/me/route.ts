import { NextResponse } from "next/server";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { uid, cookieValueToSet } = await getOrCreateUid();

    const user = await prisma.user.upsert({
      where: { id: uid },
      create: { id: uid },
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
  } catch (err) {
    console.error("[GET /api/me]", err);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}
