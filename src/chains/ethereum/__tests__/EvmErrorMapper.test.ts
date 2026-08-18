import { describe, it, expect } from "vitest";
import { mapEvmError } from "../errors/EvmErrorMapper";

describe("mapEvmError", () => {
  it("maps user rejection errors", () => {
    const error = new Error("User rejected the request");
    const mapped = mapEvmError(error);

    expect(mapped.category).toBe("wallet");
    expect(mapped.retryable).toBe(false);
    expect(mapped.message).toContain("rejected");
  });

  it("maps network errors as retryable", () => {
    const error = new Error("Network timeout");
    const mapped = mapEvmError(error);

    expect(mapped.category).toBe("network");
    expect(mapped.retryable).toBe(true);
  });

  it("maps revert errors", () => {
    const error = new Error("execution reverted: ERC20: insufficient balance");
    const mapped = mapEvmError(error);

    expect(mapped.category).toBe("contract");
    expect(mapped.retryable).toBe(false);
  });

  it("maps access control errors", () => {
    const error = new Error("AccessControl: account is missing role");
    const mapped = mapEvmError(error);

    expect(mapped.category).toBe("authorization");
    expect(mapped.retryable).toBe(false);
  });

  it("maps gas errors", () => {
    const error = new Error("out of gas");
    const mapped = mapEvmError(error);

    expect(mapped.category).toBe("contract");
    expect(mapped.retryable).toBe(false);
  });

  it("handles unknown errors gracefully", () => {
    const mapped = mapEvmError("some string error");

    expect(mapped.category).toBe("network");
    expect(mapped.retryable).toBe(true);
    expect(mapped.message).toBe("An unknown error occurred");
  });

  it("preserves the cause", () => {
    const original = new Error("original error");
    const mapped = mapEvmError(original);

    expect(mapped.cause).toBe(original);
  });
});
