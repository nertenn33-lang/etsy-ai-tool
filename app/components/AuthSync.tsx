"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export default function AuthSync() {
    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (isLoaded && user) {
            fetch("/api/auth/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            }).catch(err => console.error("Auth sync failed", err));
        }
    }, [isLoaded, user]);

    return null;
}
