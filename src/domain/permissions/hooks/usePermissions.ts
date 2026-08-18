"use client";

import { useQuery } from "@tanstack/react-query";
import { useChain } from "@/app/providers/ChainProvider";
import { useWalletContext } from "@/app/providers/WalletProvider";
import { Permissions } from "@/types";

export interface UsePermissionsOptions {
  /** Address to query permissions for. Defaults to connected wallet. */
  address?: string;
  /** Enable/disable the query */
  enabled?: boolean;
}

export interface UsePermissionsReturn {
  /** Resolved permissions for the account */
  permissions: Permissions | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether there was an error */
  isError: boolean;
  /** Error object if present */
  error: Error | null;
  /** Convenience: can the user mint? */
  canMint: boolean;
  /** Convenience: can the user burn? */
  canBurn: boolean;
  /** Convenience: can the user transfer? */
  canTransfer: boolean;
  /** Convenience: can the user delegate? */
  canDelegate: boolean;
  /** Convenience: can the user revoke delegations? */
  canRevoke: boolean;
  /** Refetch permissions */
  refetch: () => void;
}

/**
 * usePermissions queries the active chain's permission adapter to determine
 * what actions the current user can perform.
 *
 * Frontend permission checks improve UX (hide/disable buttons) but never
 * replace contract-level enforcement.
 *
 * Usage:
 * ```tsx
 * function MintButton() {
 *   const { canMint } = usePermissions();
 *   return (
 *     <button disabled={!canMint}>Mint Tokens</button>
 *   );
 * }
 * ```
 */
export function usePermissions(
  options: UsePermissionsOptions = {}
): UsePermissionsReturn {
  const { adapters, activeChain } = useChain();
  const { address: walletAddress } = useWalletContext();

  const targetAddress = options.address ?? walletAddress;
  const enabled = (options.enabled ?? true) && !!targetAddress;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["permissions", activeChain, targetAddress],
    queryFn: async () => {
      if (!targetAddress) throw new Error("No address provided");
      return adapters.permissions.getPermissions(targetAddress);
    },
    enabled,
    staleTime: 60_000, // Permissions change infrequently
  });

  return {
    permissions: data,
    isLoading,
    isError,
    error: error as Error | null,
    canMint: data?.canMint ?? false,
    canBurn: data?.canBurn ?? false,
    canTransfer: data?.canTransfer ?? false,
    canDelegate: data?.canDelegate ?? false,
    canRevoke: data?.canRevoke ?? false,
    refetch,
  };
}
