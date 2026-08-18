"use client";

import React, { useState, useCallback } from "react";
import { useDelegations } from "@/domain/delegation/hooks/useDelegations";
import { usePermissions } from "@/domain/permissions/hooks/usePermissions";
import { CreateDelegationRequest } from "@/types";

const AVAILABLE_PERMISSIONS = ["mint", "burn", "transfer", "delegate", "revoke"];

/**
 * CreateDelegationForm allows creating new delegations.
 * Respects RBAC — only shown if the user has delegate permission.
 */
export function CreateDelegationForm() {
  const { createDelegation, isActive, statusLabel } = useDelegations();
  const { canDelegate } = usePermissions();

  const [delegatee, setDelegatee] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");

  const togglePermission = useCallback((perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!delegatee || selectedPermissions.length === 0) return;

      const request: CreateDelegationRequest = {
        delegatee,
        permissions: selectedPermissions,
        expiresAt: expiresAt
          ? Math.floor(new Date(expiresAt).getTime() / 1000)
          : undefined,
      };

      await createDelegation(request);

      // Reset form on success
      setDelegatee("");
      setSelectedPermissions([]);
      setExpiresAt("");
    },
    [delegatee, selectedPermissions, expiresAt, createDelegation]
  );

  if (!canDelegate) {
    return (
      <div className="create-delegation-form-disabled">
        <p>You do not have permission to create delegations.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="create-delegation-form">
      <h3>Create Delegation</h3>

      <div className="form-field">
        <label htmlFor="delegation-delegatee" className="form-label">
          Delegate To
        </label>
        <input
          id="delegation-delegatee"
          type="text"
          value={delegatee}
          onChange={(e) => setDelegatee(e.target.value)}
          placeholder="Address to delegate permissions to"
          disabled={isActive}
          className="form-input"
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label">Permissions</label>
        <div className="permission-checkboxes" role="group" aria-label="Select permissions">
          {AVAILABLE_PERMISSIONS.map((perm) => (
            <label key={perm} className="permission-checkbox-label">
              <input
                type="checkbox"
                checked={selectedPermissions.includes(perm)}
                onChange={() => togglePermission(perm)}
                disabled={isActive}
                className="permission-checkbox"
              />
              {perm}
            </label>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="delegation-expires" className="form-label">
          Expires At (optional)
        </label>
        <input
          id="delegation-expires"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          disabled={isActive}
          className="form-input"
        />
      </div>

      <button
        type="submit"
        disabled={isActive || !delegatee || selectedPermissions.length === 0}
        className="button button-primary"
      >
        {isActive ? statusLabel : "Create Delegation"}
      </button>
    </form>
  );
}
