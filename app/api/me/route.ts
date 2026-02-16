import { NextResponse } from "next/server";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { uid, cookieValueToSet } = await getOrCreateUid();

    const user = await prisma.user.upsert({
      where: { id: uid },

      create: { id: uid, credits: 1 }, // Manual override: 1 Free Credit
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
    const code = err && typeof (err as { code?: string }).code === "string" ? (err as { code: string }).code : "";
    console.error("[GET /api/me] Failed to load user.", code ? `code=${code}` : "", err);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}
