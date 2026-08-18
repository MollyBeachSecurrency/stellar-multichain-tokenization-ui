import { QueuedRequest } from "@/types";
import { RequestQueue } from "./RequestQueue";

export type RequestHandler = (
  operation: string,
  payload: unknown
) => Promise<void>;

export interface RetryProcessorConfig {
  /** Base delay between retries in ms (exponential backoff) */
  baseDelay?: number;
  /** Maximum delay between retries in ms */
  maxDelay?: number;
  /** Whether to automatically listen for online events */
  autoRetryOnReconnect?: boolean;
}

/**
 * RetryProcessor replays queued requests when the browser comes back online.
 *
 * Flow:
 * 1. Browser goes offline -> requests fail -> queued in IndexedDB
 * 2. Browser comes online -> RetryProcessor activates
 * 3. Each queued request is replayed in FIFO order
 * 4. Successful requests are dequeued
 * 5. Failed requests have retryCount incremented
 * 6. Requests exceeding maxRetries are discarded
 *
 * Idempotency keys and transaction reconciliation prevent duplicate execution
 * for mutation operations.
 */
export class RetryProcessor {
  private queue: RequestQueue;
  private handler: RequestHandler;
  private config: Required<RetryProcessorConfig>;
  private isProcessing = false;
  private removeOnlineListener: (() => void) | null = null;

  constructor(
    queue: RequestQueue,
    handler: RequestHandler,
    config: RetryProcessorConfig = {}
  ) {
    this.queue = queue;
    this.handler = handler;
    this.config = {
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      autoRetryOnReconnect: config.autoRetryOnReconnect ?? true,
    };
  }

  /**
   * Start listening for online events.
   * When the browser reconnects, automatically processes the queue.
   */
  start(): void {
    if (
      this.config.autoRetryOnReconnect &&
      typeof window !== "undefined"
    ) {
      const onlineHandler = () => {
        this.processAll();
      };

      window.addEventListener("online", onlineHandler);

      this.removeOnlineListener = () => {
        window.removeEventListener("online", onlineHandler);
      };

      // If already online, process any stale queue items
      if (navigator.onLine) {
        this.processAll();
      }
    }
  }

  /**
   * Stop listening for online events.
   */
  stop(): void {
    if (this.removeOnlineListener) {
      this.removeOnlineListener();
      this.removeOnlineListener = null;
    }
  }

  /**
   * Process all pending requests in the queue.
   * Processes sequentially to maintain order and prevent overwhelming the server.
   */
  async processAll(): Promise<ProcessResult> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0, discarded: 0 };
    }

    this.isProcessing = true;

    const result: ProcessResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      discarded: 0,
    };

    try {
      const pending = await this.queue.getPending();

      for (const request of pending) {
        result.processed++;

        const success = await this.processOne(request);

        if (success) {
          result.succeeded++;
        } else {
          // Check if it was discarded (exceeded max retries)
          const updated = await this.queue.markRetried(request.id);
          if (updated === null) {
            result.discarded++;
          } else {
            result.failed++;
          }
        }

        // Brief pause between retries to avoid thundering herd
        await this.delay(this.getBackoffDelay(request.retryCount));
      }
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Process a single queued request.
   */
  private async processOne(request: QueuedRequest): Promise<boolean> {
    try {
      await this.handler(request.operation, request.payload);
      await this.queue.dequeue(request.id);
      return true;
    } catch (error) {
      // Request still failing — will be retried next cycle
      return false;
    }
  }

  /**
   * Calculate exponential backoff delay.
   */
  private getBackoffDelay(retryCount: number): number {
    const delay = this.config.baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, this.config.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  discarded: number;
}
