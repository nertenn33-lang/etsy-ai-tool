/**
 * Create or update .env.local with Stripe-related keys. Never overwrites existing values.
 * Run: npm run setup:stripe
 */
import fs from "fs";
import path from "path";

const ENV_LOCAL_PATH = path.join(process.cwd(), ".env.local");

const TEMPLATE = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  STRIPE_ENABLED: "true",
  STRIPE_SECRET_KEY: "",
  STRIPE_PRICE_ID: "",
  STRIPE_WEBHOOK_SECRET: "",
};

function parseEnvContent(content) {
  const map = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    map[key] = value;
  }
  return map;
}

function mergeEnv(existing) {
  const out = { ...existing };
  for (const [key, defaultVal] of Object.entries(TEMPLATE)) {
    if (!(key in out) || out[key] === undefined) {
      out[key] = defaultVal;
    }
  }
  return out;
}

function formatEnv(merged) {
  const lines = Object.entries(TEMPLATE).map(([key]) => {
    const value = merged[key] ?? "";
    return value ? `${key}=${value}` : `${key}=`;
  });
  const templateKeys = new Set(Object.keys(TEMPLATE));
  const extra = Object.entries(merged)
    .filter(([k]) => !templateKeys.has(k))
    .map(([k, v]) => (v ? `${k}=${v}` : `${k}=`));
  return [...lines, ...extra].join("\n");
}

let existed = false;
let existingMap = {};

if (fs.existsSync(ENV_LOCAL_PATH)) {
  existed = true;
  const content = fs.readFileSync(ENV_LOCAL_PATH, "utf8");
  existingMap = parseEnvContent(content);
}

const merged = mergeEnv(existingMap);
const output = formatEnv(merged);
fs.writeFileSync(ENV_LOCAL_PATH, output + "\n", "utf8");

console.log(existed ? "✅ Updated .env.local (missing keys added)." : "✅ Created .env.local.");
console.log("Now paste STRIPE_SECRET_KEY and STRIPE_PRICE_ID into .env.local and restart the dev server.");
