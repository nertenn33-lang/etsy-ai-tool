"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { sanitizeKeyword } from "@/src/lib/etsy/normalize";
import { isGenericOnly } from "@/src/lib/etsy/score";
import { track } from "@/src/lib/analytics/posthog";

async function copyToClipboardSafe(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}

function prepareChips(items: string[]): { display: string[]; more: number } {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = sanitizeKeyword(raw);
    if (!s || isGenericOnly(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return { display: out.slice(0, 13), more: Math.max(0, out.length - 13) };
}

function useCountUp(target: number, durationMs = 600): number {
  const safeTarget = typeof target === "number" && Number.isFinite(target) ? target : 0;
  const [display, setDisplay] = useState<number>(safeTarget);
  const prevTargetRef = useRef<number>(safeTarget);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const endValue = typeof target === "number" && Number.isFinite(target) ? target : 0;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(endValue);
      prevTargetRef.current = endValue;
      return;
    }
    cancelAnimationFrame(rafRef.current);
    const startValue = prevTargetRef.current;
    if (startValue === endValue) {
      setDisplay(endValue);
      return;
    }
    const startTime = performance.now();

    const tick = () => {
      if (!mountedRef.current) return;
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      const value = startValue + (endValue - startValue) * eased;
      setDisplay(value);
      if (t >= 1) {
        prevTargetRef.current = endValue;
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  if (typeof target !== "number" || isNaN(target)) {
    return prevTargetRef.current;
  }
  return display;
}

type Me = { uid: string; credits?: number };
type AnalyzeResult = {
  beforeScore?: number;
  afterScore?: number;
  diagnosis?: string;
  microNiches?: string[];
  bestMicro?: string;
  preview?: { title?: string; tags?: string[]; bullets?: string[] };
  locked?: boolean;
  score?: number;
  breakdown?: { demand: number; competition: number; priceRoom: number; saturation: number };
  summary?: string;
  why?: string;
  blockers?: string[];
  actions?: string[];
  premium?: { winningKeywords: string[]; optimizedTitle: string; listingStructure: string[] };
  [k: string]: unknown;
};
type PreviewHydrated = {
  before: number;
  after: number;
  diagnosis?: string;
  title?: string;
  tags?: string[];
  bullets?: string[];
  bestMicro?: string;
};
type GenerateResult = {
  uid: string;
  idea: string;
  micro: string;
  listing: {
    title: string;
    tags: string[];
    description: string;
    rationale: string;
    beforeScore: number;
    afterScore: number;
  };
  creditsLeft: number;
  listingsLeft?: number;
  /** UI-only SEO notes (competition, price band, phrases); not in listing description */
  seoNotes?: string;
};

const MIN_IDEA = 10;
const MIN_MICRO = 5;
const EXAMPLE_IDEA = "Handmade ceramic mugs with custom pet portraits for dog lovers";
const EXAMPLE_MICRO = "Personalized dog portrait mugs";

const LOADING_STEPS = [
  "Parsing idea",
  "Finding micro-niche",
  "Optimizing title",
  "Preparing listing",
];

const PRESETS = [
  { label: "🎁 Gift", idea: "Personalized birth flower necklace for moms and daughters — made to order", micro: "Personalized birth flower necklace" },
  { label: "🐶 Pet niche", idea: EXAMPLE_IDEA, micro: EXAMPLE_MICRO },
  { label: "🕯 Decor", idea: "Minimalist soy candle set with custom label for housewarming gifts", micro: "Custom label soy candles" },
];

const REAL_EXAMPLES = [
  {
    title: "Birth Flower Necklace",
    beforeScore: 36,
    afterScore: 95,
    beforeTitle: "Handmade Birth Flower Necklace Gift",
    beforeTags: ["handmade", "gift", "mom", "necklace", "jewelry"],
    afterTitle: "custom birth flower necklace, gift for mom — Personalized Birth Flower Necklace",
    afterTags: ["custom birth flower", "birth flower necklace", "gift for mom", "mom necklace gift", "minimalist necklace", "personalized jewelry", "name necklace", "floral pendant"],
  },
  {
    title: "Pet Memorial",
    beforeScore: 42,
    afterScore: 88,
    beforeTitle: "Pet Portrait Watercolor Custom Gift",
    beforeTags: ["pet", "dog", "gift", "portrait", "handmade"],
    afterTitle: "custom pet memorial portrait, dog mom gift — Watercolor Pet Portrait",
    afterTags: ["custom pet portrait", "pet memorial art", "dog mom gift", "sympathy gift", "watercolor portrait", "pet loss gift", "memorial portrait", "custom dog portrait"],
  },
  {
    title: "Digital Chore Chart",
    beforeScore: 39,
    afterScore: 91,
    beforeTitle: "Chore Chart Template Printable Kids",
    beforeTags: ["printable", "template", "kids", "chart", "etsy"],
    afterTitle: "editable chore chart, canva template — Kids Chore Chart Printable",
    afterTags: ["editable chore chart", "canva template", "kids chore chart", "chore chart printable", "routine chart", "reward chart", "instant download", "minimalist template"],
  },
];

const SCORE_KEY_REGEX = /(before|after|score)/i;
const SCORE_KEY_STRICT_REGEX = /(before_score|after_score|beforeScore|afterScore)/i;

function normalizeScore(v: number): number {
  if (!Number.isFinite(v)) return 0;
  let out: number;
  if (v > 0 && v <= 1) {
    out = Math.round(v * 100);
  } else if (v > 100 && v <= 10000) {
    out = v % 100 === 0 || v > 1000 ? Math.round(v / 100) : 100;
  } else {
    out = Math.round(v);
  }
  return Math.min(100, Math.max(0, out));
}

function findScoreCandidates(
  obj: unknown,
  maxDepth = 6,
  prefix = "",
  depth = 0,
  out: Array<{ path: string; value: number }> = []
): Array<{ path: string; value: number }> {
  if (depth > maxDepth || out.length >= 100) return out;
  if (obj === null || typeof obj !== "object") return out;
  const rec = obj as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    const val = rec[key];
    const path = prefix ? `${prefix}.${key}` : key;
    const keyMatches = SCORE_KEY_REGEX.test(key) || SCORE_KEY_STRICT_REGEX.test(key);
    if (keyMatches) {
      const num = typeof val === "number" ? val : typeof val === "string" ? Number(val) : NaN;
      if (Number.isFinite(num)) out.push({ path, value: num });
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      findScoreCandidates(val, maxDepth, path, depth + 1, out);
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "object" && item !== null)
          findScoreCandidates(item, maxDepth, `${path}[${i}]`, depth + 1, out);
      });
    }
  }
  return out.sort((a, b) => a.path.length - b.path.length);
}

function getScores(
  data: Record<string, unknown>,
  candidates: Array<{ path: string; value: number }> = []
): { before: number; after: number } {
  const preview = data.preview && typeof data.preview === "object" ? (data.preview as Record<string, unknown>) : undefined;
  const analysis = data.analysis && typeof data.analysis === "object" ? (data.analysis as Record<string, unknown>) : undefined;
  let before: number;
  let after: number;
  if (typeof data.beforeScore === "number" && typeof data.afterScore === "number") {
    before = normalizeScore(data.beforeScore);
    after = normalizeScore(data.afterScore);
  } else if (typeof preview?.beforeScore === "number" && typeof preview?.afterScore === "number") {
    before = normalizeScore(preview.beforeScore);
    after = normalizeScore(preview.afterScore);
  } else if (typeof analysis?.beforeScore === "number" && typeof analysis?.afterScore === "number") {
    before = normalizeScore(analysis.beforeScore);
    after = normalizeScore(analysis.afterScore);
  } else {
    before = normalizeScore(Number(data.before ?? data.beforeScore));
    after = normalizeScore(Number(data.after ?? data.afterScore));
  }
  const inRange = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
  if (!inRange(before) || !inRange(after)) {
    const bestBefore = candidates.find((c) => /before/i.test(c.path) && Number.isFinite(c.value));
    const bestAfter = candidates.find((c) => /after/i.test(c.path) && Number.isFinite(c.value));
    if (bestBefore !== undefined) before = normalizeScore(bestBefore.value);
    if (bestAfter !== undefined) after = normalizeScore(bestAfter.value);
    if (inRange(before) && !inRange(after) && bestBefore !== undefined) after = before;
    if (inRange(after) && !inRange(before) && bestAfter !== undefined) before = after;
  }
  before = Number.isFinite(before) ? Math.min(100, Math.max(0, before)) : 0;
  after = Number.isFinite(after) ? Math.min(100, Math.max(0, after)) : 0;
  if (after < before) after = before;
  return { before, after };
}

function scoreLabel(after: number): { text: string; className: string } {
  const s = Math.min(100, Math.max(0, after));
  if (s >= 75) return { text: "High conversion chance 🔥", className: "text-indigo-400" };
  if (s >= 55) return { text: "Medium potential", className: "text-slate-400" };
  return { text: "Needs improvement", className: "text-amber-400" };
}

function ScoreBar({ before, after }: { before: number; after: number }) {
  const beforeAnimated = useCountUp(before, 600);
  const afterAnimated = useCountUp(after, 600);
  const beforePct = Math.min(100, Math.max(0, beforeAnimated));
  const afterPct = Math.min(100, Math.max(0, afterAnimated));
  const fillPct = Math.max(0, afterPct - beforePct);
  const label = scoreLabel(after);
  const afterSafe = afterAnimated >= beforeAnimated ? afterAnimated : beforeAnimated;
  return (
    <div className="space-y-2">
      {process.env.NODE_ENV !== "production" && (
        <p className="text-xs text-slate-500 font-mono">
          countUp: {Math.round(beforeAnimated)} → {Math.round(afterAnimated)}
        </p>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Listing potential</span>
        <span className="font-medium text-slate-200">
          {Math.round(beforeAnimated)} → <span className="text-indigo-400">{Math.round(afterSafe)}</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden flex">
        <div
          className="h-full bg-white/15 transition-[width] duration-500 ease-out"
          style={{ width: `${beforePct}%` }}
        />
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-500 ease-out"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border border-indigo-400/20 bg-indigo-500/10 ${label.className}`}>
        {label.text}
      </span>
    </div>
  );
}

const GLASS_CARD =
  "glass-card-inner relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl";
const GLOW_RING =
  "absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500/35 via-fuchsia-500/20 to-cyan-500/35 blur-xl -z-10";

const MARQUEE_ROW_1 = [
  "Find a micro-niche",
  "Optimize tags",
  "Boost conversion",
  "Fix title structure",
  "Gift intent",
  "Search-friendly",
  "Deterministic output",
  "Reduce friction",
];
const MARQUEE_ROW_2 = [
  "Etsy keywords",
  "Better description",
  "Clear CTA",
  "Less keyword stuffing",
  "Readable listings",
  "Higher click-through",
  "Better trust",
  "Shopper-friendly",
];

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: string[];
  reverse?: boolean;
}) {
  const duplicated = [...items, ...items];
  return (
    <div
      className="group overflow-hidden w-full"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div
        className={`inline-flex flex-nowrap gap-3 marquee-track group-hover:[animation-play-state:paused] ${reverse ? "marquee-reverse" : "marquee-normal"
          }`}
      >
        {duplicated.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="shrink-0 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs text-slate-200 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PaywallModal({
  open,
  onClose,
  onRefresh,
  onCheckout,
  checkoutLoading,
  error,
  loadingRefresh = false,
}: {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
  onCheckout: () => void;
  checkoutLoading: boolean;
  error?: string | null;
  loadingRefresh?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;
  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="paywall-title"
    >
      <div
        className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <h2 id="paywall-title" className="text-xl font-semibold text-white text-center -mt-4">
          Unlock 3 Pro Etsy Listings
        </h2>
        <p className="text-center text-slate-300 text-sm">
          3 Pro Listings — $9.99 (one-time)
        </p>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">• Optimized title</li>
          <li className="flex gap-2">• 13 Etsy tags</li>
          <li className="flex gap-2">• Conversion-focused description</li>
          <li className="flex gap-2">• Rationale + score</li>
          <li className="flex gap-2">• Deterministic output</li>
          <li className="flex gap-2">• Use anytime</li>
        </ul>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={onCheckout}
            disabled={checkoutLoading}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 transition-all duration-150 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checkoutLoading && (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
            )}
            {checkoutLoading ? "Redirecting…" : "Unlock 3 listings — $9.99"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loadingRefresh}
            className="text-xs text-slate-400 hover:text-slate-300 underline disabled:opacity-50"
          >
            Already paid? Refresh
          </button>
          {error && (
            <div className="space-y-3">
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm text-rose-200">{error}</p>
              </div>
              {error.includes("Missing STRIPE_PRICE_ID") && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-3">
                  <p className="text-xs text-amber-200">
                    Open Stripe → Products → Unlock 3 Pro Etsy Listings → Price → copy price_...
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://dashboard.stripe.com/products"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white border border-white/20"
                    >
                      Open Stripe Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("npm run setup:stripe");
                      }}
                      className="inline-flex items-center rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white border border-white/20"
                    >
                      Run setup command
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}

async function safeTextOrMessage(res: Response): Promise<string> {
  try {
    const data = await res.json().catch(() => ({}));
    const err =
      data && typeof (data as Record<string, unknown>).error === "string"
        ? String((data as Record<string, unknown>).error)
        : null;
    return err ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default function HomeClient() {
  const [idea, setIdea] = useState("");
  const [micro, setMicro] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [preview, setPreview] = useState<PreviewHydrated | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [noCredits, setNoCredits] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const [justAnalyzed, setJustAnalyzed] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [generateHttpStatus, setGenerateHttpStatus] = useState<number | null>(null);
  const [debugAnalyzeRaw, setDebugAnalyzeRaw] = useState("");
  const [debugAnalyzeRoot, setDebugAnalyzeRoot] = useState("");
  const [debugCandidates, setDebugCandidates] = useState<Array<{ path: string; value: number }>>([]);
  const [checkoutToast, setCheckoutToast] = useState<"success" | "cancel" | null>(null);
  const fullListingRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement | null>(null);
  const ideaRef = useRef<HTMLTextAreaElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const purchaseRef = useRef<HTMLElement | null>(null);
  const [highlightResults, setHighlightResults] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const isAnalyzingRef = useRef(false);
  const lastAnalyzeInputRef = useRef<{ idea: string; micro: string } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const fn = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const isLoading = loadingAnalyze || loadingGenerate;
  useEffect(() => {
    if (!isLoading || prefersReducedMotion) return;
    setLoadingStepIndex(0);
    const id = setInterval(() => {
      setLoadingStepIndex((i) => (i + 1) % LOADING_STEPS.length);
    }, 350);
    return () => clearInterval(id);
  }, [isLoading, prefersReducedMotion]);

  async function copyToClipboard(text: string, kind: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(kind);
      setTimeout(() => setCopyToast(null), 1200);
    } catch {
      setCopyToast(null);
    }
  }

  async function handleCheckout() {
    setPaywallError(null);
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data?.url === "string") {
        track("checkout_started", { uid: me?.uid, credits: me?.credits });
        window.location.href = data.url;
        return;
      }
      const msg = (typeof data?.error === "string" ? data.error : null) || `Request failed (${res.status})`;
      console.warn("[CHECKOUT] failed", res.status, msg);
      setPaywallError(msg || "Payments are currently disabled (missing Stripe config).");
    } catch (e) {
      const fallback = "Payments are currently disabled (missing Stripe config).";
      setPaywallError(fallback);
      console.warn("[CHECKOUT] failed", e);
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  const ideaValid = idea.trim().length >= MIN_IDEA && idea.trim().length <= 500;
  const microValid = micro.trim().length >= MIN_MICRO && micro.trim().length <= 120;
  const formValid = ideaValid && microValid;

  const router = useRouter();
  const [meLastUpdated, setMeLastUpdated] = useState<number>(0);

  async function refreshMe(): Promise<Me | undefined> {
    setLoadingMe(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setMe(data);
      setMeLastUpdated(Date.now());
      return data as Me;
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Failed to load");
      return undefined;
    } finally {
      setLoadingMe(false);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      params.delete("checkout");
      const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", url);
      const prevCredits = me?.credits ?? 0;
      (async () => {
        await refreshMe();
        router.refresh();
        await new Promise((r) => setTimeout(r, 2000));
        const updated = await refreshMe();
        const newCredits = updated?.credits ?? 0;
        const uid = updated?.uid ?? me?.uid ?? "(none)";
        if (process.env.NODE_ENV !== "production") {
          console.log("[UI] success refresh prevCredits=%s newCredits=%s uid=%s", prevCredits, newCredits, uid);
        }
        if (prevCredits < newCredits) {
          setCheckoutToast("success");
          track("checkout_success", { uid: updated?.uid, credits: newCredits });
        }
      })();
    } else if (checkout === "cancel") {
      setCheckoutToast("cancel");
      params.delete("checkout");
      const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", url);
    }
  }, [router]);

  useEffect(() => {
    if (!checkoutToast) return;
    const t = setTimeout(() => setCheckoutToast(null), 5000);
    return () => clearTimeout(t);
  }, [checkoutToast]);

  useEffect(() => {
    if (generateResult && fullListingRef.current) {
      fullListingRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [generateResult]);

  async function postJSON(
    url: string,
    body: { idea: string; micro: string }
  ): Promise<{ ok: boolean; status: number; data: unknown }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 402) {
      setNoCredits(true);
      return { ok: false, status: 402, data };
    }
    if (!res.ok) {
      setGlobalError(
        (data && typeof data.error === "string" ? data.error : null) ||
        `Request failed (${res.status})`
      );
      return { ok: false, status: res.status, data };
    }
    setGlobalError(null);
    setNoCredits(false);
    return { ok: true, status: res.status, data };
  }

  async function handleAnalyze(overrideIdea?: string, overrideMicro?: string) {
    const ideaToUse = overrideIdea ?? idea.trim();
    const microToUse = overrideMicro ?? micro.trim();
    const valid = ideaToUse.length >= MIN_IDEA && ideaToUse.length <= 500 && microToUse.length >= MIN_MICRO && microToUse.length <= 120;
    if (!valid || loadingAnalyze) return;
    isAnalyzingRef.current = true;
    setLoadingAnalyze(true);
    setAnalyzeResult(null);
    setPreview(null);
    try {
      const { ok, data } = await postJSON("/api/analyze", {
        idea: ideaToUse,
        micro: microToUse,
      });
      if (ok && data && typeof data === "object") {
        setDebugAnalyzeRaw(JSON.stringify(data, null, 2));
        const root = (data as Record<string, unknown>)?.analysis ?? (data as Record<string, unknown>)?.result ?? (data as Record<string, unknown>)?.data ?? data;
        const rootObj = (typeof root === "object" && root !== null ? root : data) as Record<string, unknown>;
        setDebugAnalyzeRoot(JSON.stringify(rootObj, null, 2));
        const candidates = findScoreCandidates(rootObj);
        setDebugCandidates(candidates);
        console.log("ANALYZE RAW", data);
        console.log("ANALYZE ROOT", rootObj);
        console.log("SCORE CANDIDATES", candidates);
        const { before, after } = getScores(rootObj, candidates);
        const previewSrc = (rootObj?.preview ?? rootObj) as Record<string, unknown> | undefined;
        const diagnosis = previewSrc && typeof previewSrc.diagnosis === "string" ? previewSrc.diagnosis : undefined;
        const bestMicro = previewSrc && typeof previewSrc.bestMicro === "string" ? previewSrc.bestMicro : undefined;
        const title = previewSrc && typeof previewSrc.title === "string" ? previewSrc.title : undefined;
        const tags = Array.isArray(previewSrc?.tags) ? (previewSrc.tags as string[]) : undefined;
        const bullets = Array.isArray(previewSrc?.bullets) ? (previewSrc.bullets as string[]) : undefined;
        setAnalyzeResult(data as AnalyzeResult);
        setPreview({
          before,
          after,
          diagnosis,
          title,
          tags,
          bullets,
          bestMicro,
        });
        lastAnalyzeInputRef.current = { idea: ideaToUse.trim(), micro: microToUse.trim() };
        const inputHash = JSON.stringify({ idea: ideaToUse.trim(), micro: microToUse.trim() });
        console.log("[DEBUG] analyze input hash=" + inputHash.slice(0, 80) + "... before=" + before + " after=" + after + " score=(" + before + "→" + after + ")");
        console.log("ANALYZE RESULT", { before, after, diagnosis, title, tags, bullets, bestMicro });
        refreshMe();
        setJustAnalyzed(true);
        setTimeout(() => setJustAnalyzed(false), 2000);
      }
    } finally {
      isAnalyzingRef.current = false;
      setLoadingAnalyze(false);
    }
  }

  async function applyPresetAndAnalyze(preset: { label: string; idea: string; micro: string }) {
    setIdea(preset.idea);
    setMicro(preset.micro);
    setAppliedPreset(preset.label);
    setTimeout(() => setAppliedPreset(null), 1000);
    await new Promise<void>((r) => setTimeout(r, 0));
    await handleAnalyze(preset.idea, preset.micro);
  }

  async function handleGenerate() {
    if (!formValid || loadingGenerate) return;
    track("generate_clicked", { uid: me?.uid, credits: me?.credits });
    const credits = me?.credits ?? 0;
    if (credits <= 0) {
      track("paywall_opened", { source: "generate_locked", uid: me?.uid, credits: 0 });
      setNoCredits(true);
      setGenerateStatus("idle");
      return;
    }
    const currentIdea = idea.trim();
    const currentMicro = micro.trim();
    const currentInputHash = JSON.stringify({ idea: currentIdea, micro: currentMicro });
    const lastInput = lastAnalyzeInputRef.current;
    const analyzeMatches = lastInput && lastInput.idea === currentIdea && lastInput.micro === currentMicro;
    if (!analyzeResult || !analyzeMatches) {
      await handleAnalyze(currentIdea, currentMicro);
    }
    console.log("[DEBUG] generate input hash=" + currentInputHash.slice(0, 80) + "... using analyze hash=" + (lastAnalyzeInputRef.current ? JSON.stringify(lastAnalyzeInputRef.current).slice(0, 80) + "..." : "n/a"));
    setLoadingGenerate(true);
    setGenerateResult(null);
    setGenerateStatus("loading");
    setGenerateHttpStatus(null);
    setGlobalError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idea: currentIdea, micro: currentMicro }),
      });
      setGenerateHttpStatus(res.status);
      if (res.status === 402) {
        track("paywall_opened", { source: "generate_locked", uid: me?.uid, credits: 0 });
        setNoCredits(true);
        setGenerateStatus("idle");
        return;
      }
      if (!res.ok) {
        setGenerateStatus("error");
        setGlobalError(await safeTextOrMessage(res));
        return;
      }
      const data = await res.json().catch(() => ({}));
      setGenerateResult(data as GenerateResult);
      const title = (data as GenerateResult)?.listing?.title ?? "";
      console.log("[DEBUG] generate ok; UI score source=analyze; title=" + (title.slice(0, 50) + (title.length > 50 ? "…" : "")));
      await refreshMe();
      setGenerateStatus("success");
      const creditsLeft = (data as GenerateResult)?.creditsLeft ?? me?.credits ?? 0;
      track("generate_success", { uid: me?.uid, credits: creditsLeft });
    } catch (e) {
      setGenerateStatus("error");
      setGlobalError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setLoadingGenerate(false);
    }
  }

  const credits = me?.credits ?? 0;
  const hasCredits = credits > 0;
  const hasGenerated = generateStatus === "success" && !!generateResult;
  const listingsLeft = credits;
  const listingsDisplay = loadingMe ? "—" : String(listingsLeft);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.log("[UI] badge uid=%s credits=%s source=me", me?.uid ?? "(none)", me?.credits ?? "—");
  }, [me?.uid, me?.credits]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.log("[UI] lockGate hasCredits=%s credits=%s", hasCredits, me?.credits);
  }, [hasCredits, me?.credits]);

  return (
    <div className="min-h-screen text-slate-100 relative overflow-hidden">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 35s linear infinite; }
        .marquee-track.marquee-reverse { animation-direction: reverse; }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; }
        }
        .generate-btn-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 40%,
            rgba(255,255,255,0.15) 45%,
            rgba(255,255,255,0.25) 50%,
            rgba(255,255,255,0.15) 55%,
            transparent 60%,
            transparent 100%
          );
          transform: translateX(-100%);
          transition: transform 0.6s ease;
          pointer-events: none;
        }
        .generate-btn-shine:hover:not(:disabled)::after {
          transform: translateX(100%);
        }
        .glass-card-inner::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 100%);
          pointer-events: none;
        }
        .loading-step-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(129, 140, 248, 0.9);
          animation: step-pulse 0.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-step-dot { animation: none; }
        }
        @keyframes step-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {/* Dark gradient base */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Nebula + star field overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.12), transparent 50%),
            radial-gradient(ellipse 60% 40% at 85% 50%, rgba(217,70,239,0.08), transparent 45%),
            radial-gradient(ellipse 50% 40% at 15% 70%, rgba(6,182,212,0.06), transparent 45%),
            radial-gradient(1.5px 1.5px at 20% 30%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1.5px 1.5px at 60% 15%, rgba(255,255,255,0.35), transparent),
            radial-gradient(1.5px 1.5px at 80% 60%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.25), transparent)
          `,
        }}
      />

      {/* Subtle noise texture (CSS-only approximation) */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Etsy AI Tool
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${loadingMe
                  ? "bg-white/10 text-slate-500"
                  : "bg-indigo-500/20 text-indigo-200 border border-indigo-400/20"
                }`}
            >
              {!loadingMe && (
                <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full mr-2" aria-hidden />
              )}
              Listings left: {listingsDisplay}
            </span>
          </div>
        </div>
      </header>

      {checkoutToast === "success" && (
        <div className="sticky top-[57px] z-10 mx-auto max-w-3xl px-4 sm:px-6 py-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 px-4 py-2.5 text-sm font-medium text-center animate-[fadeIn_0.3s_ease-out]">
            ✅ 3 listings added.
          </div>
        </div>
      )}
      {checkoutToast === "cancel" && (
        <div className="sticky top-[57px] z-10 mx-auto max-w-3xl px-4 sm:px-6 py-2">
          <div className="rounded-xl border border-white/20 bg-white/5 text-slate-400 px-4 py-2.5 text-sm font-medium text-center animate-[fadeIn_0.3s_ease-out]">
            Checkout canceled.
          </div>
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 z-20 rounded-xl border border-amber-500/40 bg-slate-900/95 backdrop-blur px-3 py-2 text-xs font-mono text-amber-200/90 space-y-1">
          <div>uid: {me?.uid ?? "—"}</div>
          <div>credits: {me?.credits ?? "—"}</div>
          <div>lastUpdated: {meLastUpdated ? new Date(meLastUpdated).toISOString().slice(11, 23) : "—"}</div>
          <div className="mt-1 flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => refreshMe()}
              className="rounded bg-amber-500/30 px-2 py-0.5 hover:bg-amber-500/50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/debug/reset-user", { method: "POST", credentials: "include" });
                await refreshMe();
                window.location.reload();
              }}
              className="rounded bg-red-500/40 px-2 py-0.5 hover:bg-red-500/60 text-red-200"
            >
              Reset User (DEV)
            </button>
          </div>
        </div>
      )}

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Marketing Hero */}
        <section className="text-center pt-16 pb-10">
          {/* A) Headline + subhead + proof line */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-white max-w-2xl mx-auto">
            Turn any Etsy idea into a sellable listing — in 60 seconds.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mt-4">
            Competition-aware keywords, title optimization, and 13 Etsy-ready tags. Powered by live Etsy signals (when available).
          </p>
          <p className="text-sm text-zinc-300 mt-3">
            ✓ See what top sellers do: long-tail tags + strong first 40 characters.
          </p>

          {/* B) CTA row + microcopy */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                track("analyze_clicked", { source: "hero", ideaLen: idea.trim().length, microLen: micro.trim().length, uid: me?.uid, credits: me?.credits });
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                setTimeout(() => ideaRef.current?.focus(), 400);
              }}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 active:scale-[0.98]"
            >
              Analyze my idea
            </button>
            <button
              type="button"
              onClick={async () => {
                track("analyze_clicked", { source: "example", ideaLen: 35, microLen: 28, uid: me?.uid, credits: me?.credits });
                setIdea("personalized birth flower necklace");
                setMicro("gift for mom, minimalist style");
                await new Promise<void>((r) => setTimeout(r, 0));
                await handleAnalyze("personalized birth flower necklace", "gift for mom, minimalist style");
                resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                setHighlightResults(true);
                setTimeout(() => setHighlightResults(false), 2000);
              }}
              disabled={loadingAnalyze}
              className="rounded-xl border border-white/20 bg-transparent px-6 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              See example
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Free preview. Pay only to unlock full listing.</p>

          {/* C) Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 max-w-3xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 hover:bg-white/7 hover:-translate-y-0.5 transition-all duration-200">
              Competition tier + price range (best-effort)
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 hover:bg-white/7 hover:-translate-y-0.5 transition-all duration-200">
              Tags ≤20 chars, no generic spam
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 hover:bg-white/7 hover:-translate-y-0.5 transition-all duration-200">
              SEO Notes you can copy-paste
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-4 mt-14">
          <h2 className="text-lg font-semibold text-white text-center">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className={`${GLASS_CARD} p-4 space-y-2`}>
              <p className="text-sm font-medium text-slate-200">Paste your idea</p>
              <p className="text-xs text-slate-500">Describe product + niche.</p>
            </div>
            <div className={`${GLASS_CARD} p-4 space-y-2`}>
              <p className="text-sm font-medium text-slate-200">Get instant signals</p>
              <p className="text-xs text-slate-500">Score + keyword plan + competition tier (when available).</p>
            </div>
            <div className={`${GLASS_CARD} p-4 space-y-2`}>
              <p className="text-sm font-medium text-slate-200">Unlock the full listing</p>
              <p className="text-xs text-slate-500">Title, tags, description + SEO Notes.</p>
            </div>
          </div>
        </section>

        {/* Real Examples — conversion proof */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white text-center">
            Real examples — from average to optimized
          </h2>
          <p className="text-sm text-zinc-400 mt-1 text-center max-w-xl mx-auto">
            See how weak Etsy listings turn into optimized, keyword-rich listings in seconds.
          </p>
          <div className="space-y-6">
            {REAL_EXAMPLES.map((ex, idx) => (
              <div key={idx} className={`${GLASS_CARD} p-5 sm:p-6 space-y-4`}>
                <h3 className="text-base font-medium text-slate-200">{ex.title}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2 rounded-lg bg-slate-800/50 border border-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Before</span>
                      <span className="text-xs rounded-full bg-slate-600/60 text-slate-300 px-2 py-0.5">Score: {ex.beforeScore}</span>
                    </div>
                    <p className="text-sm text-slate-400 font-medium leading-snug">{ex.beforeTitle}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.beforeTags.map((tag, i) => (
                        <span key={i} className="rounded-full bg-slate-600/40 text-slate-400 px-2 py-0.5 text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-emerald-400/90 uppercase tracking-wider">After</span>
                      <span className="text-xs rounded-full bg-emerald-500/25 text-emerald-200 px-2 py-0.5">Score: {ex.afterScore}</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium leading-snug">{ex.afterTitle}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.afterTags.slice(0, 8).map((tag, i) => (
                        <span key={i} className="rounded-full bg-emerald-500/20 text-emerald-200 px-2 py-0.5 text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-emerald-300/80 italic mt-2">
                      + SEO Notes included (competition + price range)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1 pt-2">
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-xl border-2 border-indigo-500/60 bg-transparent px-6 py-2.5 text-sm font-medium text-indigo-200 hover:bg-indigo-500/10 hover:border-indigo-400/80 transition-all duration-150 active:scale-[0.98]"
            >
              Try it with your own idea
            </button>
            <p className="text-xs text-zinc-500 mt-1">Takes ~30 seconds. Free preview.</p>
          </div>
        </section>

        {/* Divider + Try it now */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
        <h2 className="text-xl font-semibold text-white text-center">Try it now</h2>

        {/* Moving pills marquee */}
        <div className="space-y-4 w-full">
          <MarqueeRow items={MARQUEE_ROW_1} />
          <MarqueeRow items={MARQUEE_ROW_2} reverse />
        </div>

        {/* Ultra-soft divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" aria-hidden />

        {/* Form card with glow */}
        <section ref={formRef} className={`relative ${GLASS_CARD} !backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-6 sm:p-8 transition-all duration-200 hover:border-white/15`}>
          <div className={GLOW_RING} />
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Your idea
            </h3>
            <div className="flex flex-wrap gap-2 justify-end items-center">
              {PRESETS.map(({ label, idea: presetIdea, micro: presetMicro }) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetAndAnalyze({ label, idea: presetIdea, micro: presetMicro })}
                    className="text-xs rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-slate-300 hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-200 transition-colors"
                  >
                    {label}
                  </button>
                  {appliedPreset === label && (
                    <span className="text-xs text-emerald-400">Applied</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label htmlFor="idea" className="block text-sm font-medium text-slate-300 mb-2">
                Idea (10–500 characters)
              </label>
              <textarea
                ref={ideaRef}
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. Handmade ceramic mugs with custom pet portraits for dog lovers"
                className="w-full min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30"
                maxLength={500}
              />
              <p className="mt-1.5 text-xs text-slate-500">{idea.trim().length}/500</p>
            </div>
            <div>
              <label htmlFor="micro" className="block text-sm font-medium text-slate-300 mb-2">
                Micro-niche (5–120 characters)
              </label>
              <input
                id="micro"
                type="text"
                value={micro}
                onChange={(e) => setMicro(e.target.value)}
                placeholder="Personalized dog portrait mugs"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30"
                maxLength={120}
              />
              <p className="mt-1.5 text-xs text-slate-500">{micro.trim().length}/120</p>
            </div>
            <p className="text-sm text-slate-500">Analyze is free. Generate uses 1 listing.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  track("analyze_clicked", { source: "form", ideaLen: idea.trim().length, microLen: micro.trim().length, uid: me?.uid, credits: me?.credits });
                  handleAnalyze();
                }}
                disabled={!formValid || loadingAnalyze}
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
              >
                {loadingAnalyze ? "Analyzing…" : "Analyze"}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!formValid || loadingGenerate}
                className={`generate-btn-shine rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] relative overflow-hidden ${justAnalyzed ? "animate-pulse" : ""}`}
              >
                {loadingGenerate ? "Generating…" : "Generate"}
              </button>
            </div>
            {process.env.NODE_ENV !== "production" && (
              <div className="mt-2 text-xs text-white/40">
                generate: {generateStatus} | http: {generateHttpStatus ?? "-"}
              </div>
            )}
            {isLoading && (
              <div
                className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-4"
                aria-live="polite"
              >
                <p className="text-xs font-medium text-slate-500 mb-2">Progress</p>
                <ul className="space-y-1.5">
                  {LOADING_STEPS.map((step, i) => {
                    const active = !prefersReducedMotion && i === loadingStepIndex;
                    return (
                      <li
                        key={step}
                        className={`flex items-center gap-2 text-sm ${active ? "text-white" : "text-slate-400"}`}
                      >
                        <span
                          className={`shrink-0 rounded-full ${active ? "loading-step-dot" : "w-1.5 h-1.5 bg-slate-500"}`}
                          aria-hidden
                        />
                        <span>{step}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Usage / purchase info — directly under Generate button */}
            {!hasGenerated && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                {!hasCredits ? (
                  <>
                    <p className="text-sm text-slate-400">Full listing uses 1 credit per generate.</p>
                    <button
                      type="button"
                      onClick={() => {
                        track("paywall_opened", { source: "pricing", uid: me?.uid, credits: me?.credits });
                        setNoCredits(true);
                      }}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 transition-all duration-150"
                    >
                      Unlock 3 listings — $9.99
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">You have {credits} listings left. Generate uses 1 credit.</p>
                )}
              </div>
            )}
            {hasGenerated && hasCredits && (
              <p className="mt-4 pt-4 border-t border-white/10 text-sm text-slate-400">You have {credits} listings left.</p>
            )}
          </div>
        </section>

        {/* Ultra-soft divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" aria-hidden />

        <p className="text-center text-sm text-slate-500 mt-5">
          Free analysis • Deterministic output • Built for Etsy sellers
        </p>

        {globalError && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
            <p className="text-sm font-medium text-rose-200">Something went wrong</p>
            <p className="mt-1 text-sm text-rose-200/90">{globalError}</p>
          </div>
        )}

        {/* Empty state */}
        {!analyzeResult && !generateResult && (
          <section className={`${GLASS_CARD} p-6 sm:p-8`}>
            <h3 className="text-lg font-semibold text-white mb-2">Get a listing that converts</h3>
            <p className="text-sm text-slate-400 mb-6">
              Enter your idea and micro-niche above, then analyze for free or generate a full Etsy-ready listing.
            </p>
            <ul className="space-y-3 text-sm text-slate-400">
              {[
                { title: "Analyze", desc: "See score and preview at no cost." },
                { title: "Generate", desc: "One listing for a full title, tags, description, and rationale." },
                { title: "Deterministic", desc: "Same input always returns the same listing." },
              ].map((item, i) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                    {i + 1}
                  </span>
                  <span><strong className="text-slate-300">{item.title}</strong> — {item.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Preview */}
        {analyzeResult && (
          <section
            ref={resultsRef}
            className={`${GLASS_CARD} relative overflow-hidden p-6 sm:p-8 transition-opacity duration-300 animate-[fadeIn_0.3s_ease-out_forwards] ${highlightResults ? "ring-2 ring-emerald-400/40 animate-pulse" : ""}`}
          >
            <div aria-hidden className="pointer-events-none absolute -inset-24 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl opacity-60" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-6">Preview</h3>
              {preview ? (
                <div className="space-y-6">
                  {process.env.NODE_ENV !== "production" && (
                    <p className="text-xs text-slate-500 font-mono">
                      previewState: {preview?.before ?? "—"} → {preview?.after ?? "—"} | hasPreview: {String(Boolean(preview))}
                    </p>
                  )}
                  {(() => {
                    const before = preview?.before ?? 0;
                    const after = preview?.after ?? 0;
                    return before === 0 && after === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-4">No score yet — click Analyze</p>
                    ) : (
                      <ScoreBar before={before} after={after} />
                    );
                  })()}
                  {preview.diagnosis && (
                    <p className="text-sm text-slate-300 leading-relaxed">{preview.diagnosis}</p>
                  )}
                  {preview.title && (
                    <p className="text-sm font-medium text-white">{preview.title}</p>
                  )}
                  {preview.tags && preview.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {preview.tags.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 px-3 py-1 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-indigo-500/10"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {preview.bullets && preview.bullets.length > 0 && (
                    <ul className="space-y-2 text-sm text-slate-300">
                      {preview.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-indigo-400">•</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {preview.bestMicro && (
                    <p className="text-xs text-slate-500">Best micro: {preview.bestMicro}</p>
                  )}
                </div>
              ) : (
                <pre className="text-xs overflow-auto rounded-lg bg-black/20 p-4 whitespace-pre-wrap text-slate-400 border border-white/10">
                  {JSON.stringify(analyzeResult, null, 2)}
                </pre>
              )}
            </div>
          </section>
        )}

        {/* Pro Analysis — breakdown, blockers, actions, locked PRO */}
        {analyzeResult && (analyzeResult.breakdown || (analyzeResult.blockers?.length ?? 0) > 0) && (
          <section className={`${GLASS_CARD} p-6 sm:p-8 space-y-6`}>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Pro Analysis
            </h3>

            {analyzeResult.breakdown && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Why this score?
                </h4>
                {(analyzeResult.why || analyzeResult.summary) && (
                  <div className="space-y-1 mb-4">
                    {analyzeResult.why && (
                      <p className="text-xs text-slate-500">{analyzeResult.why}</p>
                    )}
                    {analyzeResult.summary && (
                      <p className="text-sm text-slate-300">{analyzeResult.summary}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  {[
                    { key: "demand" as const, label: "Demand" },
                    { key: "competition" as const, label: "Competition" },
                    { key: "priceRoom" as const, label: "Price room" },
                    { key: "saturation" as const, label: "Saturation" },
                  ].map(({ key, label }) => {
                    const value = Math.min(100, Math.max(0, analyzeResult.breakdown![key] ?? 0));
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-300"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{value}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {analyzeResult.blockers && analyzeResult.blockers.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Conversion blockers
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  {analyzeResult.blockers.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-rose-400/80">•</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analyzeResult.actions && analyzeResult.actions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  How to improve to 90+
                </h4>
                <ol className="space-y-1.5 text-sm text-slate-300 list-decimal list-inside">
                  {analyzeResult.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* PRO Optimization — locked card only when no credits and not yet generated */}
            {!hasCredits && !hasGenerated && analyzeResult.premium && (
              <div className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="p-4 blur-md select-none pointer-events-none" aria-hidden>
                  <p className="text-xs font-medium text-slate-500 mb-2">Winning keywords</p>
                  <p className="text-sm text-slate-400 truncate">
                    {analyzeResult.premium.winningKeywords.join(", ")}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-3 mb-1">Optimized title</p>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {analyzeResult.premium.optimizedTitle}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-3 mb-1">Listing structure</p>
                  <ul className="text-sm text-slate-400 space-y-0.5">
                    {analyzeResult.premium.listingStructure.slice(0, 3).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-sm p-6">
                  <span className="text-2xl" aria-hidden>🔒</span>
                  <p className="text-sm text-slate-300 text-center">
                    Unlock optimized listing with winning keywords and structure
                  </p>
                  <p className="text-xs text-slate-500">3 listings = $9.99 one-time</p>
                  <button
                    type="button"
                    onClick={() => {
                      track("paywall_opened", { source: "unlock_cta", uid: me?.uid, credits: me?.credits });
                      setNoCredits(true);
                    }}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 transition-all duration-150"
                  >
                    Get my optimized listing
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {analyzeResult?.etsyData && typeof analyzeResult.etsyData === "object" ? (
          <section className={`${GLASS_CARD} p-6 sm:p-8 space-y-4`}>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Etsy Signals (beta)
            </h3>
            {(() => {
              const ed = analyzeResult.etsyData as {
                suggestions?: string[];
                competition?: { resultCount: number | null; level: string };
                price?: { min: number; max: number; median: number; mean: number } | null;
                keywordPlan?: { titleKeywords?: string[]; tagKeywords?: string[]; nicheQualifiers?: string[] };
              };
              const suggestionsRaw = Array.isArray(ed.suggestions) ? ed.suggestions : [];
              const suggestionsChips = prepareChips(suggestionsRaw);
              const comp = ed.competition;
              const hasLiveSignals = (comp?.resultCount != null && comp.resultCount > 0) || suggestionsRaw.length > 0;
              const price = ed.price;
              const kp = ed.keywordPlan;
              const tagChips = prepareChips(kp?.tagKeywords ?? []);
              return (
                <>
                  <p className="text-xs text-slate-500">
                    Data status: {hasLiveSignals ? "Live Etsy signals" : "Limited (Etsy blocked)"}
                  </p>
                  {suggestionsChips.display.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Suggestions</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {suggestionsChips.display.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-white/10 text-slate-300 border border-white/10 px-3 py-1 text-xs"
                          >
                            {s}
                          </span>
                        ))}
                        {suggestionsChips.more > 0 && (
                          <span className="text-xs text-slate-500">+{suggestionsChips.more} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  {comp && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Competition Score</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${comp.level === "low"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                              : comp.level === "med"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                            }`}
                        >
                          {comp.level === "low" ? "Low" : comp.level === "med" ? "Medium" : comp.level === "high" ? "High" : "Unknown"}
                        </span>
                        {comp.resultCount != null && (
                          <span className="text-xs text-slate-400">
                            Estimated competition: {comp.level === "low" ? "Low" : comp.level === "med" ? "Medium" : "High"} (~{comp.resultCount.toLocaleString()} listings)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {price && (
                    <div className="text-xs text-slate-400">
                      Suggested price range: ${price.min.toFixed(0)}–${price.max.toFixed(0)} (median ${price.median.toFixed(0)})
                    </div>
                  )}
                  {kp && ((kp.titleKeywords?.length ?? 0) > 0 || tagChips.display.length > 0) && (
                    <div className="space-y-2">
                      {kp.titleKeywords && kp.titleKeywords.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Title keywords</p>
                          <div className="flex flex-wrap gap-1">
                            {kp.titleKeywords.map((kw, i) => (
                              <span key={i} className="rounded bg-indigo-500/20 text-indigo-200 px-2 py-0.5 text-xs">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {tagChips.display.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Tag keywords</p>
                          <div className="flex flex-wrap gap-1 items-center">
                            {tagChips.display.map((kw, i) => (
                              <span key={i} className="rounded bg-white/10 text-slate-300 px-2 py-0.5 text-xs">
                                {kw}
                              </span>
                            ))}
                            {tagChips.more > 0 && (
                              <span className="text-xs text-slate-500">+{tagChips.more} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </section>
        ) : analyzeResult ? (
          <section className={`${GLASS_CARD} p-4`}>
            <p className="text-xs text-slate-500">Data status: Limited (Etsy blocked)</p>
          </section>
        ) : null}

        {process.env.NODE_ENV !== "production" && (debugAnalyzeRaw || debugCandidates.length > 0) && (
          <section className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 text-xs text-slate-400">
            <p className="text-slate-300 font-medium mb-2">
              Computed: {preview?.before ?? "—"} → {preview?.after ?? "—"}
            </p>
            {debugCandidates.slice(0, 50).map((c, i) => (
              <div key={i} className="font-mono text-slate-400">
                {c.path} — {c.value} → {normalizeScore(c.value)}
              </div>
            ))}
            {debugCandidates.length > 50 && (
              <p className="text-slate-500 mt-1">+{debugCandidates.length - 50} more</p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-400">Root JSON</summary>
              <pre className="mt-2 p-2 rounded bg-black/30 overflow-auto max-h-48 whitespace-pre-wrap text-slate-500">
                {debugAnalyzeRoot || "(empty)"}
              </pre>
            </details>
          </section>
        )}

        {/* Purchase section — only in flow; hidden after successful generate */}
        {(analyzeResult || generateResult) && !hasGenerated && (
          <section ref={purchaseRef} className={`${GLASS_CARD} p-6 sm:p-8 space-y-4 mt-10 max-w-3xl mx-auto`}>
            <h2 className="text-lg font-semibold text-white">$9.99 — 3 listings (one-time)</h2>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li>One-time payment</li>
              <li>No subscription</li>
              <li>Use anytime</li>
            </ul>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li>Instant delivery</li>
              <li>Credits never expire</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                track("paywall_opened", { source: "pricing", uid: me?.uid, credits: me?.credits });
                setNoCredits(true);
              }}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 transition-all duration-150 active:scale-[0.98]"
            >
              {(me?.credits ?? 0) === 0 ? "Unlock 3 listings" : "Get 3 more listings"}
            </button>
            {(me?.credits ?? 0) > 0 && (
              <p className="text-xs text-slate-500">You have credits — buy more anytime.</p>
            )}
            <p className="text-xs text-slate-500">Need more? More packs coming soon.</p>
          </section>
        )}

        <PaywallModal
          open={noCredits}
          onClose={() => setNoCredits(false)}
          onRefresh={() => { void refreshMe(); }}
          onCheckout={handleCheckout}
          checkoutLoading={isCheckoutLoading}
          error={paywallError}
          loadingRefresh={loadingMe}
        />

        {/* Full listing */}
        {generateResult && (
          <section
            ref={fullListingRef}
            className={`${GLASS_CARD} overflow-hidden`}
          >
            <div className="border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 px-6 py-3 flex items-center gap-2 text-sm text-slate-300">
              <span aria-hidden>🔒</span>
              <span>Full listing (1 listing)</span>
            </div>
            <div className="p-6 sm:p-8 space-y-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-white leading-tight flex-1 min-w-0">
                  {generateResult.listing.title}
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generateResult.listing.title, "title")}
                    className="text-xs rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-200 transition-colors"
                  >
                    Copy title
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generateResult.listing.tags.join(", "), "tags")}
                    className="text-xs rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-200 transition-colors"
                  >
                    Copy tags
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generateResult.listing.description, "description")}
                    className="text-xs rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-200 transition-colors"
                  >
                    Copy description
                  </button>
                  {copyToast && (
                    <span className="text-xs text-emerald-400" key={copyToast}>
                      Copied!
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Score</p>
                <ScoreBar
                  before={preview?.before ?? 0}
                  after={preview?.after ?? 0}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Deterministic output • Same input = same listing • Score from Analyze
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {generateResult.listing.tags.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 px-3 py-1.5 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Description</p>
                <div className="space-y-3 text-slate-200 leading-7">
                  {generateResult.listing.description
                    .split(/\n\n+/)
                    .map((para) => para.trim())
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Rationale</p>
                <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {generateResult.listing.rationale}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <span className="inline-flex items-center rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 px-3 py-1.5 text-sm font-medium">
                  Listings left: {listingsDisplay}
                </span>
              </div>

              {/* SEO Notes (for you) — UI-only, not in listing description */}
              {(() => {
                const fromResult = generateResult.seoNotes;
                const fromAnalyze = (() => {
                  const ed = analyzeResult?.etsyData;
                  if (!ed || typeof ed !== "object") return null;
                  const comp = (ed as { competition?: { resultCount?: number | null; level?: string } }).competition;
                  const price = (ed as { price?: { median?: number } }).price;
                  const kp = (ed as { keywordPlan?: { titleKeywords?: string[] } }).keywordPlan;
                  const bullets: string[] = [];
                  if (comp?.resultCount != null && comp?.level) {
                    const tier = comp.level === "low" ? "Low" : comp.level === "med" ? "Medium" : "High";
                    bullets.push(`Competition: ${tier} (~${comp.resultCount.toLocaleString()} listings)`);
                  }
                  if (price?.median) {
                    const m = price.median;
                    const lo = Math.max(0, m * 0.85);
                    const hi = m * 1.15;
                    bullets.push(`Suggested price band: $${lo.toFixed(0)}–$${hi.toFixed(0)} (median $${m.toFixed(0)})`);
                  }
                  const phrases = (kp?.titleKeywords ?? []).slice(0, 3).filter(Boolean);
                  if (phrases.length > 0) bullets.push(`Top phrases: ${phrases.join(", ")}`);
                  return bullets.length > 0 ? bullets.join("\n") : null;
                })();
                const seoNotesText = fromResult ?? fromAnalyze ?? null;
                if (!seoNotesText) return null;
                return (
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">SEO Notes (for you)</p>
                    <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-white/5 rounded-lg p-4 border border-white/10 mb-3">
                      {seoNotesText}
                    </pre>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboardSafe(seoNotesText);
                        setCopyToast(ok ? "seoNotes" : "copyFailed");
                        if (ok) setTimeout(() => setCopyToast(null), 2000);
                        else setTimeout(() => setCopyToast(null), 3000);
                      }}
                      className="text-xs rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-200 transition-colors"
                    >
                      Copy SEO Notes
                    </button>
                    {copyToast === "seoNotes" && (
                      <span className="ml-2 text-xs text-emerald-400">Copied</span>
                    )}
                    {copyToast === "copyFailed" && (
                      <span className="ml-2 text-rose-400 text-xs">Copy failed</span>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        <div className="h-px bg-white/10 my-6" aria-hidden />

        {/* FAQ — after Try-it-now flow */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">FAQ</h2>
          <dl className={`${GLASS_CARD} divide-y divide-white/10 p-0 overflow-hidden`}>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">Is this the official Etsy API?</dt>
              <dd className="mt-2 text-xs text-slate-500">No. We use best-effort public signals. If Etsy blocks or changes, the tool still works — just without live signals.</dd>
            </div>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">Will Etsy ban me?</dt>
              <dd className="mt-2 text-xs text-slate-500">We don&apos;t access your Etsy account. We only generate text and keyword suggestions.</dd>
            </div>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">Why do I see &apos;Limited (Etsy blocked)&apos; sometimes?</dt>
              <dd className="mt-2 text-xs text-slate-500">Etsy may rate-limit automated requests. We fall back safely and still generate listings.</dd>
            </div>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">What do I get after paying?</dt>
              <dd className="mt-2 text-xs text-slate-500">Credits that unlock 3 full listing generations (title + 13 tags + description + SEO Notes).</dd>
            </div>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">Do my credits expire?</dt>
              <dd className="mt-2 text-xs text-slate-500">No — once purchased, your credits stay forever.</dd>
            </div>
          </dl>
        </section>

        {/* Contact */}
        <section id="contact" className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">Contact</h2>
          <p className="text-sm text-zinc-400 text-center">Have a question, feedback, or partnership idea? We&apos;d love to hear from you.</p>
          <div className={`${GLASS_CARD} p-6 sm:p-8`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
                <a href="mailto:support@rankonetsy.com" className="text-sm text-zinc-200 underline decoration-white/20 hover:decoration-white/40">
                  support@rankonetsy.com
                </a>
                <p className="text-xs text-zinc-500">We usually reply within 24 hours.</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                />
                <textarea
                  placeholder="Your message"
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 min-h-[100px]"
                  rows={4}
                />
                <button
                  type="button"
                  onClick={() => {
                    const subject = encodeURIComponent("RankOnEtsy Contact");
                    const body = encodeURIComponent(`Name: ${contactName}\nEmail: ${contactEmail}\n\n${contactMsg}`);
                    window.location.href = `mailto:support@rankonetsy.com?subject=${subject}&body=${body}`;
                  }}
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-emerald-500/80 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
                >
                  Send message
                </button>
                <p className="text-xs text-zinc-500 mt-2">No spam. Just real support.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison section */}
        <section className={`${GLASS_CARD} p-6 sm:p-8`}>
          <h3 className="text-base font-semibold text-white mb-6 text-center">
            Traditional method vs Etsy AI Tool
          </h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:-translate-y-[2px] hover:shadow-xl hover:border-indigo-400/40">
              <p className="text-sm font-medium text-slate-400 mb-3">Traditional</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2">• Keyword research manually</li>
                <li className="flex gap-2">• Writing title, tags, description</li>
                <li className="flex gap-2">• Guessing micro-niche fit</li>
                <li className="flex gap-2">• Hours per listing</li>
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 transition hover:-translate-y-[2px] hover:shadow-xl hover:border-indigo-400/40">
              <p className="text-sm font-medium text-indigo-300 mb-3">&lt; 30 sec with Etsy AI Tool</p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">• Analyze → score + preview</li>
                <li className="flex gap-2">• Generate → full listing</li>
                <li className="flex gap-2">• Deterministic, repeatable</li>
                <li className="flex gap-2">• Done.</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="h-px bg-white/10 my-10" aria-hidden />

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} RankOnEtsy</p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-xs text-zinc-500 hover:text-zinc-300">Privacy</a>
            <a href="/terms" className="text-xs text-zinc-500 hover:text-zinc-300">Terms</a>
          </div>
        </footer>
        <p className="text-xs text-zinc-500 text-center pb-6">Questions? support@rankonetsy.com</p>

        {/* Sticky mini pricing badge — only when no credits and not in success state */}
        {credits === 0 && !hasGenerated && (
          <button
            type="button"
            onClick={() => {
              track("paywall_opened", { source: "sticky", uid: me?.uid, credits: 0 });
              purchaseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => setNoCredits(true), 600);
            }}
            className="fixed bottom-4 right-4 z-30 bg-black/70 backdrop-blur rounded-full px-4 py-2 text-sm text-white shadow-lg hover:bg-black/90 cursor-pointer transition-colors"
            aria-label="Unlock 3 listings for $9.99"
          >
            $9.99 • 3 listings • one-time
          </button>
        )}
      </main>
    </div>
  );
}
