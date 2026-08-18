"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { SupportedChain } from "@/types";
import { TokenAdapter } from "@/domain/token/TokenAdapter";
import { DelegationAdapter } from "@/domain/delegation/DelegationAdapter";
import { PermissionAdapter } from "@/domain/permissions/PermissionAdapter";
import { WalletAdapter } from "@/domain/wallet/WalletAdapter";

// ─── Adapter Registry ────────────────────────────────────────────────────────

export interface AdapterRegistry {
  wallet: WalletAdapter;
  token: TokenAdapter;
  delegation: DelegationAdapter;
  permissions: PermissionAdapter;
}

export interface ChainConfig {
  ethereum?: AdapterRegistry;
  stellar?: AdapterRegistry;
}

// ─── Context Types ───────────────────────────────────────────────────────────

interface ChainContextValue {
  /** The currently active chain */
  activeChain: SupportedChain;
  /** Switch to a different chain */
  setActiveChain: (chain: SupportedChain) => void;
  /** Get the adapter registry for the active chain */
  adapters: AdapterRegistry;
  /** Get adapters for a specific chain (useful for cross-chain operations) */
  getAdapters: (chain: SupportedChain) => AdapterRegistry;
  /** List of all configured chains */
  availableChains: SupportedChain[];
}

const ChainContext = createContext<ChainContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface ChainProviderProps {
  children: React.ReactNode;
  config: ChainConfig;
  defaultChain?: SupportedChain;
}

/**
 * ChainProvider is the centralized network context.
 *
 * It resolves the active chain's adapters and exposes them to the component tree.
 * Components never need to check which chain is active — they just call
 * the domain adapters provided by this context.
 */
export function ChainProvider({
  children,
  config,
  defaultChain,
}: ChainProviderProps) {
  const availableChains = useMemo(() => {
    const chains: SupportedChain[] = [];
    if (config.ethereum) chains.push("ethereum");
    if (config.stellar) chains.push("stellar");
    return chains;
  }, [config]);

  const initialChain =
    defaultChain ??
    (process.env.NEXT_PUBLIC_DEFAULT_CHAIN as SupportedChain) ??
    availableChains[0] ??
    "ethereum";

  const [activeChain, setActiveChain] = useState<SupportedChain>(initialChain);

  const getAdapters = useCallback(
    (chain: SupportedChain): AdapterRegistry => {
      const registry = config[chain];
      if (!registry) {
        throw new Error(`No adapters configured for chain: ${chain}`);
      }
      return registry;
    },
    [config]
  );

  const adapters = useMemo(() => getAdapters(activeChain), [activeChain, getAdapters]);

  const value: ChainContextValue = useMemo(
    () => ({
      activeChain,
      setActiveChain,
      adapters,
      getAdapters,
      availableChains,
    }),
    [activeChain, adapters, getAdapters, availableChains]
  );

  return (
    <ChainContext.Provider value={value}>{children}</ChainContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useChain provides access to the active chain and its adapter registry.
 */
export function useChain(): ChainContextValue {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error("useChain must be used within a ChainProvider");
  }
  return context;
}
