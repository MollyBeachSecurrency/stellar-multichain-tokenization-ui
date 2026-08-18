"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { WalletSession, SupportedChain } from "@/types";
import { useChain } from "./ChainProvider";

// ─── Context Types ───────────────────────────────────────────────────────────

interface WalletContextValue {
  /** Current wallet session, or null if disconnected */
  session: WalletSession | null;
  /** Whether the wallet is currently connected */
  isConnected: boolean;
  /** Whether a connection attempt is in progress */
  isConnecting: boolean;
  /** Connect to the wallet for the active chain */
  connect: () => Promise<void>;
  /** Disconnect the active wallet */
  disconnect: () => Promise<void>;
  /** The connected address, or null */
  address: string | null;
  /** The active chain */
  chain: SupportedChain;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface WalletProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

/**
 * WalletProvider manages wallet connection state using the active chain's WalletAdapter.
 *
 * It provides a unified wallet interface regardless of whether the user
 * is connected to MetaMask (EVM) or Freighter (Stellar).
 */
export function WalletProvider({
  children,
  autoConnect = false,
}: WalletProviderProps) {
  const { activeChain, adapters } = useChain();
  const [session, setSession] = useState<WalletSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check existing session on mount or chain change
  useEffect(() => {
    const existingSession = adapters.wallet.getSession();
    setSession(existingSession);

    if (!existingSession && autoConnect) {
      adapters.wallet
        .connect()
        .then(setSession)
        .catch(() => {
          // Silent failure for auto-connect
        });
    }
  }, [adapters.wallet, autoConnect]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const newSession = await adapters.wallet.connect();
      setSession(newSession);
    } finally {
      setIsConnecting(false);
    }
  }, [adapters.wallet]);

  const disconnect = useCallback(async () => {
    await adapters.wallet.disconnect();
    setSession(null);
  }, [adapters.wallet]);

  const value: WalletContextValue = useMemo(
    () => ({
      session,
      isConnected: session?.connected ?? false,
      isConnecting,
      connect,
      disconnect,
      address: session?.address ?? null,
      chain: activeChain,
    }),
    [session, isConnecting, connect, disconnect, activeChain]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useWalletContext provides access to the current wallet session and connection methods.
 */
export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
