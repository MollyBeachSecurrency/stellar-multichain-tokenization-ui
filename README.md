# DTCC Stellar EVM Frontend

A multi-chain institutional tokenization frontend that supports both Ethereum/EVM and Stellar/Soroban within a single React and Next.js application.

The project is designed around a chain-abstraction architecture that keeps blockchain-specific SDK behavior out of shared UI components. Ethereum integrations use Wagmi and viem, while Stellar integrations use the Stellar JavaScript SDK and Soroban RPC. Shared business capabilities such as token balances, transfers, permissions, delegation, and transaction state are exposed through domain-level adapters.

The goal is not to make Ethereum and Stellar behave identically. Instead, the application shares business logic and user experience while keeping chain-specific transaction semantics isolated inside their respective implementations.

## Overview

The existing platform is primarily Ethereum/EVM-oriented. This project extends that architecture to support Stellar and Soroban without creating an entirely separate frontend.

At a high level:

```text
                        React / Next.js
                              |
                         Domain Hooks
                              |
                     Application Services
                              |
                     Capability Adapters
                        /           \
                       /             \
               EVM Adapters       Stellar Adapters
               Wagmi / viem       Stellar JS SDK
                    |                  |
               Ethereum RPC       Soroban RPC
                    |                  |
               Solidity            Soroban
               Contracts           Contracts
```

The frontend communicates with blockchain functionality through domain interfaces rather than directly importing blockchain SDKs throughout the component tree.

## Goals

The primary goals of this project are:

* Support Ethereum and Stellar from one frontend application
* Preserve the existing React and Next.js application architecture
* Keep Wagmi, viem, Stellar SDK, and Soroban RPC concerns isolated
* Share business capabilities where practical
* Preserve chain-specific transaction behavior where necessary
* Support wallet connection for multiple blockchain ecosystems
* Provide normalized transaction state across chains
* Integrate indexed blockchain data through GraphQL
* Support Stellar event ingestion and indexing
* Handle eventual consistency between transaction confirmation and indexed data
* Provide reusable permission and RBAC-aware UI behavior
* Make the application extensible to additional blockchain integrations

## Non-Goals

This project does not attempt to create a fake universal blockchain API.

Ethereum and Stellar have fundamentally different transaction models.

For example:

### Ethereum

* ABI encoding
* gas estimation
* gas pricing
* nonce handling
* EVM revert behavior
* transaction receipts

### Stellar / Soroban

* transaction simulation
* Soroban resource footprints
* authorization entries
* ledger sequence handling
* transaction preparation
* storage TTL considerations

These differences remain inside chain-specific implementations.

## Tech Stack

### Frontend

* React
* TypeScript
* Next.js
* React Query or equivalent server-state management
* GraphQL

### Ethereum

* Wagmi
* viem
* Ethereum JSON-RPC
* Solidity contract ABIs

### Stellar

* Stellar JavaScript SDK
* Soroban RPC
* Soroban smart contracts
* Stellar wallet integration

### Data and Indexing

* GraphQL
* Substreams
* Event-driven indexing

### Testing

* Vitest or Jest
* React Testing Library
* Mock adapters
* Integration tests against supported blockchain environments

## Architecture

### Shared Application Layer

React components should interact with domain operations rather than blockchain SDKs directly.

Instead of:

```tsx
const result = useWriteContract({
  abi,
  address,
  functionName: "transfer",
});
```

or directly constructing a Soroban transaction inside a component, the UI should call something like:

```tsx
const { transfer } = useTransfer();

await transfer({
  recipient,
  amount,
});
```

The hook resolves the appropriate chain implementation.

## Domain Adapters

Adapters represent application capabilities.

```ts
interface TokenAdapter {
  getBalance(address: string): Promise<bigint>;

  transfer(
    recipient: string,
    amount: bigint
  ): Promise<TransactionResult>;

  mint(
    recipient: string,
    amount: bigint
  ): Promise<TransactionResult>;

  burn(
    amount: bigint
  ): Promise<TransactionResult>;
}
```

Each blockchain implements the same business capability differently.

```ts
class EvmTokenAdapter implements TokenAdapter {
  // Wagmi / viem implementation
}

class StellarTokenAdapter implements TokenAdapter {
  // Stellar SDK / Soroban implementation
}
```

This architecture lets React depend on `TokenAdapter` rather than directly depending on either blockchain SDK.

## Adapter Categories

Rather than building one oversized `BlockchainAdapter`, functionality is divided by domain.

Suggested interfaces include:

```text
WalletAdapter

TokenAdapter

DelegationAdapter

PermissionAdapter

ContractAdapter

TransactionAdapter

IndexerAdapter
```

This keeps interfaces focused and prevents unrelated blockchain functionality from becoming coupled.

## Chain Provider

The application maintains the active blockchain through a centralized provider.

```ts
export type SupportedChain =
  | "ethereum"
  | "stellar";
```

Conceptually:

```text
ChainProvider
     |
activeChain
     |
AdapterRegistry
   /       \
EVM       Stellar
```

The provider exposes the appropriate adapters to the rest of the application.

Components should not contain repeated logic such as:

```ts
if (chain === "ethereum") {
  // Ethereum implementation
}

if (chain === "stellar") {
  // Stellar implementation
}
```

Chain selection should remain centralized.

## Ethereum Adapter

The EVM adapter handles Ethereum-specific integration.

Responsibilities include:

* Wagmi configuration
* viem clients
* wallet connection
* contract reads
* contract writes
* ABI encoding
* gas estimation
* nonce handling
* transaction submission
* transaction receipt monitoring
* EVM error normalization

Example flow:

```text
React
  |
Domain Hook
  |
EVM Adapter
  |
Wagmi / viem
  |
Ethereum RPC
  |
Solidity Contract
```

## Stellar Adapter

The Stellar implementation handles Soroban-specific transaction behavior.

Responsibilities include:

* wallet connection
* Stellar account resolution
* contract invocation construction
* Soroban RPC communication
* transaction simulation
* simulation result processing
* authorization handling
* transaction preparation
* wallet signing
* submission
* transaction confirmation
* Stellar error normalization

The Soroban transaction lifecycle is more explicit than the standard EVM flow.

Typical flow:

```text
User Action
    |
Validate Input
    |
Resolve Wallet
    |
Build Contract Invocation
    |
Simulate Transaction
    |
Inspect Simulation
    |
Prepare Transaction
    |
Request Signature
    |
Submit
    |
Poll Status
    |
Confirm
    |
Update UI
```

## Transaction State

A blockchain transaction should not be represented using only:

```ts
isLoading: boolean;
```

The application uses a richer transaction state model:

```ts
export type TransactionStatus =
  | "idle"
  | "preparing"
  | "simulating"
  | "awaiting_signature"
  | "submitting"
  | "pending"
  | "confirmed"
  | "indexing"
  | "success"
  | "error";
```

This allows the UI to clearly communicate transaction progress.

Examples:

```text
Preparing transaction

Simulating transaction

Waiting for wallet approval

Transaction submitted

Transaction confirmed

Updating application data

Complete
```

This is particularly useful in an institutional application where users need to understand exactly which stage of an operation has completed.

## Indexed Data

RPC and indexed data have separate responsibilities.

### RPC

Use blockchain RPC for:

* transaction simulation
* transaction submission
* transaction confirmation
* targeted state reads
* direct contract interaction

### Indexer / GraphQL

Use indexed data for:

* historical activity
* asset lists
* delegation lists
* search
* filtering
* event-derived state
* contract discovery
* dashboard data
* application-oriented queries

The frontend should not attempt to discover the entire blockchain application state through arbitrary RPC calls.

## Stellar Indexing

The expected Stellar data pipeline is:

```text
Stellar Network
      |
Soroban Contract Events
      |
Substreams
      |
Indexer
      |
GraphQL
      |
React Application
```

The indexer provides frontend-friendly queries while Soroban RPC remains responsible for direct blockchain interaction.

## Eventual Consistency

Transaction confirmation and indexed state do not necessarily happen at the same time.

Example:

```text
User submits delegation revocation
              |
              v
Soroban transaction confirms
              |
              v
Frontend knows operation succeeded
              |
              v
Contract event emitted
              |
              v
Substreams processes event
              |
              v
GraphQL updates
              |
              v
UI receives synchronized data
```

The application should therefore distinguish between:

```text
confirmed
```

and:

```text
indexed / synchronized
```

A transaction should not appear to fail simply because GraphQL has not yet processed the corresponding event.

## Wallet Architecture

Wallet behavior also remains chain-specific.

```ts
export interface WalletAdapter {
  connect(): Promise<WalletSession>;

  disconnect(): Promise<void>;

  getSession(): WalletSession | null;
}
```

Example shared session:

```ts
export interface WalletSession {
  chain: "ethereum" | "stellar";
  address: string;
  network: string;
  connected: boolean;
}
```

Ethereum wallet implementation:

```text
WalletAdapter
    |
Wagmi
    |
EVM Wallet
```

Stellar wallet implementation:

```text
WalletAdapter
    |
Stellar Wallet Integration
    |
Stellar Account
```

## Delegation Account

Delegation Account is a strong initial vertical slice for the Stellar implementation because the contract exposes meaningful authorization, lifecycle, and event-driven behavior.

The contract includes concepts such as:

* delegation creation
* delegation revocation
* batch revocation
* authorization
* controllers
* RBAC
* timelocks
* queued operations
* expiration
* sub-authorization
* Soroban events
* persistent storage
* TTL behavior

A complete frontend flow could look like:

```text
Delegations Page
       |
GraphQL Query
       |
Display Active Delegations
       |
User Clicks Revoke
       |
Permission Check
       |
DelegationAdapter.revoke()
       |
Stellar Adapter
       |
Simulation
       |
Wallet Signature
       |
Submission
       |
Confirmation
       |
Contract Event
       |
Substreams
       |
GraphQL
       |
UI Reconciliation
```

## RBAC and Permissions

The frontend may use authorization information to improve UX.

For example:

```ts
const permissions = usePermissions(account);
```

The UI may:

* hide unauthorized actions
* disable unavailable actions
* explain why an action cannot be performed
* request additional confirmation for sensitive actions

However, frontend authorization is never the security boundary.

The blockchain contract or backend must remain authoritative because users can bypass the frontend entirely.

## Error Handling

Raw SDK errors should not propagate directly into UI components.

Instead, normalize them:

```ts
export interface ChainError {
  category:
    | "wallet"
    | "simulation"
    | "authorization"
    | "network"
    | "contract"
    | "indexer";

  message: string;

  retryable: boolean;

  cause?: unknown;
}
```

Examples:

```text
WagmiError
      |
EvmErrorMapper
      |
ChainError
```

```text
Soroban RPC Error
      |
StellarErrorMapper
      |
ChainError
```

React only needs to understand the normalized application error.

## Dynamic Contract Form Generator

The project may also include a schema-driven contract form generator.

For EVM contracts:

```text
ABI
 |
ABI Parser
 |
Normalized Function Schema
 |
Recursive Form Renderer
 |
Validation
 |
Serialization
 |
Contract Adapter
```

A primitive type maps directly to a field.

```text
address
  -> AddressInput

uint256
  -> BigIntegerInput

bool
  -> Checkbox

string
  -> TextInput
```

Nested data is rendered recursively.

```text
tuple
  |
NestedFieldGroup

tuple[]
  |
DynamicArrayField
  |
NestedFieldGroup
```

This supports structures containing nested structs, arrays, and arrays of structs without requiring custom forms for every function. The interview specifically explored using recursive rendering for these deeply nested contract inputs.

## Offline Request Queue

Transient network failures should be recoverable.

The application can persist retryable operations using IndexedDB.

```text
Request
   |
Network Failure
   |
Classify Failure
   |
Retryable?
   |
Persist Request
   |
Connection Restored
   |
Retry Processor
   |
Replay Request
```

Example:

```ts
export interface QueuedRequest {
  id: string;
  operation: string;
  payload: unknown;
  createdAt: number;
  retryCount: number;
  idempotencyKey: string;
}
```

Requests should only be retried when appropriate.

A `400`, authorization error, or contract rejection should not be treated the same as a temporary connectivity failure.

Idempotency and transaction reconciliation should also be used where duplicate execution would be dangerous.

## Suggested Project Structure

```text
src/
├── app/
│   ├── layout.tsx
│   ├── providers/
│   │   ├── AppProviders.tsx
│   │   ├── ChainProvider.tsx
│   │   ├── WalletProvider.tsx
│   │   └── QueryProvider.tsx
│   └── routes/
│
├── components/
│   ├── common/
│   ├── wallet/
│   ├── transactions/
│   ├── tokens/
│   └── delegations/
│
├── domain/
│   ├── wallet/
│   │   ├── WalletAdapter.ts
│   │   └── types.ts
│   │
│   ├── token/
│   │   ├── TokenAdapter.ts
│   │   ├── hooks/
│   │   └── types.ts
│   │
│   ├── delegation/
│   │   ├── DelegationAdapter.ts
│   │   ├── hooks/
│   │   └── types.ts
│   │
│   └── permissions/
│       ├── PermissionAdapter.ts
│       └── types.ts
│
├── chains/
│   ├── ethereum/
│   │   ├── adapters/
│   │   │   ├── EvmTokenAdapter.ts
│   │   │   ├── EvmWalletAdapter.ts
│   │   │   └── EvmDelegationAdapter.ts
│   │   ├── contracts/
│   │   ├── errors/
│   │   ├── wagmi/
│   │   └── viem/
│   │
│   └── stellar/
│       ├── adapters/
│       │   ├── StellarTokenAdapter.ts
│       │   ├── StellarWalletAdapter.ts
│       │   └── StellarDelegationAdapter.ts
│       ├── contracts/
│       ├── errors/
│       ├── rpc/
│       └── sdk/
│
├── data/
│   ├── graphql/
│   ├── queries/
│   ├── mutations/
│   └── indexing/
│
├── transactions/
│   ├── TransactionManager.ts
│   ├── TransactionStatus.ts
│   └── useTransaction.ts
│
├── forms/
│   ├── abi/
│   │   ├── parseAbi.ts
│   │   └── normalizeAbi.ts
│   ├── fields/
│   ├── ContractFunctionForm.tsx
│   └── RecursiveField.tsx
│
├── offline/
│   ├── RequestQueue.ts
│   ├── RetryProcessor.ts
│   └── IndexedDbStore.ts
│
├── lib/
│   ├── errors/
│   ├── validation/
│   └── formatting/
│
└── types/
```

## Example Environment Configuration

```bash
# Application
NEXT_PUBLIC_DEFAULT_CHAIN=stellar

# Ethereum
NEXT_PUBLIC_EVM_CHAIN_ID=
NEXT_PUBLIC_EVM_RPC_URL=

# Stellar
NEXT_PUBLIC_STELLAR_NETWORK=
NEXT_PUBLIC_STELLAR_RPC_URL=
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=

# GraphQL
NEXT_PUBLIC_GRAPHQL_URL=
```

Do not commit private keys, secrets, custodial credentials, or privileged signing material to frontend environment files.

## Installation

```bash
git clone <repository-url>

cd dtcc-stellar-evm-frontend

npm install
```

Create your environment configuration:

```bash
cp .env.example .env.local
```

Then start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Development Scripts

Expected scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run test:coverage
```

Exact scripts should be updated once the package configuration is finalized.

## Testing Strategy

### Unit Tests

Test:

* domain services
* hooks
* formatting
* validation
* transaction state transitions
* permission logic
* recursive ABI rendering

### Component Tests

Test React components with mocked adapters.

React unit tests should not require a live Ethereum or Stellar network.

### Adapter Tests

Test each blockchain implementation independently.

```text
TokenAdapter Contract
        |
    ----------------
    |              |
 EVM Tests     Stellar Tests
```

### Integration Tests

Use supported local or test environments to verify:

* wallet connection
* transaction preparation
* signing
* transaction submission
* contract interaction
* confirmation
* indexer synchronization

Important transaction cases include wallet rejection, simulation failure, RPC timeout, authorization failure, wrong network, malformed addresses, contract errors, expired transactions, duplicate submission, delayed indexers, and wallet disconnection during a transaction.

## Observability

Production frontend observability should capture structured context rather than relying on `console.log`.

Useful fields include:

```text
transaction hash
chain
network
contract ID / address
wallet address
operation
transaction stage
RPC endpoint
simulation error category
wallet error category
indexer latency
correlation ID
```

Errors should be normalized before reaching UI components.

## Migration Strategy

The existing Ethereum application should be migrated incrementally.

### Phase 1

Understand the existing frontend boundaries.

### Phase 2

Identify direct Wagmi, viem, ABI, RPC, and EVM dependencies.

### Phase 3

Define chain-neutral domain interfaces.

### Phase 4

Wrap existing Ethereum functionality behind EVM adapters.

### Phase 5

Introduce Stellar adapters.

### Phase 6

Add Stellar wallet and network support.

### Phase 7

Integrate Stellar indexed data.

### Phase 8

Move one complete feature through the new architecture.

Delegation Account is a strong candidate.

### Phase 9

Expand the adapter model to other features.

### Phase 10

Remove remaining chain assumptions from shared components.

The intent is to evolve the existing application rather than rewrite it.

## Design Principles

### 1. React should not know about blockchain SDK internals

Components communicate through application hooks and domain services.

### 2. Share capabilities, not implementation details

`transfer()` can be shared.

Gas estimation and Soroban simulation should not be artificially unified.

### 3. Treat transaction state as a workflow

Blockchain operations have multiple meaningful stages.

### 4. Separate command paths from query paths

RPC handles immediate blockchain interaction.

Indexed GraphQL data handles query-heavy application state.

### 5. Expect eventual consistency

A confirmed blockchain transaction does not guarantee that indexed data has already updated.

### 6. Keep security enforcement outside the UI

Frontend permissions improve UX but do not provide authoritative access control.

### 7. Build for additional chains

New blockchain implementations should primarily require new adapters, not rewriting application components.

## Future Work

Potential additions include:

* additional tokenization workflows
* complete Delegation Account UI
* Factory-based contract discovery
* Stellar contract metadata driven forms
* indexed address lists
* compliance workflows
* advanced RBAC screens
* transaction history
* transaction recovery
* multi-wallet support
* richer operational monitoring
* standardized telemetry
* additional blockchain adapters

## Status

This repository is intended to serve as the frontend architecture for integrating Stellar/Soroban alongside an existing Ethereum/EVM implementation.

Initial development should focus on establishing the shared adapter architecture and completing one end-to-end Stellar vertical slice before expanding across the rest of the application.

## License

Internal / proprietary unless otherwise specified.