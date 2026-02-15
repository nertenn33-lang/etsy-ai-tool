"use client";

/**
 * When NEXT_PUBLIC_LANDING_MODE=true, show a banner so users know payments are offline.
 */
export function LandingModeBanner() {
  const show =
    typeof process.env.NEXT_PUBLIC_LANDING_MODE !== "undefined" &&
    process.env.NEXT_PUBLIC_LANDING_MODE?.trim()?.toLowerCase() === "true";

  if (!show) return null;

  return (
    <div
      className="sticky top-0 z-50 w-full border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-sm"
      role="banner"
    >
      <div className="mx-auto max-w-3xl px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-amber-200">
        <span aria-hidden>⚠️</span>
        <span>Payments temporarily offline —</span>
        <a
          href="/#waitlist"
          className="font-medium text-amber-100 underline hover:text-white"
        >
          Join waitlist
        </a>
      </div>
    </div>
  );
}
