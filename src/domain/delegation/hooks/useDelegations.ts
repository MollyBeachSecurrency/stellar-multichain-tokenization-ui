"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChain } from "@/app/providers/ChainProvider";
import { useWalletContext } from "@/app/providers/WalletProvider";
import { useTransaction } from "@/transactions";
import {
  Delegation,
  CreateDelegationRequest,
  TransactionResult,
  ChainError,
} from "@/types";
import { addTransaction } from "@/transactions/transactionStore";

export interface UseDelegationsReturn {
  /** List of delegations for the connected account */
  delegations: Delegation[];
  /** Whether the delegation list is loading */
  isLoading: boolean;
  /** Error from loading delegations */
  loadError: Error | null;
  /** Create a new delegation */
  createDelegation: (request: CreateDelegationRequest) => Promise<TransactionResult | undefined>;
  /** Revoke a delegation */
  revokeDelegation: (delegationId: string) => Promise<TransactionResult | undefined>;
  /** Batch revoke multiple delegations */
  batchRevoke: (delegationIds: string[]) => Promise<TransactionResult | undefined>;
  /** Current transaction status label */
  statusLabel: string;
  /** Whether a delegation operation is in progress */
  isActive: boolean;
  /** Last transaction error */
  txError: ChainError | null;
  /** Refetch delegations */
  refetch: () => void;
  /** Reset transaction state */
  reset: () => void;
}

/**
 * useDelegations provides a complete delegation management interface.
 *
 * Combines:
 * - Query: loads delegation list from the active chain's adapter
 * - Mutations: create, revoke, batch revoke with transaction tracking
 * - Automatic cache invalidation after successful mutations
 *
 * Usage:
 * ```tsx
 * function DelegationsPage() {
 *   const { delegations, isLoading, revokeDelegation, statusLabel } = useDelegations();
 *
 *   return (
 *     <ul>
 *       {delegations.map(d => (
 *         <li key={d.id}>
 *           {d.delegatee}
 *           <button onClick={() => revokeDelegation(d.id)}>Revoke</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useDelegations(): UseDelegationsReturn {
  const { adapters, activeChain } = useChain();
  const { address } = useWalletContext();
  const queryClient = useQueryClient();
  const { state, statusLabel, isActive, execute, reset } = useTransaction({
    chain: activeChain,
  });

  // Query delegations
  const {
    data: delegations = [],
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["delegations", activeChain, address],
    queryFn: async () => {
      if (!address) return [];
      return adapters.delegation.getDelegations(address);
    },
    enabled: !!address,
    staleTime: 30_000,
  });

  // Invalidate delegations cache after a mutation
  const invalidateDelegations = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["delegations", activeChain, address],
    });
  }, [queryClient, activeChain, address]);

  // Create delegation
  const createDelegation = useCallback(
    async (request: CreateDelegationRequest): Promise<TransactionResult | undefined> => {
      return execute(async (controls) => {
        if (activeChain === "stellar") {
          controls.simulate();
        }
        controls.awaitSignature();
        controls.submit();

        const result = await adapters.delegation.createDelegation(request);

        controls.confirm();
        addTransaction(result, "createDelegation");

        controls.indexing();
        // Wait for indexer then invalidate cache
        await new Promise((resolve) => setTimeout(resolve, 3000));
        invalidateDelegations();

        controls.success();
        return result;
      });
    },
    [adapters.delegation, activeChain, execute, invalidateDelegations]
  );

  // Revoke delegation
  const revokeDelegation = useCallback(
    async (delegationId: string): Promise<TransactionResult | undefined> => {
      return execute(async (controls) => {
        if (activeChain === "stellar") {
          controls.simulate();
        }
        controls.awaitSignature();
        controls.submit();

        const result = await adapters.delegation.revokeDelegation(delegationId);

        controls.confirm();
        addTransaction(result, "revokeDelegation");

        controls.indexing();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        invalidateDelegations();

        controls.success();
        return result;
      });
    },
    [adapters.delegation, activeChain, execute, invalidateDelegations]
  );

  // Batch revoke
  const batchRevoke = useCallback(
    async (delegationIds: string[]): Promise<TransactionResult | undefined> => {
      return execute(async (controls) => {
        if (activeChain === "stellar") {
          controls.simulate();
        }
        controls.awaitSignature();
        controls.submit();

        const result = await adapters.delegation.batchRevoke(delegationIds);

        controls.confirm();
        addTransaction(result, "batchRevoke");

        controls.indexing();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        invalidateDelegations();

        controls.success();
        return result;
      });
    },
    [adapters.delegation, activeChain, execute, invalidateDelegations]
  );

  return {
    delegations,
    isLoading,
    loadError: loadError as Error | null,
    createDelegation,
    revokeDelegation,
    batchRevoke,
    statusLabel,
    isActive,
    txError: state.error,
    refetch,
    reset,
  };
}
