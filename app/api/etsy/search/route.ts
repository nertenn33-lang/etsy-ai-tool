import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { fetchSearchResults } from "@/src/lib/etsy/fetch";
import { computePriceStats, normalizeQuery } from "@/src/lib/etsy/normalize";
import { checkEtsyRateLimit, getEtsyRateLimitKey } from "@/src/lib/etsy/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = normalizeQuery(searchParams.get("q")?.trim() ?? "");
  if (!q) {
    return NextResponse.json(
      { ok: false, q: "", resultCount: null, sampleTitles: [], priceStats: null, samplePricesCount: 0, error: "Missing q" },
      { status: 400 }
    );
  }
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;
  const headersList = await headers();
  const rateKey = getEtsyRateLimitKey(uid, headersList);
  if (!checkEtsyRateLimit(rateKey)) {
    return NextResponse.json(
      { ok: false, q, resultCount: null, sampleTitles: [], priceStats: null, samplePricesCount: 0, error: "Rate limited" },
      { status: 429, headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } }
    );
  }
  try {
    const result = await fetchSearchResults(q);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          q,
          resultCount: null,
          sampleTitles: [],
          priceStats: null,
          samplePricesCount: 0,
          error: result.error,
        },
        {
          status: 200,
          headers: { "Cache-Control": "public, max-age=600, s-maxage=600" },
        }
      );
    }
    const priceStats = computePriceStats(result.samplePrices);
    return NextResponse.json(
      {
        ok: true,
        q,
        resultCount: result.resultCount,
        sampleTitles: result.sampleTitles,
        priceStats,
        samplePricesCount: result.samplePrices.length,
      },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV === "development") console.warn("[api/etsy/search]", msg);
    return NextResponse.json(
      {
        ok: false,
        q,
        resultCount: null,
        sampleTitles: [],
        priceStats: null,
        samplePricesCount: 0,
        error: msg,
      },
      { status: 200 }
    );
  }
}
