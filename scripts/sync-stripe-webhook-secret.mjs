/**
 * Start Stripe listen, capture whsec from output, write STRIPE_WEBHOOK_SECRET to .env.local.
 * Cross-platform. Run from repo root: node scripts/sync-stripe-webhook-secret.mjs [port]
 * Stripe listen runs in background (detached). Then restart Next and run stripe trigger in another terminal.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = parseInt(process.argv[2] || "3000", 10) || 3000;
const forwardUrl = `http://localhost:${PORT}/api/stripe/webhook`;
const envLocalPath = path.join(process.cwd(), ".env.local");

function setEnvLocalKey(key, value) {
  let content = "";
  if (fs.existsSync(envLocalPath)) {
    content = fs.readFileSync(envLocalPath, "utf8");
  }
  const line = `${key}=${value}`;
  const keyRegex = new RegExp(`^${key}=.*`, "m");
  if (keyRegex.test(content)) {
    content = content.replace(keyRegex, line);
  } else {
    if (content && !content.endsWith("\n")) content += "\n";
    content += `${line}\n`;
  }
  fs.writeFileSync(envLocalPath, content.trimEnd() + "\n", "utf8");
}

console.log("[sync-stripe-webhook-secret] Starting stripe listen (forward-to %s) ...", forwardUrl);
const proc = spawn("stripe", ["listen", "--forward-to", forwardUrl], {
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});

let out = "";
proc.stdout?.on("data", (d) => { out += (d && d.toString()) || ""; });
proc.stderr?.on("data", (d) => { out += (d && d.toString()) || ""; });

await new Promise((r) => setTimeout(r, 8000));
const whsec = out.match(/whsec_[a-zA-Z0-9]+/)?.[0];

if (!whsec) {
  console.error("[sync-stripe-webhook-secret] Could not capture whsec after 8s. Output so far:", out.slice(0, 500));
  proc.kill();
  process.exit(1);
}

setEnvLocalKey("STRIPE_WEBHOOK_SECRET", whsec);
const tail = whsec.length > 6 ? whsec.slice(-6) : "(short)";
proc.unref();
console.log("");
console.log("Wrote STRIPE_WEBHOOK_SECRET tail=%s into .env.local", tail);
console.log("");
console.log("NEXT STEPS:");
console.log("  1. Restart Next dev server (Ctrl+C then npm run dev).");
console.log("  2. In another terminal run: stripe trigger payment_intent.succeeded");
console.log("  3. Stripe CLI should show [200].");
console.log("");
process.exit(0);
