export type PermissionAction =
  | "mint"
  | "burn"
  | "transfer"
  | "delegate"
  | "revoke"
  | "admin";

export interface RoleAssignment {
  account: string;
  role: string;
  grantedAt: number;
  grantedBy: string;
}
