import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-14">
        <Link href="/" className="inline-block text-sm text-zinc-400 hover:text-zinc-200 mb-8">
          ← Back to home
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-zinc-500 mb-8">Last updated: February 15, 2026</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">What we collect</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                <li>Input text you provide (idea, niche)</li>
                <li>Basic usage analytics (if enabled)</li>
                <li>Purchase/credit metadata (payment provider)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">What we don&apos;t collect</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                <li>No Etsy account access</li>
                <li>No passwords</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">How we use data</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                <li>Provide the service (analysis/listing generation)</li>
                <li>Improve the product</li>
                <li>Fraud prevention / billing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">Cookies</h2>
              <p className="text-sm text-slate-400">
                We use a uid cookie to keep track of credits.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-slate-200 mb-3">Third parties</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                <li>Stripe for payments</li>
                <li>PostHog for analytics (only if enabled)</li>
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
