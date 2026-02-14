/**
 * In-memory TTL cache for Etsy suggest/search. Reduces block risk.
 */

const SUGGEST_TTL_MS = 10 * 60 * 1000;
const SEARCH_TTL_MS = 15 * 60 * 1000;
const FAILURE_TTL_MS = 30 * 1000;

type SuggestValue = { ok: true; suggestions: string[] } | { ok: false; error: string };
type SearchValue = {
  ok: true;
  resultCount: number | null;
  sampleTitles: string[];
  samplePrices: number[];
} | { ok: false; error: string };

interface Entry<T> {
  at: number;
  value: T;
}

const suggestCache = new Map<string, Entry<SuggestValue>>();
const searchCache = new Map<string, Entry<SearchValue>>();

function get<T>(map: Map<string, Entry<T>>, key: string, ttlMs: number): T | null {
  const ent = map.get(key);
  if (!ent) return null;
  if (Date.now() - ent.at > ttlMs) {
    map.delete(key);
    return null;
  }
  return ent.value;
}

function set<T>(map: Map<string, Entry<T>>, key: string, value: T, ttlMs: number): void {
  map.set(key, { at: Date.now(), value });
}

export function getCachedSuggest(normalizedQ: string): SuggestValue | null {
  return get(suggestCache, "suggest:q=" + normalizedQ, SUGGEST_TTL_MS);
}

export function setCachedSuggest(normalizedQ: string, value: SuggestValue, fromSuccess: boolean): void {
  set(suggestCache, "suggest:q=" + normalizedQ, value, fromSuccess ? SUGGEST_TTL_MS : FAILURE_TTL_MS);
}

export function getCachedSearch(normalizedQ: string): SearchValue | null {
  return get(searchCache, "search:q=" + normalizedQ, SEARCH_TTL_MS);
}

export function setCachedSearch(normalizedQ: string, value: SearchValue, fromSuccess: boolean): void {
  set(searchCache, "search:q=" + normalizedQ, value, fromSuccess ? SEARCH_TTL_MS : FAILURE_TTL_MS);
}
