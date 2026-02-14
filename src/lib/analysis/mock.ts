/**
 * Deterministic mock analysis for free tier when no LLM key is configured.
 * Uses a seeded PRNG derived from seed string (uid + "|" + normalizedIdea).
 */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

/** Seeded PRNG (mulberry32). Returns values in [0, 1). */
function createSeededRandom(seed: number): () => number {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) ^ (t >>> 14);
    return ((t >>> 0) / 4294967296) * 0.9999999403953552 + 0;
  };
}

const DIAGNOSIS_PARTS = [
  "Your idea has solid potential but needs sharper positioning.",
  "The market is crowded; differentiation will be key.",
  "Focus on a specific audience to stand out.",
  "Listing quality and visuals will make or break conversion.",
  "Consider seasonal demand and search trends.",
  "Pricing and perceived value need careful calibration.",
  "Your niche has room for a unique angle.",
];

const MICRO_NICHE_POOL = [
  "Personalized engraved jewelry",
  "Minimalist leather accessories",
  "Vintage-style home decor",
  "Eco-friendly baby products",
  "Custom pet portraits",
  "Handmade soy candles",
  "Printable wall art",
  "Boho macrame plant hangers",
  "Resin coasters and trinkets",
  "Sticker packs for planners",
  "Custom tumblers and mugs",
  "Crochet amigurumi",
  "Wooden toy sets",
  "Linen napkins and tea towels",
  "Ceramic plant pots",
];

const TITLE_PREFIXES = ["Handmade", "Custom", "Artisan", "Personalized", "Unique"];
const TITLE_SUFFIXES = ["for Everyday", "Gift Idea", "Home & Living", "Collection", "Set"];

const BULLET_POOL = [
  "Handcrafted with attention to detail.",
  "Perfect for gifting or treating yourself.",
  "Ships carefully packaged.",
  "Made to order; allow 3–5 days.",
  "Eco-conscious materials when possible.",
  "Small batch for quality control.",
];

const WHY_POOL = [
  "Score reflects demand vs competition and how well your idea fits current search behavior.",
  "Breakdown is based on niche demand, competition level, price room, and market saturation.",
  "Higher demand and lower saturation improve score; strong competition and tight pricing weigh it down.",
  "Your idea’s score comes from estimated search demand, competitor density, and listing-quality signals.",
];

const BLOCKER_POOL = [
  "Title doesn't lead with high-intent keywords.",
  "Tags miss long-tail search phrases buyers use.",
  "Description lacks clear benefits and social proof.",
  "Price point may feel high without value framing.",
  "Images and listing structure not optimized for conversion.",
  "Competition in this niche is very high.",
  "Seasonal demand is low for this product type.",
];

const ACTION_POOL = [
  "Put your best keyword in the first 3 words of the title.",
  "Add 13 relevant tags including long-tail variants.",
  "Open the description with a benefit-driven hook.",
  "Add a short 'Why buy' or guarantee line.",
  "Use bullet points for scannability.",
  "Include a clear call-to-action (e.g. Add to cart today).",
  "Test different main images; use lifestyle shots.",
  "Consider a limited-time or bundle offer.",
];

const KEYWORD_POOL = [
  "personalized gift",
  "handmade",
  "custom order",
  "etsy bestseller",
  "unique",
  "small batch",
  "artisan",
  "long tail keyword",
  "niche specific",
  "trending search",
];

export interface MockAnalysisResult {
  beforeScore: number;
  afterScore: number;
  diagnosis: string;
  microNiches: [string, string, string];
  bestMicro: string;
  preview: {
    title: string;
    tags: [string, string, string, string, string];
    bullets: [string, string, string];
  };
  locked: true;
  /** PRO analysis schema */
  score: number;
  breakdown: {
    demand: number;
    competition: number;
    priceRoom: number;
    saturation: number;
  };
  summary: string;
  why: string;
  blockers: string[];
  actions: string[];
  premium: {
    winningKeywords: string[];
    optimizedTitle: string;
    listingStructure: string[];
  };
}

export function getMockAnalysis(seed: string): MockAnalysisResult {
  const hash = hashString(seed);
  const rand = createSeededRandom(hash);

  const beforeScore = 30 + Math.floor(rand() * 41);
  const boost = 15 + Math.floor(rand() * 21);
  const afterScore = Math.min(95, beforeScore + boost);

  const diagnosisParts = [...DIAGNOSIS_PARTS]
    .sort(() => rand() - 0.5)
    .slice(0, 2 + Math.floor(rand() * 2))
    .join(" ");
  const diagnosis = diagnosisParts || DIAGNOSIS_PARTS[0]!;

  const shuffled = [...MICRO_NICHE_POOL].sort(() => rand() - 0.5);
  const microNiches: [string, string, string] = [
    shuffled[0]!,
    shuffled[1]!,
    shuffled[2]!,
  ];
  const bestMicro = microNiches[Math.floor(rand() * 3)]!;

  const title =
    TITLE_PREFIXES[Math.floor(rand() * TITLE_PREFIXES.length)]! +
    " " +
    TITLE_SUFFIXES[Math.floor(rand() * TITLE_SUFFIXES.length)]!;

  const tagPool = [...MICRO_NICHE_POOL, "handmade", "gift", "custom", "etsy", "small batch"];
  const tagSet = new Set<string>();
  while (tagSet.size < 5) {
    tagSet.add(tagPool[Math.floor(rand() * tagPool.length)]!);
  }
  const tags = Array.from(tagSet).slice(0, 5) as [string, string, string, string, string];

  const bulletPool = [...BULLET_POOL].sort(() => rand() - 0.5);
  const bullets: [string, string, string] = [
    bulletPool[0]!,
    bulletPool[1]!,
    bulletPool[2]!,
  ];

  const score = afterScore;
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  const demand = clamp(40 + rand() * 45);
  const competition = clamp(30 + rand() * 50);
  const priceRoom = clamp(35 + rand() * 45);
  const saturation = clamp(25 + rand() * 55);
  const summary =
    "Solid listing potential with room to improve title, tags, and description for better visibility and conversion.";
  const why = WHY_POOL[Math.floor(rand() * WHY_POOL.length)]!;
  const shuffledBlockers = [...BLOCKER_POOL].sort(() => rand() - 0.5);
  const blockers = shuffledBlockers.slice(0, 3 + Math.floor(rand() * 2));
  const shuffledActions = [...ACTION_POOL].sort(() => rand() - 0.5);
  const actions = shuffledActions.slice(0, 3 + Math.floor(rand() * 2));

  const kwPool = [...KEYWORD_POOL].sort(() => rand() - 0.5);
  const winningKeywords = kwPool.slice(0, 3 + Math.floor(rand() * 4));
  const optimizedTitle =
    TITLE_PREFIXES[Math.floor(rand() * TITLE_PREFIXES.length)]! +
    " " +
    title +
    " — " +
    bestMicro;
  const listingStructure = [
    "Strong opening hook with primary keyword",
    "3–5 benefit bullets",
    "Clear CTA and guarantee",
    "Shipping and policies",
    "Keywords naturally repeated",
  ].slice(0, 3 + Math.floor(rand() * 3));

  return {
    beforeScore,
    afterScore,
    diagnosis,
    microNiches,
    bestMicro,
    preview: { title, tags, bullets },
    locked: true,
    score,
    breakdown: { demand, competition, priceRoom, saturation },
    summary,
    why,
    blockers,
    actions,
    premium: {
      winningKeywords,
      optimizedTitle,
      listingStructure,
    },
  };
}
