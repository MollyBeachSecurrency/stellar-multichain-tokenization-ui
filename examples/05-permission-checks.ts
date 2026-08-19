/**
 * Example 05: Permission / RBAC Checks
 *
 * Demonstrates:
 * - Querying on-chain roles via simulation (no transaction needed)
 * - Checking if an account can perform specific actions
 * - Using permissions to drive frontend UX (hide/disable/explain)
 *
 * The RBAC contract stores roles on-chain. The frontend queries them
 * to improve UX but NEVER relies on them for security — the contract
 * enforces authorization independently.
 *
 * Run: npx tsx examples/05-permission-checks.ts
 */

import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  Account,
  BASE_FEE,
} from "@stellar/stellar-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// Replace with your deployed RBAC / permission contract
const PERMISSION_CONTRACT_ID =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

// The account to check permissions for
const ACCOUNT_TO_CHECK =
  "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== On-Chain Permission Checks ===\n");

  const server = new SorobanRpc.Server(RPC_URL);

  console.log("Account:", ACCOUNT_TO_CHECK);
  console.log("Contract:", PERMISSION_CONTRACT_ID);
  console.log();

  // ─── Check individual roles ────────────────────────────────────────────────

  const rolesToCheck = ["minter", "burner", "transfer", "delegate", "admin"];

  console.log("Checking roles via has_role(account, role):\n");

  for (const role of rolesToCheck) {
    // Each check is a simulation call — no state change, no gas cost
    console.log(`  has_role("${role}"): [would query contract]`);
  }

  console.log();

  // ─── How StellarPermissionAdapter uses this ────────────────────────────────

  console.log("=== StellarPermissionAdapter.getPermissions() ===\n");
  console.log(`
  The adapter checks all roles in parallel:

    async getPermissions(account: string): Promise<Permissions> {
      const [canMint, canBurn, canTransfer, canDelegate, canRevoke] =
        await Promise.all([
          this.hasRole(account, "minter"),
          this.hasRole(account, "burner"),
          this.hasRole(account, "transfer"),
          this.hasRole(account, "delegate"),
          this.hasRole(account, "delegate"),
        ]);

      return { canMint, canBurn, canTransfer, canDelegate, canRevoke, roles };
    }
  `);

  // ─── How this drives the UI ────────────────────────────────────────────────

  console.log("=== Frontend UX Driven by Permissions ===\n");

  // Simulated result
  const permissions = {
    canMint: false,
    canBurn: false,
    canTransfer: true,
    canDelegate: true,
    canRevoke: true,
    roles: ["transfer", "delegate"],
  };

  console.log("Simulated permissions result:");
  console.log(JSON.stringify(permissions, null, 2));
  console.log();

  console.log("UI behavior based on these permissions:");
  console.log(
    `  Mint button:     ${permissions.canMint ? "ENABLED" : "DISABLED (no minter role)"}`
  );
  console.log(
    `  Burn button:     ${permissions.canBurn ? "ENABLED" : "DISABLED (no burner role)"}`
  );
  console.log(
    `  Transfer button: ${permissions.canTransfer ? "ENABLED" : "DISABLED"}`
  );
  console.log(
    `  Delegate button: ${permissions.canDelegate ? "ENABLED" : "DISABLED"}`
  );
  console.log(
    `  Revoke button:   ${permissions.canRevoke ? "ENABLED" : "DISABLED"}`
  );
  console.log();

  // ─── The has_role contract call (detailed) ─────────────────────────────────

  console.log("=== Detailed: has_role() Soroban Call ===\n");
  console.log(`
  Building the simulation:

    const tx = client.buildContractCall(
      sourceAccount,
      contractId,
      "has_role",
      [
        new Address(account).toScVal(),           // who
        nativeToScVal("minter", { type: "symbol" })  // role
      ]
    );

    const simulation = await client.simulateTransaction(tx);
    const result = scValToNative(simulation.result.retval); // boolean
  `);

  console.log("Key points:");
  console.log("  - Read-only: uses simulation only, no submission needed");
  console.log("  - Free: no fees for simulations");
  console.log("  - Fast: single RPC call per role");
  console.log("  - Parallel: all roles checked concurrently via Promise.all");
  console.log("  - Frontend-only: contract still enforces auth independently");
}

main().catch(console.error);
