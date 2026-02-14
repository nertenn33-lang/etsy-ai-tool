/**
 * Minimal PostHog analytics. No-op if NEXT_PUBLIC_POSTHOG_KEY is missing.
 * Lazy singleton; props merged with page: "home", optional uid/credits from callers.
 */

type PostHogClient = { capture: (event: string, props?: Record<string, unknown>) => void };
let client: PostHogClient | null = null;
let initPromise: Promise<PostHogClient | null> | null = null;

function ensureClient(): Promise<PostHogClient | null> {
  if (client) return Promise.resolve(client);
  if (typeof window === "undefined") return Promise.resolve(null);
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key.trim() === "") return Promise.resolve(null);
  if (!initPromise) {
    initPromise = import("posthog-js").then((posthog) => {
      posthog.default.init(key, { api_host: "https://us.i.posthog.com" });
      client = posthog.default;
      return client;
    }).catch(() => null);
  }
  return initPromise;
}

/**
 * Track an event. No-op if PostHog key is missing or init fails.
 * Callers can pass uid, credits; we always add page: "home".
 */
export function track(event: string, props?: Record<string, unknown>): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key.trim() === "") return;
  const payload = { page: "home" as const, ...props };
  if (client) {
    client.capture(event, payload);
    return;
  }
  if (typeof window === "undefined") return;
  void ensureClient().then((ph) => {
    if (ph) ph.capture(event, payload);
  });
}
