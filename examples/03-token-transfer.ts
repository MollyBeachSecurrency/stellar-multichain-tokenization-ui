/**
 * Example 03: Token Transfer (Full Soroban Transaction Lifecycle)
 *
 * Demonstrates the complete Soroban transaction flow:
 *   1. Build the contract invocation
 *   2. Simulate to get resource requirements
 *   3. Prepare (assemble resources + auth)
 *   4. Sign with keypair (in production, this is the wallet)
 *   5. Submit to the network
 *   6. Poll for confirmation
 *
 * This is the same flow used by StellarTokenAdapter.transfer()
 * but shown step-by-step for educational purposes.
 *
 * Run: npx tsx examples/03-token-transfer.ts
 *
 * IMPORTANT: Set SENDER_SECRET below to a funded testnet account secret key.
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
  BASE_FEE,
  Transaction,
} from "@stellar/stellar-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// Replace with your funded testnet secret key
const SENDER_SECRET = "SCZANGBA5YHTNYVVV3C7CAZMCLPAVAR7BQIT3BIMVPUOA4YBGPGNU6ZY";

// Any valid testnet public key as recipient
const RECIPIENT = "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";

// Native XLM token contract (SAC) on testnet
const TOKEN_CONTRACT =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Transfer 1 XLM (7 decimals)
const AMOUNT = BigInt(10_000_000); // 1.0 XLM in stroops

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Soroban Token Transfer (Full Lifecycle) ===\n");

  const server = new SorobanRpc.Server(RPC_URL);
  const senderKeypair = Keypair.fromSecret(SENDER_SECRET);
  const senderPublicKey = senderKeypair.publicKey();

  console.log("Sender:", senderPublicKey);
  console.log("Recipient:", RECIPIENT);
  console.log("Amount:", Number(AMOUNT) / 10_000_000, "XLM");
  console.log();

  // ─── Step 1: Get the source account (for sequence number) ────────────────

  console.log("Step 1: Fetching source account...");
  const sourceAccount = await server.getAccount(senderPublicKey);
  console.log("  Sequence:", sourceAccount.sequenceNumber());
  console.log();

  // ─── Step 2: Build the contract invocation ───────────────────────────────

  console.log("Step 2: Building contract invocation...");
  const contract = new Contract(TOKEN_CONTRACT);

  const transferArgs: xdr.ScVal[] = [
    new Address(senderPublicKey).toScVal(), // from
    new Address(RECIPIENT).toScVal(), // to
    nativeToScVal(AMOUNT, { type: "i128" }), // amount
  ];

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("transfer", ...transferArgs))
    .setTimeout(300) // 5 minutes
    .build();

  console.log("  Transaction built (unsigned)");
  console.log();

  // ─── Step 3: Simulate the transaction ────────────────────────────────────

  console.log("Step 3: Simulating transaction...");
  const simulation = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simulation)) {
    console.error("Simulation failed:", (simulation as any).error);
    return;
  }

  const successSim =
    simulation as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  console.log("  Simulation succeeded");
  console.log("  Min resource fee:", successSim.minResourceFee);
  console.log();

  // ─── Step 4: Prepare (assemble resources & authorization) ────────────────

  console.log("Step 4: Preparing transaction (assembling resources)...");
  const prepared = SorobanRpc.assembleTransaction(tx, successSim).build();
  console.log("  Transaction prepared with resource footprint and auth entries");
  console.log();

  // ─── Step 5: Sign the transaction ───────────────────────────────────────

  console.log("Step 5: Signing transaction...");
  prepared.sign(senderKeypair);
  console.log("  Transaction signed by", senderPublicKey.substring(0, 10) + "...");
  console.log();

  // In the browser, this step uses the wallet adapter:
  //   const signedXdr = await wallet.signTransaction(prepared.toXDR());
  //   const signedTx = new Transaction(signedXdr, NETWORK_PASSPHRASE);

  // ─── Step 6: Submit ──────────────────────────────────────────────────────

  console.log("Step 6: Submitting transaction...");
  const sendResponse = await server.sendTransaction(prepared);
  console.log("  Status:", sendResponse.status);
  console.log("  Hash:", sendResponse.hash);
  console.log();

  if (sendResponse.status === "ERROR") {
    console.error("Submission error:", sendResponse.errorResult);
    return;
  }

  // ─── Step 7: Poll for confirmation ───────────────────────────────────────

  console.log("Step 7: Polling for confirmation...");
  const confirmed = await waitForConfirmation(server, sendResponse.hash);

  if (confirmed.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    console.log("  Transaction CONFIRMED!");
    console.log("  Ledger:", confirmed.ledger);
  } else {
    console.log("  Transaction FAILED");
  }

  console.log("\n--- Architecture Mapping ---");
  console.log(`
  In this project, steps 1-7 are encapsulated in:
  
    SorobanClient.prepareContractCall() — steps 1-4
    StellarWalletAdapter.signTransaction() — step 5
    SorobanClient.submitTransaction() — step 6
    SorobanClient.waitForConfirmation() — step 7
    
  The StellarTokenAdapter.transfer() method orchestrates all of them.
  React components just call: await adapter.transfer(recipient, amount)
  `);
}

// ─── Helper: Poll for transaction confirmation ───────────────────────────────

async function waitForConfirmation(
  server: SorobanRpc.Server,
  hash: string,
  timeoutMs = 30000,
  intervalMs = 2000
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await server.getTransaction(hash);

    if (response.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return response;
    }

    if (response.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      return response;
    }

    // NOT_FOUND = still pending
    console.log("  ...waiting (status: NOT_FOUND)");
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Confirmation timeout");
}

main().catch(console.error);
