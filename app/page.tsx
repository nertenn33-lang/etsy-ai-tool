import LandingPage from "@/app/landing/LandingPage";
import HomeClient from "@/app/HomeClient";

/**
 * When LANDING_MODE=true, show landing-only page (no DB/Stripe). Else show full app.
 */
export default function Page() {
  if (process.env.LANDING_MODE === "true") {
    return <LandingPage />;
  }
  return <HomeClient />;
}
