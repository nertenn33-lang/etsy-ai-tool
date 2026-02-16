"use client";

import { Lightbulb, ArrowRight, Target, TrendingUp, ImageIcon, AlertCircle, Lock } from "lucide-react";
import { type EtsyTrendData } from "@/src/lib/etsyDataEngine";

export default function ActionPlan({ data, credits, onUnlock }: { data: EtsyTrendData; credits: number; onUnlock: () => void }) {
    const isLocked = credits === 0;

    // Logic to generate smart recommendations
    const tips = [];

    // Tip 1: Competition & Title Strategy
    if (data.competitionScore > 70) {
        tips.push({
            title: "Refine Your SEO Strategy",
            desc: "Your competition is high. Generic keywords won't work. Switch to 'Long-tail' phrases (e.g., 'Custom minimalist silver ring' instead of 'silver ring').",
            icon: Target,
            color: "text-rose-400",
            bg: "bg-rose-500/10"
        });
    } else if (data.competitionScore < 40 && data.marketDemand > 60) {
        tips.push({
            title: "Dominate this Niche",
            desc: "Competition is low but demand is high! You found a winner. Double down on ads and list variations immediately.",
            icon: TrendingUp,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10"
        });
    } else {
        tips.push({
            title: "Optimize Keywords",
            desc: "Ensure your main keyword appears in the first 40 characters of your title and tags.",
            icon: Target,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10"
        });
    }

    // Tip 2: Demand & Seasonality
    if (data.marketDemand < 40) {
        tips.push({
            title: "Check Seasonality",
            desc: "Demand is currently low. This might be off-season. Consider updating tags for upcoming holidays (e.g., Mother's Day, Christmas).",
            icon: AlertCircle,
            color: "text-amber-400",
            bg: "bg-amber-500/10"
        });
    } else {
        tips.push({
            title: "Visual Trust",
            desc: "Top sellers in this category use 8+ photos. Add lifestyle shots and videos to increase conversion rate.",
            icon: ImageIcon,
            color: "text-blue-400",
            bg: "bg-blue-500/10"
        });
    }

    // Tip 3: Conversion/Pricing (Generic but valuable)
    if (data.monthlySales > 500) {
        tips.push({
            title: "Competitive Pricing",
            desc: "Sales volume is high. offer a 'Bundle' discount (e.g., Buy 2 get 10% off) to increase Average Order Value.",
            icon: ArrowRight,
            color: "text-fuchsia-400",
            bg: "bg-fuchsia-500/10"
        });
    } else {
        tips.push({
            title: "First Sale Focus",
            desc: "To get momentum, ask friends to favorite your shop or run a 24-hour flash sale to trigger the algorithm.",
            icon: Lightbulb,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10"
        });
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-8">
            {/* Glow Effect */}
            <div className="absolute -inset-px bg-gradient-to-r from-amber-500/10 to-emerald-500/10 opacity-50 blur-xl pointer-events-none" />
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Lightbulb className="w-32 h-32 text-white" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                        <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">AI Action Plan</h3>
                        <p className="text-slate-400 text-sm">Personalized coaching to improve your rank.</p>
                    </div>
                </div>

                <div className="relative">
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isLocked ? 'blur-md select-none opacity-50' : ''}`}>
                        {tips.map((tip, i) => (
                            <div key={i} className="group relative rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors">
                                <div className={`w-10 h-10 rounded-lg ${tip.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <tip.icon className={`w-5 h-5 ${tip.color}`} />
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">{tip.title}</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                            </div>
                        ))}
                    </div>

                    {isLocked && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6">
                            <div className="bg-slate-900/90 border border-indigo-500/30 backdrop-blur-md rounded-2xl p-8 max-w-md shadow-2xl">
                                <div className="mx-auto w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h4 className="text-xl font-bold text-white mb-2">Unlock Personalized AI Action Plan</h4>
                                <p className="text-slate-400 text-sm mb-6">
                                    Get 10+ SEO tips, competitor secrets, and a step-by-step coaching plan with the Starter Pack.
                                </p>
                                <button
                                    onClick={onUnlock}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(99,102,241,0.7)] hover:scale-105 active:scale-95 animate-pulse"
                                >
                                    Unlock with Starter Pack
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
