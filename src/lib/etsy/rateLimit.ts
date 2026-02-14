/**
 * Simple in-memory rate limit for Etsy API routes.
 * Prefer uid (cookie); fallback to IP from x-forwarded-for or x-real-ip.
 * Unknown clients: 5 req/10min; identified (uid or IP): 20 req/10min.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const MAX_REQUESTS_ANONYMOUS = 5;

const store = new Map<string, { count: number; resetAt: number }>();

function now(): number {
  return Date.now();
}

/** Build rate-limit key: uid first, else IP from proxy headers, else "unknown". */
export function getEtsyRateLimitKey(uid: string | undefined, headers: Headers): string {
  if (uid && uid.trim()) return uid.trim() + ":etsy";
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first + ":etsy";
  }
  const xri = headers.get("x-real-ip")?.trim();
  if (xri) return xri + ":etsy";
  return "unknown:etsy";
}

export function checkEtsyRateLimit(key: string): boolean {
  const isAnonymous = key === "unknown:etsy";
  const limit = isAnonymous ? MAX_REQUESTS_ANONYMOUS : MAX_REQUESTS;
  const ent = store.get(key);
  const n = now();
  if (!ent) {
    store.set(key, { count: 1, resetAt: n + WINDOW_MS });
    return true;
  }
  if (n >= ent.resetAt) {
    store.set(key, { count: 1, resetAt: n + WINDOW_MS });
    return true;
  }
  if (ent.count >= limit) return false;
  ent.count++;
  return true;
}
