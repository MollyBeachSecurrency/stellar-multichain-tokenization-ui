"use client";

import React from "react";
import { useDelegations } from "@/domain/delegation/hooks/useDelegations";
import { usePermissions } from "@/domain/permissions/hooks/usePermissions";
import { Delegation } from "@/types";
import { TransactionStatusDisplay } from "@/components/transactions/TransactionStatusDisplay";
import { useTransaction } from "@/transactions";
import { useChain } from "@/app/providers/ChainProvider";

/**
 * DelegationList displays active delegations and allows revocation.
 *
 * This is the primary vertical slice demonstrating the full Stellar
 * architecture — from GraphQL query through revocation flow.
 */
export function DelegationList() {
  const {
    delegations,
    isLoading,
    loadError,
    revokeDelegation,
    batchRevoke,
    statusLabel,
    isActive,
    txError,
    refetch,
    reset,
  } = useDelegations();

  const { canRevoke } = usePermissions();
  const { activeChain } = useChain();
  const { state } = useTransaction({ chain: activeChain });

  if (isLoading) {
    return (
      <div className="delegation-list delegation-list-loading">
        <p>Loading delegations...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="delegation-list delegation-list-error">
        <p>Failed to load delegations: {loadError.message}</p>
        <button onClick={() => refetch()} className="button button-secondary">
          Retry
        </button>
      </div>
    );
  }

  const activeDelegations = delegations.filter((d) => d.active);
  const expiredDelegations = delegations.filter((d) => !d.active);

  return (
    <div className="delegation-list">
      <div className="delegation-list-header">
        <h2>Delegations</h2>
        <span className="delegation-count">
          {activeDelegations.length} active
        </span>
      </div>

      {activeDelegations.length === 0 ? (
        <p className="delegation-empty">No active delegations.</p>
      ) : (
        <ul className="delegation-items" role="list">
          {activeDelegations.map((delegation) => (
            <DelegationItem
              key={delegation.id}
              delegation={delegation}
              onRevoke={revokeDelegation}
              canRevoke={canRevoke}
              isRevoking={isActive}
            />
          ))}
        </ul>
      )}

      {expiredDelegations.length > 0 && (
        <details className="delegation-expired-section">
          <summary>
            Expired / Revoked ({expiredDelegations.length})
          </summary>
          <ul className="delegation-items delegation-items-expired" role="list">
            {expiredDelegations.map((delegation) => (
              <DelegationItem
                key={delegation.id}
                delegation={delegation}
                onRevoke={revokeDelegation}
                canRevoke={false}
                isRevoking={false}
              />
            ))}
          </ul>
        </details>
      )}

      <TransactionStatusDisplay state={state} />
    </div>
  );
}

// ─── Delegation Item ─────────────────────────────────────────────────────────

interface DelegationItemProps {
  delegation: Delegation;
  onRevoke: (id: string) => Promise<any>;
  canRevoke: boolean;
  isRevoking: boolean;
}

function DelegationItem({
  delegation,
  onRevoke,
  canRevoke,
  isRevoking,
}: DelegationItemProps) {
  const isExpired =
    delegation.expiresAt && delegation.expiresAt < Date.now() / 1000;

  return (
    <li className={`delegation-item ${!delegation.active ? "delegation-item-inactive" : ""}`}>
      <div className="delegation-item-header">
        <span className="delegation-delegatee" title={delegation.delegatee}>
          {truncate(delegation.delegatee)}
        </span>
        <span
          className={`delegation-status ${delegation.active ? "delegation-status-active" : "delegation-status-inactive"}`}
        >
          {delegation.active ? "Active" : isExpired ? "Expired" : "Revoked"}
        </span>
      </div>

      <div className="delegation-item-permissions">
        {delegation.permissions.map((perm) => (
          <span key={perm} className="delegation-permission-badge">
            {perm}
          </span>
        ))}
      </div>

      <div className="delegation-item-meta">
        <span className="delegation-created">
          Created: {new Date(delegation.createdAt * 1000).toLocaleDateString()}
        </span>
        {delegation.expiresAt && (
          <span className="delegation-expires">
            Expires: {new Date(delegation.expiresAt * 1000).toLocaleDateString()}
          </span>
        )}
      </div>

      {delegation.active && canRevoke && (
        <button
          onClick={() => onRevoke(delegation.id)}
          disabled={isRevoking}
          className="button button-danger delegation-revoke-button"
          aria-label={`Revoke delegation for ${delegation.delegatee}`}
        >
          {isRevoking ? "Revoking..." : "Revoke"}
        </button>
      )}
    </li>
  );
}

function truncate(str: string): string {
  if (str.length <= 14) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}
