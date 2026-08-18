import { WalletAdapter } from "@/domain/wallet/WalletAdapter";
import { WalletSession } from "@/types";
import { mapStellarError } from "../errors/StellarErrorMapper";

/**
 * StellarWalletAdapter implements WalletAdapter for Stellar wallets.
 *
 * Supports Freighter and other Stellar wallet extensions that implement
 * the standard Stellar wallet API.
 *
 * Responsibilities:
 * - Wallet detection and connection
 * - Public key retrieval
 * - Network resolution
 * - Message signing
 * - Transaction signing (exposed separately for the transaction flow)
 */
export class StellarWalletAdapter implements WalletAdapter {
  private session: WalletSession | null = null;
  private networkPassphrase: string;

  constructor(networkPassphrase?: string) {
    this.networkPassphrase =
      networkPassphrase ??
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
      "Test SDF Network ; September 2015";
  }

  async connect(): Promise<WalletSession> {
    try {
      // Check if Freighter or compatible wallet is available
      const walletApi = await this.getWalletApi();

      if (!walletApi) {
        throw new Error(
          "Stellar wallet not found. Please install Freighter or a compatible wallet."
        );
      }

      // Request access
      const publicKey = await walletApi.getPublicKey();

      if (!publicKey) {
        throw new Error("Failed to get public key from wallet");
      }

      const network = await walletApi.getNetwork();

      this.session = {
        chain: "stellar",
        address: publicKey,
        network: network ?? "testnet",
        connected: true,
      };

      return this.session;
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async disconnect(): Promise<void> {
    this.session = null;
  }

  getSession(): WalletSession | null {
    return this.session;
  }

  getAddress(): string | null {
    return this.session?.address ?? null;
  }

  isConnected(): boolean {
    return this.session?.connected ?? false;
  }

  async signMessage(message: string): Promise<string> {
    try {
      const walletApi = await this.getWalletApi();
      if (!walletApi) {
        throw new Error("Wallet not available");
      }

      // Sign arbitrary data
      const signature = await walletApi.signMessage(message);
      return signature;
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  /**
   * Sign a Stellar transaction XDR using the connected wallet.
   * This is used by the Stellar adapters during the transaction flow.
   */
  async signTransaction(
    txXdr: string,
    opts?: { networkPassphrase?: string }
  ): Promise<string> {
    try {
      const walletApi = await this.getWalletApi();
      if (!walletApi) {
        throw new Error("Wallet not available");
      }

      const signedXdr = await walletApi.signTransaction(txXdr, {
        networkPassphrase: opts?.networkPassphrase ?? this.networkPassphrase,
      });

      return signedXdr;
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  /**
   * Get the wallet API from the browser extension.
   * Supports Freighter and compatible wallets.
   */
  private async getWalletApi(): Promise<StellarWalletApi | null> {
    // Check for Freighter
    if (typeof window !== "undefined" && (window as any).freighterApi) {
      const freighter = (window as any).freighterApi;

      // Check if user has granted access
      const isConnected = await freighter.isConnected();
      if (!isConnected) {
        // Request connection
        await freighter.requestAccess();
      }

      return {
        getPublicKey: () => freighter.getPublicKey(),
        getNetwork: () => freighter.getNetwork(),
        signTransaction: (xdr: string, opts?: any) =>
          freighter.signTransaction(xdr, opts),
        signMessage: (message: string) => {
          // Freighter doesn't have a native signMessage, encode as blob
          const encoder = new TextEncoder();
          const data = encoder.encode(message);
          return freighter.signBlob(data);
        },
      };
    }

    return null;
  }
}

/**
 * Internal interface for Stellar wallet extensions.
 */
interface StellarWalletApi {
  getPublicKey(): Promise<string>;
  getNetwork(): Promise<string>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string }
  ): Promise<string>;
  signMessage(message: string): Promise<string>;
}
