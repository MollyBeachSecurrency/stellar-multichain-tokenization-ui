/**
 * Format a bigint token amount with decimals.
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number = 18,
  maxFractionDigits: number = 4
): string {
  if (amount === BigInt(0)) return "0";

  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return formatWithCommas(integerPart.toString());
  }

  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmed = fractionalStr.slice(0, maxFractionDigits).replace(/0+$/, "");

  if (trimmed === "") {
    return formatWithCommas(integerPart.toString());
  }

  return `${formatWithCommas(integerPart.toString())}.${trimmed}`;
}

/**
 * Format a number string with comma separators.
 */
export function formatWithCommas(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Truncate a blockchain address for display.
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a Unix timestamp to a locale string.
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Format a relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return formatTimestamp(timestamp);
}
