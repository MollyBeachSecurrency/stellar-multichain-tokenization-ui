import { describe, it, expect } from "vitest";
import {
  mapStellarError,
  categorizeStellarError,
} from "../errors/StellarErrorMapper";

describe("mapStellarError", () => {
  // ─── Wallet Errors ────────────────────────────────────────────────────────

  describe("wallet errors", () => {
    it("maps user cancellation", () => {
      const error = new Error("User cancelled the transaction");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("wallet");
      expect(mapped.retryable).toBe(false);
      expect(mapped.message).toContain("cancelled");
    });

    it("maps user rejection", () => {
      const error = new Error("Transaction rejected by user");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("wallet");
      expect(mapped.retryable).toBe(false);
    });

    it("maps wallet not found", () => {
      const error = new Error("Stellar wallet not found in extensions");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("wallet");
      expect(mapped.retryable).toBe(false);
      expect(mapped.message).toContain("Freighter");
    });

    it("maps freighter not installed", () => {
      const error = new Error("Freighter extension not installed");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("wallet");
      expect(mapped.retryable).toBe(false);
    });

    it("maps wallet not connected as retryable", () => {
      const error = new Error("Wallet not connected");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("wallet");
      expect(mapped.retryable).toBe(true);
    });
  });

  // ─── Simulation Errors ────────────────────────────────────────────────────

  describe("simulation errors", () => {
    it("maps simulation failure", () => {
      const error = new Error("Simulation failed: host invocation failed");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("simulation");
      expect(mapped.retryable).toBe(false);
    });

    it("extracts contract error code from simulation", () => {
      const error = new Error(
        "Simulation failed: error code #4 in contract"
      );
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("simulation");
      expect(mapped.message).toContain("4");
    });
  });

  // ─── Authorization Errors ─────────────────────────────────────────────────

  describe("authorization errors", () => {
    it("maps unauthorized error", () => {
      const error = new Error("Not authorized to call this function");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("authorization");
      expect(mapped.retryable).toBe(false);
    });

    it("maps missing authorization", () => {
      const error = new Error("Missing authorization entry");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("authorization");
      expect(mapped.retryable).toBe(false);
    });
  });

  // ─── Network Errors ───────────────────────────────────────────────────────

  describe("network errors", () => {
    it("maps timeout as retryable", () => {
      const error = new Error("Network timeout after 30s");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("network");
      expect(mapped.retryable).toBe(true);
    });

    it("maps fetch failure as retryable", () => {
      const error = new Error("Fetch failed: ECONNREFUSED");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("network");
      expect(mapped.retryable).toBe(true);
    });

    it("maps 503 as retryable network error", () => {
      const error = new Error("RPC returned 503 Service Unavailable");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("network");
      expect(mapped.retryable).toBe(true);
    });

    it("maps confirmation timeout as retryable", () => {
      const error = new Error("Transaction confirmation timeout");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("network");
      expect(mapped.retryable).toBe(true);
      expect(mapped.message).toContain("may still succeed");
    });
  });

  // ─── Contract Errors ──────────────────────────────────────────────────────

  describe("contract errors", () => {
    it("maps transaction failure", () => {
      const error = new Error("Transaction failed: tx_failed");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("contract");
      expect(mapped.retryable).toBe(false);
    });

    it("maps resource exceeded", () => {
      const error = new Error("Resource budget exceeded");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("contract");
      expect(mapped.retryable).toBe(false);
    });

    it("maps sequence number conflict as retryable", () => {
      const error = new Error("tx_bad_seq: bad sequence number");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("contract");
      expect(mapped.retryable).toBe(true);
    });

    it("maps account not found", () => {
      const error = new Error("Account not found on network");
      const mapped = mapStellarError(error);

      expect(mapped.category).toBe("contract");
      expect(mapped.retryable).toBe(false);
    });
  });

  // ─── Unknown Errors ───────────────────────────────────────────────────────

  describe("unknown errors", () => {
    it("handles non-Error values gracefully", () => {
      const mapped = mapStellarError("string error");

      expect(mapped.category).toBe("network");
      expect(mapped.retryable).toBe(true);
      expect(mapped.message).toBe("An unknown Stellar error occurred");
    });

    it("handles null/undefined", () => {
      const mapped = mapStellarError(null);

      expect(mapped.category).toBe("network");
      expect(mapped.retryable).toBe(true);
    });

    it("preserves cause", () => {
      const original = new Error("original");
      const mapped = mapStellarError(original);

      expect(mapped.cause).toBe(original);
    });
  });
});

describe("categorizeStellarError", () => {
  it("categorizes by error constructor name", () => {
    // Create a custom error class
    class NetworkError extends Error {
      constructor() {
        super("network issue");
        this.name = "NetworkError";
      }
    }

    const result = categorizeStellarError(new NetworkError());
    expect(result).toBe("network");
  });

  it("returns 'network' for non-Error types", () => {
    expect(categorizeStellarError("string")).toBe("network");
    expect(categorizeStellarError(null)).toBe("network");
    expect(categorizeStellarError(42)).toBe("network");
  });

  it("returns 'contract' for generic Error", () => {
    expect(categorizeStellarError(new Error("generic"))).toBe("contract");
  });
});
