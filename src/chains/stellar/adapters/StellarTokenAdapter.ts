import { TokenAdapter } from "@/domain/token/TokenAdapter";
import { TransactionResult } from "@/types";
import { SorobanClient } from "../rpc/SorobanClient";
import { StellarWalletAdapter } from "./StellarWalletAdapter";
import { mapStellarError } from "../errors/StellarErrorMapper";
import {
  nativeToScVal,
  Address,
  xdr,
  scValToNative,
  Transaction,
} from "@stellar/stellar-sdk";

/**
 * StellarTokenAdapter implements TokenAdapter for Soroban token contracts.
 *
 * Follows the Soroban transaction lifecycle:
 * 1. Build invocation
 * 2. Simulate
 * 3. Prepare (resources + authorization)
 * 4. Sign via wallet
 * 5. Submit
 * 6. Poll for confirmation
 *
 * The contract interface follows the Soroban token standard (SEP-41).
 */
export class StellarTokenAdapter implements TokenAdapter {
  private client: SorobanClient;
  private wallet: StellarWalletAdapter;
  private contractId: string;

  constructor(
    client: SorobanClient,
    wallet: StellarWalletAdapter,
    contractId: string
  ) {
    this.client = client;
    this.wallet = wallet;
    this.contractId = contractId;
  }

  async getBalance(address: string): Promise<bigint> {
    try {
      const { transaction } = await this.client.prepareContractCall(
        address,
        this.contractId,
        "balance",
        [new Address(address).toScVal()]
      );

      // For view calls, we can read the result from simulation
      const simulation = await this.client.simulateTransaction(transaction);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        return scValToNative(resultVal) as bigint;
      }

      throw new Error("Failed to read balance from simulation");
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async transfer(recipient: string, amount: bigint): Promise<TransactionResult> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) {
        throw new Error("Wallet not connected");
      }

      // Build the transfer invocation
      const args: xdr.ScVal[] = [
        new Address(sourceAddress).toScVal(), // from
        new Address(recipient).toScVal(), // to
        nativeToScVal(amount, { type: "i128" }), // amount
      ];

      const { transaction } = await this.client.prepareContractCall(
        sourceAddress,
        this.contractId,
        "transfer",
        args
      );

      // Sign with wallet
      const signedXdr = await this.wallet.signTransaction(
        transaction.toXDR()
      );

      // Reconstruct signed transaction
      const signedTx = new Transaction(
        signedXdr,
        this.client.getNetworkPassphrase()
      );

      // Submit
      const response = await this.client.submitTransaction(signedTx);

      if (response.status === "ERROR") {
        throw new Error(`Transaction submission failed: ${response.hash}`);
      }

      // Poll for confirmation
      const confirmation = await this.client.waitForConfirmation(
        response.hash
      );

      return {
        hash: response.hash,
        chain: "stellar",
        status: "confirmed",
        timestamp: Date.now(),
      };
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async mint(recipient: string, amount: bigint): Promise<TransactionResult> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) {
        throw new Error("Wallet not connected");
      }

      const args: xdr.ScVal[] = [
        new Address(recipient).toScVal(),
        nativeToScVal(amount, { type: "i128" }),
      ];

      const { transaction } = await this.client.prepareContractCall(
        sourceAddress,
        this.contractId,
        "mint",
        args
      );

      const signedXdr = await this.wallet.signTransaction(
        transaction.toXDR()
      );

      const signedTx = new Transaction(
        signedXdr,
        this.client.getNetworkPassphrase()
      );

      const response = await this.client.submitTransaction(signedTx);

      if (response.status === "ERROR") {
        throw new Error(`Mint transaction failed: ${response.hash}`);
      }

      await this.client.waitForConfirmation(response.hash);

      return {
        hash: response.hash,
        chain: "stellar",
        status: "confirmed",
        timestamp: Date.now(),
      };
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async burn(amount: bigint): Promise<TransactionResult> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) {
        throw new Error("Wallet not connected");
      }

      const args: xdr.ScVal[] = [
        new Address(sourceAddress).toScVal(),
        nativeToScVal(amount, { type: "i128" }),
      ];

      const { transaction } = await this.client.prepareContractCall(
        sourceAddress,
        this.contractId,
        "burn",
        args
      );

      const signedXdr = await this.wallet.signTransaction(
        transaction.toXDR()
      );

      const signedTx = new Transaction(
        signedXdr,
        this.client.getNetworkPassphrase()
      );

      const response = await this.client.submitTransaction(signedTx);

      if (response.status === "ERROR") {
        throw new Error(`Burn transaction failed: ${response.hash}`);
      }

      await this.client.waitForConfirmation(response.hash);

      return {
        hash: response.hash,
        chain: "stellar",
        status: "confirmed",
        timestamp: Date.now(),
      };
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async totalSupply(): Promise<bigint> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) {
        throw new Error("Wallet not connected");
      }

      const account = await this.client.getAccount(sourceAddress);
      const tx = this.client.buildContractCall(
        account,
        this.contractId,
        "total_supply",
        []
      );

      const simulation = await this.client.simulateTransaction(tx);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        return scValToNative(resultVal) as bigint;
      }

      throw new Error("Failed to read total supply");
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async symbol(): Promise<string> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) {
        throw new Error("Wallet not connected");
      }

      const account = await this.client.getAccount(sourceAddress);
      const tx = this.client.buildContractCall(
        account,
        this.contractId,
        "symbol",
        []
      );

      const simulation = await this.client.simulateTransaction(tx);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        return scValToNative(resultVal) as string;
      }

      throw new Error("Failed to read symbol");
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async decimals(): Promise<number> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) {
        throw new Error("Wallet not connected");
      }

      const account = await this.client.getAccount(sourceAddress);
      const tx = this.client.buildContractCall(
        account,
        this.contractId,
        "decimals",
        []
      );

      const simulation = await this.client.simulateTransaction(tx);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        return Number(scValToNative(resultVal));
      }

      throw new Error("Failed to read decimals");
    } catch (error) {
      throw mapStellarError(error);
    }
  }
}
