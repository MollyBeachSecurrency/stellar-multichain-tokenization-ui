/**
 * Example 02: Token Balance and Info
 *
 * Demonstrates:
 * - Reading a SEP-41 (Soroban token standard) contract via simulation
 * - Querying balance, symbol, decimals, total_supply
 * - Using the SorobanClient helper from this project
 *
 * The Soroban token standard (SEP-41) defines:
 *   balance(address) -> i128
 *   symbol() -> string
 *   decimals() -> u32
 *   name() -> string
 *   total_supply() -> i128
 *   transfer(from, to, amount)
 *   approve(from, spender, amount, expiration_ledger)
 *
 * Run: npx tsx examples/02-token-balance-and-info.ts
 */

import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  Account,
  xdr,
  scValToNative,
  Address,
  BASE_FEE,
} from "@stellar/stellar-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// Native XLM wrapped as a Soroban token (SAC - Stellar Asset Contract)
// This is the wrapped XLM token on testnet — always available
const NATIVE_TOKEN_CONTRACT =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Replace with any Stellar testnet account address
const ACCOUNT_TO_QUERY =
  "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== SEP-41 Token Queries via Soroban RPC ===\n");

  const server = new SorobanRpc.Server(RPC_URL);

  // We need a source account to build simulation transactions.
  // For read-only queries, any funded account works.
  let sourceAccount: Account;
  try {
    sourceAccount = await server.getAccount(ACCOUNT_TO_QUERY);
  } catch {
    console.log(
      "Account not found on testnet. Fund it via https://friendbot.stellar.org/?addr=" +
        ACCOUNT_TO_QUERY
    );
    return;
  }

  // ─── Query: symbol() ─────────────────────────────────────────────────────

  const symbol = await queryContract(
    server,
    sourceAccount,
    NATIVE_TOKEN_CONTRACT,
    "symbol",
    []
  );
  console.log("Token symbol:", symbol);

  // ─── Query: decimals() ───────────────────────────────────────────────────

  const decimals = await queryContract(
    server,
    sourceAccount,
    NATIVE_TOKEN_CONTRACT,
    "decimals",
    []
  );
  console.log("Token decimals:", decimals);

  // ─── Query: balance(address) ─────────────────────────────────────────────

  const balance = await queryContract(
    server,
    sourceAccount,
    NATIVE_TOKEN_CONTRACT,
    "balance",
    [new Address(ACCOUNT_TO_QUERY).toScVal()]
  );
  console.log("Token balance (raw):", balance);

  if (typeof balance === "bigint" && typeof decimals === "number") {
    const formatted = Number(balance) / Math.pow(10, decimals);
    console.log("Token balance (formatted):", formatted);
  }

  console.log("\n--- Architecture Note ---");
  console.log(`
  In the project, these queries are encapsulated in:
  
    src/chains/stellar/adapters/StellarTokenAdapter.ts
    
  Which implements the domain interface:
  
    src/domain/token/TokenAdapter.ts
    
  React components use:
  
    const adapter = new StellarTokenAdapter(client, wallet, contractId);
    const balance = await adapter.getBalance(address);
    const sym = await adapter.symbol();
    const dec = await adapter.decimals();
    
  The adapter handles all Soroban RPC simulation logic internally.
  `);
}

// ─── Helper: Query a Soroban contract via simulation ─────────────────────────

async function queryContract(
  server: SorobanRpc.Server,
  sourceAccount: Account,
  contractId: string,
  method: string,
  args: xdr.ScVal[]
): Promise<unknown> {
  const contract = new Contract(contractId);

  // Build the transaction
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate (doesn't submit to the network — just reads state)
  const simulation = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simulation)) {
    throw new Error(
      `Simulation error for ${method}: ${JSON.stringify(
        (simulation as any).error
      )}`
    );
  }

  // Extract the return value
  const successResult = simulation as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  if (successResult.result) {
    return scValToNative(successResult.result.retval);
  }

  return null;
}

main().catch(console.error);
