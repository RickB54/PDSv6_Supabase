// src/hooks/useAuthLocalShim.ts
import { useState, useEffect } from "react";

export function useAuthLocalShim() {
    const [user, setUser] = useState<{ id?: string; role?: string } | null>(null);

    useEffect(() => {
        const mode = (import.meta.env.VITE_AUTH_MODE || "local").toLowerCase();
        if (mode === "local") {
            // Keep cookie-based admin intact; if cookie exists other logic may detect it.
            // Provide a default local-admin for components expecting a user object.
            const isAdmin = ((): boolean => {
                try {
                    return localStorage.getItem("adminMode") === "true";
                } catch {
                    return false;
                }
            })();
            if (isAdmin) setUser({ id: "local-admin", role: "admin" });
            else setUser(null);
        }
    }, []);

    return {
        user,
        loginLocal: async () => {
            localStorage.setItem("adminMode", "true");
            setUser({ id: "local-admin", role: "admin" });
            return { ok: true };
        },
        logoutLocal: async () => {
            localStorage.removeItem("adminMode");
            setUser(null);
            return { ok: true };
        }
    };
}
