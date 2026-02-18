"use client";

import { Check, Zap, X } from "lucide-react";
import { useState } from "react";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    async function handleCheckout() {
        setLoading(true);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("Checkout error:", data.error);
                alert("Checkout failed. Please try again.");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-left align-middle shadow-2xl transition-all backdrop-blur-xl">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/50">
                        <Zap className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                        Unlock Full Access
                    </h3>
                    <p className="mt-2 text-slate-400">
                        Get more credits to analyze high-demand niches.
                    </p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8 relative group">
                    <div className="absolute -inset-px bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur-sm -z-10" />

                    <div className="flex items-baseline justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white">Starter Pack</h4>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">$9.99</span>
                            <span className="text-sm text-slate-400">/one-time</span>
                        </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                        {[
                            "3 Premium Credits",
                            "Deep Analysis",
                            "Competitor Spy",
                            "Sales Estimates"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                {item}
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleCheckout}
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:from-indigo-500 hover:to-violet-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Buy Credits <Zap className="w-4 h-4 fill-white" />
                            </>
                        )}
                    </button>
                </div>

                <p className="text-center text-xs text-slate-500">
                    Secure payment via Lemon Squeezy. One-time purchase.
                </p>
            </div>
        </div>
    );
}
