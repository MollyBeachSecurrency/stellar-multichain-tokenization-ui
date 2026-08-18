import {
  TransactionStatus,
  TransactionState,
  ChainError,
  SupportedChain,
} from "@/types";
import { isValidTransition } from "./TransactionStatus";

export type TransactionListener = (state: TransactionState) => void;

/**
 * TransactionManager is a lightweight state machine that manages
 * a single blockchain transaction through its full lifecycle.
 *
 * It validates transitions, emits state changes to listeners,
 * and provides a consistent interface regardless of chain.
 */
export class TransactionManager {
  private state: TransactionState;
  private listeners: Set<TransactionListener> = new Set();

  constructor(chain: SupportedChain | null = null) {
    this.state = {
      status: "idle",
      hash: null,
      error: null,
      chain,
    };
  }

  /**
   * Get the current transaction state.
   */
  getState(): TransactionState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: TransactionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Transition to a new status.
   * Throws if the transition is invalid.
   */
  transition(to: TransactionStatus): void {
    if (!isValidTransition(this.state.status, to)) {
      throw new Error(
        `Invalid transaction transition: ${this.state.status} -> ${to}`
      );
    }

    this.state = { ...this.state, status: to };

    // Clear error when leaving error state
    if (to !== "error") {
      this.state.error = null;
    }

    this.notify();
  }

  /**
   * Set the transaction hash (typically after submission).
   */
  setHash(hash: string): void {
    this.state = { ...this.state, hash };
    this.notify();
  }

  /**
   * Set the active chain for this transaction.
   */
  setChain(chain: SupportedChain): void {
    this.state = { ...this.state, chain };
    this.notify();
  }

  /**
   * Transition to error state with a normalized ChainError.
   */
  fail(error: ChainError): void {
    if (!isValidTransition(this.state.status, "error")) {
      throw new Error(
        `Cannot transition to error from: ${this.state.status}`
      );
    }

    this.state = { ...this.state, status: "error", error };
    this.notify();
  }

  /**
   * Reset the transaction manager to idle state.
   */
  reset(): void {
    this.state = {
      status: "idle",
      hash: null,
      error: null,
      chain: this.state.chain,
    };
    this.notify();
  }

  /**
   * Execute a full transaction lifecycle with the provided executor.
   * The executor receives callbacks to advance the state machine.
   */
  async execute<T>(
    executor: (controls: TransactionControls) => Promise<T>
  ): Promise<T> {
    this.transition("preparing");

    const controls: TransactionControls = {
      simulate: () => this.transition("simulating"),
      awaitSignature: () => this.transition("awaiting_signature"),
      submit: (hash?: string) => {
        this.transition("submitting");
        if (hash) this.setHash(hash);
      },
      pending: (hash?: string) => {
        this.transition("pending");
        if (hash) this.setHash(hash);
      },
      confirm: () => this.transition("confirmed"),
      indexing: () => this.transition("indexing"),
      success: () => this.transition("success"),
    };

    try {
      const result = await executor(controls);
      return result;
    } catch (err) {
      const chainError: ChainError =
        err instanceof Error && "category" in err
          ? (err as unknown as ChainError)
          : {
              category: "network",
              message: err instanceof Error ? err.message : "Unknown error",
              retryable: true,
              cause: err,
            };

      this.fail(chainError);
      throw err;
    }
  }

  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

/**
 * Controls exposed to transaction executors to advance the state machine.
 */
export interface TransactionControls {
  simulate: () => void;
  awaitSignature: () => void;
  submit: (hash?: string) => void;
  pending: (hash?: string) => void;
  confirm: () => void;
  indexing: () => void;
  success: () => void;
}
