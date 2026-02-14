import { cookies } from "next/headers";

const UID_COOKIE_NAME = "uid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Ensures a persistent uid cookie. If missing, generates a new uuid v4 and
 * returns it so the caller can set the cookie on the response.
 */
export async function getOrCreateUid(): Promise<{
  uid: string;
  cookieValueToSet?: string;
}> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(UID_COOKIE_NAME)?.value;

  if (existing) {
    return { uid: existing };
  }

  const uid = crypto.randomUUID();
  return { uid, cookieValueToSet: uid };
}

export const uidCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: ONE_YEAR_SECONDS,
  // Do not set domain on localhost so cookie is stable across redirects.
};
