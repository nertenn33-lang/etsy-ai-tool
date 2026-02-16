"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Smartphone, Check, DollarSign } from "lucide-react";

const GLASS_CARD =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10";

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
    <div className="min-h-screen text-slate-100 relative overflow-hidden font-sans">
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.15), transparent 50%),
            radial-gradient(ellipse 60% 40% at 85% 50%, rgba(217,70,239,0.1), transparent 45%)
          `,
        }}
      />

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-32 space-y-32">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Etsy Intelligence</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-tight">
            Rank Higher.<br />
            <span className="text-gradient">Sell More.</span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Turn any idea into a best-selling Etsy listing in seconds.
            Real-time market data, competition analysis, and SEO-optimized tags at your fingertips.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/analyze"
              className="group relative inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-slate-950 font-bold transition-all hover:scale-105 hover:bg-slate-200"
            >
              Start analyzing for free
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Mobile Preview Image Mockup (Abstract) */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="relative mt-16 mx-auto max-w-5xl rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-2xl shadow-2xl overflow-hidden p-2 ring-1 ring-white/10"
          >
            <div className="rounded-xl overflow-hidden bg-slate-950 aspect-[16/9] relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
              <div className="text-center space-y-4">
                <Zap className="w-16 h-16 text-yellow-400 mx-auto animate-pulse" />
                <div className="text-2xl font-bold">Live Market Data Visualization</div>
                <div className="text-slate-500">Interactive charts and real-time signals</div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Features */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white">Why Top Sellers Use Tool</h2>
            <p className="text-slate-400">Stop guessing. Start dominating your niche.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ y: -5 }}
              className={`${GLASS_CARD} p-8 space-y-4`}
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Instant Analysis</h3>
              <p className="text-slate-400 leading-relaxed">
                Paste a keyword and get an instant breakdown of demand, competition, and potential revenue.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className={`${GLASS_CARD} p-8 space-y-4`}
            >
              <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">SEO Optimization</h3>
              <p className="text-slate-400 leading-relaxed">
                Get 13 golden keywords and a title structure that algorithm loves. Copy & paste ready.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className={`${GLASS_CARD} p-8 space-y-4`}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Competition Spy</h3>
              <p className="text-slate-400 leading-relaxed">
                See what the top 100 listings are doing right (and wrong) so you can outrank them.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className={`${GLASS_CARD} p-6 sm:p-8 text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 mb-4">
            <DollarSign className="h-6 w-6 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Simple, fair pricing</h2>
          <p className="mt-2 text-slate-400 max-w-lg mx-auto">
            Pay only for what you need. Credits never expire.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 flex flex-col items-center hover:bg-white/10 transition-colors">
              <span className="text-sm font-medium text-slate-300">Starter</span>
              <span className="text-3xl font-bold text-white mt-2">$9.99</span>
              <span className="text-xs text-slate-500 mt-1">5 Credits</span>
              <ul className="mt-4 space-y-2 text-sm text-slate-400 text-left w-full">
                <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-emerald-500" /> Full Market Analysis</li>
                <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-emerald-500" /> SEO Tag Generator</li>
              </ul>
            </div>
            <div className="rounded-xl bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-6 flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>
              <span className="text-sm font-medium text-indigo-300">Pro</span>
              <span className="text-3xl font-bold text-white mt-2">$29.99</span>
              <span className="text-xs text-indigo-200 mt-1">20 Credits</span>
              <ul className="mt-4 space-y-2 text-sm text-slate-300 text-left w-full">
                <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-indigo-400" /> Best Value</li>
                <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-indigo-400" /> Priority Support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Frequently Asked Questions</h2>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-8 max-w-4xl mx-auto">
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
