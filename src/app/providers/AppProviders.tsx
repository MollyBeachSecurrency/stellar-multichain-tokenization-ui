"use client";

import React from "react";
import { ChainProvider, ChainConfig } from "./ChainProvider";
import { WalletProvider } from "./WalletProvider";
import { QueryProvider } from "./QueryProvider";
import { SupportedChain } from "@/types";

interface AppProvidersProps {
  children: React.ReactNode;
  chainConfig: ChainConfig;
  defaultChain?: SupportedChain;
  autoConnect?: boolean;
}

/**
 * AppProviders composes all application-level providers in the correct order.
 *
 * Provider hierarchy:
 * 1. QueryProvider - React Query for server state management
 * 2. ChainProvider - active chain and adapter resolution
 * 3. WalletProvider - wallet connection state (depends on ChainProvider)
 *
 * Usage in layout.tsx:
 * ```tsx
 * <AppProviders chainConfig={config}>
 *   {children}
 * </AppProviders>
 * ```
 */
export function AppProviders({
  children,
  chainConfig,
  defaultChain,
  autoConnect = false,
}: AppProvidersProps) {
  return (
    <QueryProvider>
      <ChainProvider config={chainConfig} defaultChain={defaultChain}>
        <WalletProvider autoConnect={autoConnect}>
          {children}
        </WalletProvider>
      </ChainProvider>
    </QueryProvider>
  );
}
