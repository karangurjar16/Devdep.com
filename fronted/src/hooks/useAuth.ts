import { useEffect, useState } from "react";
import { getMe, type GitHubUser } from "@/api/github";

interface AuthState {
    user: GitHubUser | null;
    loading: boolean;
    isAuthenticated: boolean;
}

export function useAuth(): AuthState {
    const [user, setUser] = useState<GitHubUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        getMe()
            .then((u) => {
                if (!cancelled) setUser(u);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {
        user,
        loading,
        isAuthenticated: user !== null,
    };
}
