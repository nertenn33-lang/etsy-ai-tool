# Stripe Webhook – Local Test

Stripe CLI installed olmalı.

## .env.local doğrulaması

Aşağıdakilerin dolu olduğundan emin ol:

- **STRIPE_SECRET_KEY** – `sk_test_...` (Stripe Dashboard → Developers → API keys)
- **STRIPE_PRICE_ID** – `price_...` (Stripe Dashboard → Products → ilgili fiyat)
- **NEXT_PUBLIC_APP_URL** – `http://localhost:3000`
- **STRIPE_ENABLED** – `true`
- **STRIPE_WEBHOOK_SECRET** – **Boşsa:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` çalıştır; terminalde yazdığı `whsec_...` değerini kopyala ve `.env.local` içinde `STRIPE_WEBHOOK_SECRET=whsec_...` olarak yapıştır. Bu değişkeni her değiştirdiğinde **dev server’ı yeniden başlat** (Ctrl+C → `npm run dev`).

## Adımlar

1. **CLI sürümü**
   ```powershell
   stripe --version
   ```

2. **Stripe hesabına giriş**
   ```powershell
   stripe login
   ```

3. **Webhook dinleyici**
   ```powershell
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   - Terminalde çıkan `whsec_...` değerini kopyala.
   - `.env.local` içindeki `STRIPE_WEBHOOK_SECRET=` satırına yapıştır.

4. **Dev server yeniden başlat**
   - Çalışan server’da Ctrl+C.
   - `npm run dev`

5. **Test ödeme**
   - UI’dan checkout yap (Unlock 3 listings), veya
   - Terminalde: `stripe trigger checkout.session.completed`  
     (Not: trigger ile gelen event’te metadata uid olmayabilir; gerçek ödeme UI üzerinden daha güvenilir.)

6. **Kontrol**
   - `GET http://localhost:3000/api/me` → `credits` / `listings` +3 artmış olmalı.

## 400 görürsen (troubleshooting)

Webhook 400 dönüyorsa **next dev** terminalindeki log’a bak:

- **`400: Missing stripe-signature header`**  
  İstek webhook’a `Stripe-Signature` header’ı ile gelmiyor. Stripe CLI ile mi tetikleniyor? `stripe listen --forward-to localhost:3000/api/stripe/webhook` kullanıyor musun? Route path tam olarak `/api/stripe/webhook` mi?

- **`500: Missing STRIPE_WEBHOOK_SECRET in env`**  
  `.env.local` içinde `STRIPE_WEBHOOK_SECRET` boş veya yok. `stripe listen` çalıştır; terminalde yazdığı `whsec_...` değerini kopyala, `.env.local`’a `STRIPE_WEBHOOK_SECRET=whsec_...` olarak yapıştır. **Sonra dev server’ı mutlaka yeniden başlat** (Ctrl+C → `npm run dev`).

- **`[stripe webhook] signature verify failed` → 400 Invalid signature**  
  `STRIPE_WEBHOOK_SECRET` yanlış veya eski. Her `stripe listen` oturumu farklı bir `whsec_...` üretir. Yeni bir terminalde `stripe listen ...` çalıştırdıysan, yeni çıkan `whsec_...` değerini `.env.local`’a yazıp dev server’ı yeniden başlat.

## Sık hata

- **400 / metadata uid missing**  
  Checkout session metadata’da `uid` gelmiyor. `app/api/checkout/route.ts` içinde `metadata: { uid, creditsToAdd: "3" }` gönderildiğini kontrol et.

- **400 veya 401 signature hatası**  
  `STRIPE_WEBHOOK_SECRET` boş veya yanlış. `stripe listen` çıktısındaki `whsec_...` değerini `.env.local`’a yazıp dev server’ı yeniden başlat.

- **Webhook hiç tetiklenmiyor**  
  `stripe listen` çalışan terminal kapanmış olabilir. Webhook’lar sadece bu terminal açıkken localhost’a iletilir; kapatırsan Stripe event’leri local’e düşmez.

---

## RUN CHECKLIST (PowerShell)

1. `stripe --version`
2. `stripe login`
3. `stripe listen --forward-to localhost:3000/api/stripe/webhook`  
   → Copy the printed `whsec_...` into `.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Restart dev server: Ctrl+C, then `npm run dev`
5. Run test checkout in UI (Paywall → Unlock 3 listings). Use test card: **4242 4242 4242 4242**, expiry **12/34**, CVC **123**
6. Verify credits:
   ```powershell
   Invoke-WebRequest -Uri http://localhost:3000/api/me -UseBasicParsing | Select-Object -Expand Content
   ```
   → `credits` / `listings` should be +3.

---

## Lokal test prosedürü (debug)

1. **stripe listen** çalıştır (ayrı terminal):  
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Çıkan **whsec_...** değerini `.env.local` → **STRIPE_WEBHOOK_SECRET** olarak yaz.
3. **Dev server restart:** Ctrl+C, sonra `npm run dev`.
4. **Test checkout:** UI’dan Paywall → Unlock 3 listings → kart 4242... 12/34 123.
5. **stripe listen** terminalinde `checkout.session.completed` event’i görünüyor mu?
6. **next dev** terminalinde `[stripe webhook] credited creditsToAdd=3 to uid=...` log’u görünüyor mu?
7. **GET /api/me** (veya `Invoke-WebRequest -Uri http://localhost:3000/api/me -UseBasicParsing`) → `listings` +3 oldu mu?

---

## Deterministic local test plan (proof)

Webhook uses **Node runtime** and **raw body** only. Use this to prove env and signature.

### 1. Start Stripe CLI listener (Terminal A)

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

- Copy the printed **whsec_...** (full string).
- Put it in `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...` (no quotes).
- **Restart dev server** so it loads the new env (Ctrl+C then `npm run dev`).

### 2. Start dev server (Terminal B)

```bash
npm run dev
```

### 3. Trigger a test event (Terminal C or same as B)

```bash
stripe trigger checkout.session.completed
```

- **Stripe CLI (Terminal A)** must show **200** for the forwarded request.
- **Next dev (Terminal B)** must show:

**Expected logs (success):**

```
[stripe webhook] sig present=true len=<number>
[stripe webhook] env secret len=<number> tail=<last 6 chars> (match this to Stripe CLI whsec_... tail; pid=<pid>)
[stripe webhook] verified event.type=checkout.session.completed id=evt_...
[stripe webhook] session.id=cs_... session.metadata=... client_reference_id=...
[stripe webhook] idempotency check: already=false
[stripe webhook] credited creditsToAdd=3 to uid=<some-id>
```

- **Proof:** `env secret tail=` must match the **last 6 characters** of the `whsec_...` from Stripe CLI. If they differ, the process is using a different env (wrong file or no restart).
- **Note:** `stripe trigger checkout.session.completed` does not send your app’s metadata, so `uid` may be missing and you’ll see “no uid” and no credit. For real credit test, use **UI checkout** (Paywall → Unlock 3 listings) so metadata.uid is set.

### 4. Verify credits (UI checkout only)

After a **real** checkout from the app (not just trigger):

```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/me -UseBasicParsing | Select-Object -Expand Content
```

- Response should include `"credits":3` (or higher) and `"listings":3`.

Optional: open `npx prisma studio` and check `User.credits` and `StripeEvent` table for the event id.

---

## Deterministic local test (ONE PASS – proof)

Use this to prove which server is hit and that webhook returns 200.

### 1. Start Next dev and note port

```bash
npm run dev
```

- In the terminal, note the port (e.g. `localhost:3000` or `localhost:3001`). Call it `<PORT>`.

### 2. Start Stripe CLI listener

```bash
stripe listen --forward-to http://localhost:<PORT>/api/stripe/webhook
```

- Copy the printed **whsec_...** (full string, no quotes).
- In project root, edit `.env.local`:
  - Set exactly: `STRIPE_WEBHOOK_SECRET=whsec_...` (NO quotes, NO spaces around `=`)
- **Restart the Next dev server** (Ctrl+C, then `npm run dev` again).

### 3. Prove env and server (ping)

```bash
curl http://localhost:<PORT>/api/debug/ping
```

**Expected JSON:**

```json
{
  "ok": true,
  "pid": <number>,
  "portGuess": <PORT>,
  "envHasWebhookSecret": true,
  "secretTail": "<last 6 chars of whsec_...>",
  "now": "<ISO date>"
}
```

- `secretTail` must match the **last 6 characters** of the `whsec_...` from the Stripe CLI terminal. If not, wrong env or wrong process.

### 4. Trigger non-checkout event (expect 200)

```bash
stripe trigger payment_intent.succeeded
```

- **Stripe CLI:** must show **200** for the forwarded POST.
- **Next dev terminal:** must show lines like:
  - `[stripe webhook] pid=... url=... host=...`
  - `[stripe webhook] sig present=true len=...`
  - `[stripe webhook] env secret len=... tail=...`
  - `[stripe webhook] verified event.type=payment_intent.succeeded id=evt_...`

### 5. Trigger checkout event (expect 200; credit only if uid present)

```bash
stripe trigger checkout.session.completed
```

- **Stripe CLI:** must show **200**.
- **Next dev terminal:** must show:
  - `[stripe webhook] verified event.type=checkout.session.completed id=evt_...`
  - Either “no uid” (no credit) or “credited creditsToAdd=3 to uid=...” if trigger included metadata/client_reference_id.

### 6. Real UI checkout (credits should increase)

- In the app: Paywall → Unlock 3 listings → complete with card 4242... 12/34 123.
- Next logs: `[stripe webhook] credited creditsToAdd=3 to uid=...`
- Then:

```bash
curl http://localhost:<PORT>/api/me
```

- Response must include `"credits":3` (or higher) and `"listings":3`. No caching: `/api/me` uses `force-dynamic`.

### If Stripe CLI still shows 400

Use the proof logs:

- **wrong port:** `url` or `host` in logs shows a different port than the one in `stripe listen --forward-to`. Fix: use the port from `npm run dev` in the forward URL.
- **multiple servers:** `pid` in webhook log differs from `pid` in `/api/debug/ping` when you hit ping in the same run. Fix: kill all Node processes and start a single `npm run dev`.
- **STRIPE_WEBHOOK_SECRET not loaded:** `env secret len=0` or `tail=null`. Fix: ensure `.env.local` is in project root, has `STRIPE_WEBHOOK_SECRET=whsec_...`, and restart dev server.
- **whsec mismatch:** `secretTail` in logs does not match last 6 chars of the `whsec_...` from the **current** `stripe listen` session. Fix: copy the whsec from the same terminal where `stripe listen` is running, update `.env.local`, restart dev server.
- **request not reaching our route:** `url` does not contain `/api/stripe/webhook`. Fix: path or proxy; ensure `stripe listen` forwards to `http://localhost:<PORT>/api/stripe/webhook`.
