import { gql } from "@apollo/client";

/**
 * Query contract events from the indexer.
 */
export const GET_CONTRACT_EVENTS = gql`
  query GetContractEvents(
    $contractAddress: String!
    $chain: String!
    $type: String
    $first: Int
    $skip: Int
  ) {
    contractEvents(
      contractAddress: $contractAddress
      chain: $chain
      type: $type
      first: $first
      skip: $skip
    ) {
      id
      type
      chain
      contractAddress
      blockNumber
      timestamp
      transactionHash
      data
    }
  }
`;

/**
 * Query recent events across all contracts for an account.
 */
export const GET_ACCOUNT_ACTIVITY = gql`
  query GetAccountActivity(
    $account: String!
    $chain: String
    $first: Int
    $skip: Int
  ) {
    accountActivity(
      account: $account
      chain: $chain
      first: $first
      skip: $skip
    ) {
      id
      type
      chain
      contractAddress
      blockNumber
      timestamp
      transactionHash
      data
    }
  }
`;
