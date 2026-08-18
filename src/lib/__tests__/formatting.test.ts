import { describe, it, expect } from "vitest";
import {
  formatTokenAmount,
  formatWithCommas,
  truncateAddress,
} from "../formatting";

describe("formatTokenAmount", () => {
  it("formats zero", () => {
    expect(formatTokenAmount(BigInt(0))).toBe("0");
  });

  it("formats whole tokens", () => {
    // 1 token with 18 decimals
    expect(formatTokenAmount(BigInt("1000000000000000000"))).toBe("1");
  });

  it("formats fractional tokens", () => {
    // 1.5 tokens with 18 decimals
    expect(formatTokenAmount(BigInt("1500000000000000000"))).toBe("1.5");
  });

  it("respects maxFractionDigits", () => {
    // 1.123456789 tokens
    expect(
      formatTokenAmount(BigInt("1123456789000000000"), 18, 4)
    ).toBe("1.1234");
  });

  it("trims trailing zeros from fraction", () => {
    // 1.10 tokens
    expect(formatTokenAmount(BigInt("1100000000000000000"))).toBe("1.1");
  });

  it("adds commas to large amounts", () => {
    // 1,000,000 tokens
    expect(
      formatTokenAmount(BigInt("1000000000000000000000000"))
    ).toBe("1,000,000");
  });

  it("handles non-18 decimals", () => {
    // 100 tokens with 6 decimals (USDC-style)
    expect(formatTokenAmount(BigInt("100000000"), 6)).toBe("100");
  });
});

describe("formatWithCommas", () => {
  it("adds commas to large numbers", () => {
    expect(formatWithCommas("1000000")).toBe("1,000,000");
    expect(formatWithCommas("1234567890")).toBe("1,234,567,890");
  });

  it("does not add commas to small numbers", () => {
    expect(formatWithCommas("999")).toBe("999");
    expect(formatWithCommas("0")).toBe("0");
  });
});

describe("truncateAddress", () => {
  it("truncates long addresses", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    expect(truncateAddress(address)).toBe("0x1234...5678");
  });

  it("does not truncate short strings", () => {
    expect(truncateAddress("0x1234")).toBe("0x1234");
  });

  it("supports custom char count", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    expect(truncateAddress(address, 6)).toBe("0x123456...345678");
  });
});
