"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        refetchOnWindowFocus: false,
                        retry: (failureCount, error) => {
                            // Don't retry on 401/403
                            if (error instanceof Error && error.message.includes("401")) {
                                return false;
                            }
                            return failureCount < 2;
                        },
                    },
                },
            })
    );

    // Hydrate auth state
    const { setLoading } = useAuthStore();

    useEffect(() => {
        setLoading(false);
    }, [setLoading]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === "development" && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    );
}