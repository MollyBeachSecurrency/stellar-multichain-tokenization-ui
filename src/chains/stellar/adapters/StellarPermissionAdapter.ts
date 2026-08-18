import { PermissionAdapter } from "@/domain/permissions/PermissionAdapter";
import { Permissions } from "@/types";
import { SorobanClient } from "../rpc/SorobanClient";
import { StellarWalletAdapter } from "./StellarWalletAdapter";
import { mapStellarError } from "../errors/StellarErrorMapper";
import {
  nativeToScVal,
  Address,
  xdr,
  scValToNative,
} from "@stellar/stellar-sdk";

/**
 * StellarPermissionAdapter queries on-chain permissions from a Soroban
 * access control / RBAC contract.
 *
 * Like the EVM version, these frontend checks improve UX but never
 * replace contract-level enforcement.
 */
export class StellarPermissionAdapter implements PermissionAdapter {
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

  async getPermissions(account: string): Promise<Permissions> {
    try {
      const [canMint, canBurn, canTransfer, canDelegate, canRevoke] =
        await Promise.all([
          this.hasRole(account, "minter"),
          this.hasRole(account, "burner"),
          this.hasRole(account, "transfer"),
          this.hasRole(account, "delegate"),
          this.hasRole(account, "delegate"), // Revoke uses same role
        ]);

      const roles: string[] = [];
      if (canMint) roles.push("minter");
      if (canBurn) roles.push("burner");
      if (canTransfer) roles.push("transfer");
      if (canDelegate) roles.push("delegate");

      return {
        canMint,
        canBurn,
        canTransfer,
        canDelegate,
        canRevoke,
        roles,
      };
    } catch (error) {
      throw mapStellarError(error);
    }
  }

  async hasRole(account: string, role: string): Promise<boolean> {
    try {
      const sourceAccount = await this.client.getAccount(account);

      const tx = this.client.buildContractCall(
        sourceAccount,
        this.contractId,
        "has_role",
        [
          new Address(account).toScVal(),
          nativeToScVal(role, { type: "symbol" }),
        ]
      );

      const simulation = await this.client.simulateTransaction(tx);

      if ("result" in simulation && simulation.result) {
        const resultVal = (simulation as any).result.retval;
        return scValToNative(resultVal) as boolean;
      }

      return false;
    } catch (error) {
      // If the contract call fails (e.g., role doesn't exist), return false
      return false;
    }
  }

  async canPerform(account: string, action: string): Promise<boolean> {
    const roleMap: Record<string, string> = {
      mint: "minter",
      burn: "burner",
      transfer: "transfer",
      delegate: "delegate",
      revoke: "delegate",
      admin: "admin",
    };

    const role = roleMap[action];
    if (!role) return false;

    return this.hasRole(account, role);
  }
}
