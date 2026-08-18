"use client";

import React from "react";
import { TransactionState } from "@/types";
import { getStatusLabel, isActiveStatus, isTerminalStatus } from "@/transactions";

interface TransactionStatusDisplayProps {
  state: TransactionState;
  className?: string;
}

/**
 * TransactionStatusDisplay renders the current state of a blockchain transaction.
 * Shows a progress indicator with the user-friendly status label.
 *
 * This is particularly important in institutional applications where users
 * need to understand exactly which stage of an operation has completed.
 */
export function TransactionStatusDisplay({
  state,
  className = "",
}: TransactionStatusDisplayProps) {
  const { status, hash, error } = state;

  if (status === "idle") return null;

  const isActive = isActiveStatus(status);
  const isTerminal = isTerminalStatus(status);
  const label = getStatusLabel(status);

  return (
    <div
      className={`transaction-status ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="transaction-status-indicator">
        {isActive && <LoadingSpinner />}
        {status === "success" && <SuccessIcon />}
        {status === "error" && <ErrorIcon />}
      </div>

      <div className="transaction-status-content">
        <p className="transaction-status-label">{label}</p>

        {hash && (
          <p className="transaction-status-hash">
            <span className="transaction-hash-label">Tx:</span>{" "}
            <code className="transaction-hash-value">
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </code>
          </p>
        )}

        {error && (
          <div className="transaction-status-error">
            <p className="transaction-error-message">{error.message}</p>
            {error.retryable && (
              <p className="transaction-error-hint">This operation can be retried.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="loading-spinner" aria-hidden="true">
      <div className="spinner" />
    </div>
  );
}

function SuccessIcon() {
  return (
    <span className="status-icon status-icon-success" aria-hidden="true">
      ✓
    </span>
  );
}

function ErrorIcon() {
  return (
    <span className="status-icon status-icon-error" aria-hidden="true">
      ✕
    </span>
  );
}
