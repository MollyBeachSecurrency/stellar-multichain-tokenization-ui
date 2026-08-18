import { TransactionResult, SupportedChain } from "@/types";

/**
 * In-memory store for recent transaction results.
 * Useful for displaying transaction history within the current session.
 *
 * For persistent transaction history, use the GraphQL indexer.
 */

interface StoredTransaction extends TransactionResult {
  operation: string;
  createdAt: number;
}

const MAX_STORED_TRANSACTIONS = 50;

let transactions: StoredTransaction[] = [];
let listeners: Set<() => void> = new Set();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Add a completed transaction to the store.
 */
export function addTransaction(
  result: TransactionResult,
  operation: string
): void {
  const stored: StoredTransaction = {
    ...result,
    operation,
    createdAt: Date.now(),
  };

  transactions = [stored, ...transactions].slice(0, MAX_STORED_TRANSACTIONS);
  notify();
}

/**
 * Get all stored transactions, optionally filtered by chain.
 */
export function getTransactions(chain?: SupportedChain): StoredTransaction[] {
  if (chain) {
    return transactions.filter((tx) => tx.chain === chain);
  }
  return [...transactions];
}

/**
 * Get a specific transaction by hash.
 */
export function getTransaction(hash: string): StoredTransaction | undefined {
  return transactions.find((tx) => tx.hash === hash);
}

/**
 * Clear all stored transactions.
 */
export function clearTransactions(): void {
  transactions = [];
  notify();
}

/**
 * Subscribe to transaction store changes.
 * Returns an unsubscribe function.
 */
export function subscribeToTransactions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
