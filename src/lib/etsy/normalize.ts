/**
 * Helpers to sanitize strings and parse price text from Etsy (e.g. "$12.34", "US$ 9.99", "€10,50").
 */

export function sanitizeKeyword(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .slice(0, 80);
}

/** Normalize search query: lower, trim, collapse spaces, limit 80 chars. Safe for cache key and encoding. */
export function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

/** Parse price string to number; returns null if not parseable. */
export function parsePrice(text: string): number | null {
  if (!text || typeof text !== "string") return null;
  const normalized = text
    .replace(/\s+/g, "")
    .replace(/[€$£]|US\s*\$?|USD|GBP|EUR/gi, "")
    .replace(",", ".");
  const match = normalized.match(/[\d]+\.?\d*/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

/** Extract all price-like numbers from a string (e.g. "From $9.99 to $24.99"). */
export function extractPrices(text: string): number[] {
  const prices: number[] = [];
  const re = /(?:US\s*\$?|USD|€|£|\$)\s*[\d,]+\.?\d*|[\d,]+\.?\d*\s*(?:USD|EUR|GBP)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = parsePrice(m[0]);
    if (n !== null && n > 0 && n < 1e6) prices.push(n);
  }
  return prices;
}

export function computePriceStats(prices: number[]): { min: number; max: number; median: number; mean: number } | null {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;
  return { min, max, median, mean };
}

export function computeQuartiles(prices: number[]): { p25: number; p75: number } | null {
  if (prices.length < 2) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * 0.25)] ?? sorted[0]!;
  const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1]!;
  return { p25, p75 };
}
