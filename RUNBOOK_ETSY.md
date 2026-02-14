# Runbook: Etsy Real Data (suggest + search + enrichment)

Endpoints are **GET** with query `q=` only (no POST body):

- **Suggest:** `GET /api/etsy/suggest?q=<encoded-query>`
- **Search:** `GET /api/etsy/search?q=<encoded-query>`

## Test plan (must pass)

1. **Dev server:** `npm run dev`
2. **Suggest:** `GET /api/etsy/suggest?q=personalized%20birth%20flower%20necklace`  
   Expect: `{ "ok": true, "q": "...", "suggestions": [...] }` (best effort; may be empty if Etsy blocks or structure changes).
3. **Search:** `GET /api/etsy/search?q=personalized%20birth%20flower%20necklace`  
   Expect: `{ "ok": true, "q": "...", "resultCount": number|null, "sampleTitles": [...], "priceStats": { min, max, median, mean } }` (best effort).
4. **UI Analyze:** Click Analyze → analysis still works even if Etsy fails; `etsyData` is optional.
5. **UI Generate (with credits):** Generate → listing should include better tags when `etsyData` is present; SEO notes (competition, price band, phrases) appear in UI-only “SEO Notes” panel, not in listing description.
6. **Etsy fail:** If suggest/search fail or timeout, tool behaves exactly as before (no etsyData; mock listing unchanged).

## Commands (Windows)

```powershell
# After npm run dev (adjust port if different, e.g. 3001)
curl "http://localhost:3000/api/etsy/suggest?q=personalized%20birth%20flower%20necklace"
curl "http://localhost:3000/api/etsy/search?q=personalized%20birth%20flower%20necklace"
```

## Spam test (rate limit)

Call suggest repeatedly with GET; after the limit (20 per 10 min per uid/IP, or 5 per 10 min for unknown) expect **429** with `{ "ok": false, "error": "Rate limited" }`.

```powershell
for ($i=0; $i -lt 25; $i++) { Invoke-WebRequest "http://localhost:3000/api/etsy/suggest?q=personalized%20necklace" -UseBasicParsing | Out-Null }
```

After ~20 successful responses, subsequent calls should return 429 until the window resets.

## No recursion

- `/api/analyze` calls `getEtsyEnrichment(idea, micro)` only (no call to generate).
- `/api/generate` calls `getEtsyEnrichment(idea, micro)` only (no call to analyze).
