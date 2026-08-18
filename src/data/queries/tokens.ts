import { gql } from "@apollo/client";

/**
 * Query token transfer history for an account.
 */
export const GET_TOKEN_TRANSFERS = gql`
  query GetTokenTransfers(
    $account: String!
    $chain: String
    $first: Int
    $skip: Int
  ) {
    tokenTransfers(
      account: $account
      chain: $chain
      first: $first
      skip: $skip
    ) {
      hash
      from
      to
      amount
      timestamp
      blockNumber
      chain
      status
    }
  }
`;

/**
 * Query token metadata.
 */
export const GET_TOKEN_INFO = gql`
  query GetTokenInfo($contractAddress: String!, $chain: String!) {
    tokenInfo(contractAddress: $contractAddress, chain: $chain) {
      address
      name
      symbol
      decimals
      totalSupply
      chain
    }
  }
`;

/**
 * Query token balances across all tokens for an account.
 */
export const GET_TOKEN_BALANCES = gql`
  query GetTokenBalances($account: String!, $chain: String) {
    tokenBalances(account: $account, chain: $chain) {
      tokenAddress
      tokenName
      tokenSymbol
      tokenDecimals
      balance
      chain
    }
  }
`;
