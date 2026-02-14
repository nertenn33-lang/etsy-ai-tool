import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUid, uidCookieOptions } from "@/src/lib/uid";
import { getMockAnalysis } from "@/src/lib/analysis/mock";
import { getEtsyEnrichment, getEtsyBreakdownSignals } from "@/src/lib/etsy/enrichment";

const AnalyzeBodySchema = z.object({
  idea: z
    .string()
    .trim()
    .min(10, "Idea must be at least 10 characters")
    .max(500, "Idea must be at most 500 characters"),
  micro: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = AnalyzeBodySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const message = first?.message ?? "Validation failed";
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    const { idea, micro } = parsed.data;
    const normalizedIdea = idea.trim();
    const normalizedMicro = (micro ?? "").trim();
    const { uid, cookieValueToSet } = await getOrCreateUid();
    const seed = `${uid}|${normalizedIdea}|${normalizedMicro}`;

    const hasLlmKey = Boolean(
      process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY
    );

    if (!hasLlmKey) {
      const analysis = getMockAnalysis(seed);
      let payload: Record<string, unknown> = { ...analysis };
      try {
        const etsyData = await getEtsyEnrichment(normalizedIdea, normalizedMicro);
        if (etsyData) {
          payload.etsyData = etsyData;
          payload.breakdown = getEtsyBreakdownSignals(etsyData);
        }
      } catch {
        /* omit etsyData on failure */
      }
      const response = NextResponse.json(payload, { status: 200 });
      if (cookieValueToSet) {
        response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
      }
      return response;
    }

    // Future: call real LLM provider here, e.g. OpenRouter/OpenAI
    // For now, keep mock so behavior is consistent until provider is implemented
    const analysis = getMockAnalysis(seed);
    let payload: Record<string, unknown> = { ...analysis };
    try {
      const etsyData = await getEtsyEnrichment(normalizedIdea, normalizedMicro);
      if (etsyData) {
        payload.etsyData = etsyData;
        payload.breakdown = getEtsyBreakdownSignals(etsyData);
      }
    } catch {
      /* omit etsyData on failure */
    }
    const response = NextResponse.json(payload, { status: 200 });
    if (cookieValueToSet) {
      response.cookies.set("uid", cookieValueToSet, uidCookieOptions);
    }
    return response;
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
