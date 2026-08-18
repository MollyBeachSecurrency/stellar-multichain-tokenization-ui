import { gql } from "@apollo/client";

/**
 * Query delegations for an account, with optional filtering.
 */
export const GET_DELEGATIONS = gql`
  query GetDelegations(
    $account: String!
    $chain: String
    $active: Boolean
    $first: Int
    $skip: Int
  ) {
    delegations(
      account: $account
      chain: $chain
      active: $active
      first: $first
      skip: $skip
    ) {
      id
      delegator
      delegatee
      permissions
      createdAt
      expiresAt
      active
      chain
      transactionHash
      blockNumber
    }
  }
`;

/**
 * Query a single delegation by ID.
 */
export const GET_DELEGATION = gql`
  query GetDelegation($id: String!, $chain: String!) {
    delegation(id: $id, chain: $chain) {
      id
      delegator
      delegatee
      permissions
      createdAt
      expiresAt
      active
      chain
      transactionHash
      blockNumber
      revokedAt
      revokedBy
    }
  }
`;

/**
 * Query delegation events (created, revoked, etc.).
 */
export const GET_DELEGATION_EVENTS = gql`
  query GetDelegationEvents(
    $account: String!
    $chain: String
    $first: Int
    $skip: Int
  ) {
    delegationEvents(
      account: $account
      chain: $chain
      first: $first
      skip: $skip
    ) {
      id
      type
      delegationId
      actor
      timestamp
      transactionHash
      blockNumber
      chain
    }
  }
`;
