# Security Documentation — ItemCreated Emitter Contract

**Standard:** DTCC/SEC Smart Contract Testing & Quality Requirements (August 19, 2026)  
**Last Updated:** August 19, 2026  
**Audit Status:** Pre-audit (testing framework in place, awaiting formal review)

---

## Purpose

This contract is a **dummy/test emitter** that produces `ItemCreated` events matching the schema the real Factory contract will emit. It exists to unblock the Substreams → SQL Server → GraphQL Mesh → Frontend pipeline while the production Factory contract is developed.

While this is a test utility, it follows the same security patterns as production contracts to serve as a reference implementation.

---

## Authorization Model

### Roles

| Role | Description | How Assigned |
|------|-------------|--------------|
| Controller | The single administrative address that can perform privileged operations | Set during `initialize()`, transferable via `transfer_control()` |
| Factory | The factory contract address (stored for reference/future use) | Set during `initialize()`, immutable after init |

### Privileged Functions

| Function | Who Can Call | Auth Mechanism |
|----------|-------------|----------------|
| `initialize` | Anyone (once) | `controller.require_auth()` + one-time guard |
| `emit_item_created` | Controller only | `require_auth()` on stored controller |
| `emit_batch` | Controller only | `require_auth()` on stored controller |
| `pause` | Controller only | `require_auth()` on stored controller |
| `unpause` | Controller only | `require_auth()` on stored controller |
| `transfer_control` | Controller only | `require_auth()` on stored controller |

### Unprivileged Functions (anyone can call)

| Function | Description |
|----------|-------------|
| `version` | Returns contract version (1) |
| `get_controller` | Returns current controller address |
| `get_factory` | Returns factory address |
| `is_paused` | Returns pause state |
| `get_item_count` | Returns total items created |

---

## Trust Assumptions

| Assumption | Detail |
|------------|--------|
| Controller is trusted | The controller address can emit arbitrary events, pause/unpause, and transfer control |
| Initialization caller provides correct addresses | No validation that controller/factory are "real" contracts — they're just addresses |
| Soroban runtime enforces `require_auth` | We rely on the Soroban host environment to enforce signature verification |
| Ledger timestamp is honest | `created_at` uses `env.ledger().timestamp()` — we trust the network's ledger time |
| Single controller model | No multi-sig, no timelocks, no role hierarchy (appropriate for a test utility) |
| Events are append-only | Once emitted, events cannot be retracted or modified |

### What This Contract Does NOT Guarantee

- It does not verify that `token_address` is a real deployed contract
- It does not enforce uniqueness of token addresses (it's an emitter, not a registry)
- It does not restrict the `admin` field — any address can be specified as admin in the event
- It does not implement timelocks or delayed operations

---

## Controller Model

### Initialization

```
deploy → initialize(controller, factory)
```

- `initialize` can only be called once (guarded by `INITIALIZED_KEY`)
- The caller must provide auth for the `controller` address
- After initialization, the contract is in **active** (unpaused) state
- `item_count` starts at 0

### Control Transfer

```
controller calls transfer_control(new_controller)
  → old controller loses all privileges immediately
  → new controller gains all privileges immediately
```

- No pending/accept pattern (appropriate for test utility)
- Transfer is immediate and irreversible
- Pause state is preserved across transfer

### Emergency Paths

| Action | Mechanism |
|--------|-----------|
| Stop all emissions | `pause()` — blocks `emit_item_created` and `emit_batch` |
| Resume operations | `unpause()` — restores normal operation |
| Transfer away from compromised key | `transfer_control(new_address)` |

---

## Emergency / Pause Behavior

### What Is Blocked When Paused

| Function | Blocked |
|----------|---------|
| `emit_item_created` | Yes |
| `emit_batch` | Yes |

### What Remains Available When Paused

| Function | Available |
|----------|-----------|
| `version` | Yes |
| `get_controller` | Yes |
| `get_factory` | Yes |
| `is_paused` | Yes |
| `get_item_count` | Yes |
| `pause` (already paused — no-op semantically) | Yes |
| `unpause` | Yes |
| `transfer_control` | Yes |

### Who Can Trigger

| Action | Who |
|--------|-----|
| Pause | Current controller only |
| Unpause | Current controller only |

### Recovery

If the controller key is compromised:
1. Attacker could unpause and emit false events
2. Mitigation: transfer control to a safe address before attacker acts
3. Downstream systems should validate event data independently

---

## Input Validation

| Input | Validation | Error |
|-------|-----------|-------|
| `name` | Must be non-empty | `"name cannot be empty"` |
| `symbol` | Must be non-empty | `"symbol cannot be empty"` |
| `decimals` | Must be ≤ 18 | `"decimals exceeds maximum (18)"` |
| `initial_supply` | Must be ≥ 0 | `"initial_supply cannot be negative"` |
| Batch size | Must be ≤ `MAX_BATCH_SIZE` (50) | `"batch size exceeds maximum"` |
| Batch vector lengths | Must all be equal | `"input vector length mismatch"` |

---

## Storage Layout

| Key | Type | Description |
|-----|------|-------------|
| `"controller"` | Address | Current controller address |
| `"factory"` | Address | Factory contract address |
| `"paused"` | bool | Whether the contract is paused |
| `"init"` | bool | Whether initialization has occurred |
| `"item_count"` | u64 | Total items created |

All storage uses instance-level storage (shared lifetime with the contract instance).

---

## Known Security Boundaries

| Boundary | On-chain | Off-chain |
|----------|----------|-----------|
| Authorization to emit | Enforced (require_auth) | N/A |
| Pause enforcement | Enforced | N/A |
| Event data validity | NOT enforced (any address/string accepted) | Substreams/indexer should validate |
| Token address existence | NOT verified | Downstream must check |
| Admin address correctness | NOT verified | Downstream must check |
| Event uniqueness | NOT enforced (emitter, not registry) | Indexer handles dedup |

---

## Threat Model (Test Utility Context)

| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Controller key compromised | False events emitted | Pause + transfer control; downstream validation |
| Replay/duplicate events | Indexer receives duplicates | Substreams deduplication by tx hash |
| Paused contract can't emit | Temporary DoS on testing | Unpause (requires controller) |
| False token addresses in events | Downstream indexes invalid data | GraphQL/frontend validate token existence |

---

## Audit Status

| Phase | Status |
|-------|--------|
| Testing framework | Complete |
| Unit tests | Complete (85+ tests) |
| Invariant tests | Complete (8 invariants) |
| Fuzz tests | Complete (256 iterations/property) |
| Mutation testing | Planned (blocked on crates.io access) |
| Internal security review | Pending |
| External audit (OpenZeppelin) | Not applicable for test utility |

---

## Differences from Production Factory

This test utility intentionally simplifies the real Factory contract:

| Aspect | This Contract | Production Factory |
|--------|---------------|-------------------|
| Token deployment | Not performed | Deploys real token contracts |
| Registry | None (emitter only) | Maintains token registry |
| Multi-controller | No | Yes (RBAC/TeamContext) |
| Timelocks | No | Yes |
| Delegation | No | Yes |
| Cross-contract auth | No | Yes (authorize_as_current_contract) |
| Event schema | Matches Factory | Authoritative source |

The event schema (`ItemCreatedEvent`) is the contract between this utility and the downstream pipeline. Changes to this schema require coordinated updates to Substreams, SQL Server, GraphQL Mesh, and frontend code.
