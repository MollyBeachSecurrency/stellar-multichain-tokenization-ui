import {
  Delegation,
  CreateDelegationRequest,
  TransactionResult,
} from "@/types";

/**
 * DelegationAdapter defines the shared interface for delegation operations.
 *
 * The Delegation Account is a key vertical slice: it exercises
 * authorization, lifecycle, events, timelocks, and state transitions.
 */
export interface DelegationAdapter {
  /**
   * Get all delegations for a given account.
   */
  getDelegations(account: string): Promise<Delegation[]>;

  /**
   * Get a single delegation by its ID.
   */
  getDelegation(delegationId: string): Promise<Delegation | null>;

  /**
   * Create a new delegation.
   */
  createDelegation(request: CreateDelegationRequest): Promise<TransactionResult>;

  /**
   * Revoke an existing delegation.
   */
  revokeDelegation(delegationId: string): Promise<TransactionResult>;

  /**
   * Batch revoke multiple delegations.
   */
  batchRevoke(delegationIds: string[]): Promise<TransactionResult>;

  /**
   * Check whether a delegation is currently active (not expired or revoked).
   */
  isActive(delegationId: string): Promise<boolean>;
}
