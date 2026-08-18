import { ChainConfig, AdapterRegistry } from "@/app/providers/ChainProvider";
import { WalletAdapter } from "@/domain/wallet/WalletAdapter";
import { TokenAdapter } from "@/domain/token/TokenAdapter";
import { DelegationAdapter } from "@/domain/delegation/DelegationAdapter";
import { PermissionAdapter } from "@/domain/permissions/PermissionAdapter";
import {
  WalletSession,
  TransactionResult,
  Delegation,
  CreateDelegationRequest,
  Permissions,
} from "@/types";

/**
 * Mock adapters for development and demonstration.
 * Replace these with real adapters (EvmXxxAdapter / StellarXxxAdapter) in production.
 */

class MockWalletAdapter implements WalletAdapter {
  private session: WalletSession | null = null;

  async connect(): Promise<WalletSession> {
    this.session = {
      chain: "stellar",
      address: "GBZXN7PIRZGNMHGA7MUUUF4GWDBD",
      network: "testnet",
      connected: true,
    };
    return this.session;
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

  async signMessage(_message: string): Promise<string> {
    return "mock-signature";
  }
}

class MockTokenAdapter implements TokenAdapter {
  async getBalance(_address: string): Promise<bigint> {
    return BigInt(1000000000000000000);
  }

  async transfer(_recipient: string, _amount: bigint): Promise<TransactionResult> {
    await delay(2000);
    return {
      hash: "0x" + Math.random().toString(16).slice(2),
      chain: "stellar",
      status: "confirmed",
      timestamp: Date.now(),
    };
  }

  async mint(_recipient: string, _amount: bigint): Promise<TransactionResult> {
    await delay(1500);
    return { hash: "0xmock", chain: "stellar", status: "confirmed", timestamp: Date.now() };
  }

  async burn(_amount: bigint): Promise<TransactionResult> {
    await delay(1500);
    return { hash: "0xmock", chain: "stellar", status: "confirmed", timestamp: Date.now() };
  }

  async totalSupply(): Promise<bigint> {
    return BigInt(100000000000000000000000);
  }

  async symbol(): Promise<string> {
    return "DTCC";
  }

  async decimals(): Promise<number> {
    return 18;
  }
}

class MockDelegationAdapter implements DelegationAdapter {
  async getDelegations(_account: string): Promise<Delegation[]> {
    return [
      {
        id: "del-1",
        delegator: "GBZXN7PIRZGNMHGA7MUUUF4GWDBD",
        delegatee: "GCFDS2KDGKZQAJ36FXGBB",
        permissions: ["transfer", "mint"],
        createdAt: Date.now() / 1000 - 86400,
        expiresAt: Date.now() / 1000 + 86400 * 30,
        active: true,
        chain: "stellar",
      },
    ];
  }

  async getDelegation(_id: string): Promise<Delegation | null> {
    return null;
  }

  async createDelegation(_request: CreateDelegationRequest): Promise<TransactionResult> {
    await delay(2000);
    return { hash: "0xmock", chain: "stellar", status: "confirmed", timestamp: Date.now() };
  }

  async revokeDelegation(_id: string): Promise<TransactionResult> {
    await delay(2000);
    return { hash: "0xmock", chain: "stellar", status: "confirmed", timestamp: Date.now() };
  }

  async batchRevoke(_ids: string[]): Promise<TransactionResult> {
    await delay(2000);
    return { hash: "0xmock", chain: "stellar", status: "confirmed", timestamp: Date.now() };
  }

  async isActive(_id: string): Promise<boolean> {
    return true;
  }
}

class MockPermissionAdapter implements PermissionAdapter {
  async getPermissions(_account: string): Promise<Permissions> {
    return {
      canMint: true,
      canBurn: true,
      canTransfer: true,
      canDelegate: true,
      canRevoke: true,
      roles: ["minter", "burner", "transfer", "delegate"],
    };
  }

  async hasRole(_account: string, _role: string): Promise<boolean> {
    return true;
  }

  async canPerform(_account: string, _action: string): Promise<boolean> {
    return true;
  }
}

/**
 * Get a mock chain config for development.
 */
export function getMockChainConfig(): ChainConfig {
  const mockRegistry: AdapterRegistry = {
    wallet: new MockWalletAdapter(),
    token: new MockTokenAdapter(),
    delegation: new MockDelegationAdapter(),
    permissions: new MockPermissionAdapter(),
  };

  return {
    ethereum: mockRegistry,
    stellar: mockRegistry,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
