import LandingPage from "@/app/landing/LandingPage";

/**
 * When LANDING_MODE=true, show landing-only page (no DB/Stripe). Else show full app.
 */
export default function Page() {
  return <LandingPage />;
}
