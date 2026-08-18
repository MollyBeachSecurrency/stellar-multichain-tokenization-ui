import { TransactionResult } from "@/types";

/**
 * TokenAdapter defines the shared interface for token operations.
 *
 * This covers balance queries, transfers, minting, and burning.
 * Each chain implements these using its native SDK and contract interaction model.
 */
export interface TokenAdapter {
  /**
   * Get the token balance for a given account.
   */
  getBalance(address: string): Promise<bigint>;

  /**
   * Transfer tokens to a recipient.
   */
  transfer(recipient: string, amount: bigint): Promise<TransactionResult>;

  /**
   * Mint new tokens to a recipient (requires permission).
   */
  mint(recipient: string, amount: bigint): Promise<TransactionResult>;

  /**
   * Burn tokens from the connected wallet (requires permission).
   */
  burn(amount: bigint): Promise<TransactionResult>;

  /**
   * Get the total supply of the token.
   */
  totalSupply(): Promise<bigint>;

  /**
   * Get the token symbol.
   */
  symbol(): Promise<string>;

  /**
   * Get the token decimals.
   */
  decimals(): Promise<number>;
}
