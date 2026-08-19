/**
 * Example 04: Delegation Lifecycle
 *
 * Demonstrates the full delegation workflow on Soroban:
 *   - Create a delegation (grant permissions to another address)
 *   - Query delegations for an account
 *   - Check if a delegation is active
 *   - Revoke a delegation
 *   - Batch revoke multiple delegations
 *
 * The Delegation Account contract is the primary vertical slice for
 * this project. It exercises:
 *   - Authorization entries
 *   - RBAC
 *   - Timelocks / expiration
 *   - Soroban persistent storage
 *   - Contract events (for indexing)
 *
 * Run: npx tsx examples/04-delegation-lifecycle.ts
 *
 * NOTE: Requires a deployed delegation contract on testnet.
 *       Replace DELEGATION_CONTRACT_ID with your deployed contract.
 */

import {
  Keypair,
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// Replace with your deployed delegation contract
const DELEGATION_CONTRACT_ID =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

// Replace with a funded testnet secret key
const DELEGATOR_SECRET = "SCZANGBA5YHTNYVVV3C7CAZMCLPAVAR7BQIT3BIMVPUOA4YBGPGNU6ZY";

// The address receiving delegated permissions
const DELEGATEE_PUBLIC =
  "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Delegation Lifecycle on Soroban ===\n");

  const server = new SorobanRpc.Server(RPC_URL);
  const delegatorKeypair = Keypair.fromSecret(DELEGATOR_SECRET);
  const delegatorPublic = delegatorKeypair.publicKey();

  console.log("Delegator:", delegatorPublic);
  console.log("Delegatee:", DELEGATEE_PUBLIC);
  console.log("Contract:", DELEGATION_CONTRACT_ID);
  console.log();

  // ─── 1. Create Delegation ─────────────────────────────────────────────────

  console.log("=== Creating Delegation ===");
  console.log("Granting permissions: [transfer, delegate]");
  console.log("Expires at: ledger timestamp + 1 hour");
  console.log();

  // Build the create_delegation invocation
  const permissions = ["transfer", "delegate"];
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

  const createArgs: xdr.ScVal[] = [
    new Address(delegatorPublic).toScVal(), // delegator
    new Address(DELEGATEE_PUBLIC).toScVal(), // delegatee
    nativeToScVal(
      permissions.map((p) => nativeToScVal(p, { type: "symbol" }))
    ), // permissions vec
    nativeToScVal(expiresAt, { type: "u64" }), // expires_at
  ];

  console.log("Transaction args (ScVal encoded):");
  console.log("  delegator:", delegatorPublic.substring(0, 10) + "...");
  console.log("  delegatee:", DELEGATEE_PUBLIC.substring(0, 10) + "...");
  console.log("  permissions:", permissions);
  console.log("  expires_at:", expiresAt.toString());
  console.log();

  // In production, the full flow is:
  //   const { transaction } = await client.prepareContractCall(
  //     delegatorPublic, contractId, "create_delegation", createArgs
  //   );
  //   const signedXdr = await wallet.signTransaction(transaction.toXDR());
  //   const signedTx = new Transaction(signedXdr, NETWORK_PASSPHRASE);
  //   const response = await client.submitTransaction(signedTx);
  //   await client.waitForConfirmation(response.hash);

  console.log("  [Would submit create_delegation transaction here]");
  console.log();

  // ─── 2. Query Delegations ─────────────────────────────────────────────────

  console.log("=== Querying Delegations ===");
  console.log("Calling get_delegations(account)...\n");

  // This is a read-only call via simulation
  const queryArgs: xdr.ScVal[] = [
    new Address(delegatorPublic).toScVal(),
  ];

  console.log("  In the adapter, this is:");
  console.log("    const delegations = await adapter.getDelegations(account);");
  console.log();
  console.log("  The raw Soroban response would be an array of structs:");
  console.log("  [");
  console.log("    {");
  console.log("      id: 'del_001',");
  console.log("      delegator: 'GABC...',");
  console.log("      delegatee: 'GXYZ...',");
  console.log("      permissions: ['transfer', 'delegate'],");
  console.log("      created_at: 1721234567,");
  console.log("      expires_at: 1721238167,");
  console.log("      active: true");
  console.log("    }");
  console.log("  ]");
  console.log();

  // ─── 3. Check Active Status ───────────────────────────────────────────────

  console.log("=== Checking Delegation Status ===");
  console.log("Calling is_active(delegation_id)...\n");

  console.log("  const isActive = await adapter.isActive('del_001');");
  console.log("  // Returns: true (not expired, not revoked)");
  console.log();

  // ─── 4. Revoke Delegation ─────────────────────────────────────────────────

  console.log("=== Revoking Delegation ===");
  console.log("Calling revoke_delegation(caller, delegation_id)...\n");

  const revokeArgs: xdr.ScVal[] = [
    new Address(delegatorPublic).toScVal(), // caller (must be delegator or admin)
    nativeToScVal("del_001", { type: "symbol" }), // delegation_id
  ];

  console.log("  This triggers:");
  console.log("  1. Simulation (check authorization)");
  console.log("  2. Prepare (assemble auth entries)");
  console.log("  3. Sign (wallet approval)");
  console.log("  4. Submit");
  console.log("  5. Confirm");
  console.log("  6. Contract emits 'delegation_revoked' event");
  console.log("  7. Substreams picks up event → indexes to GraphQL");
  console.log();

  // ─── 5. Batch Revoke ──────────────────────────────────────────────────────

  console.log("=== Batch Revoke ===");
  console.log("Revoking multiple delegations in one transaction...\n");

  const batchIds = ["del_001", "del_002", "del_003"];
  const batchArgs: xdr.ScVal[] = [
    new Address(delegatorPublic).toScVal(),
    nativeToScVal(
      batchIds.map((id) => nativeToScVal(id, { type: "symbol" }))
    ),
  ];

  console.log("  const result = await adapter.batchRevoke(['del_001', 'del_002', 'del_003']);");
  console.log("  // Single transaction, multiple revocations");
  console.log();

  // ─── Architecture Summary ─────────────────────────────────────────────────

  console.log("=== How This Maps to the Project ===\n");
  console.log(`
  src/chains/stellar/adapters/StellarDelegationAdapter.ts
    - createDelegation(request) — full tx lifecycle
    - getDelegations(account)   — read via simulation
    - getDelegation(id)         — single delegation lookup
    - revokeDelegation(id)      — full tx lifecycle
    - batchRevoke(ids)          — full tx lifecycle
    - isActive(id)              — read via simulation

  The adapter implements:
    src/domain/delegation/DelegationAdapter.ts (interface)

  React components use hooks that call the adapter:
    const { delegations, revoke, create } = useDelegations();
    
  The delegation page flow:
    1. GraphQL query loads delegations (indexed data)
    2. User clicks "Revoke"
    3. Permission check via PermissionAdapter
    4. DelegationAdapter.revokeDelegation(id)
    5. Transaction status shown via TransactionStatusDisplay
    6. Contract event emitted
    7. Substreams → GraphQL → UI reconciliation
  `);
}

main().catch(console.error);
