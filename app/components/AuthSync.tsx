"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useCredits } from "@/src/hooks/useCredits";

export default function AuthSync() {
    const { user, isLoaded } = useUser();
    const { updateCredits } = useCredits();

    useEffect(() => {
        if (isLoaded && user) {
            fetch("/api/auth/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && typeof data.credits === 'number') {
                        updateCredits(data.credits);
                    }
                })
                .catch(err => console.error("Auth sync failed", err));
        }
    }, [isLoaded, user, updateCredits]);

    return null;
}
