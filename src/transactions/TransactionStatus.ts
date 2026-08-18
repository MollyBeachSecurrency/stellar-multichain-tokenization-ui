import { TransactionStatus, SupportedChain } from "@/types";

/**
 * Valid transition map for the transaction state machine.
 * Each status maps to the set of statuses it can transition to.
 */
export const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  idle: ["preparing"],
  preparing: ["simulating", "awaiting_signature", "error"],
  simulating: ["awaiting_signature", "error"],
  awaiting_signature: ["submitting", "error"],
  submitting: ["pending", "error"],
  pending: ["confirmed", "error"],
  confirmed: ["indexing", "success"],
  indexing: ["success", "error"],
  success: ["idle"],
  error: ["idle", "preparing"],
};

/**
 * Check whether a transition from one status to another is valid.
 */
export function isValidTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get a user-facing label for a transaction status.
 */
export function getStatusLabel(status: TransactionStatus): string {
  const labels: Record<TransactionStatus, string> = {
    idle: "Ready",
    preparing: "Preparing transaction",
    simulating: "Simulating transaction",
    awaiting_signature: "Waiting for wallet approval",
    submitting: "Submitting transaction",
    pending: "Transaction submitted",
    confirmed: "Transaction confirmed",
    indexing: "Updating application data",
    success: "Complete",
    error: "Transaction failed",
  };
  return labels[status];
}

/**
 * Determine which statuses are relevant for a given chain.
 * For example, Stellar uses the "simulating" step while Ethereum typically skips it.
 */
export function getChainSteps(chain: SupportedChain): TransactionStatus[] {
  if (chain === "stellar") {
    return [
      "idle",
      "preparing",
      "simulating",
      "awaiting_signature",
      "submitting",
      "pending",
      "confirmed",
      "indexing",
      "success",
    ];
  }

  // Ethereum flow skips simulation as a distinct UI step
  return [
    "idle",
    "preparing",
    "awaiting_signature",
    "submitting",
    "pending",
    "confirmed",
    "indexing",
    "success",
  ];
}

/**
 * Check if a transaction status represents an active/in-progress state.
 */
export function isActiveStatus(status: TransactionStatus): boolean {
  return status !== "idle" && status !== "success" && status !== "error";
}

/**
 * Check if a transaction status represents a terminal state.
 */
export function isTerminalStatus(status: TransactionStatus): boolean {
  return status === "success" || status === "error";
}
