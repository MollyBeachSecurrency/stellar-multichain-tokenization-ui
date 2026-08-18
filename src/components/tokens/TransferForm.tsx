"use client";

import React, { useState, useCallback } from "react";
import { useTransfer } from "@/domain/token/hooks/useTransfer";
import { TransactionStatusDisplay } from "@/components/transactions/TransactionStatusDisplay";
import { useTransaction } from "@/transactions";
import { useChain } from "@/app/providers/ChainProvider";

/**
 * TransferForm is a chain-agnostic token transfer form.
 * It does not know whether it's using Wagmi or the Stellar SDK.
 */
export function TransferForm() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { transfer, statusLabel, isActive, error, reset } = useTransfer();
  const { activeChain } = useChain();
  const { state } = useTransaction({ chain: activeChain });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!recipient || !amount) return;

      try {
        const amountBigInt = BigInt(amount);
        await transfer(recipient, amountBigInt);
      } catch {
        // Error handled by useTransfer
      }
    },
    [recipient, amount, transfer]
  );

  return (
    <div className="transfer-form-container">
      <h2 className="transfer-form-title">Transfer Tokens</h2>

      <form onSubmit={handleSubmit} className="transfer-form">
        <div className="form-field">
          <label htmlFor="transfer-recipient" className="form-label">
            Recipient Address
          </label>
          <input
            id="transfer-recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={
              activeChain === "ethereum" ? "0x..." : "G..."
            }
            disabled={isActive}
            className="form-input"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="transfer-amount" className="form-label">
            Amount
          </label>
          <input
            id="transfer-amount"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setAmount(e.target.value);
              }
            }}
            placeholder="0"
            disabled={isActive}
            className="form-input"
            required
          />
        </div>

        <div className="transfer-form-actions">
          <button
            type="submit"
            disabled={isActive || !recipient || !amount}
            className="button button-primary"
          >
            {isActive ? statusLabel : "Transfer"}
          </button>

          {(error || state.status === "success") && (
            <button
              type="button"
              onClick={reset}
              className="button button-secondary"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      <TransactionStatusDisplay state={state} />
    </div>
  );
}
