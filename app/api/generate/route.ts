import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import { getPrisma } from "@/src/lib/prisma";
import { getMockListing } from "@/src/lib/generation/mock";
import { getEtsyEnrichment } from "@/src/lib/etsy/enrichment";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  idea: z.string().trim().min(10).max(500),
  micro: z.string().trim().min(5).max(120),
});

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { idea, micro } = parsed.data;
    const normalizedIdea = normalize(idea);
    const normalizedMicro = normalize(micro);

    const hasLlmKey = Boolean(
      process.env.OPENROUTER_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.LLM_API_KEY,
    );
    if (!hasLlmKey) {
      return NextResponse.json(
        { error: "Missing LLM API key" },
        { status: 500 },
      );
    }

    const prisma = getPrisma();
    const { uid, cookieValueToSet } = await getOrCreateUid();

    await prisma.user.upsert({
      where: { id: uid },
      create: { id: uid, credits: 0 },
      update: {},
    });

    const { count } = await prisma.user.updateMany({
      where: { id: uid, credits: { gt: 0 } },
      data: { credits: { decrement: 1 } },
    });

    if (count === 0) {
      return NextResponse.json({ error: "No credits" }, { status: 402 });
    }

    const seed = `${uid}|${normalizedIdea}|${normalizedMicro}`;
    let listing = getMockListing(seed);
    let etsyData: Awaited<ReturnType<typeof getEtsyEnrichment>> = null;
    try {
      etsyData = await getEtsyEnrichment(idea.trim(), micro.trim());
    } catch {
      /* use existing listing when Etsy enrichment fails */
    }
    if (etsyData?.keywordPlan) {
      const genericTitleStart = new Set(["handmade", "collection"]);
      const titleKws = etsyData.keywordPlan.titleKeywords.filter(
        (kw) => !genericTitleStart.has(kw.trim().toLowerCase().split(/\s+/)[0] ?? "")
      );
      const firstTwo = (titleKws.length >= 2 ? titleKws : etsyData.keywordPlan.titleKeywords).slice(0, 2);
      const existingTitleLower = listing.title.toLowerCase();
      const prefixParts = firstTwo.filter(
        (kw) => kw && !existingTitleLower.includes(kw.trim().toLowerCase())
      );
      const prefix = prefixParts.join(" ").trim();
      const newTitle = prefix
        ? `${prefix} ${listing.title}`.trim().replace(/\s+/g, " ").slice(0, 140)
        : listing.title;
      const tagKw = etsyData.keywordPlan.tagKeywords;
      const tags13 = tagKw.length >= 13 ? tagKw.slice(0, 13) : [...tagKw, ...listing.tags].slice(0, 13);
      listing = {
        ...listing,
        title: newTitle,
        tags: tags13 as typeof listing.tags,
      };
    }

    let seoNotes: string | undefined;
    if (etsyData) {
      const bullets: string[] = [];
      const comp = etsyData.competition;
      if (comp?.resultCount != null && comp?.level) {
        const tier = comp.level === "low" ? "Low" : comp.level === "med" ? "Medium" : "High";
        bullets.push(`Competition: ${tier} (~${comp.resultCount.toLocaleString()} listings)`);
      }
      if (etsyData.price?.median) {
        const m = etsyData.price.median;
        const lo = Math.max(0, m * 0.85);
        const hi = m * 1.15;
        bullets.push(`Suggested price band: $${lo.toFixed(0)}–$${hi.toFixed(0)} (median $${m.toFixed(0)})`);
      }
      const titlePhrases = (etsyData.keywordPlan?.titleKeywords ?? []).slice(0, 3).filter(Boolean);
      if (titlePhrases.length > 0) {
        bullets.push(`Top phrases: ${titlePhrases.join(", ")}`);
      }
      if (bullets.length > 0) seoNotes = bullets.join("\n");
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { credits: true },
    });
    const creditsLeft = user?.credits ?? 0;

    const response = NextResponse.json(
      {
        uid,
        idea: normalizedIdea,
        micro: normalizedMicro,
        listing: {
          title: listing.title,
          tags: listing.tags,
          description: listing.description,
          rationale: listing.rationale,
          beforeScore: listing.beforeScore,
          afterScore: listing.afterScore,
        },
        creditsLeft,
        listingsLeft: creditsLeft, // temporary: same as creditsLeft; UI uses me.listings
        ...(seoNotes !== undefined && { seoNotes }),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );

    if (cookieValueToSet) {
      response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
    }
    return response;
  } catch (err) {
    console.error("[POST /api/generate]", err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 },
    );
  }
}
