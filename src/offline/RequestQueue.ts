import { QueuedRequest } from "@/types";
import { IndexedDbStore } from "./IndexedDbStore";

/**
 * RequestQueue manages the lifecycle of retryable failed requests.
 *
 * When a network request fails due to a transient error:
 * 1. Classify the error (only transient failures are queued)
 * 2. Persist the request in IndexedDB
 * 3. When connectivity returns, retry via RetryProcessor
 *
 * IMPORTANT:
 * - Only transient network failures should be queued (timeout, offline, 5xx)
 * - Application errors (400, 401, 403, contract reverts) should NOT be queued
 * - Mutation operations must use idempotency keys to prevent duplicates
 */
export class RequestQueue {
  private store: IndexedDbStore;
  private listeners: Set<(count: number) => void> = new Set();

  constructor(store?: IndexedDbStore) {
    this.store = store ?? new IndexedDbStore();
  }

  /**
   * Initialize the queue (opens IndexedDB).
   */
  async initialize(): Promise<void> {
    await this.store.open();
  }

  /**
   * Enqueue a failed request for later retry.
   * Returns true if enqueued, false if duplicate (same idempotency key).
   */
  async enqueue(
    operation: string,
    payload: unknown,
    idempotencyKey: string,
    maxRetries: number = 5
  ): Promise<boolean> {
    // Prevent duplicate enqueue
    const exists = await this.store.hasIdempotencyKey(idempotencyKey);
    if (exists) return false;

    const request: QueuedRequest = {
      id: generateId(),
      operation,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries,
      idempotencyKey,
    };

    await this.store.add(request);
    await this.notifyListeners();
    return true;
  }

  /**
   * Get all pending requests.
   */
  async getPending(): Promise<QueuedRequest[]> {
    return this.store.getAll();
  }

  /**
   * Get the count of pending requests.
   */
  async getCount(): Promise<number> {
    return this.store.count();
  }

  /**
   * Mark a request as retried (increment retry count).
   * Removes the request if it exceeds maxRetries.
   */
  async markRetried(id: string): Promise<QueuedRequest | null> {
    const request = await this.store.get(id);
    if (!request) return null;

    request.retryCount += 1;

    if (request.retryCount >= request.maxRetries) {
      await this.store.remove(id);
      await this.notifyListeners();
      return null; // Exceeded max retries
    }

    await this.store.update(request);
    return request;
  }

  /**
   * Remove a request from the queue (after successful replay).
   */
  async dequeue(id: string): Promise<void> {
    await this.store.remove(id);
    await this.notifyListeners();
  }

  /**
   * Clear all pending requests.
   */
  async clear(): Promise<void> {
    await this.store.clear();
    await this.notifyListeners();
  }

  /**
   * Subscribe to queue count changes.
   */
  onCountChange(listener: (count: number) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners(): Promise<void> {
    const count = await this.store.count();
    this.listeners.forEach((listener) => listener(count));
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Determine if an error is transient (retryable) vs. permanent.
 *
 * Only transient errors should result in queuing.
 * Application-level errors (bad request, auth, contract revert) should not.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network-level failures
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("fetch failed") ||
      message.includes("offline") ||
      message.includes("aborted")
    ) {
      return true;
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return true;
    }

    return false;
  }

  return false;
}
