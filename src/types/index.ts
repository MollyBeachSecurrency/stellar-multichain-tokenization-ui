/**
 * Core shared types for the dual-chain tokenization application.
 */

// ─── Chain Types ─────────────────────────────────────────────────────────────

export type SupportedChain = "ethereum" | "stellar";

// ─── Transaction Types ───────────────────────────────────────────────────────

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

export interface TransactionResult {
  hash: string;
  chain: SupportedChain;
  status: TransactionStatus;
  blockNumber?: number;
  timestamp?: number;
  error?: ChainError;
}

export interface TransactionState {
  status: TransactionStatus;
  hash: string | null;
  error: ChainError | null;
  chain: SupportedChain | null;
}

// ─── Wallet Types ────────────────────────────────────────────────────────────

export interface WalletSession {
  chain: SupportedChain;
  address: string;
  network: string;
  connected: boolean;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export type ChainErrorCategory =
  | "wallet"
  | "simulation"
  | "authorization"
  | "network"
  | "contract"
  | "indexer";

export interface ChainError {
  category: ChainErrorCategory;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

// ─── Delegation Types ────────────────────────────────────────────────────────

export interface Delegation {
  id: string;
  delegator: string;
  delegatee: string;
  permissions: string[];
  createdAt: number;
  expiresAt?: number;
  active: boolean;
  chain: SupportedChain;
}

export interface CreateDelegationRequest {
  delegatee: string;
  permissions: string[];
  expiresAt?: number;
}

// ─── Permission Types ────────────────────────────────────────────────────────

export interface Permissions {
  canMint: boolean;
  canBurn: boolean;
  canTransfer: boolean;
  canDelegate: boolean;
  canRevoke: boolean;
  roles: string[];
}

// ─── Indexer Types ───────────────────────────────────────────────────────────

export interface IndexedEvent {
  id: string;
  type: string;
  chain: SupportedChain;
  contractAddress: string;
  blockNumber: number;
  timestamp: number;
  data: Record<string, unknown>;
}

// ─── Offline Queue Types ─────────────────────────────────────────────────────

export interface QueuedRequest {
  id: string;
  operation: string;
  payload: unknown;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  idempotencyKey: string;
}

// ─── Form / ABI Types ────────────────────────────────────────────────────────

export type AbiMutability = "view" | "pure" | "nonpayable" | "payable";

export interface ContractFunctionSchema {
  name: string;
  mutability: AbiMutability;
  inputs: ContractInputSchema[];
  outputs: ContractOutputSchema[];
}

export interface ContractInputSchema {
  name: string;
  type: string;
  components?: ContractInputSchema[];
}

export interface ContractOutputSchema {
  name: string;
  type: string;
  components?: ContractOutputSchema[];
}
