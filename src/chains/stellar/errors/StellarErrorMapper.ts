import { ChainError, ChainErrorCategory } from "@/types";

/**
 * Maps raw Stellar SDK / Soroban RPC errors into normalized ChainError objects.
 *
 * This keeps Stellar-specific error semantics out of shared React components.
 */
export function mapStellarError(error: unknown): ChainError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Wallet / signing errors
    if (
      message.includes("user cancelled") ||
      message.includes("user rejected") ||
      message.includes("denied") ||
      message.includes("rejected by user")
    ) {
      return {
        category: "wallet",
        message: "Transaction was cancelled by the user",
        retryable: false,
        cause: error,
      };
    }

    if (
      message.includes("wallet not found") ||
      message.includes("not installed") ||
      message.includes("freighter")
    ) {
      return {
        category: "wallet",
        message: "Stellar wallet not found. Please install Freighter or a compatible wallet.",
        retryable: false,
        cause: error,
      };
    }

    if (
      message.includes("not connected") ||
      message.includes("no wallet")
    ) {
      return {
        category: "wallet",
        message: "Wallet is not connected",
        retryable: true,
        cause: error,
      };
    }

    // Simulation errors
    if (
      message.includes("simulation failed") ||
      message.includes("host invocation failed") ||
      message.includes("simulat")
    ) {
      return {
        category: "simulation",
        message: extractSimulationReason(error.message) ?? "Transaction simulation failed",
        retryable: false,
        cause: error,
      };
    }

    // Authorization errors
    if (
      message.includes("auth") ||
      message.includes("unauthorized") ||
      message.includes("not authorized") ||
      message.includes("missing authorization")
    ) {
      return {
        category: "authorization",
        message: "Authorization failed. You may not have permission for this action.",
        retryable: false,
        cause: error,
      };
    }

    // Network / RPC errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("fetch failed") ||
      message.includes("503") ||
      message.includes("502")
    ) {
      return {
        category: "network",
        message: "Network error. Please check your connection to the Stellar network.",
        retryable: true,
        cause: error,
      };
    }

    // Transaction confirmation timeout
    if (message.includes("confirmation timeout")) {
      return {
        category: "network",
        message: "Transaction submitted but confirmation timed out. It may still succeed.",
        retryable: true,
        cause: error,
      };
    }

    // Transaction failed on ledger
    if (
      message.includes("transaction failed") ||
      message.includes("tx_failed")
    ) {
      return {
        category: "contract",
        message: "Transaction failed on the Stellar network",
        retryable: false,
        cause: error,
      };
    }

    // Resource / budget errors
    if (
      message.includes("exceeded") ||
      message.includes("budget") ||
      message.includes("resource")
    ) {
      return {
        category: "contract",
        message: "Transaction exceeded resource limits",
        retryable: false,
        cause: error,
      };
    }

    // Account not found
    if (
      message.includes("account not found") ||
      message.includes("not found")
    ) {
      return {
        category: "contract",
        message: "Account not found on the Stellar network",
        retryable: false,
        cause: error,
      };
    }

    // Sequence number issues
    if (message.includes("sequence") || message.includes("tx_bad_seq")) {
      return {
        category: "contract",
        message: "Transaction sequence conflict. Please try again.",
        retryable: true,
        cause: error,
      };
    }

    // Fallback
    return {
      category: "contract",
      message: error.message,
      retryable: false,
      cause: error,
    };
  }

  return {
    category: "network",
    message: "An unknown Stellar error occurred",
    retryable: true,
    cause: error,
  };
}

/**
 * Extract a more specific reason from a simulation error message.
 */
function extractSimulationReason(message: string): string | null {
  // Look for contract error codes
  const contractErrorMatch = message.match(
    /error.*?(?:code|#)\s*(\d+)/i
  );
  if (contractErrorMatch) {
    return `Contract error code: ${contractErrorMatch[1]}`;
  }

  // Look for function-specific errors
  const fnMatch = message.match(/function '(\w+)' .+ failed/i);
  if (fnMatch) {
    return `Call to '${fnMatch[1]}' failed during simulation`;
  }

  return null;
}

/**
 * Map Stellar SDK error types to categories.
 */
export function categorizeStellarError(error: unknown): ChainErrorCategory {
  if (error instanceof Error) {
    const name = error.constructor.name;

    const categoryMap: Record<string, ChainErrorCategory> = {
      NetworkError: "network",
      NotFoundError: "contract",
      BadResponseError: "network",
      AccountRequiresMemoError: "contract",
    };

    return categoryMap[name] ?? "contract";
  }

  return "network";
}
