import { SupportedChain } from "@/types";

export interface WalletConfig {
  chain: SupportedChain;
  autoConnect?: boolean;
  requiredNetwork?: string;
}

export interface WalletConnectionOptions {
  network?: string;
}

export type WalletEventType = "connect" | "disconnect" | "accountChanged" | "networkChanged";

export interface WalletEvent {
  type: WalletEventType;
  address?: string;
  network?: string;
}

export type WalletEventHandler = (event: WalletEvent) => void;
