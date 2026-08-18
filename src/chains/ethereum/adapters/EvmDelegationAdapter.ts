import { DelegationAdapter } from "@/domain/delegation/DelegationAdapter";
import {
  Delegation,
  CreateDelegationRequest,
  TransactionResult,
} from "@/types";
import { mapEvmError } from "../errors/EvmErrorMapper";
import { delegationAbi } from "../contracts/delegationAbi";

/**
 * EvmDelegationAdapter implements DelegationAdapter using Wagmi/viem
 * for Solidity-based delegation contracts.
 *
 * Responsibilities:
 * - Query delegation state from the contract
 * - Create delegations with permission arrays
 * - Revoke individual or batch delegations
 * - Monitor transaction receipts
 * - Normalize EVM errors
 */
export class EvmDelegationAdapter implements DelegationAdapter {
  private wagmiConfig: any;
  private contractAddress: `0x${string}`;

  constructor(wagmiConfig: any, contractAddress: string) {
    this.wagmiConfig = wagmiConfig;
    this.contractAddress = contractAddress as `0x${string}`;
  }

  async getDelegations(account: string): Promise<Delegation[]> {
    try {
      const { readContract } = await import("@wagmi/core");

      const raw = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: delegationAbi,
        functionName: "getDelegations",
        args: [account as `0x${string}`],
      });

      return (raw as any[]).map((d) => this.mapDelegation(d));
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async getDelegation(delegationId: string): Promise<Delegation | null> {
    try {
      const { readContract } = await import("@wagmi/core");

      const raw = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: delegationAbi,
        functionName: "getDelegation",
        args: [delegationId as `0x${string}`],
      });

      if (!raw) return null;
      return this.mapDelegation(raw);
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async createDelegation(
    request: CreateDelegationRequest
  ): Promise<TransactionResult> {
    try {
      const { writeContract, waitForTransactionReceipt } = await import(
        "@wagmi/core"
      );

      // Encode permission strings as bytes32
      const permissionBytes = request.permissions.map((p) =>
        this.stringToBytes32(p)
      );

      const hash = await writeContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: delegationAbi,
        functionName: "createDelegation",
        args: [
          request.delegatee as `0x${string}`,
          permissionBytes,
          BigInt(request.expiresAt ?? 0),
        ],
      });

      const receipt = await waitForTransactionReceipt(this.wagmiConfig, {
        hash,
      });

      return {
        hash,
        chain: "ethereum",
        status: receipt.status === "success" ? "confirmed" : "error",
        blockNumber: Number(receipt.blockNumber),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async revokeDelegation(delegationId: string): Promise<TransactionResult> {
    try {
      const { writeContract, waitForTransactionReceipt } = await import(
        "@wagmi/core"
      );

      const hash = await writeContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: delegationAbi,
        functionName: "revokeDelegation",
        args: [delegationId as `0x${string}`],
      });

      const receipt = await waitForTransactionReceipt(this.wagmiConfig, {
        hash,
      });

      return {
        hash,
        chain: "ethereum",
        status: receipt.status === "success" ? "confirmed" : "error",
        blockNumber: Number(receipt.blockNumber),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async batchRevoke(delegationIds: string[]): Promise<TransactionResult> {
    try {
      const { writeContract, waitForTransactionReceipt } = await import(
        "@wagmi/core"
      );

      const hash = await writeContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: delegationAbi,
        functionName: "batchRevoke",
        args: [delegationIds as `0x${string}`[]],
      });

      const receipt = await waitForTransactionReceipt(this.wagmiConfig, {
        hash,
      });

      return {
        hash,
        chain: "ethereum",
        status: receipt.status === "success" ? "confirmed" : "error",
        blockNumber: Number(receipt.blockNumber),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async isActive(delegationId: string): Promise<boolean> {
    try {
      const { readContract } = await import("@wagmi/core");

      const active = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: delegationAbi,
        functionName: "isActive",
        args: [delegationId as `0x${string}`],
      });

      return active as boolean;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private mapDelegation(raw: any): Delegation {
    return {
      id: raw.id,
      delegator: raw.delegator,
      delegatee: raw.delegatee,
      permissions: (raw.permissions as string[]).map((p) =>
        this.bytes32ToString(p)
      ),
      createdAt: Number(raw.createdAt),
      expiresAt: Number(raw.expiresAt) || undefined,
      active: raw.active,
      chain: "ethereum",
    };
  }

  private stringToBytes32(str: string): `0x${string}` {
    // Pad string to 32 bytes
    const hex = Buffer.from(str, "utf8").toString("hex").padEnd(64, "0");
    return `0x${hex}` as `0x${string}`;
  }

  private bytes32ToString(bytes: string): string {
    // Remove 0x prefix and trailing zeros, decode
    const hex = bytes.replace(/^0x/, "").replace(/0+$/, "");
    return Buffer.from(hex, "hex").toString("utf8");
  }
}
