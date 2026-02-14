/**
 * Server-only: fetch Etsy suggest and search. Used by API routes and by analyze enrichment.
 * Uses in-memory cache, browser-like headers, normalized query.
 */

import { extractPrices, normalizeQuery } from "./normalize";
import { getCachedSuggest, setCachedSuggest, getCachedSearch, setCachedSearch } from "./cache";

const SUGGEST_TIMEOUT_MS = 4000;
const SEARCH_TIMEOUT_MS = 6000;

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
} as const;

export async function fetchSuggestions(q: string): Promise<{ ok: true; suggestions: string[] } | { ok: false; error: string }> {
  const normalizedQ = normalizeQuery(q);
  if (!normalizedQ) return { ok: false, error: "Empty query" };
  const cached = getCachedSuggest(normalizedQ);
  if (cached) return cached;
  const encoded = encodeURIComponent(normalizedQ);
  const url = `https://www.etsy.com/api/v3/ajax/bespoke/public/search-suggestions?q=${encoded}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUGGEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const out: { ok: false; error: string } = { ok: false, error: `HTTP ${res.status}` };
      setCachedSuggest(normalizedQ, out, false);
      return out;
    }
    const data = (await res.json()) as unknown;
    let list: Array<{ query?: string; text?: string; suggestion?: string }> = [];
    if (Array.isArray((data as { results?: unknown[] }).results)) {
      list = (data as { results: Array<{ query?: string; text?: string; suggestion?: string }> }).results;
    } else if (Array.isArray((data as { suggestions?: unknown[] }).suggestions)) {
      list = ((data as { suggestions: string[] }).suggestions).map((s) => (typeof s === "string" ? { query: s } : { query: "" }));
    }
    const suggestions = list
      .map((r) => (typeof r?.query === "string" ? r.query : typeof r?.text === "string" ? r.text : typeof r?.suggestion === "string" ? r.suggestion : ""))
      .filter((s) => s.length > 0);
    const out = { ok: true as const, suggestions };
    setCachedSuggest(normalizedQ, out, true);
    return out;
  } catch (e) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : String(e);
    const out = { ok: false as const, error: msg };
    setCachedSuggest(normalizedQ, out, false);
    return out;
  }
}

export async function fetchSearchResults(q: string): Promise<{
  ok: true;
  resultCount: number | null;
  sampleTitles: string[];
  samplePrices: number[];
} | { ok: false; error: string }> {
  const normalizedQ = normalizeQuery(q);
  if (!normalizedQ) return { ok: false, error: "Empty query" };
  const cached = getCachedSearch(normalizedQ);
  if (cached) return cached;
  const encoded = encodeURIComponent(normalizedQ);
  const url = `https://www.etsy.com/search?q=${encoded}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const out = { ok: false as const, error: `HTTP ${res.status}` };
      setCachedSearch(normalizedQ, out, false);
      return out;
    }
    const html = await res.text();
    const { load } = await import("cheerio");
    const $ = load(html);
    const sampleTitles: string[] = [];
    $("[data-search-results-item] h3, .v2-listing-card__title, [data-listing-card-title]").each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length > 5) sampleTitles.push(t.slice(0, 120));
    });
    if (sampleTitles.length === 0) {
      $("h3").each((_, el) => {
        const t = $(el).text().trim();
        if (t && t.length > 10 && t.length < 120) sampleTitles.push(t);
      });
    }
    const samplePrices: number[] = [];
    $(".currency-value, [data-price], .wt-text-caption").each((_, el) => {
      samplePrices.push(...extractPrices($(el).text()));
    });
    const allPriceText = $("body").text();
    const prices = extractPrices(allPriceText);
    const uniquePrices = [...new Set(prices)].filter((p) => p > 0 && p < 1e5).slice(0, 20);
    let resultCount: number | null = null;
    const countText = $(".wt-text-caption--small, [data-search-results-count]").text();
    const countMatch = countText.match(/([\d,]+)\s*results?/i) ?? countText.match(/([\d,]+)/);
    if (countMatch) resultCount = parseInt(countMatch[1].replace(/,/g, ""), 10);
    const out = {
      ok: true as const,
      resultCount: Number.isFinite(resultCount) ? resultCount : null,
      sampleTitles: sampleTitles.slice(0, 12),
      samplePrices: uniquePrices.length > 0 ? uniquePrices : samplePrices.slice(0, 20),
    };
    setCachedSearch(normalizedQ, out, true);
    return out;
  } catch (e) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : String(e);
    const out = { ok: false as const, error: msg };
    setCachedSearch(normalizedQ, out, false);
    return out;
  }
}
