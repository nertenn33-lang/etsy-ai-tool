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
import { motion } from "framer-motion";

import { getSimulatedEtsyData, type EtsyTrendData } from "@/src/lib/etsyDataEngine";
import PricingModal from "./PricingModal";
import ActionPlan from "./ActionPlan";

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
        <div className="min-h-screen text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />

            <nav className="relative border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-500/20">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">SEO Command Center</span>
                    </div>

                    {!readOnly ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowPricing(true)}
                                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-white/10 hover:border-indigo-500/50 transition-all duration-300"
                            >
                                <Zap className={`w-4 h-4 ${credits > 0 ? 'text-yellow-400' : 'text-slate-600'} group-hover:scale-110 transition-transform`} />
                                <span className="text-sm font-medium">{credits} Credits</span>
                                <span className="ml-2 text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border border-indigo-500/20">
                                    Add
                                </span>
                            </button>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 shadow-inner" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <a href="/app" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors glow-hover px-4 py-2 rounded-lg">
                                Login for Full Access
                            </a>
                        </div>
                    )}
                </div>
            </nav>

            <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

                {/* Search Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mx-auto text-center space-y-8"
                >
                    <h1 className="text-4xl sm:text-5xl font-bold">
                        <span className="text-gradient">
                            {readOnly ? `Market Report: ${initialKeyword}` : "Market Intelligence"}
                        </span>
                    </h1>

                    {!readOnly ? (
                        <form onSubmit={handleAnalyze} className="relative group max-w-xl mx-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-lg"></div>
                            <div className="relative flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                                <Search className="w-5 h-5 text-slate-400 ml-4" />
                                <input
                                    type="text"
                                    placeholder="Analyze a niche (e.g. 'handmade soap')"
                                    className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 px-4 py-3 text-lg"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Analyze <Zap className="w-4 h-4 fill-white" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Exclusive deep-dive analysis and trend data for <strong className="text-white">{initialKeyword}</strong>.
                        </p>
                    )}
                </motion.section>

                {data && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="space-y-8"
                    >

                        {/* Top Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                {
                                    label: "Market Demand",
                                    value: data.marketDemand,
                                    max: 100,
                                    icon: TrendingUp,
                                    color: data.marketDemand > 70 ? "text-emerald-400" : "text-amber-400",
                                    barColor: data.marketDemand > 70 ? "bg-emerald-500" : "bg-amber-500"
                                },
                                {
                                    label: "Est. Monthly Sales",
                                    value: data.monthlySales.toLocaleString(),
                                    icon: DollarSign,
                                    color: "text-indigo-400",
                                    subtext: "Top 100 Listings"
                                },
                                {
                                    label: "Competition",
                                    value: data.competitionScore,
                                    max: 100,
                                    icon: Users,
                                    color: "text-rose-400",
                                    badge: data.competitionScore > 70 ? "High" : "Low"
                                }
                            ].map((metric, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                    className="glass-card p-6 rounded-2xl glow-hover group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <metric.icon className="w-24 h-24 text-white" />
                                    </div>

                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <h3 className="text-slate-400 text-sm font-medium flex items-center gap-2">
                                            <metric.icon className={`w-4 h-4 ${metric.color}`} />
                                            {metric.label}
                                        </h3>
                                        <span className={`text-3xl font-bold text-white tracking-tight`}>
                                            {typeof metric.value === 'number' && metric.max ? `${metric.value}/100` : metric.value}
                                        </span>
                                    </div>

                                    {metric.max ? (
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(Number(metric.value) / metric.max) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.5 }}
                                                className={`h-full rounded-full ${metric.barColor || 'bg-indigo-500'} shadow-[0_0_10px_currentColor]`}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 mt-2">{metric.subtext}</p>
                                    )}

                                    {metric.badge && (
                                        <div className="flex items-center gap-2 text-xs mt-3">
                                            <span className={`px-2 py-0.5 rounded-full border ${metric.badge === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                                                {metric.badge} Saturation
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Chart Section */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 }}
                                className="lg:col-span-2 glass-card rounded-2xl p-8 flex flex-col"
                            >
                                <div className="mb-8 flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <SearchIcon className="w-5 h-5 text-indigo-400" />
                                        Search Volume Trend
                                    </h3>
                                    <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-medium">
                                        Last 6 Months
                                    </div>
                                </div>

                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.searchVolumeHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                stroke="#475569"
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                stroke="#475569"
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(2, 6, 23, 0.9)',
                                                    borderColor: 'rgba(255,255,255,0.1)',
                                                    color: '#f8fafc',
                                                    borderRadius: '12px',
                                                    backdropFilter: 'blur(8px)',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                                }}
                                                itemStyle={{ color: '#818cf8' }}
                                                cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="volume"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorVolume)"
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Tags Section */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 }}
                                className="glass-card rounded-2xl p-8 flex flex-col h-full"
                            >
                                <h3 className="text-xl font-semibold text-white mb-6">High Potential Tags</h3>
                                <div className="flex flex-wrap gap-2.5 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                                    {data.tags.map((tag, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.8 + (i * 0.05) }}
                                            className={`
                         flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 cursor-default group hover:scale-105
                         ${tag.volume === "high"
                                                    ? "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40"
                                                    : tag.volume === "medium"
                                                        ? "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
                                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                                }
                       `}
                                        >
                                            <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{tag.text}</span>
                                            {tag.volume === "high" && <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />}
                                            {tag.volume === "medium" && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="mt-auto pt-6 border-t border-white/5">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500" /> High Vol</span>
                                        <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Med Vol</span>
                                    </div>
                                </div>
                            </motion.div>


                        </div>

                        {/* AI Action Plan */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                        >
                            <ActionPlan data={data} />
                        </motion.div>
                    </motion.div>
                )}

                {readOnly && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="flex justify-center pt-12 pb-8"
                    >
                        <a
                            href="/app"
                            className="group relative inline-flex items-center gap-4 rounded-full bg-slate-950/80 px-10 py-5 text-white ring-1 ring-white/10 hover:ring-indigo-500/50 transition-all duration-300 hover:scale-105 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <span className="font-bold text-xl relative z-10">Analyze Your Own Product</span>
                            <div className="relative z-10 p-2 rounded-full bg-indigo-500 group-hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/30">
                                <Zap className="w-5 h-5 fill-white text-white" />
                            </div>
                        </a>
                    </motion.div>
                )}

            </main>
        </div>
    );
}
