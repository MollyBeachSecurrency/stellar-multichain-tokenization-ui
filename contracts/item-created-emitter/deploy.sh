#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# ItemCreated Emitter — Build, Deploy, and Emit 3 Test Token Instances
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script:
#   1. Builds the Soroban contract to WASM
#   2. Deploys it to Stellar public testnet
#   3. Invokes emit_item_created() 3 times with realistic test data
#
# Prerequisites:
#   - Rust + wasm32-unknown-unknown target (rustup target add wasm32-unknown-unknown)
#   - stellar CLI (brew install stellar-cli OR cargo install stellar-cli)
#   - A funded testnet identity (the script creates one if needed)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# The emitted events will be visible to Derek's Substreams pipeline.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

NETWORK="testnet"
IDENTITY="item-created-deployer"

echo "═══════════════════════════════════════════════════════════════"
echo "  ItemCreated Emitter — Deploy & Seed (Stellar Testnet)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Ensure identity exists ──────────────────────────────────────────

if ! stellar keys address "$IDENTITY" &>/dev/null; then
  echo "Creating new testnet identity: $IDENTITY"
  stellar keys generate "$IDENTITY" --network "$NETWORK"
  echo "Funding via friendbot..."
  stellar keys fund "$IDENTITY" --network "$NETWORK"
else
  echo "Using existing identity: $IDENTITY"
fi

DEPLOYER_ADDRESS=$(stellar keys address "$IDENTITY")
echo "Deployer address: $DEPLOYER_ADDRESS"
echo ""

# ─── Step 2: Build the contract ──────────────────────────────────────────────

echo "Building contract..."
cd "$(dirname "$0")"
cargo build --release --target wasm32-unknown-unknown

WASM_PATH="target/wasm32-unknown-unknown/release/item_created_emitter.wasm"

if [ ! -f "$WASM_PATH" ]; then
  echo "ERROR: WASM not found at $WASM_PATH"
  exit 1
fi

echo "WASM built: $WASM_PATH"
echo "Size: $(wc -c < "$WASM_PATH") bytes"
echo ""

# ─── Step 3: Deploy the contract ─────────────────────────────────────────────

echo "Deploying to Stellar testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$IDENTITY" \
  --network "$NETWORK")

echo "Contract deployed!"
echo "Contract ID: $CONTRACT_ID"
echo ""

# ─── Step 4: Verify deployment ───────────────────────────────────────────────

echo "Verifying deployment (calling version())..."
VERSION=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- version)

echo "Contract version: $VERSION"
echo ""

# ─── Step 5: Emit 3 ItemCreated events ───────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  Emitting 3 test ItemCreated events"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Generate 3 fake token contract addresses (random testnet addresses)
TOKEN1=$(stellar keys generate token1-temp --network "$NETWORK" 2>/dev/null && stellar keys address token1-temp || stellar keys address token1-temp)
TOKEN2=$(stellar keys generate token2-temp --network "$NETWORK" 2>/dev/null && stellar keys address token2-temp || stellar keys address token2-temp)
TOKEN3=$(stellar keys generate token3-temp --network "$NETWORK" 2>/dev/null && stellar keys address token3-temp || stellar keys address token3-temp)

# ─── Token 1: DTCC Treasury Bond 2025 ────────────────────────────────────────

echo "Emitting ItemCreated #1: DTCC Treasury Bond 2025 (DTB25)..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- emit_item_created \
  --token_address "$TOKEN1" \
  --name "DTCC Treasury Bond 2025" \
  --symbol "DTB25" \
  --decimals 7 \
  --initial_supply 10000000000000 \
  --admin "$DEPLOYER_ADDRESS"

echo "  Token 1 emitted (1,000,000 DTB25)"
echo ""

# ─── Token 2: DTCC Corporate Note A ──────────────────────────────────────────

echo "Emitting ItemCreated #2: DTCC Corporate Note A (DCNA)..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- emit_item_created \
  --token_address "$TOKEN2" \
  --name "DTCC Corporate Note A" \
  --symbol "DCNA" \
  --decimals 7 \
  --initial_supply 5000000000000 \
  --admin "$DEPLOYER_ADDRESS"

echo "  Token 2 emitted (500,000 DCNA)"
echo ""

# ─── Token 3: DTCC Municipal Bond X ──────────────────────────────────────────

echo "Emitting ItemCreated #3: DTCC Municipal Bond X (DMBX)..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- emit_item_created \
  --token_address "$TOKEN3" \
  --name "DTCC Municipal Bond X" \
  --symbol "DMBX" \
  --decimals 7 \
  --initial_supply 20000000000000 \
  --admin "$DEPLOYER_ADDRESS"

echo "  Token 3 emitted (2,000,000 DMBX)"
echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Contract ID:     $CONTRACT_ID"
echo "Deployer:        $DEPLOYER_ADDRESS"
echo "Network:         Stellar Public Testnet"
echo ""
echo "Emitted Events:"
echo "  1. DTB25  — DTCC Treasury Bond 2025   (1,000,000 supply)"
echo "  2. DCNA   — DTCC Corporate Note A     (500,000 supply)"
echo "  3. DMBX   — DTCC Municipal Bond X     (2,000,000 supply)"
echo ""
echo "Event topic filter for Substreams:"
echo "  topic[0] = Symbol('ItemCrtd')"
echo "  topic[1] = admin address ($DEPLOYER_ADDRESS)"
echo ""
echo "Event data structure (ItemCreatedEvent):"
echo "  { token_address, name, symbol, decimals, initial_supply, admin, created_at }"
echo ""
echo "Derek: Use contract ID above to configure your Substreams source."
echo "═══════════════════════════════════════════════════════════════"
