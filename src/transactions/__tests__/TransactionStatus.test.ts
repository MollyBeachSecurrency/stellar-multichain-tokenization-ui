import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  getStatusLabel,
  getChainSteps,
  isActiveStatus,
  isTerminalStatus,
} from "../TransactionStatus";

describe("TransactionStatus", () => {
  describe("isValidTransition", () => {
    it("allows idle -> preparing", () => {
      expect(isValidTransition("idle", "preparing")).toBe(true);
    });

    it("allows preparing -> simulating", () => {
      expect(isValidTransition("preparing", "simulating")).toBe(true);
    });

    it("allows preparing -> awaiting_signature (EVM skips simulation)", () => {
      expect(isValidTransition("preparing", "awaiting_signature")).toBe(true);
    });

    it("allows error -> idle (reset)", () => {
      expect(isValidTransition("error", "idle")).toBe(true);
    });

    it("allows error -> preparing (retry)", () => {
      expect(isValidTransition("error", "preparing")).toBe(true);
    });

    it("rejects idle -> confirmed", () => {
      expect(isValidTransition("idle", "confirmed")).toBe(false);
    });

    it("rejects success -> error", () => {
      expect(isValidTransition("success", "error")).toBe(false);
    });

    it("rejects pending -> idle", () => {
      expect(isValidTransition("pending", "idle")).toBe(false);
    });
  });

  describe("getStatusLabel", () => {
    it("returns user-friendly labels", () => {
      expect(getStatusLabel("idle")).toBe("Ready");
      expect(getStatusLabel("simulating")).toBe("Simulating transaction");
      expect(getStatusLabel("awaiting_signature")).toBe("Waiting for wallet approval");
      expect(getStatusLabel("confirmed")).toBe("Transaction confirmed");
      expect(getStatusLabel("indexing")).toBe("Updating application data");
      expect(getStatusLabel("success")).toBe("Complete");
      expect(getStatusLabel("error")).toBe("Transaction failed");
    });
  });

  describe("getChainSteps", () => {
    it("includes simulating for stellar", () => {
      const steps = getChainSteps("stellar");
      expect(steps).toContain("simulating");
    });

    it("excludes simulating for ethereum", () => {
      const steps = getChainSteps("ethereum");
      expect(steps).not.toContain("simulating");
    });
  });

  describe("isActiveStatus", () => {
    it("returns true for in-progress statuses", () => {
      expect(isActiveStatus("preparing")).toBe(true);
      expect(isActiveStatus("submitting")).toBe(true);
      expect(isActiveStatus("pending")).toBe(true);
      expect(isActiveStatus("indexing")).toBe(true);
    });

    it("returns false for terminal and idle", () => {
      expect(isActiveStatus("idle")).toBe(false);
      expect(isActiveStatus("success")).toBe(false);
      expect(isActiveStatus("error")).toBe(false);
    });
  });

  describe("isTerminalStatus", () => {
    it("returns true for success and error", () => {
      expect(isTerminalStatus("success")).toBe(true);
      expect(isTerminalStatus("error")).toBe(true);
    });

    it("returns false for all other statuses", () => {
      expect(isTerminalStatus("idle")).toBe(false);
      expect(isTerminalStatus("preparing")).toBe(false);
      expect(isTerminalStatus("pending")).toBe(false);
    });
  });
});
