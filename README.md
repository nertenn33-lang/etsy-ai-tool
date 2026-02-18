This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Landing-only mode (SEO + lead capture, no DB/Stripe)

When the backend or DB is not ready, you can ship a **landing-only** version that does not depend on `DATABASE_URL` or Stripe. The build succeeds without a database; `/` shows a landing page with waitlist signup and a link to a demo Analyze page.

**How to enable landing mode in Vercel:**

1. In Vercel: Project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `LANDING_MODE`  
     **Value:** `true`  
     **Environments:** Production (and Preview if you want).
3. Add:
   - **Name:** `NEXT_PUBLIC_LANDING_MODE`  
     **Value:** `true`  
     **Environments:** same as above.
4. **Do not** set `DATABASE_URL` (optional for this mode).
5. Redeploy.

**Result:**

- **/** shows the landing page (RankOnEtsy hero, “Join waitlist”, “Try demo (Analyze)”).
- **/analyze** is a standalone demo (Analyze only; no credits or checkout).
- **/api/waitlist** accepts POST `{ "email": "..." }` and logs the email (Vercel logs); returns 200.
- **/api/checkout** returns **503** with a friendly message: “Payments temporarily offline. Join the waitlist…”
- A top banner shows: “Payments temporarily offline — Join waitlist”.

To **disable** landing mode and run the full app, remove both env vars (or set them to `false`) and set `DATABASE_URL` (and Stripe vars if needed), then redeploy.

## Database (Prisma + PostgreSQL / Neon)

The project uses **PostgreSQL** (e.g. [Neon](https://neon.tech)) for Vercel serverless. SQLite is not used in production.

- Set `DATABASE_URL` in `.env` (and in Vercel → Environment Variables) to your Neon (or other Postgres) connection string, e.g.  
  `DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"`.  
  Required for both local run and Vercel build.

**Run migrations and generate the client:**

```bash
# Apply migrations (creates User + StripeEvent on Postgres)
npx prisma migrate deploy

# Or for local dev with a fresh DB
npx prisma migrate dev

# Generate Prisma Client (runs on postinstall / vercel-build too)
npx prisma generate
```

### Neon + Vercel deploy

1. Create a project at [Neon](https://neon.tech) and copy the connection string.
2. In Vercel: Project → Settings → Environment Variables → add `DATABASE_URL` (Value = Neon URL), for **All Environments**.
3. Run migrations against the same DB once (local or CI):  
   `npx prisma migrate deploy`  
   (Or use Neon’s SQL editor to run the SQL from `prisma/migrations/20260215120000_postgres_init/migration.sql`.)
4. Redeploy the app. `/api/me` should return 200; Stripe checkout → webhook should add +3 credits.

## Testing POST /api/generate (credits)

**0. LLM key (required for 200)**  
Set at least one in `.env`: `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `LLM_API_KEY`. For mock-only testing use e.g. `LLM_API_KEY=sk-mock`.

**1. Seed credits**

Get your `uid` from `http://localhost:3000/api/me`. Then (replace `YOUR_UID`):

```bash
# One-liner with Prisma CLI (Windows PowerShell: use single quotes for the SQL)
echo "UPDATE User SET credits = 5 WHERE id = 'YOUR_UID';" | npx prisma db execute --stdin
```

Or: `npx prisma studio` → edit `User.credits`.

**2. Success (200, decrements 1 credit)**

```bash
curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d "{\"idea\":\"Selling handmade ceramic mugs with custom pet portraits\", \"micro\":\"Custom pet portrait mugs\"}"
```

Response: `{ uid, idea, micro, listing: { title, tags, description, rationale, beforeScore, afterScore }, creditsLeft }`. Same uid + same body → same listing (deterministic).

**3. No credits (402)**

When `creditsLeft` is 0, same request returns **402** with `{ "error": "No credits" }`.

## Lemon Squeezy Integration

Payments are handled via Lemon Squeezy.

**Environment Variables:**
- `WEBHOOK_SECRET`: The signing secret from your Lemon Squeezy Webhook settings.

**Workflow:**
1.  User clicks "Buy" -> Redirects to `buy.rankonetsy.com` (Lemon Squeezy Checkout).
2.  URL includes `?checkout[custom][user_id]=UID` to bind the purchase to the user.
3.  Lemon Squeezy sends a `POST` request to `/api/webhook/lemonsqueezy`.
4.  Server verifies the signature using `WEBHOOK_SECRET`.
5.  If event is `order_created`, user gets **+3 Credits**.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
