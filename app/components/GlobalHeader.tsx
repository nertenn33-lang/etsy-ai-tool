"use client";

import { BarChart3, Zap, CreditCard } from "lucide-react";
import { useCredits } from "@/src/hooks/useCredits";
import PricingModal from "./PricingModal";
import { useState } from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function GlobalHeader() {
    const { credits } = useCredits();
    const [showPricing, setShowPricing] = useState(false);

    return (
        <>
            <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />

            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-500/20">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">SEO Command Center</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-white/10">
                            <Zap className={`w-3.5 h-3.5 ${credits > 0 ? "text-yellow-400" : "text-slate-500"}`} />
                            <span className="text-sm font-medium text-slate-200">{credits} Credits</span>
                        </div>

                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all">
                                    Sign In
                                </button>
                            </SignInButton>
                        </SignedOut>

                        <SignedIn>
                            <UserButton />
                        </SignedIn>

                        <button
                            onClick={() => setShowPricing(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span className="hidden sm:inline">Get More Credits</span>
                            <span className="sm:inline">Buy</span>
                        </button>
                    </div>
                </div>
            </nav>
        </>
    );
}
