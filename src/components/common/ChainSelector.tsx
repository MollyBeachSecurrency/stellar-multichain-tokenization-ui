"use client";

import React from "react";
import { useChain } from "@/app/providers/ChainProvider";
import { SupportedChain } from "@/types";

/**
 * ChainSelector allows the user to switch between supported chains.
 * Chain selection happens once at this boundary — components below
 * never need to check which chain is active.
 */
export function ChainSelector() {
  const { activeChain, setActiveChain, availableChains } = useChain();

  return (
    <div className="chain-selector" role="radiogroup" aria-label="Select blockchain network">
      {availableChains.map((chain) => (
        <button
          key={chain}
          className={`chain-option ${chain === activeChain ? "chain-option-active" : ""}`}
          onClick={() => setActiveChain(chain)}
          role="radio"
          aria-checked={chain === activeChain}
        >
          <ChainIcon chain={chain} />
          <span className="chain-option-label">{getChainLabel(chain)}</span>
        </button>
      ))}
    </div>
  );
}

function ChainIcon({ chain }: { chain: SupportedChain }) {
  // Simple text-based icons — replace with SVG in production
  return (
    <span className="chain-icon" aria-hidden="true">
      {chain === "ethereum" ? "⟠" : "✦"}
    </span>
  );
}

function getChainLabel(chain: SupportedChain): string {
  switch (chain) {
    case "ethereum":
      return "Ethereum";
    case "stellar":
      return "Stellar";
    default:
      return chain;
  }
}
