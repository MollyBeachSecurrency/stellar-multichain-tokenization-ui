"use client";

import React from "react";
import { useTokenBalance } from "@/domain/token/hooks/useTokenBalance";
import { formatTokenAmount } from "@/lib/formatting";

interface TokenBalanceDisplayProps {
  address?: string;
  decimals?: number;
  symbol?: string;
  className?: string;
}

/**
 * TokenBalanceDisplay shows the token balance for the connected wallet
 * or a specific address.
 */
export function TokenBalanceDisplay({
  address,
  decimals = 18,
  symbol = "TOKEN",
  className = "",
}: TokenBalanceDisplayProps) {
  const { balance, isLoading, isError, error } = useTokenBalance({ address });

  if (isLoading) {
    return (
      <div className={`token-balance token-balance-loading ${className}`}>
        <span className="token-balance-skeleton">Loading balance...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`token-balance token-balance-error ${className}`}>
        <span className="token-balance-error-text">
          {error?.message ?? "Failed to load balance"}
        </span>
      </div>
    );
  }

  const formattedBalance = balance
    ? formatTokenAmount(balance, decimals)
    : "0";

  return (
    <div className={`token-balance ${className}`}>
      <span className="token-balance-amount">{formattedBalance}</span>
      <span className="token-balance-symbol">{symbol}</span>
    </div>
  );
}
