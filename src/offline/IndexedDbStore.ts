import { QueuedRequest } from "@/types";

const DB_NAME = "dtcc-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "requests";

/**
 * IndexedDbStore provides persistent storage for queued requests
 * using the browser's IndexedDB API.
 *
 * This survives page reloads, tab closures, and browser restarts,
 * allowing the application to retry failed requests when connectivity returns.
 */
export class IndexedDbStore {
  private db: IDBDatabase | null = null;

  /**
   * Open or create the IndexedDB database.
   */
  async open(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("operation", "operation", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("idempotencyKey", "idempotencyKey", { unique: true });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
    });
  }

  /**
   * Add a request to the queue.
   * Throws if a request with the same idempotency key already exists.
   */
  async add(request: QueuedRequest): Promise<void> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const addRequest = store.add(request);

      addRequest.onerror = () => reject(addRequest.error);
      addRequest.onsuccess = () => resolve();
    });
  }

  /**
   * Get all queued requests, ordered by creation time.
   */
  async getAll(): Promise<QueuedRequest[]> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("createdAt");
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get a specific request by ID.
   */
  async get(id: string): Promise<QueuedRequest | undefined> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? undefined);
    });
  }

  /**
   * Update a request (e.g., increment retryCount).
   */
  async update(request: QueuedRequest): Promise<void> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put(request);

      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    });
  }

  /**
   * Remove a request from the queue (after successful replay or max retries).
   */
  async remove(id: string): Promise<void> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all queued requests.
   */
  async clear(): Promise<void> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get the count of pending requests.
   */
  async count(): Promise<number> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Check if a request with the given idempotency key already exists.
   */
  async hasIdempotencyKey(key: string): Promise<boolean> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("idempotencyKey");
      const request = index.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(!!request.result);
    });
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private async ensureOpen(): Promise<void> {
    if (!this.db) {
      await this.open();
    }
  }
}
