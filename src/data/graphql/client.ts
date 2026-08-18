import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  NormalizedCacheObject,
} from "@apollo/client";

let client: ApolloClient<NormalizedCacheObject> | null = null;

/**
 * Get or create the Apollo GraphQL client.
 *
 * The GraphQL endpoint serves indexed blockchain data from the Substreams pipeline.
 * This is the "application data" layer — used for:
 * - Historical activity
 * - Delegation lists
 * - Asset discovery
 * - Filtering and search
 * - Dashboard data
 * - Event-derived state
 *
 * Direct chain RPC remains responsible for:
 * - Transaction simulation
 * - Transaction submission
 * - Transaction confirmation
 * - Targeted contract state reads
 */
export function getGraphqlClient(): ApolloClient<NormalizedCacheObject> {
  if (client) return client;

  const url =
    process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";

  client = new ApolloClient({
    link: new HttpLink({
      uri: url,
      fetchOptions: {
        method: "POST",
      },
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            delegations: {
              // Merge paginated results
              keyArgs: ["account", "chain"],
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
            },
            events: {
              keyArgs: ["contractAddress", "chain", "type"],
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
            },
          },
        },
        Delegation: {
          keyFields: ["id", "chain"],
        },
        TokenTransfer: {
          keyFields: ["hash", "chain"],
        },
        ContractEvent: {
          keyFields: ["id"],
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        errorPolicy: "all",
      },
      query: {
        fetchPolicy: "network-first",
        errorPolicy: "all",
      },
    },
  });

  return client;
}

/**
 * Reset the Apollo cache.
 * Useful after chain switches or wallet disconnection.
 */
export async function resetGraphqlCache(): Promise<void> {
  if (client) {
    await client.resetStore();
  }
}
