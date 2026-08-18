import { DelegationAdapter } from "@/domain/delegation/DelegationAdapter";
import {
  Delegation,
  CreateDelegationRequest,
  TransactionResult,
} from "@/types";
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
 * StellarDelegationAdapter implements DelegationAdapter for Soroban
 * delegation contracts.
 *
 * This is the primary vertical slice demonstrating the full Stellar
 * transaction lifecycle:
 * - Simulation
 * - Authorization entries
 * - Resource preparation
 * - Wallet signing
 * - Submission
 * - Confirmation polling
 * - Event-driven state updates
 *
 * The delegation contract manages:
 * - Delegation creation with permission arrays
 * - Revocation (individual and batch)
 * - Timelocks and expiration
 * - Sub-authorization
 * - RBAC
 */
export class StellarDelegationAdapter implements DelegationAdapter {
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

  async getDelegations(account: string): Promise<Delegation[]> {
    try {
      const sourceAccount = await this.client.getAccount(account);

      const tx = this.client.buildContractCall(
        sourceAccount,
        this.contractId,
        "get_delegations",
        [new Address(account).toScVal()]
      );

      const simulation = await this.client.simulateTransaction(tx);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        const raw = scValToNative(resultVal);
        return this.mapDelegationArray(raw);
      }

      return [];
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async getDelegation(delegationId: string): Promise<Delegation | null> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) throw new Error("Wallet not connected");

      const sourceAccount = await this.client.getAccount(sourceAddress);

      const tx = this.client.buildContractCall(
        sourceAccount,
        this.contractId,
        "get_delegation",
        [nativeToScVal(delegationId, { type: "symbol" })]
      );

      const simulation = await this.client.simulateTransaction(tx);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        const raw = scValToNative(resultVal);
        if (!raw) return null;
        return this.mapDelegation(raw);
      }

      return null;
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async createDelegation(
    request: CreateDelegationRequest
  ): Promise<TransactionResult> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) throw new Error("Wallet not connected");

      // Build args for create_delegation(delegatee, permissions, expires_at)
      const permissionsScVal = nativeToScVal(
        request.permissions.map((p) => nativeToScVal(p, { type: "symbol" }))
      );

      const args: xdr.ScVal[] = [
        new Address(sourceAddress).toScVal(), // delegator
        new Address(request.delegatee).toScVal(), // delegatee
        permissionsScVal, // permissions vec
        nativeToScVal(BigInt(request.expiresAt ?? 0), { type: "u64" }), // expires_at
      ];

      const { transaction } = await this.client.prepareContractCall(
        sourceAddress,
        this.contractId,
        "create_delegation",
        args
      );

      // Sign
      const signedXdr = await this.wallet.signTransaction(
        transaction.toXDR()
      );

      const signedTx = new Transaction(
        signedXdr,
        this.client.getNetworkPassphrase()
      );

      // Submit
      const response = await this.client.submitTransaction(signedTx);

      if (response.status === "ERROR") {
        throw new Error(`Create delegation failed: ${response.hash}`);
      }

      // Confirm
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

  async revokeDelegation(delegationId: string): Promise<TransactionResult> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) throw new Error("Wallet not connected");

      const args: xdr.ScVal[] = [
        new Address(sourceAddress).toScVal(), // caller
        nativeToScVal(delegationId, { type: "symbol" }), // delegation_id
      ];

      const { transaction } = await this.client.prepareContractCall(
        sourceAddress,
        this.contractId,
        "revoke_delegation",
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
        throw new Error(`Revoke delegation failed: ${response.hash}`);
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

  async batchRevoke(delegationIds: string[]): Promise<TransactionResult> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) throw new Error("Wallet not connected");

      const idsScVal = nativeToScVal(
        delegationIds.map((id) => nativeToScVal(id, { type: "symbol" }))
      );

      const args: xdr.ScVal[] = [
        new Address(sourceAddress).toScVal(),
        idsScVal,
      ];

      const { transaction } = await this.client.prepareContractCall(
        sourceAddress,
        this.contractId,
        "batch_revoke",
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
        throw new Error(`Batch revoke failed: ${response.hash}`);
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

  async isActive(delegationId: string): Promise<boolean> {
    try {
      const sourceAddress = this.wallet.getAddress();
      if (!sourceAddress) throw new Error("Wallet not connected");

      const sourceAccount = await this.client.getAccount(sourceAddress);

      const tx = this.client.buildContractCall(
        sourceAccount,
        this.contractId,
        "is_active",
        [nativeToScVal(delegationId, { type: "symbol" })]
      );

      const simulation = await this.client.simulateTransaction(tx);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        return scValToNative(resultVal) as boolean;
      }

      return false;
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private mapDelegationArray(raw: any[]): Delegation[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((d) => this.mapDelegation(d));
  }

  private mapDelegation(raw: any): Delegation {
    return {
      id: String(raw.id ?? raw.delegation_id ?? ""),
      delegator: String(raw.delegator ?? ""),
      delegatee: String(raw.delegatee ?? ""),
      permissions: Array.isArray(raw.permissions)
        ? raw.permissions.map(String)
        : [],
      createdAt: Number(raw.created_at ?? raw.createdAt ?? 0),
      expiresAt: Number(raw.expires_at ?? raw.expiresAt ?? 0) || undefined,
      active: Boolean(raw.active ?? raw.is_active ?? true),
      chain: "stellar",
    };
  }
}
