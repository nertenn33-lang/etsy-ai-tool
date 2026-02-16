"use client";

import { useState } from "react";
import {
    Search,
    TrendingUp,
    Users,
    DollarSign,
    BarChart3,
    Zap,
    Flame,
    Search as SearchIcon
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { getSimulatedEtsyData, type EtsyTrendData } from "@/src/lib/etsyDataEngine";
import PricingModal from "./PricingModal";

const GLASS_CARD = "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-6";


interface DashboardClientProps {
    initialKeyword?: string;
    initialData?: EtsyTrendData;
    readOnly?: boolean;
}

export default function DashboardClient({ initialKeyword = "", initialData, readOnly = false }: DashboardClientProps) {
    const [keyword, setKeyword] = useState(initialKeyword);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<EtsyTrendData | null>(initialData || null);
    const [credits, setCredits] = useState(3);
    const [showPricing, setShowPricing] = useState(false);

    async function handleAnalyze(e: React.FormEvent) {
        e.preventDefault();
        if (readOnly) return; // Disable search in read-only mode
        if (!keyword.trim()) return;

        if (credits <= 0) {
            setShowPricing(true);
            return;
        }

        setLoading(true);
        setData(null);

        try {
            const result = await getSimulatedEtsyData(keyword);
            setData(result);
            setCredits(prev => Math.max(0, prev - 1));
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-indigo-500/30">
            <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-500/10 blur-[120px]" />
            </div>

            <nav className="relative border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">SEO Command Center</span>
                    </div>

                    {!readOnly ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowPricing(true)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-white/10 hover:bg-slate-700 transition-colors"
                            >
                                <Zap className={`w-4 h-4 ${credits > 0 ? 'text-yellow-400' : 'text-slate-500'}`} />
                                <span className="text-sm font-medium">{credits} Credits</span>
                                <span className="ml-1 text-xs text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                    Add
                                </span>
                            </button>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <a href="/app" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                Login for Full Access
                            </a>
                        </div>
                    )}
                </div>
            </nav>

            <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Search Section */}
                <section className="max-w-2xl mx-auto text-center space-y-6">
                    <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                        {readOnly ? `Market Report: ${initialKeyword}` : "Market Intelligence"}
                    </h1>
                    {!readOnly ? (
                        <form onSubmit={handleAnalyze} className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl opacity-30 group-hover:opacity-60 transition duration-500 blur"></div>
                            <div className="relative flex items-center bg-slate-950 rounded-xl p-1.5">
                                <Search className="w-5 h-5 text-slate-400 ml-3" />
                                <input
                                    type="text"
                                    placeholder="Analyze a niche (e.g. 'handmade soap')"
                                    className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 px-4 py-2"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Analyze <Zap className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-slate-400 text-lg">
                            Exclusive analysis and trend data for <strong>{initialKeyword}</strong>.
                        </p>
                    )}
                </section>


                {data && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                        {/* Top Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Market Demand */}
                            <div className={GLASS_CARD}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-slate-400 text-sm font-medium flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                        Market Demand
                                    </h3>
                                    <span className={`text-2xl font-bold ${data.marketDemand > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {data.marketDemand}/100
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-1000 ${data.marketDemand > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                        style={{ width: `${data.marketDemand}%` }}
                                    />
                                </div>
                            </div>

                            {/* Monthly Sales */}
                            <div className={GLASS_CARD}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-slate-400 text-sm font-medium flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-indigo-400" />
                                        Est. Monthly Sales
                                    </h3>
                                    <span className="text-2xl font-bold text-white">
                                        {data.monthlySales.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">Based on top 100 listings analysis</p>
                            </div>

                            {/* Competition Score */}
                            <div className={GLASS_CARD}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-slate-400 text-sm font-medium flex items-center gap-2">
                                        <Users className="w-4 h-4 text-rose-400" />
                                        Competition
                                    </h3>
                                    <span className="text-2xl font-bold text-white">
                                        {data.competitionScore}/100
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded-full ${data.competitionScore > 70 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                        {data.competitionScore > 70 ? 'High' : data.competitionScore > 40 ? 'Medium' : 'Low'}
                                    </span>
                                    <span className="text-slate-500">saturation</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Chart Section */}
                            <div className={`lg:col-span-2 ${GLASS_CARD} flex flex-col`}>
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                    <SearchIcon className="w-4 h-4 text-indigo-400" />
                                    Search Volume Trend
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.searchVolumeHistory}>
                                            <defs>
                                                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                stroke="#64748b"
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                stroke="#64748b"
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                                itemStyle={{ color: '#818cf8' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="volume"
                                                stroke="#6366f1"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorVolume)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Tags Section */}
                            <div className={`${GLASS_CARD} flex flex-col`}>
                                <h3 className="text-lg font-semibold text-white mb-4">High Potential Tags</h3>
                                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                    {data.tags.map((tag, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default"
                                        >
                                            <span className="text-sm text-slate-300">{tag.text}</span>
                                            {tag.volume === "high" && <Flame className="w-3 h-3 text-orange-500" />}
                                            {tag.volume === "medium" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> High Vol</span>
                                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> Med Vol</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {readOnly && (
                    <div className="flex justify-center pt-8 pb-4">
                        <a
                            href="/app"
                            className="group relative inline-flex items-center gap-3 rounded-full bg-slate-900 px-8 py-4 text-white ring-1 ring-white/10 hover:bg-slate-800 hover:ring-indigo-500/50 transition-all duration-300"
                        >
                            <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-indigo-500/20 blur-xl"></span>
                            <span className="font-semibold text-lg">Analyze Your Own Product</span>
                            <Zap className="w-5 h-5 text-yellow-400 group-hover:fill-yellow-400 transition-colors" />
                        </a>
                    </div>
                )}


            </main>
        </div>
    );
}
