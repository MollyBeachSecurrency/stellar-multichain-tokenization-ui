import { ChainError, ChainErrorCategory } from "@/types";

/**
 * Create a ChainError from an unknown caught value.
 */
export function toChainError(
  error: unknown,
  defaultCategory: ChainErrorCategory = "network"
): ChainError {
  if (isChainError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      category: defaultCategory,
      message: error.message,
      retryable: defaultCategory === "network",
      cause: error,
    };
  }

  return {
    category: defaultCategory,
    message: String(error),
    retryable: false,
    cause: error,
  };
}

/**
 * Type guard for ChainError.
 */
export function isChainError(error: unknown): error is ChainError {
  return (
    typeof error === "object" &&
    error !== null &&
    "category" in error &&
    "message" in error &&
    "retryable" in error
  );
}

/**
 * Get a user-friendly error message from a ChainError.
 */
export function getUserMessage(error: ChainError): string {
  switch (error.category) {
    case "wallet":
      return error.message;
    case "simulation":
      return `Simulation failed: ${error.message}`;
    case "authorization":
      return `Permission denied: ${error.message}`;
    case "network":
      return error.retryable
        ? "Network issue. Please try again."
        : error.message;
    case "contract":
      return `Contract error: ${error.message}`;
    case "indexer":
      return "Data temporarily unavailable. Please refresh.";
    default:
      return error.message;
  }
}
