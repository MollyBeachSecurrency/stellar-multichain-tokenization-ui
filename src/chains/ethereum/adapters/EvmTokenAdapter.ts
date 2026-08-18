import { TokenAdapter } from "@/domain/token/TokenAdapter";
import { TransactionResult } from "@/types";
import { mapEvmError } from "../errors/EvmErrorMapper";
import { erc20Abi } from "../contracts/erc20Abi";

/**
 * EvmTokenAdapter implements TokenAdapter using Wagmi/viem for ERC-20 contracts.
 *
 * Responsibilities:
 * - Balance queries via contract read
 * - Token transfers via contract write
 * - Minting and burning via privileged contract calls
 * - Gas estimation
 * - Transaction receipt monitoring
 * - EVM error normalization
 */
export class EvmTokenAdapter implements TokenAdapter {
  private wagmiConfig: any;
  private contractAddress: `0x${string}`;

  constructor(wagmiConfig: any, contractAddress: string) {
    this.wagmiConfig = wagmiConfig;
    this.contractAddress = contractAddress as `0x${string}`;
  }

  async getBalance(address: string): Promise<bigint> {
    try {
      const { readContract } = await import("@wagmi/core");

      const balance = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });

      return balance as bigint;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async transfer(recipient: string, amount: bigint): Promise<TransactionResult> {
    try {
      const { writeContract, waitForTransactionReceipt } = await import(
        "@wagmi/core"
      );

      const hash = await writeContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient as `0x${string}`, amount],
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

  async mint(recipient: string, amount: bigint): Promise<TransactionResult> {
    try {
      const { writeContract, waitForTransactionReceipt } = await import(
        "@wagmi/core"
      );

      const hash = await writeContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: erc20Abi,
        functionName: "mint",
        args: [recipient as `0x${string}`, amount],
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

  async burn(amount: bigint): Promise<TransactionResult> {
    try {
      const { writeContract, waitForTransactionReceipt } = await import(
        "@wagmi/core"
      );

      const hash = await writeContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: erc20Abi,
        functionName: "burn",
        args: [amount],
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

  async totalSupply(): Promise<bigint> {
    try {
      const { readContract } = await import("@wagmi/core");

      const supply = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: erc20Abi,
        functionName: "totalSupply",
      });

      return supply as bigint;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async symbol(): Promise<string> {
    try {
      const { readContract } = await import("@wagmi/core");

      const sym = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: erc20Abi,
        functionName: "symbol",
      });

      return sym as string;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async decimals(): Promise<number> {
    try {
      const { readContract } = await import("@wagmi/core");

      const dec = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: erc20Abi,
        functionName: "decimals",
      });

      return Number(dec);
    } catch (error) {
      throw mapEvmError(error);
    }
  }
}
