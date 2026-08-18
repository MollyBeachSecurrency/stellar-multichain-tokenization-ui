"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider wraps the application with React Query's QueryClientProvider.
 *
 * Configured with sensible defaults for blockchain data:
 * - staleTime: 30s (blockchain data changes per block)
 * - retry: 2 (transient RPC errors are common)
 * - refetchOnWindowFocus: true (keep data fresh)
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
