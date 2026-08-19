/**
 * Example 07: React Hook Usage
 *
 * Demonstrates how React components interact with Stellar through
 * the adapter architecture — no direct SDK imports in components.
 *
 * This is a reference implementation showing the patterns used in:
 *   src/components/tokens/TransferForm.tsx
 *   src/components/delegations/CreateDelegationForm.tsx
 *   src/components/tokens/TokenBalanceDisplay.tsx
 *
 * NOT meant to be run as a script — this is a component file example.
 */

import React, { useState, useEffect, useCallback } from "react";

// ─── Types (from src/types/index.ts) ─────────────────────────────────────────

type TransactionStatus =
  | "idle"
  | "preparing"
  | "simulating"
  | "awaiting_signature"
  | "submitting"
  | "pending"
  | "confirmed"
  | "success"
  | "error";

interface TransactionState {
  status: TransactionStatus;
  hash: string | null;
  error: { category: string; message: string; retryable: boolean } | null;
}

// ─── Example Hook: useTokenBalance ───────────────────────────────────────────

/**
 * Fetches token balance using the active chain's TokenAdapter.
 *
 * The hook doesn't know whether it's talking to Ethereum or Stellar.
 * The ChainProvider resolves the correct adapter.
 */
function useTokenBalance(address: string | null) {
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In the real app, this comes from ChainProvider context:
  // const { tokenAdapter } = useChainAdapters();

  useEffect(() => {
    if (!address) return;

    async function fetchBalance() {
      setLoading(true);
      setError(null);
      try {
        // This calls StellarTokenAdapter.getBalance() when chain = "stellar"
        // or EvmTokenAdapter.getBalance() when chain = "ethereum"
        // const bal = await tokenAdapter.getBalance(address!);
        // setBalance(bal);

        // Simulated for this example:
        setBalance(BigInt(50_000_000_000)); // 5000 tokens with 7 decimals
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [address]);

  return { balance, loading, error };
}

// ─── Example Hook: useTransfer ───────────────────────────────────────────────

/**
 * Manages the full transfer transaction lifecycle.
 *
 * Transaction status progresses through:
 *   idle → preparing → simulating → awaiting_signature → submitting → pending → confirmed → success
 *
 * This is particularly important for Stellar where the lifecycle is more explicit.
 */
function useTransfer() {
  const [txState, setTxState] = useState<TransactionState>({
    status: "idle",
    hash: null,
    error: null,
  });

  const transfer = useCallback(
    async (recipient: string, amount: bigint) => {
      try {
        // Step 1: Preparing
        setTxState({ status: "preparing", hash: null, error: null });

        // Step 2: The adapter handles simulation internally
        setTxState({ status: "simulating", hash: null, error: null });

        // Step 3: Wallet signature requested
        setTxState({ status: "awaiting_signature", hash: null, error: null });

        // Step 4: Submitting to network
        setTxState({ status: "submitting", hash: null, error: null });

        // In the real app:
        // const result = await tokenAdapter.transfer(recipient, amount);
        const result = { hash: "abc123...", status: "confirmed" as const };

        // Step 5: Confirmed
        setTxState({
          status: "confirmed",
          hash: result.hash,
          error: null,
        });

        // Step 6: Success (after indexer catches up)
        setTxState({
          status: "success",
          hash: result.hash,
          error: null,
        });

        return result;
      } catch (err: any) {
        setTxState({
          status: "error",
          hash: null,
          error: {
            category: err.category ?? "contract",
            message: err.message,
            retryable: err.retryable ?? false,
          },
        });
        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setTxState({ status: "idle", hash: null, error: null });
  }, []);

  return { txState, transfer, reset };
}

// ─── Example Component: TokenTransferForm ────────────────────────────────────

/**
 * A transfer form component that works with both Ethereum and Stellar.
 *
 * Key patterns:
 * - Uses domain hooks (useTransfer, useTokenBalance)
 * - Never imports blockchain SDKs
 * - Shows rich transaction status (not just a spinner)
 * - Handles errors by category
 */
export function TokenTransferForm() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { txState, transfer, reset } = useTransfer();

  // In real app: const { address } = useWallet();
  const address = "GABC...";
  const { balance } = useTokenBalance(address);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10_000_000));
    await transfer(recipient, amountBigInt);
  };

  return (
    <div>
      <h2>Transfer Tokens</h2>

      {/* Balance display */}
      <p>
        Available: {(Number(balance) / 10_000_000).toFixed(2)} tokens
      </p>

      {/* Transfer form */}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="recipient">Recipient Address</label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="G... (Stellar) or 0x... (Ethereum)"
            disabled={txState.status !== "idle"}
          />
        </div>

        <div>
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={txState.status !== "idle"}
          />
        </div>

        <button
          type="submit"
          disabled={txState.status !== "idle" || !recipient || !amount}
        >
          Transfer
        </button>
      </form>

      {/* Transaction Status Display */}
      <TransactionStatusDisplay state={txState} onReset={reset} />
    </div>
  );
}

// ─── Example Component: TransactionStatusDisplay ─────────────────────────────

/**
 * Shows the user exactly where their transaction is in the lifecycle.
 *
 * This is especially valuable for Stellar where transactions go through
 * explicit simulation and signing stages.
 */
function TransactionStatusDisplay({
  state,
  onReset,
}: {
  state: TransactionState;
  onReset: () => void;
}) {
  if (state.status === "idle") return null;

  const statusMessages: Record<TransactionStatus, string> = {
    idle: "",
    preparing: "Preparing transaction...",
    simulating: "Simulating transaction...",
    awaiting_signature: "Waiting for wallet approval...",
    submitting: "Submitting to network...",
    pending: "Transaction submitted, waiting for confirmation...",
    confirmed: "Transaction confirmed!",
    success: "Complete!",
    error: "Transaction failed",
  };

  return (
    <div role="status" aria-live="polite">
      <p>{statusMessages[state.status]}</p>

      {state.hash && (
        <p>
          Transaction hash: <code>{state.hash}</code>
        </p>
      )}

      {state.error && (
        <div role="alert">
          <p>Error: {state.error.message}</p>
          {state.error.retryable && (
            <button onClick={onReset}>Try Again</button>
          )}
        </div>
      )}

      {state.status === "success" && (
        <button onClick={onReset}>New Transfer</button>
      )}
    </div>
  );
}

// ─── Example: Permission-Aware Component ─────────────────────────────────────

/**
 * Shows how permissions drive the UI.
 * Buttons are disabled/hidden based on on-chain RBAC.
 */
export function PermissionAwareActions() {
  // In real app: const permissions = usePermissions(account);
  const permissions = {
    canMint: false,
    canBurn: false,
    canTransfer: true,
    canDelegate: true,
    canRevoke: true,
  };

  return (
    <div>
      <h3>Available Actions</h3>

      <button disabled={!permissions.canTransfer}>
        Transfer
      </button>

      <button disabled={!permissions.canMint}>
        Mint {!permissions.canMint && "(No permission)"}
      </button>

      <button disabled={!permissions.canBurn}>
        Burn {!permissions.canBurn && "(No permission)"}
      </button>

      <button disabled={!permissions.canDelegate}>
        Create Delegation
      </button>

      <button disabled={!permissions.canRevoke}>
        Revoke Delegation
      </button>
    </div>
  );
}

// ─── Example: Chain-Agnostic Wallet Connection ───────────────────────────────

/**
 * The wallet button doesn't know which chain is active.
 * It delegates to WalletAdapter.connect() which resolves to
 * StellarWalletAdapter or EvmWalletAdapter based on context.
 */
export function WalletConnectExample() {
  const [session, setSession] = useState<{
    chain: string;
    address: string;
    connected: boolean;
  } | null>(null);

  const handleConnect = async () => {
    // In real app:
    // const walletAdapter = useWalletAdapter(); // from ChainProvider
    // const session = await walletAdapter.connect();
    // setSession(session);

    // For Stellar, this triggers Freighter popup
    // For Ethereum, this triggers MetaMask popup
    console.log("Connecting wallet...");
  };

  return (
    <div>
      {session ? (
        <div>
          <p>Connected: {session.address.substring(0, 8)}...</p>
          <p>Chain: {session.chain}</p>
        </div>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
