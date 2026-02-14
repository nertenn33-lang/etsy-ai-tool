/**
 * Keyword scoring and bucketing: high intent (title), long-tail (tags), niche qualifiers.
 * Etsy tag max length 20 chars; exactly 13 tagKeywords; no generic-only tags unless paired.
 */

import { sanitizeKeyword } from "./normalize";

const ETSY_TAG_MAX_LEN = 20;

const HIGH_INTENT_TERMS = new Set(
  "personalized custom handmade gift printable made to order unique artisan".split(/\s+/)
);

/** Generic-only: banned as standalone tags; allowed when paired (e.g. "gift for mom"). */
const GENERIC_ONLY = new Set([
  "etsy", "handmade", "unique", "gift", "modern", "minimalist", "wall art", "decor",
]);

/** Recipient/occasion: keywords containing these count as recipient/occasion. */
const RECIPIENT_OCCASION_TERMS = new Set([
  "mom", "mother", "dad", "father", "girlfriend", "boyfriend", "wife", "husband",
  "mothers day", "mother's day", "fathers day", "father's day", "birthday", "memorial",
  "wedding", "anniversary", "baby", "bridesmaid", "graduation", "christmas", "valentine",
]);

/** Product-type: keywords containing these count as product-type. */
const PRODUCT_TYPE_TERMS = new Set([
  "necklace", "pendant", "bracelet", "earring", "ring", "printable", "template",
  "sticker", "mug", "poster", "art", "print", "keychain", "coaster", "candle",
  "tumbler", "shirt", "hoodie", "blanket", "pillow", "ornament", "card", "invitation",
]);

export function isGenericOnly(keyword: string): boolean {
  const k = keyword.toLowerCase().trim();
  if (GENERIC_ONLY.has(k)) return true;
  const words = k.split(/\s+/);
  if (words.length === 1) return GENERIC_ONLY.has(words[0]!);
  return false;
}

/** If <= 20 return as-is. Else shorten by replacements + stopword removal; no mid-word slice. Returns null if still > 20 (caller should drop candidate). */
function shortenTag(tag: string): string | null {
  let t = tag.trim().replace(/\s+/g, " ");
  if (t.length <= ETSY_TAG_MAX_LEN) return t;

  t = t.replace(/\bpersonalized\b/gi, "custom");
  t = t.replace(/\bmothers\s+day\b/gi, "mother day");
  t = t.replace(/\bmother's\s+day\b/gi, "mother day");
  t = t.replace(/\bprintable\s+template\b/gi, "template");
  t = t.replace(/\b(for|the|and|with)\b/gi, " ").replace(/\s+/g, " ").trim();
  if (t.length <= ETSY_TAG_MAX_LEN) return t;
  return null;
}

function hasAnyTerm(keyword: string, terms: Set<string>): boolean {
  const k = keyword.toLowerCase();
  for (const term of terms) {
    const re = new RegExp("\\b" + term.replace(/\s+/g, "\\s+") + "\\b", "i");
    if (re.test(k)) return true;
  }
  return false;
}

function getFirstMatchingTerm(text: string, terms: Set<string>): string | null {
  const k = text.toLowerCase();
  for (const term of terms) {
    const re = new RegExp("\\b" + term.replace(/\s+/g, "\\s+") + "\\b", "i");
    if (re.test(k)) return term;
  }
  return null;
}

export type KeywordCandidate = {
  term: string;
  intentScore: number;
  difficulty: number;
  finalScore: number;
};

export function computeDifficulty(resultCount?: number): number {
  if (resultCount == null || resultCount <= 0) return 1;
  return Math.log10(resultCount + 10);
}

export interface KeywordScoreInput {
  keyword: string;
  resultCount: number | null;
  suggestionPosition: number;
  appearsInTitlesCount: number;
  length: number;
}

export function scoreKeyword(input: KeywordScoreInput): number {
  const { keyword, resultCount, suggestionPosition, appearsInTitlesCount, length } = input;
  let score = 50;
  if (suggestionPosition >= 0 && suggestionPosition < 20) score += 15 - suggestionPosition * 0.5;
  score += Math.min(15, appearsInTitlesCount * 3);
  const wordCount = keyword.split(/\s+/).length;
  if (wordCount >= 2 && wordCount <= 4) score += 10;
  if (HIGH_INTENT_TERMS.has(keyword.split(/\s+/)[0]?.toLowerCase() ?? "")) score += 12;
  if (resultCount !== null) {
    if (resultCount < 5000) score += 10;
    else if (resultCount > 50000) score -= 10;
  }
  if (length >= 15 && length <= 35) score += 5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export type KeywordBucket = "title" | "tag" | "niche";

export function bucketKeyword(keyword: string, score: number, wordCount: number): KeywordBucket {
  const first = keyword.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (HIGH_INTENT_TERMS.has(first) && score >= 70 && wordCount <= 3) return "title";
  if (wordCount >= 3 && score >= 50) return "niche";
  return "tag";
}

export function buildKeywordCandidates(
  idea: string,
  micro: string,
  suggestions: string[],
  sampleTitles: string[]
): string[] {
  const seen = new Set<string>();
  const add = (s: string) => {
    const t = sanitizeKeyword(s).toLowerCase();
    if (t.length >= 2 && t.length <= 80) seen.add(t);
  };

  add(micro);
  idea.split(/\s+/).filter((w) => w.length >= 3).forEach(add);
  suggestions.forEach(add);

  for (const title of sampleTitles) {
    const words = title.split(/\s+/).filter((w) => w.length >= 2);
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        add(words.slice(i, i + n).join(" "));
      }
    }
  }

  const candidates = Array.from(seen).filter((c) => {
    const words = c.split(/\s+/).length;
    const len = c.length;
    const valid = /^[a-z0-9\s]+$/.test(c);
    return words >= 1 && words <= 6 && len >= 10 && len <= 40 && valid;
  });

  return candidates.slice(0, 25);
}

export interface KeywordPlan {
  titleKeywords: string[];
  tagKeywords: string[];
  nicheQualifiers: string[];
}

export function buildKeywordPlan(
  idea: string,
  micro: string,
  suggestions: string[],
  sampleTitles: string[],
  resultCount: number | null
): KeywordPlan {
  const rawCandidates = buildKeywordCandidates(idea, micro, suggestions, sampleTitles);
  const difficulty = computeDifficulty(resultCount ?? undefined);

  const withScores: KeywordCandidate[] = rawCandidates
    .filter((c) => !isGenericOnly(c))
    .map((keyword) => {
      const suggestionPos = suggestions.map((s) => s.toLowerCase()).indexOf(keyword);
      let appearsInTitles = 0;
      for (const t of sampleTitles) {
        if (t.toLowerCase().includes(keyword)) appearsInTitles++;
      }
      const intentScore = scoreKeyword({
        keyword,
        resultCount,
        suggestionPosition: suggestionPos >= 0 ? suggestionPos : 999,
        appearsInTitlesCount: appearsInTitles,
        length: keyword.length,
      });
      const diff = difficulty;
      const finalScore = diff > 0 ? intentScore / diff : intentScore;
      return { term: keyword, intentScore, difficulty: diff, finalScore };
    });

  withScores.sort((a, b) => b.finalScore - a.finalScore);

  const wordCount = (t: string) => t.split(/\s+/).length;
  const longTailBucket = withScores
    .filter((c) => wordCount(c.term) >= 2)
    .slice();
  const recipientBucket = withScores
    .filter((c) => hasAnyTerm(c.term, RECIPIENT_OCCASION_TERMS))
    .sort((a, b) => b.finalScore - a.finalScore);
  const productTypeBucket = withScores
    .filter((c) => hasAnyTerm(c.term, PRODUCT_TYPE_TERMS))
    .sort((a, b) => b.finalScore - a.finalScore);

  const titleCandidates = withScores.filter((c) => {
    const wc = wordCount(c.term);
    const first = c.term.split(/\s+/)[0]?.toLowerCase() ?? "";
    return wc <= 3 && HIGH_INTENT_TERMS.has(first);
  });
  const titleSet = titleCandidates.slice(0, 5).map((c) => c.term);

  const nicheSet = withScores
    .filter((c) => wordCount(c.term) >= 3)
    .slice(0, 6)
    .map((c) => c.term);

  const tagSet: string[] = [];
  const used = new Set<string>();
  const toTag = (k: string): string | null => shortenTag(k);

  const takeFromBucket = (bucket: KeywordCandidate[], max: number): void => {
    let n = 0;
    for (const c of bucket) {
      if (n >= max || tagSet.length >= 13) break;
      const t = toTag(c.term);
      if (t == null || t.length < 2 || used.has(t) || isGenericOnly(c.term)) continue;
      used.add(t);
      tagSet.push(t);
      n++;
    }
  };

  takeFromBucket(longTailBucket, 5);
  takeFromBucket(recipientBucket, 3);
  takeFromBucket(productTypeBucket, 3);

  for (const c of withScores) {
    if (tagSet.length >= 13) break;
    const t = toTag(c.term);
    if (t != null && t.length >= 2 && !used.has(t) && c.term.length <= ETSY_TAG_MAX_LEN) {
      used.add(t);
      tagSet.push(t);
    }
  }

  const combined = [micro, idea].join(" ");
  const productTypeTerm =
    getFirstMatchingTerm(combined, PRODUCT_TYPE_TERMS) ??
    rawCandidates.map((k) => getFirstMatchingTerm(k, PRODUCT_TYPE_TERMS)).find((t) => t != null) ??
    micro.trim().split(/\s+/).filter((w) => w.length >= 2).pop()?.toLowerCase() ??
    "gift";
  const recipientTerm =
    getFirstMatchingTerm(combined, RECIPIENT_OCCASION_TERMS) ??
    rawCandidates.map((k) => getFirstMatchingTerm(k, RECIPIENT_OCCASION_TERMS)).find((t) => t != null) ??
    "her";

  const fillerTemplates: (() => string)[] = [
    () => `custom ${productTypeTerm}`,
    () => `${productTypeTerm} gift`,
    () => "gift for mom",
    () => "gift for her",
    () => "gift for him",
    () => `${micro.trim()} gift`,
    () => "mother day gift",
  ];

  while (tagSet.length < 13) {
    let added = false;
    for (const tmpl of fillerTemplates) {
      if (tagSet.length >= 13) break;
      const raw = tmpl();
      const t = shortenTag(raw);
      if (t != null && t.length >= 2 && !used.has(t) && !isGenericOnly(t)) {
        used.add(t);
        tagSet.push(t);
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  const applyDiversityGuard = (tags: string[]): string[] => {
    const out: string[] = [];
    let giftFor = 0,
      motherDay = 0,
      necklace = 0;
    const giftForRe = /^gift\s+for\s+/i;
    const motherDayRe = /^mothers?\s*day/i;
    const necklaceRe = /^necklace/i;
    for (const t of tags) {
      const lower = t.toLowerCase().trim();
      if (giftForRe.test(lower) && giftFor >= 2) continue;
      if (giftForRe.test(lower)) giftFor++;
      if (motherDayRe.test(lower) && motherDay >= 1) continue;
      if (motherDayRe.test(lower)) motherDay++;
      if (necklaceRe.test(lower) && necklace >= 2) continue;
      if (necklaceRe.test(lower)) necklace++;
      out.push(t);
    }
    return out.slice(0, 13);
  };
  const tagKeywords = applyDiversityGuard(tagSet);
  if (process.env.NODE_ENV === "development") {
    console.log("[etsy] tags(13):", tagKeywords, tagKeywords.map((t) => t.length));
  }

  return {
    titleKeywords: titleSet.slice(0, 5),
    tagKeywords,
    nicheQualifiers: nicheSet.slice(0, 6),
  };
}
