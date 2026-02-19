"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export function usePaymentHandshake(onCreditsUpdated: (credits: number) => void) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get("success");

        if (success === "true") {
            setIsProcessing(true);

            // Timeout Failsafe: 5 seconds max
            const timeout = setTimeout(() => {
                if (isProcessing) {
                    setIsProcessing(false);
                    setShowToast(true);
                    cleanUrl();
                    // Still trigger confetti because they paid!
                    triggerConfetti();
                }
            }, 5000);

            // Polling for credit update
            const interval = setInterval(async () => {
                try {
                    const res = await fetch("/api/me");
                    if (res.ok) {
                        const data = await res.json();
                        if (data.credits >= 3) { // Threshold check
                            onCreditsUpdated(data.credits);
                            setIsProcessing(false);
                            triggerConfetti();
                            cleanUrl();
                            clearInterval(interval);
                            clearTimeout(timeout);
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000);

            // Cleanup
            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [onCreditsUpdated]); // eslint-disable-line react-hooks/exhaustive-deps

    function triggerConfetti() {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#ec4899']
        });
    }

    function cleanUrl() {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
    }

    return { isProcessing, showToast, setShowToast };
}
