export interface DelegationFilter {
  delegator?: string;
  delegatee?: string;
  active?: boolean;
}

export interface DelegationEvent {
  type: "created" | "revoked" | "expired" | "batch_revoked";
  delegationId: string;
  timestamp: number;
  actor: string;
}

export interface TimelockConfig {
  delay: number;
  expiresAt: number;
}
