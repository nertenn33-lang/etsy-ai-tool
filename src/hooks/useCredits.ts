import { useState, useEffect } from "react";

export function useCredits() {
    const [credits, setCredits] = useState(0);

    // Initialize from local storage
    useEffect(() => {
        const saved = localStorage.getItem("user_credits");
        if (saved) {
            setCredits(parseInt(saved, 10));
        }
    }, []);

    // Listen for storage events (cross-tab sync)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "user_credits" && e.newValue) {
                setCredits(parseInt(e.newValue, 10));
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Helper to update credits manually (e.g. after analysis or purchase)
    const updateCredits = (newAmount: number) => {
        setCredits(newAmount);
        localStorage.setItem("user_credits", newAmount.toString());
        // Trigger a custom event for same-tab sync if needed, though React state handles it within component tree
        // For other components not sharing this instance:
        window.dispatchEvent(new Event("storage"));
    };

    return { credits, updateCredits };
}
