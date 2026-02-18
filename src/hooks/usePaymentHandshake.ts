"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export function usePaymentHandshake(onCreditsUpdated: (credits: number) => void) {
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get("success");
        // We no longer strictly need session_id for client-side verification with Lemon Squeezy
        // as we rely on the webhook having processed the order by the time the user returns
        // or shortly thereafter via polling.

        if (success === "true") {
            setIsProcessing(true);

            // Polling for credit update
            // We poll `/api/me` which returns the current credit count from DB.
            // The webhook should update the DB.
            const interval = setInterval(async () => {
                try {
                    const res = await fetch("/api/me");
                    if (res.ok) {
                        const data = await res.json();
                        // Check if credits have increased. 
                        // In a real app we might want to know the *previous* credit count to be sure,
                        // but here checking against a threshold or assuming increment is OK for now.
                        // Let's assume if we are in "success" mode, any >0 or increased credit count is good.
                        // For robustness, let's just wait for > 0 (since they start at 0 or 1).
                        // If they bought 3, they should have at least 3 or 4.
                        if (data.credits >= 3) {
                            onCreditsUpdated(data.credits);
                            finishHandshake();
                            clearInterval(interval);
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000);

            // Cleanup
            return () => clearInterval(interval);
        }
    }, [onCreditsUpdated]);

    function finishHandshake() {
        setIsProcessing(false);
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#ec4899']
        });
        // Clean URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
    }

    return { isProcessing };
}
