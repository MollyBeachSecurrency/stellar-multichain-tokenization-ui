import { WalletSession } from "@/types";

/**
 * WalletAdapter defines the shared interface for wallet operations
 * across all supported chains.
 *
 * Each blockchain provides its own implementation that handles
 * chain-specific wallet behavior (MetaMask for EVM, Freighter for Stellar, etc.)
 */
export interface WalletAdapter {
  /**
   * Connect to the user's wallet and establish a session.
   */
  connect(): Promise<WalletSession>;

  /**
   * Disconnect and clear the active wallet session.
   */
  disconnect(): Promise<void>;

  /**
   * Get the current wallet session, or null if not connected.
   */
  getSession(): WalletSession | null;

  /**
   * Get the connected wallet address, or null if not connected.
   */
  getAddress(): string | null;

  /**
   * Check if the wallet is currently connected.
   */
  isConnected(): boolean;

  /**
   * Sign an arbitrary message with the connected wallet.
   */
  signMessage(message: string): Promise<string>;
}
