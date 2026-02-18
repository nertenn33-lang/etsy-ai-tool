import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export function usePaymentHandshake(onCreditsUpdated: (credits: number) => void) {
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get("success");
        const sessionId = params.get("session_id");

        if (success === "true") {
            setIsProcessing(true);

            // 1. Session Binding (Priority)
            if (sessionId) {
                fetch("/api/payment/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: sessionId })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && typeof data.credits === "number") {
                            onCreditsUpdated(data.credits);
                            finishHandshake();
                        }
                    })
                    .catch(err => console.error("Handshake failed:", err));
            }

            // 2. Polling Fallback (in case session_id is missing or verify fails initially)
            const interval = setInterval(async () => {
                try {
                    const res = await fetch("/api/me");
                    if (res.ok) {
                        const data = await res.json();
                        // Strict check: assume purchase gives at least 3 credits, or we have > 1
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
    }, []);

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
