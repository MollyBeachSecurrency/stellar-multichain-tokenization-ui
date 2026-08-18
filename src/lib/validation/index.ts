/**
 * Validate an Ethereum address.
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a Stellar public key (G... format).
 */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

/**
 * Validate a blockchain address for the given chain.
 */
export function isValidAddress(
  address: string,
  chain: "ethereum" | "stellar"
): boolean {
  if (chain === "ethereum") return isValidEvmAddress(address);
  if (chain === "stellar") return isValidStellarAddress(address);
  return false;
}

/**
 * Validate that a string represents a valid positive bigint.
 */
export function isValidAmount(value: string): boolean {
  if (!value || value === "") return false;
  try {
    const n = BigInt(value);
    return n > BigInt(0);
  } catch {
    return false;
  }
}

/**
 * Validate that a value is a valid hex string.
 */
export function isValidHex(value: string): boolean {
  return /^0x[a-fA-F0-9]*$/.test(value);
}
