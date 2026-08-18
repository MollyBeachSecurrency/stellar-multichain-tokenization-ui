"use client";

import { useCallback, useState } from "react";
import { useChain } from "@/app/providers/ChainProvider";
import { useTransaction } from "@/transactions";
import { TransactionResult, ChainError } from "@/types";
import { addTransaction } from "@/transactions/transactionStore";

export interface UseTransferReturn {
  /** Execute a token transfer */
  transfer: (recipient: string, amount: bigint) => Promise<TransactionResult | undefined>;
  /** Current transaction status label */
  statusLabel: string;
  /** Whether the transfer is in progress */
  isActive: boolean;
  /** Last error, if any */
  error: ChainError | null;
  /** Reset the transfer state */
  reset: () => void;
}

/**
 * useTransfer provides a chain-agnostic token transfer operation
 * with integrated transaction state management.
 *
 * Usage:
 * ```tsx
 * function TransferForm() {
 *   const { transfer, statusLabel, isActive } = useTransfer();
 *
 *   const handleSubmit = async () => {
 *     await transfer(recipient, amount);
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleSubmit} disabled={isActive}>Transfer</button>
 *       {isActive && <p>{statusLabel}</p>}
 *     </>
 *   );
 * }
 * ```
 */
export function useTransfer(): UseTransferReturn {
  const { adapters, activeChain } = useChain();
  const { state, statusLabel, isActive, execute, reset } = useTransaction({
    chain: activeChain,
  });

  const transfer = useCallback(
    async (
      recipient: string,
      amount: bigint
    ): Promise<TransactionResult | undefined> => {
      const result = await execute(async (controls) => {
        // For Stellar, simulation is an explicit step
        if (activeChain === "stellar") {
          controls.simulate();
        }

        controls.awaitSignature();

        // The adapter handles the full flow internally,
        // but we track state transitions for UI feedback
        controls.submit();

        const txResult = await adapters.token.transfer(recipient, amount);

        controls.confirm();

        // Store in recent transactions
        addTransaction(txResult, "transfer");

        controls.indexing();

        // Brief delay to account for indexer lag
        await new Promise((resolve) => setTimeout(resolve, 2000));

        controls.success();

        return txResult;
      });

      return result;
    },
    [adapters.token, activeChain, execute]
  );

  return {
    transfer,
    statusLabel,
    isActive,
    error: state.error,
    reset,
  };
}
