import { SupportedChain } from "@/types";

/**
 * SyncStatus tracks whether the indexed data has caught up with
 * a confirmed blockchain transaction.
 *
 * This is the core mechanism for handling eventual consistency:
 * - Transaction confirms on-chain (confirmed)
 * - Contract emits event
 * - Substreams processes event
 * - GraphQL updates
 * - UI reflects synchronized state
 *
 * The gap between "confirmed" and "indexed" is the eventual consistency window.
 */
export interface SyncState {
  /** Whether the indexer has caught up */
  isSynced: boolean;
  /** Timestamp of the last known sync */
  lastSyncedAt: number | null;
  /** The block number the indexer has processed up to */
  lastSyncedBlock: number | null;
  /** Whether we are actively polling for sync */
  isPolling: boolean;
}

export class SyncStatus {
  private state: SyncState = {
    isSynced: true,
    lastSyncedAt: null,
    lastSyncedBlock: null,
    isPolling: false,
  };

  private listeners: Set<(state: SyncState) => void> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;

  /**
   * Mark that a transaction has confirmed but indexer may not have caught up yet.
   * Start polling until the expected block is indexed.
   */
  startWaitingForSync(
    expectedBlock: number,
    pollFn: () => Promise<number | null>,
    intervalMs: number = 3000,
    timeoutMs: number = 60000
  ): void {
    this.state = { ...this.state, isSynced: false, isPolling: true };
    this.notify();

    const startTime = Date.now();

    this.pollInterval = setInterval(async () => {
      try {
        const latestBlock = await pollFn();

        if (latestBlock !== null && latestBlock >= expectedBlock) {
          this.markSynced(latestBlock);
          return;
        }

        // Timeout check
        if (Date.now() - startTime > timeoutMs) {
          this.stopPolling();
          // Consider synced after timeout — data may still lag but we move on
          this.state = { ...this.state, isSynced: true, isPolling: false };
          this.notify();
        }
      } catch {
        // Continue polling on failure
      }
    }, intervalMs);
  }

  /**
   * Mark the indexer as synced.
   */
  markSynced(block?: number): void {
    this.stopPolling();
    this.state = {
      isSynced: true,
      lastSyncedAt: Date.now(),
      lastSyncedBlock: block ?? this.state.lastSyncedBlock,
      isPolling: false,
    };
    this.notify();
  }

  /**
   * Get current sync state.
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Subscribe to sync state changes.
   */
  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clean up polling intervals.
   */
  destroy(): void {
    this.stopPolling();
    this.listeners.clear();
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
