/**
 * Simulates checkout.session.completed webhook for local proof.
 * Usage: node scripts/simulate-stripe-webhook.js <uid>
 * Requires: STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY in .env
 */
require("dotenv").config();
const Stripe = require("stripe");
const http = require("http");

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/simulate-stripe-webhook.js <uid>");
  process.exit(1);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!webhookSecret || !secretKey) {
  console.error("Need STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY in .env");
  process.exit(1);
}

const payload = {
  id: "evt_simulate_" + Date.now(),
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_simulate_1",
      metadata: { uid, credits: "3" },
    },
  },
};
const payloadStr = JSON.stringify(payload);
const stripe = new Stripe(secretKey);
const header = stripe.webhooks.generateTestHeaderString({
  payload: payloadStr,
  secret: webhookSecret,
});

const port = process.env.PORT || 3000;
const req = http.request(
  {
    hostname: "localhost",
    port,
    path: "/api/stripe/webhook",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": header,
      "Content-Length": Buffer.byteLength(payloadStr),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log("Webhook response:", res.statusCode, body || "(empty)");
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  }
);
req.on("error", (e) => {
  console.error("Request error:", e.message);
  process.exit(1);
});
req.write(payloadStr);
req.end();
