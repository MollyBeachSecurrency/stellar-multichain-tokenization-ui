# Testing Strategy — DTCC Stellar EVM Frontend

**Standard:** DTCC/SEC Smart Contract Testing & Quality Requirements (August 19, 2026)  
**Scope:** This repository covers both the frontend application (React/Next.js) and the ItemCreated emitter contract (Soroban/Rust)  
**Last Updated:** August 19, 2026

---

## Overview

This repository contains two testable codebases:

| Codebase | Location | Language | Framework | Coverage Target |
|----------|----------|----------|-----------|-----------------|
| Smart Contract | `contracts/item-created-emitter/` | Rust | soroban-sdk | 98% CI gate / 100% engineering target |
| Frontend | `src/` | TypeScript | Vitest + React Testing Library | 80% lines |

Both are enforced via GitHub Actions CI before merge.

---

## Smart Contract Testing

Full documentation: [`contracts/item-created-emitter/TESTING.md`](./contracts/item-created-emitter/TESTING.md)

### Test Categories

| Category | Count | Requirement |
|----------|-------|-------------|
| Unit tests | 16 | §3 — positive, negative, state-transition, duplicates |
| Authorization tests | 10 | §7 — controller, unauthorized, after transfer |
| Pause tests | 10 | §8 — blocks mutators, allows reads, cycles |
| Boundary tests | 14 | §6 — zero, max, off-by-one, empty, duplicates |
| Event tests | 10 | §10 — topic, payload, order, no-emit-on-failure |
| Invariant tests | 8 | §4 — monotonic count, pause enforcement, idempotent init |
| Fuzz tests | 9 (×256) | §5 — random inputs, property validation |
| Factory integration | 8 | §9 — init, emit, schema validation, pipeline |
| **Total** | **~85 tests, 2,400+ assertions** | |

### Running Contract Tests

```bash
cd contracts/item-created-emitter
cargo test --workspace           # All tests
make check                       # Full CI simulation (fmt + clippy + deny + build + test + coverage)
make coverage                    # Generate coverage report
make mutants                     # Mutation testing
```

### Contract Invariants

1. Item count is monotonically non-decreasing
2. Pause blocks ALL mutating operations
3. Event count equals item_count for all valid operations
4. Controller change does not affect pause state
5. Initialization happens exactly once
6. Count increments by exact number of items created

### Mutation Testing

Tool: `cargo-mutants`  
Status: Planned (pre-audit requirement)  
All security-relevant mutations (removed auth checks, reversed booleans, skipped pause) must be caught.

---

## Frontend Testing

### Framework

- **Test runner:** Vitest
- **Component testing:** React Testing Library
- **Environment:** jsdom
- **Coverage:** V8 provider

### Configuration

- `vitest.config.ts` — Test configuration with path aliases and coverage
- `src/test/setup.ts` — Global setup (testing-library matchers, env mocks)
- `.eslintrc.json` — Lint rules

### Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

### Running Frontend Tests

```bash
npm run test              # Single run
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Test Categories (Frontend)

| Category | Description | Example |
|----------|-------------|---------|
| Error mapper tests | Verify SDK errors normalize to ChainError | `StellarErrorMapper.test.ts`, `EvmErrorMapper.test.ts` |
| Adapter unit tests | Mock RPC, verify adapter logic | Token/Delegation/Permission adapters |
| Component tests | Render with mock adapters | TransferForm, DelegationList |
| Hook tests | Verify domain hooks with mock providers | useTransfer, useDelegations |
| Integration tests | Event schema decoding | ItemCreated event → frontend types |

### Frontend Testing Requirements (per §16)

| Requirement | Status |
|-------------|--------|
| Event schema validation | Implemented (StellarErrorMapper tests) |
| Integration test (contract → UI) | Planned (requires deployed contract) |
| GraphQL schema tests | Planned (requires Mesh endpoint) |
| No secrets committed | Enforced (CI scan) |
| Build passes (`npm run build`) | CI enforced |
| Lint passes (ESLint) | CI enforced |
| Type check passes (TypeScript strict) | CI enforced |

---

## CI Pipeline

### Contract CI (`.github/workflows/contract-ci.yml`)

| Check | Tool | Blocking |
|-------|------|----------|
| Format | `cargo fmt --check` | Yes |
| Lint | `cargo clippy -- -D warnings` | Yes |
| Dependencies | `cargo deny check` | Yes |
| Build (native) | `cargo build --release` | Yes |
| Build (WASM) | `cargo build --target wasm32-unknown-unknown` | Yes |
| Soroban build | `stellar contract build` | Yes |
| Tests | `cargo test --workspace` | Yes |
| Coverage | `cargo-llvm-cov` (98% gate) | Yes |

### Frontend CI (`.github/workflows/frontend-ci.yml`)

| Check | Tool | Blocking |
|-------|------|----------|
| Build | `npm run build` | Yes |
| TypeCheck | `npm run typecheck` | Yes |
| Lint | `npm run lint` | Yes |
| Tests | `npm run test` | Yes |
| Coverage | `npm run test:coverage` | Yes |
| Secrets scan | grep patterns | Yes |

---

## PR Requirements

Every PR must complete the checklist in `.github/PULL_REQUEST_TEMPLATE.md`.

**Smart contract PRs require:**
- Two approvals
- All CI checks green
- No unresolved security comments
- TESTING.md updated if test coverage changes

**Frontend PRs require:**
- Build + lint + typecheck + tests passing
- No secrets in diff

---

## Integration Testing (End-to-End Pipeline)

The MVP integration proof validates:

```
Contract deploy
  → initialize(controller, factory)
  → emit_item_created(token, name, symbol, decimals, supply, admin)
  → ItemCrtd event emitted
  → Substreams extracts event
  → SQL Server persists entity
  → GraphQL Mesh exposes query
  → Frontend renders token in UI
```

### Current Status

| Step | Owner | Status |
|------|-------|--------|
| Contract + event emission | This repo | Complete (test + deploy script) |
| Substreams ingestion | Derek | Blocked on testnet deployment |
| SQL Server persistence | Infrastructure | Pending |
| GraphQL Mesh | Infrastructure | Pending |
| Frontend rendering | This repo | Ready (adapter architecture in place) |

---

## Testing Layers Summary

Per the Aug 19 agreement:

| Layer | Purpose | Status |
|-------|---------|--------|
| Unit testing | Verify individual functions and branches | Implemented |
| Coverage | Demonstrate breadth of exercised code | 98% gate configured |
| Fuzz testing | Explore large/unpredictable input spaces | Implemented (256 iterations) |
| Invariant testing | Prove critical properties always hold | Implemented (8 invariants) |
| Integration testing | Verify components work together | Partially (contract-level done) |
| Mutation testing | Verify tests detect introduced faults | Configured (pre-audit) |
| Formal verification | Mathematically verify properties | Future (not currently required) |

---

## Related Documentation

- [Contract TESTING.md](./contracts/item-created-emitter/TESTING.md) — Detailed contract test documentation
- [Contract SECURITY.md](./contracts/item-created-emitter/SECURITY.md) — Authorization and security model
- [Contract README.md](./contracts/item-created-emitter/README.md) — Contract overview and deployment
- [PR Template](./.github/PULL_REQUEST_TEMPLATE.md) — Required checklist for all PRs
