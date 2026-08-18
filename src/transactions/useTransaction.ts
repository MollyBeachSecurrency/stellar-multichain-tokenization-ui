"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { TransactionState, SupportedChain, ChainError } from "@/types";
import { TransactionManager, TransactionControls } from "./TransactionManager";
import { getStatusLabel, isActiveStatus, isTerminalStatus } from "./TransactionStatus";

export interface UseTransactionOptions {
  chain?: SupportedChain;
  onSuccess?: (hash: string | null) => void;
  onError?: (error: ChainError) => void;
}

export interface UseTransactionReturn {
  /** Current transaction state */
  state: TransactionState;
  /** User-facing label for the current status */
  statusLabel: string;
  /** Whether the transaction is actively in progress */
  isActive: boolean;
  /** Whether the transaction is in a terminal state (success or error) */
  isTerminal: boolean;
  /** Execute a transaction through the full lifecycle */
  execute: <T>(executor: (controls: TransactionControls) => Promise<T>) => Promise<T | undefined>;
  /** Reset the transaction state to idle */
  reset: () => void;
}

/**
 * useTransaction provides React components with a managed transaction lifecycle.
 *
 * Usage:
 * ```tsx
 * const { state, statusLabel, execute, reset } = useTransaction({ chain: "stellar" });
 *
 * const handleTransfer = async () => {
 *   await execute(async (controls) => {
 *     controls.simulate();
 *     // ... simulate the transaction
 *     controls.awaitSignature();
 *     // ... get user signature
 *     controls.submit(txHash);
 *     // ... submit to network
 *     controls.pending();
 *     // ... poll for confirmation
 *     controls.confirm();
 *     controls.indexing();
 *     // ... wait for indexer
 *     controls.success();
 *   });
 * };
 * ```
 */
export function useTransaction(
  options: UseTransactionOptions = {}
): UseTransactionReturn {
  const { chain, onSuccess, onError } = options;

  const managerRef = useRef<TransactionManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new TransactionManager(chain ?? null);
  }

  const manager = managerRef.current;

  // Use useSyncExternalStore for tear-free reads
  const state = useSyncExternalStore(
    useCallback((callback) => manager.subscribe(callback), [manager]),
    () => manager.getState(),
    () => manager.getState()
  );

  const execute = useCallback(
    async <T>(
      executor: (controls: TransactionControls) => Promise<T>
    ): Promise<T | undefined> => {
      try {
        const result = await manager.execute(executor);
        if (onSuccess) {
          onSuccess(manager.getState().hash);
        }
        return result;
      } catch (err) {
        if (onError && manager.getState().error) {
          onError(manager.getState().error!);
        }
        return undefined;
      }
    },
    [manager, onSuccess, onError]
  );

  const reset = useCallback(() => {
    manager.reset();
  }, [manager]);

  return {
    state,
    statusLabel: getStatusLabel(state.status),
    isActive: isActiveStatus(state.status),
    isTerminal: isTerminalStatus(state.status),
    execute,
    reset,
  };
}
