export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export interface TransferRequest {
  recipient: string;
  amount: bigint;
}

export interface MintRequest {
  recipient: string;
  amount: bigint;
}

export interface BurnRequest {
  amount: bigint;
}
