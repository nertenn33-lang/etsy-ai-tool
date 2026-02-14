/**
 * Build etsyData for analyze response. Safe to call; returns null on any failure.
 */

import { fetchSuggestions, fetchSearchResults } from "./fetch";
import { computePriceStats, normalizeQuery } from "./normalize";
import { buildKeywordPlan } from "./score";

export type CompetitionLevel = "low" | "med" | "high" | "unknown";

export interface EtsyData {
  suggestions: string[];
  competition: { resultCount: number | null; level: CompetitionLevel };
  price: { min: number; max: number; median: number; mean: number } | null;
  keywordPlan: {
    titleKeywords: string[];
    tagKeywords: string[];
    nicheQualifiers: string[];
  };
}

function competitionLevel(resultCount: number | null): CompetitionLevel {
  if (resultCount === null) return "unknown";
  if (resultCount < 5000) return "low";
  if (resultCount < 25000) return "med";
  return "high";
}

/** Etsy-driven breakdown signals 0-100 for analyze bars. Only apply when etsyData exists. */
export function getEtsyBreakdownSignals(etsyData: EtsyData): {
  demand: number;
  competition: number;
  priceRoom: number;
  saturation: number;
} {
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  const rc = etsyData.competition.resultCount ?? 0;
  const competitionSignal = Math.min(1, Math.log10(rc + 10) / 6);
  const competition = clamp(competitionSignal * 100);

  const level = etsyData.competition.level;
  const saturationSignal = level === "low" ? 0.2 : level === "med" ? 0.5 : 0.8;
  const saturation = clamp(saturationSignal * 100);

  let priceRoom = 50;
  if (etsyData.price) {
    const { min, max, median } = etsyData.price;
    const spread = median > 0 ? (max - min) / median : 0;
    const medianReasonable = median >= 5 && median <= 2000;
    if (medianReasonable && spread >= 0.2 && spread <= 1.5) priceRoom = clamp(55 + spread * 20);
    else if (medianReasonable) priceRoom = clamp(40 + spread * 5);
  }

  const suggestionsCount = etsyData.suggestions.length;
  const longTailShare =
    etsyData.keywordPlan.tagKeywords.filter((t) => t.split(/\s+/).length >= 2).length / Math.max(etsyData.keywordPlan.tagKeywords.length, 1);
  const demandSignal = suggestionsCount >= 8 && longTailShare >= 0.35 ? 0.75 : suggestionsCount >= 3 ? 0.55 : 0.4;
  const demand = clamp(demandSignal * 100);

  return { demand, competition, priceRoom, saturation };
}

export async function getEtsyEnrichment(idea: string, micro: string): Promise<EtsyData | null> {
  const q = normalizeQuery(micro.trim() || idea.trim());
  if (!q) return null;
  try {
    const [suggestResult, searchResult] = await Promise.all([
      fetchSuggestions(q),
      fetchSearchResults(q),
    ]);
    const suggestions = suggestResult.ok ? suggestResult.suggestions : [];
    const resultCount = searchResult.ok ? searchResult.resultCount : null;
    const sampleTitles = searchResult.ok ? searchResult.sampleTitles : [];
    const samplePrices = searchResult.ok ? searchResult.samplePrices : [];
    const priceStats = computePriceStats(samplePrices);
    const keywordPlan = buildKeywordPlan(idea, micro, suggestions, sampleTitles, resultCount);

    return {
      suggestions,
      competition: { resultCount, level: competitionLevel(resultCount) },
      price: priceStats,
      keywordPlan: {
        titleKeywords: keywordPlan.titleKeywords,
        tagKeywords: keywordPlan.tagKeywords,
        nicheQualifiers: keywordPlan.nicheQualifiers,
      },
    };
  } catch {
    return null;
  }
}
