"use client";

import { useQuery } from "@tanstack/react-query";
import { useChain } from "@/app/providers/ChainProvider";
import { useWalletContext } from "@/app/providers/WalletProvider";

export interface UseTokenBalanceOptions {
  /** Address to query balance for. Defaults to connected wallet. */
  address?: string;
  /** Enable/disable the query */
  enabled?: boolean;
}

export interface UseTokenBalanceReturn {
  /** The token balance as a bigint */
  balance: bigint | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether there was an error */
  isError: boolean;
  /** Error object if present */
  error: Error | null;
  /** Refetch the balance */
  refetch: () => void;
}

/**
 * useTokenBalance queries the token balance for an address using the
 * active chain's TokenAdapter.
 *
 * Usage:
 * ```tsx
 * function BalanceDisplay() {
 *   const { balance, isLoading } = useTokenBalance();
 *   if (isLoading) return <span>Loading...</span>;
 *   return <span>{balance?.toString()}</span>;
 * }
 * ```
 */
export function useTokenBalance(
  options: UseTokenBalanceOptions = {}
): UseTokenBalanceReturn {
  const { adapters, activeChain } = useChain();
  const { address: walletAddress } = useWalletContext();

  const targetAddress = options.address ?? walletAddress;
  const enabled = (options.enabled ?? true) && !!targetAddress;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tokenBalance", activeChain, targetAddress],
    queryFn: async () => {
      if (!targetAddress) throw new Error("No address provided");
      return adapters.token.getBalance(targetAddress);
    },
    enabled,
    staleTime: 15_000, // Balance data can change per block
  });

  return {
    balance: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
