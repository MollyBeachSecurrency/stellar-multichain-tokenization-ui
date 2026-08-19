/**
 * Vitest Global Setup
 *
 * Configures testing-library matchers and global test environment.
 */
import "@testing-library/jest-dom";

// Mock window.freighterApi for Stellar wallet tests
Object.defineProperty(window, "freighterApi", {
  value: undefined,
  writable: true,
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_DEFAULT_CHAIN = "stellar";
process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "https://soroban-testnet.stellar.org";
process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE =
  "Test SDF Network ; September 2015";
process.env.NEXT_PUBLIC_GRAPHQL_URL = "http://localhost:4000/graphql";
