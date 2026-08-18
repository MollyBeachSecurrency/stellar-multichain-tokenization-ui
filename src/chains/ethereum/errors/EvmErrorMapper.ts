import { ChainError, ChainErrorCategory } from "@/types";

/**
 * Maps raw EVM/Wagmi/viem errors into normalized ChainError objects.
 *
 * This keeps EVM-specific error semantics out of shared React components.
 */
export function mapEvmError(error: unknown): ChainError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Wallet errors
    if (
      message.includes("user rejected") ||
      message.includes("user denied") ||
      message.includes("rejected the request")
    ) {
      return {
        category: "wallet",
        message: "Transaction was rejected by the user",
        retryable: false,
        cause: error,
      };
    }

    if (
      message.includes("not connected") ||
      message.includes("disconnected") ||
      message.includes("no provider")
    ) {
      return {
        category: "wallet",
        message: "Wallet is not connected",
        retryable: true,
        cause: error,
      };
    }

    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("fetch failed")
    ) {
      return {
        category: "network",
        message: "Network error. Please check your connection.",
        retryable: true,
        cause: error,
      };
    }

    // Nonce / replacement errors
    if (
      message.includes("nonce") ||
      message.includes("replacement transaction underpriced")
    ) {
      return {
        category: "contract",
        message: "Transaction conflict. Please try again.",
        retryable: true,
        cause: error,
      };
    }

    // Gas estimation errors (often indicate contract revert)
    if (
      message.includes("gas") ||
      message.includes("out of gas") ||
      message.includes("intrinsic gas too low")
    ) {
      return {
        category: "contract",
        message: "Transaction would fail. Check inputs and permissions.",
        retryable: false,
        cause: error,
      };
    }

    // Contract revert
    if (
      message.includes("revert") ||
      message.includes("execution reverted")
    ) {
      return {
        category: "contract",
        message: extractRevertReason(message) ?? "Contract execution failed",
        retryable: false,
        cause: error,
      };
    }

    // Authorization / access control
    if (
      message.includes("access") ||
      message.includes("unauthorized") ||
      message.includes("ownable") ||
      message.includes("not owner") ||
      message.includes("missing role")
    ) {
      return {
        category: "authorization",
        message: "You do not have permission to perform this action",
        retryable: false,
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
    message: "An unknown error occurred",
    retryable: true,
    cause: error,
  };
}

/**
 * Extract revert reason from an error message if present.
 */
function extractRevertReason(message: string): string | null {
  const match = message.match(/reason:\s*"?([^"]+)"?/i);
  if (match) return match[1];

  const revertMatch = message.match(/reverted with reason string '([^']+)'/);
  if (revertMatch) return revertMatch[1];

  return null;
}

/**
 * Determine error category from a Wagmi/viem error name or code.
 */
export function categorizeEvmErrorByName(name: string): ChainErrorCategory {
  const categoryMap: Record<string, ChainErrorCategory> = {
    UserRejectedRequestError: "wallet",
    ConnectorNotFoundError: "wallet",
    ChainMismatchError: "wallet",
    SwitchChainError: "wallet",
    ContractFunctionExecutionError: "contract",
    ContractFunctionRevertedError: "contract",
    EstimateGasExecutionError: "contract",
    TransactionExecutionError: "contract",
    HttpRequestError: "network",
    TimeoutError: "network",
    WebSocketRequestError: "network",
  };

  return categoryMap[name] ?? "contract";
}
