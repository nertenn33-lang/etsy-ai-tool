import Stripe from "stripe";

const key = (process.env.STRIPE_SECRET_KEY || "").trim();

if (!key) {
    console.error("[Stripe Lib] CRITICAL: STRIPE_SECRET_KEY is empty or missing!");
}

export const stripe = new Stripe(key, {
    apiVersion: "2023-10-16" as any, // Explicitly set or use latest
    typescript: true,
});

console.log("[Stripe Lib] Stripe client initialized. Key length:", key.length);
