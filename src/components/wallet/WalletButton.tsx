"use client";

import React from "react";
import { useWallet } from "@/domain/wallet/hooks/useWallet";

/**
 * WalletButton handles connect/disconnect for the active chain's wallet.
 * Displays truncated address when connected.
 */
export function WalletButton() {
  const { isConnected, isConnecting, address, chain, connect, disconnect } =
    useWallet();

  if (isConnecting) {
    return (
      <button className="wallet-button wallet-button-connecting" disabled>
        Connecting...
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-chain-badge">{chain}</span>
        <span className="wallet-address" title={address}>
          {truncateAddress(address)}
        </span>
        <button
          className="wallet-button wallet-button-disconnect"
          onClick={disconnect}
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="wallet-button wallet-button-connect" onClick={connect}>
      Connect Wallet
    </button>
  );
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
