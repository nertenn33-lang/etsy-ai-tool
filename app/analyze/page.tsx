"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Standalone Analyze demo — no /api/me, no credits, no checkout.
 * Used when LANDING_MODE=true for "Try demo (Analyze)" from the landing page.
 */
export default function AnalyzeDemoPage() {
  const [idea, setIdea] = useState("");
  const [micro, setMicro] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const i = idea.trim();
    const m = micro.trim();
    if (i.length < 10) {
      setError("Idea must be at least 10 characters");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idea: i, micro: m || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data?.error as string) || `Request failed (${res.status})`);
        return;
      }
      setResult(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const preview = result?.preview && typeof result.preview === "object" ? result.preview as Record<string, unknown> : null;
  const before = typeof preview?.beforeScore === "number" ? preview.beforeScore : typeof result?.beforeScore === "number" ? result.beforeScore : null;
  const after = typeof preview?.afterScore === "number" ? preview.afterScore : typeof result?.afterScore === "number" ? result.afterScore : null;

  return (
    <div className="min-h-screen text-slate-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <main className="relative mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">← Back</Link>
          <span className="text-xs text-slate-500">Demo — Analyze only</span>
        </div>

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-6 space-y-4">
          <h1 className="text-xl font-semibold text-white">Try the analyzer</h1>
          <p className="text-sm text-slate-400">See a score and preview. No signup or payment.</p>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label htmlFor="idea" className="block text-sm font-medium text-slate-300 mb-1">Idea (10+ chars)</label>
              <textarea
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. Handmade ceramic mugs with custom pet portraits"
                className="w-full min-h-[100px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                maxLength={500}
              />
            </div>
            <div>
              <label htmlFor="micro" className="block text-sm font-medium text-slate-300 mb-1">Micro-niche (optional)</label>
              <input
                id="micro"
                type="text"
                value={micro}
                onChange={(e) => setMicro(e.target.value)}
                placeholder="e.g. Personalized dog portrait mugs"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                maxLength={120}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-70"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </form>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </section>

        {result && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Result</h2>
            {(before != null || after != null) && (
              <p className="text-sm text-slate-300">
                Score: {before != null ? before : "—"} → {after != null ? after : "—"}
              </p>
            )}
            {preview?.diagnosis != null ? (
              <p className="text-sm text-slate-400">{String(preview.diagnosis)}</p>
            ) : null}
            {preview?.title != null ? (
              <p className="text-sm font-medium text-white">{String(preview.title)}</p>
            ) : null}
            {Array.isArray(preview?.tags) && preview.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(preview.tags as string[]).map((t, i) => (
                  <span key={i} className="rounded-full bg-indigo-500/20 text-indigo-200 px-3 py-1 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">Raw JSON</summary>
              <pre className="mt-2 p-3 rounded-lg bg-black/30 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
