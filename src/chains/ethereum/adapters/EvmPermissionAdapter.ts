import { PermissionAdapter } from "@/domain/permissions/PermissionAdapter";
import { Permissions } from "@/types";
import { mapEvmError } from "../errors/EvmErrorMapper";

/**
 * ABI for the access control contract (OpenZeppelin AccessControl-style).
 */
const accessControlAbi = [
  {
    name: "hasRole",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getRoleAdmin",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "role", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

/**
 * Well-known role identifiers (keccak256 hashes of role names).
 * These would typically be derived from the contract's constants.
 */
const ROLE_HASHES: Record<string, `0x${string}`> = {
  MINTER_ROLE: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
  BURNER_ROLE: "0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848",
  TRANSFER_ROLE: "0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c",
  DELEGATE_ROLE: "0x0dc0ba0f4f88d tried3c7b68a49e2f067ae74c6b6c3b81b6b7d14bf5a6b88daa",
  ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
};

/**
 * EvmPermissionAdapter queries on-chain access control to determine
 * what actions a user can perform.
 *
 * Frontend permission checks improve UX but never replace contract-level enforcement.
 */
export class EvmPermissionAdapter implements PermissionAdapter {
  private wagmiConfig: any;
  private contractAddress: `0x${string}`;

  constructor(wagmiConfig: any, contractAddress: string) {
    this.wagmiConfig = wagmiConfig;
    this.contractAddress = contractAddress as `0x${string}`;
  }

  async getPermissions(account: string): Promise<Permissions> {
    try {
      const [canMint, canBurn, canTransfer, canDelegate, canRevoke] =
        await Promise.all([
          this.hasRole(account, "MINTER_ROLE"),
          this.hasRole(account, "BURNER_ROLE"),
          this.hasRole(account, "TRANSFER_ROLE"),
          this.hasRole(account, "DELEGATE_ROLE"),
          this.hasRole(account, "DELEGATE_ROLE"), // Revoke uses same role
        ]);

      const roles: string[] = [];
      if (canMint) roles.push("MINTER_ROLE");
      if (canBurn) roles.push("BURNER_ROLE");
      if (canTransfer) roles.push("TRANSFER_ROLE");
      if (canDelegate) roles.push("DELEGATE_ROLE");

      return {
        canMint,
        canBurn,
        canTransfer,
        canDelegate,
        canRevoke,
        roles,
      };
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async hasRole(account: string, role: string): Promise<boolean> {
    try {
      const { readContract } = await import("@wagmi/core");

      const roleHash = ROLE_HASHES[role];
      if (!roleHash) {
        return false;
      }

      const result = await readContract(this.wagmiConfig, {
        address: this.contractAddress,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [roleHash, account as `0x${string}`],
      });

      return result as boolean;
    } catch (error) {
      throw mapEvmError(error);
    }
  }

  async canPerform(account: string, action: string): Promise<boolean> {
    const roleMap: Record<string, string> = {
      mint: "MINTER_ROLE",
      burn: "BURNER_ROLE",
      transfer: "TRANSFER_ROLE",
      delegate: "DELEGATE_ROLE",
      revoke: "DELEGATE_ROLE",
      admin: "ADMIN_ROLE",
    };

    const role = roleMap[action];
    if (!role) return false;

    return this.hasRole(account, role);
  }
}
