import { NextResponse } from "next/server";

/**
 * DEV-only: Clears the uid cookie so the next request gets a fresh user.
 * Use same path/sameSite so the browser deletes the correct cookie.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("uid", "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
    httpOnly: true,
  });
  return res;
}
