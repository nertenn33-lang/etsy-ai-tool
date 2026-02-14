# RUNBOOK: Stripe CLI must show 200

---

## Dead-simple runbook (mismatch-proof)

Use the script so the **same** Stripe listen session’s whsec is written to `.env.local`. No manual copy/paste.

### Step 1: Run the script

**Windows PowerShell (from repo root):**
```powershell
cd D:\DevTool\etsy-ai-tool
.\scripts\stripe-webhook-dev.ps1 -Port 3000
```

The script will:
- Run `stripe listen --print-secret` and capture the whsec (no regex parsing).
- Write `STRIPE_WEBHOOK_SECRET=<whsec>` into repo root `.env.local` (no quotes).
- Print the last 6 chars **tail** (e.g. `83aa60`).
- Print: **Restart Next dev server now (Ctrl+C, npm run dev)**.
- Then start the actual listener in the **same** terminal: `stripe listen --forward-to http://localhost:3000/api/stripe/webhook` (foreground).

Leave this terminal open; triggers must run in this session.

### Step 2: Restart Next

In the terminal where Next is running: **Ctrl+C**, then:
```powershell
npm run dev
```

### Step 3: Confirm tail matches (ping)

```powershell
curl http://localhost:3000/api/debug/ping
```

- Response must have `"secretTail":"xxxxxx"` matching the tail the script printed. If not, re-run the script and restart Next again.

### Step 4: Trigger and confirm [200]

In **another** terminal (Next is in one, Stripe listen is in the script terminal):
```powershell
stripe trigger payment_intent.succeeded
```

**Expected:** Stripe CLI (in the script terminal) shows ** [200] POST http://localhost:3000/api/stripe/webhook**. Next dev logs show `[stripe webhook] verified event.type=payment_intent.succeeded`.

Then:
```powershell
stripe trigger checkout.session.completed
```
Again expect **200** and in Next: `verified event.type=checkout.session.completed`.

---

## Proof instructions and expected outputs

After running the script and restarting Next:

1. **Ping:** `curl http://localhost:3000/api/debug/ping`  
   - `secretTail` in the response **must** equal the 6-char tail the script printed (e.g. `83aa60`).

2. **Trigger:** In another terminal run `stripe trigger payment_intent.succeeded`.  
   - **Stripe CLI** (script terminal): must show `[200] POST http://localhost:3000/api/stripe/webhook`.  
   - **Next dev logs:** must show `[stripe webhook] verified event.type=payment_intent.succeeded`.

**Example ping response:**
```json
{"ok":true,"pid":44988,"portGuess":3000,"envHasWebhookSecret":true,"secretTail":"83aa60","now":"2026-02-11T20:30:21.742Z"}
```

**Example Stripe CLI (script terminal):**
```text
2026-02-11 20:31:00   --> payment_intent.succeeded [evt_...]
2026-02-11 20:31:00  <--  [200] POST http://localhost:3000/api/stripe/webhook
```

**Example Next dev log:**
```text
[stripe webhook] verified event.type=payment_intent.succeeded id=evt_...
```

---

## Manual runbook (if you prefer not to use the script)

Follow in order. Do not skip restart after changing `.env.local`.

---

## A) Get actual Next port

1. Start Next (if not already running):
   ```powershell
   cd D:\DevTool\etsy-ai-tool
   npm run dev
   ```
2. In the terminal output, note the port (e.g. `localhost:3000` or `Ready on http://127.0.0.1:3000`). Call it **PORT** (e.g. `3000`).
3. If Next fails with `EADDRINUSE`, another process is using the port. Either kill it or use the port Next reports when it does start.

---

## B) Prove env and server (ping)

```powershell
curl http://localhost:<PORT>/api/debug/ping
```

**Required:**

- Response must be JSON with `"ok":true`, `"envHasWebhookSecret":true`, and `"secretTail":"......"` (6 chars).
- Note the **pid** (e.g. `44988`). All later requests must hit this same process.

**If `envHasWebhookSecret` is false:**

- `.env.local` is not loaded or not in the same folder as `package.json`.
- Ensure `D:\DevTool\etsy-ai-tool\.env.local` exists and contains `STRIPE_WEBHOOK_SECRET=whsec_...` (no quotes, no spaces around `=`).
- Restart Next (Ctrl+C, then `npm run dev`), then call ping again.

---

## C) Single Stripe listen session (same whsec)

1. In a **new** terminal:
   ```powershell
   stripe listen --forward-to http://localhost:<PORT>/api/stripe/webhook
   ```
   Use the **same PORT** as in step A (e.g. `3000`).

2. In the Stripe CLI output you will see something like:
   ```text
   Ready. Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxx (^C to quit)
   ```
   Copy the **entire** `whsec_...` value (no quotes).

3. Open `D:\DevTool\etsy-ai-tool\.env.local` and set:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
   (exact value you copied; no quotes; no spaces before/after `=`).

4. **Restart the Next dev server** (go to the terminal where `npm run dev` is running, Ctrl+C, then run `npm run dev` again). This is required so Next loads the new secret.

---

## D) Prove secret tail after restart

```powershell
curl http://localhost:<PORT>/api/debug/ping
```

- **Required:** `secretTail` in the response must match the **last 6 characters** of the `whsec_...` you pasted in step C.
- If it does not match, you are either editing a different file, or Next was not restarted, or another Next process is serving (different pid). Fix and repeat.

---

## E) If Stripe CLI still shows 400

Use the **Next dev server** logs (the terminal where `npm run dev` runs). On each webhook POST you should see lines like:

- `[stripe webhook] pid=... url=... host=...`
- `[stripe webhook] sig present=... len=...`
- `[stripe webhook] env secret len=... tail=...`

**Case 1: `envHasWebhookSecret` is false or `env secret len=0`**

- Env not loading. Fix: correct `.env.local` location, no quotes, restart Next. If monorepo, run Next from the repo that contains `.env.local`.

**Case 2: `secretTail` ≠ last 6 chars of current Stripe CLI whsec**

- Wrong secret. The CLI generates a **new** whsec for each `stripe listen` session. Fix: copy the whsec from the **current** `stripe listen` terminal into `.env.local`, save, then **restart Next**.

**Case 3: pid differs between ping and webhook logs**

- More than one Next process. Fix: stop all Node/Next processes, start a single `npm run dev`, note the pid from ping, and use that server for both ping and Stripe forward.

**Case 4: `url` / `host` show different port or path**

- Stripe is forwarding to the wrong place. Fix: run `stripe listen --forward-to http://localhost:<PORT>/api/stripe/webhook` where `<PORT>` is the one from step A and from ping.

**Case 5: "Signature verification failed" even though tail matches**

- Body might be modified or wrong runtime. Ensure webhook route has `export const runtime = "nodejs"` and that you only read the body once with `request.text()`. No middleware or other code should read the request body before the webhook.

---

## F) Proof tests (must pass)

**1) Non-checkout event → 200**

```powershell
stripe trigger payment_intent.succeeded
```

- **Stripe CLI:** must show **HTTP 200** for the forwarded POST.
- **Next dev terminal:** must show `[stripe webhook] verified event.type=payment_intent.succeeded id=evt_...`.

**2) Checkout trigger → 200**

```powershell
stripe trigger checkout.session.completed
```

- **Stripe CLI:** must show **HTTP 200**.
- **Next dev terminal:** must show `[stripe webhook] verified event.type=checkout.session.completed id=evt_...`. (No uid for trigger is OK; real UI checkout sends uid.)

**3) Real checkout → credits**

- In the app: open Paywall → Unlock 3 listings → pay with test card 4242 4242 4242 4242, 12/34, 123.
- **Next dev terminal:** must show `[stripe webhook] credited creditsToAdd=3 to uid=...`.
- Then:
  ```powershell
  curl http://localhost:<PORT>/api/me
  ```
- Response must show `credits` and `listings` increased (e.g. 3).

---

## Exact commands (copy/paste)

Replace `<PORT>` with your actual port (e.g. `3000`).

```powershell
# 1) Ping (after Next is running)
curl http://localhost:<PORT>/api/debug/ping

# 2) In another terminal: start listener (then copy whsec into .env.local and restart Next)
stripe listen --forward-to http://localhost:<PORT>/api/stripe/webhook

# 3) After restart, ping again
curl http://localhost:<PORT>/api/debug/ping

# 4) Trigger events
stripe trigger payment_intent.succeeded
stripe trigger checkout.session.completed

# 5) After real UI checkout, check credits
curl http://localhost:<PORT>/api/me
```

---

## Expected success outputs

**Ping JSON (example):**
```json
{"ok":true,"pid":44988,"portGuess":3000,"envHasWebhookSecret":true,"secretTail":"83aa60","now":"2026-02-11T20:30:21.742Z"}
```

**Stripe CLI (example):**
```text
2026-02-11 20:31:00   --> payment_intent.succeeded [evt_...]
2026-02-11 20:31:00  <--  [200] POST http://localhost:3000/api/stripe/webhook
```

**Next dev logs (example):**
```text
[stripe webhook] pid=44988 url=http://localhost:3000/api/stripe/webhook host=localhost:3000 xfHost= xfProto=
[stripe webhook] sig present=true len=...
[stripe webhook] env secret len=... tail=83aa60
[stripe webhook] rawBody length=...
[stripe webhook] verified event.type=payment_intent.succeeded id=evt_...
```

After real checkout:
```text
[stripe webhook] credited creditsToAdd=3 to uid=...
```
