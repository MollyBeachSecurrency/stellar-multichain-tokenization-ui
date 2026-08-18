import { Permissions } from "@/types";

/**
 * PermissionAdapter defines the shared interface for permission / RBAC queries.
 *
 * Frontend permission checks improve UX by hiding or disabling actions
 * the user cannot perform. The contract remains the authoritative enforcement.
 */
export interface PermissionAdapter {
  /**
   * Get the permissions for a given account.
   */
  getPermissions(account: string): Promise<Permissions>;

  /**
   * Check if an account has a specific role.
   */
  hasRole(account: string, role: string): Promise<boolean>;

  /**
   * Check if an account can perform a specific action.
   */
  canPerform(account: string, action: string): Promise<boolean>;
}
