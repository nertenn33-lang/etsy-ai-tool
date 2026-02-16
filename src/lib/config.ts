/**
 * When true, app runs in landing-only mode: / shows landing, checkout returns 503, no DB required.
 * Set LANDING_MODE=true and NEXT_PUBLIC_LANDING_MODE=true in Vercel for SEO/lead capture deploys.
 */
export const LANDING_MODE = false; // Forced to false to open the shop

/**
 * Feature and app config.
 * Production: Stripe enabled only when STRIPE_ENABLED=true (and not LANDING_MODE).
 * Development: enabled by default (unset → enabled); set STRIPE_ENABLED=false to disable.
 */
function getStripeEnabled(): boolean {
  if (LANDING_MODE) return false;
  if (process.env.NODE_ENV === "production") {
    return process.env.STRIPE_ENABLED?.trim()?.toLowerCase() === "true";
  }
  return process.env.STRIPE_ENABLED?.trim()?.toLowerCase() !== "false";
}

export const STRIPE_ENABLED = getStripeEnabled();

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";

/**
 * Returns APP_URL when Stripe is enabled. Caller must check STRIPE_ENABLED first
 * and use this only when enabling checkout (required for success_url/cancel_url).
 */
export function getAppUrlForStripe(): string | null {
  if (!STRIPE_ENABLED) return null;
  const url = APP_URL.trim();
  return url || null;
}
