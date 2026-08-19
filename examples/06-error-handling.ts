/**
 * Example 06: Error Handling & Normalization
 *
 * Demonstrates:
 * - How raw Stellar SDK errors are mapped to normalized ChainError
 * - Different error categories (wallet, simulation, network, etc.)
 * - Retryable vs non-retryable errors
 * - How the UI consumes normalized errors
 *
 * The principle: React components should never see raw Stellar SDK errors.
 * They work with ChainError, which has a consistent shape across all chains.
 *
 * Run: npx tsx examples/06-error-handling.ts
 */

// ─── The ChainError type (from src/types/index.ts) ───────────────────────────

type ChainErrorCategory =
  | "wallet"
  | "simulation"
  | "authorization"
  | "network"
  | "contract"
  | "indexer";

interface ChainError {
  category: ChainErrorCategory;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

// ─── The error mapper (simplified from src/chains/stellar/errors/) ───────────

function mapStellarError(error: unknown): ChainError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Wallet errors
    if (message.includes("user cancelled") || message.includes("user rejected")) {
      return {
        category: "wallet",
        message: "Transaction was cancelled by the user",
        retryable: false,
        cause: error,
      };
    }

    if (message.includes("wallet not found") || message.includes("freighter")) {
      return {
        category: "wallet",
        message: "Stellar wallet not found. Please install Freighter.",
        retryable: false,
        cause: error,
      };
    }

    // Simulation errors
    if (message.includes("simulation failed") || message.includes("host invocation failed")) {
      return {
        category: "simulation",
        message: "Transaction simulation failed",
        retryable: false,
        cause: error,
      };
    }

    // Auth errors
    if (message.includes("unauthorized") || message.includes("not authorized")) {
      return {
        category: "authorization",
        message: "Authorization failed. You may not have permission for this action.",
        retryable: false,
        cause: error,
      };
    }

    // Network errors
    if (message.includes("timeout") || message.includes("fetch failed") || message.includes("503")) {
      return {
        category: "network",
        message: "Network error. Please check your connection.",
        retryable: true,
        cause: error,
      };
    }

    // Sequence errors (retryable)
    if (message.includes("tx_bad_seq")) {
      return {
        category: "contract",
        message: "Transaction sequence conflict. Please try again.",
        retryable: true,
        cause: error,
      };
    }

    // Default
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

// ─── Demo: Various error scenarios ───────────────────────────────────────────

function main() {
  console.log("=== Stellar Error Handling & Normalization ===\n");

  // Simulate various raw errors and show how they map
  const scenarios = [
    {
      name: "User rejects wallet signature",
      error: new Error("User cancelled the transaction signing"),
    },
    {
      name: "Wallet not installed",
      error: new Error("Freighter wallet not found in browser extensions"),
    },
    {
      name: "Contract simulation fails",
      error: new Error("Simulation failed: host invocation failed - error code #4"),
    },
    {
      name: "Insufficient authorization",
      error: new Error("Not authorized to call this function"),
    },
    {
      name: "RPC network timeout",
      error: new Error("Fetch failed: network timeout after 30000ms"),
    },
    {
      name: "Sequence number conflict",
      error: new Error("Transaction failed: tx_bad_seq"),
    },
    {
      name: "Unknown error type",
      error: "something went wrong", // Not an Error instance
    },
  ];

  for (const scenario of scenarios) {
    const chainError = mapStellarError(scenario.error);
    console.log(`Scenario: ${scenario.name}`);
    console.log(`  Raw:       ${scenario.error instanceof Error ? scenario.error.message : String(scenario.error)}`);
    console.log(`  Category:  ${chainError.category}`);
    console.log(`  Message:   ${chainError.message}`);
    console.log(`  Retryable: ${chainError.retryable}`);
    console.log();
  }

  // ─── How the UI uses normalized errors ─────────────────────────────────────

  console.log("=== UI Error Consumption Pattern ===\n");
  console.log(`
  In a React component:

    try {
      const result = await adapter.transfer(recipient, amount);
    } catch (error) {
      // 'error' is already a ChainError (the adapter maps it)
      const chainError = error as ChainError;
      
      if (chainError.retryable) {
        // Show retry button
        showRetryableError(chainError.message);
      } else if (chainError.category === "wallet") {
        // Prompt wallet action
        showWalletPrompt(chainError.message);
      } else {
        // Show final error
        showError(chainError.message);
      }
    }
  `);

  console.log("Key benefits of this approach:");
  console.log("  1. UI code never imports @stellar/stellar-sdk");
  console.log("  2. Same error shape for Ethereum and Stellar");
  console.log("  3. Retryable flag drives automatic retry logic");
  console.log("  4. Category drives UI presentation (icons, colors, actions)");
  console.log("  5. Original cause preserved for debugging");
}

main();
