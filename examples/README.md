# Stellar Working Examples

These examples demonstrate how to use the Stellar/Soroban integration in this repository.

## Prerequisites

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Stellar testnet settings (defaults work out of the box)
```

You'll also need:
- A Stellar testnet account (generate one at https://friendbot.stellar.org)
- For browser examples: [Freighter wallet extension](https://www.freighter.app/)
- For Node.js scripts: a testnet secret key

## Examples

| File | Description |
|------|-------------|
| `01-soroban-rpc-basics.ts` | Connect to Soroban RPC, fund an account, read ledger state |
| `02-token-balance-and-info.ts` | Query SEP-41 token balance, symbol, decimals, total supply |
| `03-token-transfer.ts` | Full Soroban token transfer lifecycle (simulate → sign → submit → confirm) |
| `04-delegation-lifecycle.ts` | Create, query, and revoke delegations via the delegation contract |
| `05-permission-checks.ts` | Query on-chain RBAC roles before performing actions |
| `06-error-handling.ts` | Demonstrates error normalization from raw Stellar errors to ChainError |
| `07-react-hook-usage.tsx` | React component example using the adapter pattern from the app |

## Running Script Examples

These are TypeScript scripts intended to be run with `tsx` or `ts-node`:

```bash
npx tsx examples/01-soroban-rpc-basics.ts
npx tsx examples/02-token-balance-and-info.ts
```

## Architecture Reference

```
React Component
      |
  Domain Hook (useTransfer, useDelegations, etc.)
      |
  Adapter Interface (TokenAdapter, DelegationAdapter)
      |
  Stellar Implementation (StellarTokenAdapter, StellarDelegationAdapter)
      |
  SorobanClient (simulation, preparation, submission)
      |
  Soroban RPC (https://soroban-testnet.stellar.org)
      |
  Soroban Smart Contract (on-chain)
```

The key insight: React components never import `@stellar/stellar-sdk` directly.
They use domain hooks that resolve to the correct chain adapter based on the active chain.
