import { describe, it, expect } from "vitest";
import {
  isValidEvmAddress,
  isValidStellarAddress,
  isValidAddress,
  isValidAmount,
  isValidHex,
} from "../validation";

describe("isValidEvmAddress", () => {
  it("accepts valid EVM addresses", () => {
    expect(isValidEvmAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(true);
    expect(isValidEvmAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(true);
  });

  it("rejects invalid EVM addresses", () => {
    expect(isValidEvmAddress("0x123")).toBe(false);
    expect(isValidEvmAddress("not-an-address")).toBe(false);
    expect(isValidEvmAddress("")).toBe(false);
    expect(isValidEvmAddress("1234567890abcdef1234567890abcdef12345678")).toBe(false);
  });
});

describe("isValidStellarAddress", () => {
  it("accepts valid Stellar addresses (G... format)", () => {
    expect(
      isValidStellarAddress("GBZXN7PIRZGNMHGA7MUUUF4GWDBDTGFKXBUKG2BA7OMNZ4LY4TSSSOW")
    ).toBe(true);
  });

  it("rejects invalid Stellar addresses", () => {
    expect(isValidStellarAddress("0x123")).toBe(false);
    expect(isValidStellarAddress("SAXYZ")).toBe(false); // Secret key format
    expect(isValidStellarAddress("")).toBe(false);
  });
});

describe("isValidAddress", () => {
  it("validates EVM addresses for ethereum chain", () => {
    expect(
      isValidAddress("0x1234567890abcdef1234567890abcdef12345678", "ethereum")
    ).toBe(true);
    expect(isValidAddress("invalid", "ethereum")).toBe(false);
  });

  it("validates Stellar addresses for stellar chain", () => {
    expect(
      isValidAddress(
        "GBZXN7PIRZGNMHGA7MUUUF4GWDBDTGFKXBUKG2BA7OMNZ4LY4TSSSOW",
        "stellar"
      )
    ).toBe(true);
    expect(isValidAddress("0x123", "stellar")).toBe(false);
  });
});

describe("isValidAmount", () => {
  it("accepts valid positive amounts", () => {
    expect(isValidAmount("1")).toBe(true);
    expect(isValidAmount("1000000000000000000")).toBe(true);
    expect(isValidAmount("999")).toBe(true);
  });

  it("rejects zero and invalid values", () => {
    expect(isValidAmount("0")).toBe(false);
    expect(isValidAmount("")).toBe(false);
    expect(isValidAmount("abc")).toBe(false);
    expect(isValidAmount("-1")).toBe(false);
  });
});

describe("isValidHex", () => {
  it("accepts valid hex strings", () => {
    expect(isValidHex("0x")).toBe(true);
    expect(isValidHex("0xabcdef")).toBe(true);
    expect(isValidHex("0x1234567890ABCDEF")).toBe(true);
  });

  it("rejects invalid hex strings", () => {
    expect(isValidHex("abcdef")).toBe(false);
    expect(isValidHex("0xGG")).toBe(false);
    expect(isValidHex("")).toBe(false);
  });
});
