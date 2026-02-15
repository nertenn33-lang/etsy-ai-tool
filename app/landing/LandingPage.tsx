"use client";

import { useState } from "react";
import Link from "next/link";

const GLASS_CARD =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setWaitlistError(null);
    setWaitlistStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWaitlistStatus("success");
        setEmail("");
      } else {
        setWaitlistStatus("error");
        setWaitlistError((data?.error as string) || "Something went wrong");
      }
    } catch {
      setWaitlistStatus("error");
      setWaitlistError("Network error");
    }
  }

  return (
    <div className="min-h-screen text-slate-100 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.12), transparent 50%),
            radial-gradient(ellipse 60% 40% at 85% 50%, rgba(217,70,239,0.08), transparent 45%),
            radial-gradient(1.5px 1.5px at 20% 30%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1.5px 1.5px at 60% 15%, rgba(255,255,255,0.35), transparent)
          `,
        }}
      />

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        {/* Hero */}
        <section className="text-center pt-8 pb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            RankOnEtsy
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            Turn any Etsy idea into a sellable listing — in 60 seconds.
          </p>
          <p className="text-slate-500 text-sm mt-1 max-w-xl mx-auto">
            Competition-aware keywords, title optimization, and 13 Etsy-ready tags. Built for sellers who want to rank.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <a
              href="#waitlist"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
            >
              Join waitlist
            </a>
            <Link
              href="/analyze"
              className="rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-200 active:scale-[0.98]"
            >
              Try demo (Analyze)
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className={`${GLASS_CARD} p-5 space-y-2`}>
              <p className="text-sm font-medium text-slate-200">1. Paste your idea</p>
              <p className="text-xs text-slate-500">Describe your product and niche in a sentence.</p>
            </div>
            <div className={`${GLASS_CARD} p-5 space-y-2`}>
              <p className="text-sm font-medium text-slate-200">2. Get instant signals</p>
              <p className="text-xs text-slate-500">Score, keyword plan, and competition tier (when available).</p>
            </div>
            <div className={`${GLASS_CARD} p-5 space-y-2`}>
              <p className="text-sm font-medium text-slate-200">3. Unlock the full listing</p>
              <p className="text-xs text-slate-500">Title, 13 tags, description, and SEO notes — ready to copy.</p>
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className={`${GLASS_CARD} p-6 sm:p-8 text-center`}>
          <h2 className="text-lg font-semibold text-white">Pricing</h2>
          <p className="text-2xl font-bold text-indigo-300 mt-2">$9.99</p>
          <p className="text-sm text-slate-400 mt-1">Unlock 3 Pro Etsy listings (one-time)</p>
          <ul className="mt-4 space-y-1 text-sm text-slate-400 text-left max-w-xs mx-auto">
            <li>• Optimized title + 13 tags</li>
            <li>• Conversion-focused description</li>
            <li>• No subscription — use anytime</li>
          </ul>
          <a
            href="#waitlist"
            className="inline-block mt-6 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 transition-all"
          >
            Join waitlist to get early access
          </a>
        </section>

        {/* Social proof placeholders */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">What sellers say</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className={`${GLASS_CARD} p-5`}>
              <p className="text-sm text-slate-300 italic">&ldquo;...saved me hours on my first listing.&rdquo;</p>
              <p className="text-xs text-slate-500 mt-2">— Etsy seller</p>
            </div>
            <div className={`${GLASS_CARD} p-5`}>
              <p className="text-sm text-slate-300 italic">&ldquo;...tags and title structure actually match what buyers search.&rdquo;</p>
              <p className="text-xs text-slate-500 mt-2">— Etsy seller</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">FAQ</h2>
          <dl className={`${GLASS_CARD} divide-y divide-white/10 overflow-hidden`}>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">What do I get?</dt>
              <dd className="mt-2 text-xs text-slate-500">Optimized title, 13 Etsy tags, description, and SEO notes — all in under a minute.</dd>
            </div>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">Is there a free trial?</dt>
              <dd className="mt-2 text-xs text-slate-500">Yes — you can run &quot;Analyze&quot; for free to see your score and a preview before unlocking full listings.</dd>
            </div>
            <div className="p-4 sm:p-5">
              <dt className="text-sm font-medium text-slate-200">Do credits expire?</dt>
              <dd className="mt-2 text-xs text-slate-500">No. Once you buy, your credits stay forever.</dd>
            </div>
          </dl>
        </section>

        {/* Email capture — waitlist */}
        <section id="waitlist" className={`${GLASS_CARD} p-6 sm:p-8 space-y-4`}>
          <h2 className="text-lg font-semibold text-white text-center">Join the waitlist</h2>
          <p className="text-sm text-slate-400 text-center max-w-md mx-auto">
            Be the first to know when we launch. No spam — just one email when we&apos;re ready.
          </p>
          <form onSubmit={handleWaitlistSubmit} className="max-w-sm mx-auto space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={waitlistStatus === "loading"}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={waitlistStatus === "loading"}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 disabled:opacity-70 transition-all"
            >
              {waitlistStatus === "loading" ? "Sending…" : waitlistStatus === "success" ? "You're on the list ✓" : "Notify me"}
            </button>
            {waitlistStatus === "success" && (
              <p className="text-sm text-emerald-400 text-center">Thanks! We&apos;ll email you when we launch.</p>
            )}
            {waitlistStatus === "error" && waitlistError && (
              <p className="text-sm text-rose-400 text-center">{waitlistError}</p>
            )}
          </form>
        </section>

        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-white/10">
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} RankOnEtsy</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-zinc-500 hover:text-zinc-300">Privacy</Link>
            <Link href="/terms" className="text-xs text-zinc-500 hover:text-zinc-300">Terms</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
