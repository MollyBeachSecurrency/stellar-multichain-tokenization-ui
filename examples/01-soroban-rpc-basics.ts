/**
 * Example 01: Soroban RPC Basics
 *
 * Demonstrates:
 * - Connecting to Soroban RPC (testnet)
 * - Funding a new account via Friendbot
 * - Fetching account details
 * - Reading ledger entries
 *
 * Run: npx tsx examples/01-soroban-rpc-basics.ts
 */

import {
  Keypair,
  SorobanRpc,
  Networks,
  Account,
} from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

async function main() {
  console.log("=== Soroban RPC Basics ===\n");

  // 1. Create a new keypair
  const keypair = Keypair.random();
  console.log("Generated new keypair:");
  console.log("  Public Key:", keypair.publicKey());
  console.log("  Secret Key:", keypair.secret());
  console.log();

  // 2. Fund the account using Friendbot (testnet only)
  console.log("Funding account via Friendbot...");
  const fundResponse = await fetch(
    `${FRIENDBOT_URL}?addr=${keypair.publicKey()}`
  );

  if (!fundResponse.ok) {
    throw new Error(`Friendbot funding failed: ${fundResponse.statusText}`);
  }

  console.log("Account funded successfully!\n");

  // 3. Connect to Soroban RPC
  const server = new SorobanRpc.Server(RPC_URL);

  // 4. Fetch the account
  const account = await server.getAccount(keypair.publicKey());
  console.log("Account details:");
  console.log("  Account ID:", account.accountId());
  console.log("  Sequence:", account.sequenceNumber());
  console.log();

  // 5. Get the latest ledger info
  const health = await server.getHealth();
  console.log("Network health:");
  console.log("  Status:", health.status);
  console.log();

  // 6. Get the latest ledger
  const latestLedger = await server.getLatestLedger();
  console.log("Latest ledger:");
  console.log("  Sequence:", latestLedger.sequence);
  console.log();

  // 7. Demonstrate how this maps to our SorobanClient wrapper
  console.log("--- How this maps to the project architecture ---");
  console.log(`
  In this project, raw SorobanRpc.Server calls are wrapped by:
  
    src/chains/stellar/rpc/SorobanClient.ts
  
  Usage in the codebase:
  
    const client = new SorobanClient("https://soroban-testnet.stellar.org");
    const account = await client.getAccount(publicKey);
    
  This keeps RPC details out of adapters and components.
  `);
}

main().catch(console.error);
