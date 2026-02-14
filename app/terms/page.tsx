import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-14">
        <Link href="/" className="inline-block text-sm text-zinc-400 hover:text-zinc-200 mb-8">
          ← Back to home
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-zinc-500 mb-8">Last updated: February 15, 2026</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">Service</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                <li>We provide listing analysis + keyword suggestions + generated listing drafts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">No guarantees</h2>
              <p className="text-sm text-slate-400">
                Scores and suggestions are guidance, not guaranteed sales or ranking.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">Acceptable use</h2>
              <p className="text-sm text-slate-400">
                No abuse, scraping, or attempts to break the system.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">Credits</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                <li>One-time credits, non-refundable once delivered</li>
                <li>Credits never expire</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">Etsy</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                <li>Not affiliated with Etsy</li>
                <li>You are responsible for complying with Etsy policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">Contact</h2>
              <p className="text-sm text-slate-400">
                <a href="mailto:support@rankonetsy.com" className="text-zinc-300 underline decoration-white/20 hover:decoration-white/40">
                  support@rankonetsy.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
