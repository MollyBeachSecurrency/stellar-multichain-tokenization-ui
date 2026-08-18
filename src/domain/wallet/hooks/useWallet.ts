"use client";

import { useWalletContext } from "@/app/providers/WalletProvider";
import { WalletSession, SupportedChain } from "@/types";

export interface UseWalletReturn {
  /** Current wallet session */
  session: WalletSession | null;
  /** Whether the wallet is connected */
  isConnected: boolean;
  /** Whether a connection attempt is in progress */
  isConnecting: boolean;
  /** The connected address, or null */
  address: string | null;
  /** The active chain */
  chain: SupportedChain;
  /** Connect to the wallet */
  connect: () => Promise<void>;
  /** Disconnect the wallet */
  disconnect: () => Promise<void>;
}

/**
 * useWallet provides a chain-agnostic wallet interface to React components.
 *
 * Usage:
 * ```tsx
 * function WalletButton() {
 *   const { isConnected, address, connect, disconnect } = useWallet();
 *
 *   if (isConnected) {
 *     return <button onClick={disconnect}>{address}</button>;
 *   }
 *   return <button onClick={connect}>Connect Wallet</button>;
 * }
 * ```
 */
export function useWallet(): UseWalletReturn {
  const {
    session,
    isConnected,
    isConnecting,
    address,
    chain,
    connect,
    disconnect,
  } = useWalletContext();

  return {
    session,
    isConnected,
    isConnecting,
    address,
    chain,
    connect,
    disconnect,
  };
}
