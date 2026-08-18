"use client";

import React from "react";
import { AppProviders } from "./providers/AppProviders";
import { ChainSelector } from "@/components/common/ChainSelector";
import { WalletButton } from "@/components/wallet/WalletButton";
import { TokenBalanceDisplay } from "@/components/tokens/TokenBalanceDisplay";
import { TransferForm } from "@/components/tokens/TransferForm";
import { DelegationList } from "@/components/delegations/DelegationList";
import { CreateDelegationForm } from "@/components/delegations/CreateDelegationForm";
import { getMockChainConfig } from "@/lib/mockConfig";

/**
 * Main application page demonstrating the dual-chain architecture.
 *
 * In production, the ChainConfig would be constructed from real adapter instances.
 * Here we use a mock config to show the page structure.
 */
export default function HomePage() {
  const chainConfig = getMockChainConfig();

  return (
    <AppProviders chainConfig={chainConfig} defaultChain="stellar">
      <div className="app-layout">
        <header className="app-header">
          <div className="app-header-left">
            <h1 className="app-title">DTCC Tokenization</h1>
            <ChainSelector />
          </div>
          <WalletButton />
        </header>

        <main className="app-main">
          <section className="page-section">
            <h2 className="page-section-title">Token Balance</h2>
            <TokenBalanceDisplay />
          </section>

          <section className="page-section">
            <TransferForm />
          </section>

          <section className="page-section">
            <DelegationList />
          </section>

          <section className="page-section">
            <CreateDelegationForm />
          </section>
        </main>
      </div>
    </AppProviders>
  );
}
