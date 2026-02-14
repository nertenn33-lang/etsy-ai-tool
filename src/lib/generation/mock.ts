/**
 * Deterministic mock listing. Seed = uid|normalizedIdea|normalizedMicro.
 */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function createSeededRandom(seed: number): () => number {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) ^ (t >>> 14);
    return ((t >>> 0) / 4294967296) * 0.9999999403953552 + 0;
  };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trim();
}

const TITLE_STARTS = ["Handmade", "Custom", "Artisan", "Personalized", "Unique", "Small Batch"];
const TITLE_MIDDLES = ["Gift", "Everyday", "Home", "Collection", "Set", "Piece"];
const TITLE_ENDS = ["for You", "Idea", "Living", "Gifting", "Collection", "Edition"];

const TAG_POOL = [
  "handmade", "custom", "gift", "personalized", "etsy", "small batch",
  "artisan", "unique", "vintage", "modern", "minimalist", "boho",
  "eco friendly", "made to order", "gift idea", "home decor", "wall art",
  "ceramics", "textile", "wooden", "resin", "crochet", "macrame", "mugs", "prints",
];

const SENTENCES = [
  "This listing is crafted with care and designed to bring a special touch to your space.",
  "Each piece is made to order, so you receive something unique rather than mass-produced.",
  "We focus on quality materials and attention to detail in every step.",
  "Perfect for gifting or for treating yourself to something that reflects your style.",
  "Our small-batch approach means we can maintain high standards.",
  "Whether you're decorating your home or looking for a meaningful present, this fits.",
  "We ship with care so your item arrives in perfect condition.",
  "If you have a custom request, feel free to reach out before ordering.",
  "Thank you for supporting small makers and choosing something made with intention.",
  "We believe in creating pieces that last and that you'll enjoy for years.",
  "Our process blends traditional techniques with a modern eye for design.",
  "Ideal for anyone who appreciates handmade quality and thoughtful details.",
  "We use sustainable or recycled materials where possible.",
  "Add a personal touch to your everyday with this one-of-a-kind piece.",
];

const HOW_TO_ORDER = [
  "Choose your options (if any) and add to cart.",
  "After purchase, we'll start making your item.",
  "Ships within 3–5 business days; tracking provided.",
  "Questions? Message us—we're happy to help.",
];

const RATIONALE = [
  "Title is optimized for search and states the product and benefit.",
  "Tags cover broad and long-tail keywords for discoverability.",
  "Description answers common buyer questions and builds trust.",
  "Listing positions you in a micro-niche to reduce competition.",
  "Structure follows Etsy best practices for conversion.",
];

export interface MockListingResult {
  title: string;
  tags: [string, string, string, string, string, string, string, string, string, string, string, string, string];
  description: string;
  rationale: string;
  beforeScore: number;
  afterScore: number;
}

export function getMockListing(seed: string): MockListingResult {
  const rand = createSeededRandom(hashString(seed));

  const beforeScore = 30 + Math.floor(rand() * 41);
  const boost = 15 + Math.floor(rand() * 21);
  const afterScore = Math.min(95, beforeScore + boost);

  const titleRaw =
    TITLE_STARTS[Math.floor(rand() * TITLE_STARTS.length)]! +
    " " +
    TITLE_MIDDLES[Math.floor(rand() * TITLE_MIDDLES.length)]! +
    " " +
    TITLE_ENDS[Math.floor(rand() * TITLE_ENDS.length)]!;
  const title = truncate(titleRaw, 140);

  const shuffled = [...TAG_POOL].sort(() => rand() - 0.5);
  const tagSet = new Set<string>();
  for (let i = 0; tagSet.size < 13 && i < TAG_POOL.length * 2; i++) {
    const t = truncate(shuffled[i % shuffled.length]!, 20);
    if (t.length >= 2) tagSet.add(t);
  }
  while (tagSet.size < 13) {
    tagSet.add(truncate("tag" + rand().toString(36).slice(2, 10), 20));
  }
  const tags = Array.from(tagSet).slice(0, 13) as MockListingResult["tags"];

  const wordTarget = 120 + Math.floor(rand() * 101);
  const sentenceCount = Math.min(
    SENTENCES.length,
    Math.max(6, Math.floor(wordTarget / 18)),
  );
  const picked = [...SENTENCES].sort(() => rand() - 0.5).slice(0, sentenceCount);
  const mainBlock = picked.join(" ");
  const howToBlock = HOW_TO_ORDER.map((line) => `• ${line}`).join("\n");
  const description = `${mainBlock}\n\nHow to order:\n${howToBlock}`;

  const numBullets = 3 + Math.floor(rand() * 3);
  const rationaleParts = [...RATIONALE].sort(() => rand() - 0.5).slice(0, numBullets);
  const rationale = rationaleParts.map((b) => `• ${b}`).join("\n");

  return {
    title,
    tags,
    description,
    rationale,
    beforeScore,
    afterScore,
  };
}
