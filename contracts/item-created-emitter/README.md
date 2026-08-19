# ItemCreated Emitter Contract

A dummy Soroban contract that emits `ItemCreated` events matching the data structure the real Factory contract will eventually produce. Deployed to Stellar public testnet with 3 test token instances to unblock the LL3/Substreams pipeline.

## Purpose

Derek needs `ItemCreated` events on testnet to build and test the Substreams indexing pipeline. The real Factory contract isn't ready yet, so this emitter produces the same event shape so the pipeline work can proceed in parallel.

## Event Structure

**Topic:** `("ItemCrtd", admin_address)`

**Data (ItemCreatedEvent):**

```rust
pub struct ItemCreatedEvent {
    pub token_address: Address,   // The deployed token contract address
    pub name: String,             // e.g. "DTCC Treasury Bond 2025"
    pub symbol: String,           // e.g. "DTB25"
    pub decimals: u32,            // Typically 7 for Stellar
    pub initial_supply: i128,     // Raw amount (with decimals)
    pub admin: Address,           // Creator/owner
    pub created_at: u64,          // Ledger timestamp
}
```

## Contract Functions

| Function | Purpose |
|----------|---------|
| `emit_item_created(token_address, name, symbol, decimals, initial_supply, admin)` | Emit a single ItemCreated event |
| `emit_batch(token_addresses, names, symbols, decimals_list, initial_supplies, admin)` | Emit multiple events in one tx |
| `version()` | Returns `1` (health check) |

## Quick Deploy

```bash
cd contracts/item-created-emitter
chmod +x deploy.sh
./deploy.sh
```

The script handles everything:
1. Creates a testnet identity (if needed)
2. Builds the WASM
3. Deploys to Stellar testnet
4. Emits 3 test `ItemCreated` events

## Test Token Instances

The deploy script emits events for these 3 tokens:

| # | Symbol | Name | Initial Supply |
|---|--------|------|---------------|
| 1 | DTB25 | DTCC Treasury Bond 2025 | 1,000,000 |
| 2 | DCNA | DTCC Corporate Note A | 500,000 |
| 3 | DMBX | DTCC Municipal Bond X | 2,000,000 |

All use 7 decimals (Stellar standard).

## Substreams Configuration

To filter these events in your Substreams module:

```yaml
# substreams.yaml (example)
modules:
  - name: map_item_created
    kind: map
    inputs:
      - source: sf.stellar.type.v1.LedgerCloseMeta
    output:
      type: proto:item.v1.ItemCreatedEvents
```

Filter by:
- **Contract ID:** (printed by deploy.sh)
- **Event topic[0]:** `Symbol("ItemCrtd")`
- **Event data:** Decode as `ItemCreatedEvent` struct

## Manual Invocation

If you need to emit additional test events after deployment:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source item-created-deployer \
  --network testnet \
  -- emit_item_created \
  --token_address <ANY_STELLAR_ADDRESS> \
  --name "My Test Token" \
  --symbol "MTT" \
  --decimals 7 \
  --initial_supply 1000000000000 \
  --admin <YOUR_ADDRESS>
```

## Prerequisites

- Rust (with `wasm32-unknown-unknown` target)
- `stellar` CLI v20+
- Network access to crates.io and Stellar testnet

```bash
# Install prerequisites if needed
rustup target add wasm32-unknown-unknown
brew install stellar-cli   # or: cargo install stellar-cli
```

## Running Tests

```bash
cargo test
```

Tests verify that events are emitted correctly (runs locally, no network needed).
