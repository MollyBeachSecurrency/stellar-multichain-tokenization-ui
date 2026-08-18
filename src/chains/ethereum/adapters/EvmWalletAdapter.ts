import { WalletAdapter } from "@/domain/wallet/WalletAdapter";
import { WalletSession } from "@/types";
import { mapEvmError } from "../errors/EvmErrorMapper";

/**
 * EvmWalletAdapter implements WalletAdapter using Wagmi configuration.
 *
 * Responsibilities:
 * - Wallet connection via injected providers (MetaMask, etc.)
 * - Session management
 * - Address resolution
 * - Message signing
 *
 * This adapter wraps Wagmi's getAccount/connect/disconnect actions
 * into the domain's WalletAdapter interface.
 */
export class EvmWalletAdapter implements WalletAdapter {
  private session: WalletSession | null = null;
  private wagmiConfig: any; // Wagmi Config type - injected at construction

  constructor(wagmiConfig: any) {
    this.wagmiConfig = wagmiConfig;
  }

  async connect(): Promise<WalletSession> {
    try {
      // Use Wagmi's connect action
      const { getAccount, connect } = await import("@wagmi/core");

      // Attempt connection using the first available connector
      const connectors = this.wagmiConfig.connectors;
      if (connectors.length === 0) {
        throw new Error("No wallet connectors available");
      }

      await connect(this.wagmiConfig, { connector: connectors[0] });

      const account = getAccount(this.wagmiConfig);

      if (!account.address) {
        throw new Error("Failed to get account address after connection");
      }

      this.session = {
        chain: "ethereum",
        address: account.address,
        network: String(account.chainId ?? "unknown"),
        connected: true,
      };

      return this.session;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      const { disconnect } = await import("@wagmi/core");
      await disconnect(this.wagmiConfig);
      this.session = null;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  getSession(): WalletSession | null {
    // Sync with Wagmi's current state
    try {
      // Dynamic import not suitable for sync method, rely on cached session
      return this.session;
    } catch {
      return null;
    }
  }

  getAddress(): string | null {
    return this.session?.address ?? null;
  }

  isConnected(): boolean {
    return this.session?.connected ?? false;
  }

  async signMessage(message: string): Promise<string> {
    try {
      const { signMessage } = await import("@wagmi/core");
      const signature = await signMessage(this.wagmiConfig, { message });
      return signature;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  /**
   * Sync the adapter's session state with Wagmi's current account.
   * Call this after external state changes (e.g., user switches account in wallet).
   */
  syncFromWagmi(): void {
    try {
      // This would be called from a Wagmi watchAccount subscription
      // For now, it's a manual sync point
    } catch {
      this.session = null;
    }
  }
}
