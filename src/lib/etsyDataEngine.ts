export type EtsyTrendData = {
    marketDemand: number; // 0-100
    monthlySales: number; // estimated
    competitionScore: number; // 0-100 (higher is more competitive)
    searchVolumeHistory: { month: string; volume: number }[];
    tags: { text: string; volume: "high" | "medium" | "low" }[];
    topCompetitors: { shop: string; sales: number }[];
};

/**
 * Simulates fetching SEO data from an external source.
 * Uses a deterministic random algorithm based on the keyword string
 * to ensure the same keyword always returns the same "simulation" data.
 */
export async function getSimulatedEtsyData(keyword: string): Promise<EtsyTrendData> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

    const seed = keyword.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (offset: number = 0) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    // Market Demand: 0 to 100
    // "gift" or "custom" usually implies higher demand
    let baseDemand = Math.floor(random(1) * 80) + 10;
    if (/gift|custom|personalized/i.test(keyword)) baseDemand += 15;
    if (baseDemand > 100) baseDemand = 98;

    // Monthly Sales: correlated with demand but with variance
    const monthlySales = Math.floor(baseDemand * (random(2) * 50 + 10));

    // Competition: Independent of demand, often high for meaningful keywords
    const competitionScore = Math.floor(random(3) * 90) + 10;

    // History Trend (Last 6 months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const searchVolumeHistory = months.map((m, i) => ({
        month: m,
        volume: Math.floor(monthlySales * (0.8 + random(i + 4) * 0.4)),
    }));

    // Generate some "relevant" tags based on input + randomness
    const suffixes = ["gift", "decor", "art", "handmade", "vintage", "unique", "custom", "ideas"];
    const derivedTags = suffixes
        .map((s) => `${keyword} ${s}`)
        .sort(() => 0.5 - Math.random()) // Shuffle simple
        .slice(0, 5);

    // Fill remaining tags with simulated specific terms
    const abstractTags = [
        "boho style", "minimalist", "gift for her", "gift for him",
        "wedding favor", "party decor", "home office", "cottagecore"
    ];

    const allTagsRaw = [...derivedTags, ...abstractTags];
    // Select 13 distinctive tags
    const tags = allTagsRaw.slice(0, 13).map((t, i) => ({
        text: t.toLowerCase(),
        volume: random(i + 10) > 0.7 ? "high" as const : random(i + 10) > 0.4 ? "medium" as const : "low" as const,
    }));

    // Competitors
    const shops = ["CraftyCo", "DesiGnStudiO", "HandmadeHaven", "TheGiftNook"];
    const topCompetitors = shops.map((s, i) => ({
        shop: s,
        sales: Math.floor(monthlySales * (0.1 + random(i + 20) * 0.2)),
    }));

    return {
        marketDemand: baseDemand,
        monthlySales,
        competitionScore,
        searchVolumeHistory,
        tags,
        topCompetitors,
    };
}
