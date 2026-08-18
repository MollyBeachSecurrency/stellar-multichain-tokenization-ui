import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  xdr,
  Operation,
  Account,
  Keypair,
  Transaction,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";

/**
 * SorobanClient provides a wrapper around the Stellar SDK's SorobanRpc.Server
 * with convenience methods for the Soroban transaction lifecycle.
 *
 * Responsibilities:
 * - Soroban RPC connection management
 * - Transaction simulation
 * - Transaction preparation (resource/fee assembly)
 * - Transaction submission
 * - Transaction status polling
 * - Account resolution
 */
export class SorobanClient {
  private server: SorobanRpc.Server;
  private networkPassphrase: string;

  constructor(rpcUrl?: string, networkPassphrase?: string) {
    const url =
      rpcUrl ??
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
      "https://soroban-testnet.stellar.org";

    this.networkPassphrase =
      networkPassphrase ??
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
      Networks.TESTNET;

    this.server = new SorobanRpc.Server(url);
  }

  /**
   * Get the Soroban RPC server instance.
   */
  getServer(): SorobanRpc.Server {
    return this.server;
  }

  /**
   * Get the network passphrase.
   */
  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  /**
   * Resolve an account from its public key.
   */
  async getAccount(publicKey: string): Promise<Account> {
    const account = await this.server.getAccount(publicKey);
    return account;
  }

  /**
   * Build a Soroban contract invocation transaction.
   */
  buildContractCall(
    sourceAccount: Account,
    contractId: string,
    method: string,
    args: xdr.ScVal[]
  ): Transaction {
    const contract = new Contract(contractId);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(300)
      .build();

    return tx;
  }

  /**
   * Simulate a transaction to determine resource requirements.
   * Returns the simulation result which includes resource footprint,
   * authorization entries, and minimum resource fee.
   */
  async simulateTransaction(
    tx: Transaction
  ): Promise<SorobanRpc.Api.SimulateTransactionResponse> {
    const simulation = await this.server.simulateTransaction(tx);
    return simulation;
  }

  /**
   * Prepare a transaction after successful simulation.
   * Assembles the resource footprint, authorization entries, and fees.
   */
  prepareTransaction(
    tx: Transaction,
    simulation: SorobanRpc.Api.SimulateTransactionResponse
  ): Transaction {
    if (
      SorobanRpc.Api.isSimulationError(simulation)
    ) {
      throw new Error(
        `Simulation failed: ${(simulation as any).error}`
      );
    }

    // Use the SDK's assembleTransaction helper
    const prepared = SorobanRpc.assembleTransaction(
      tx,
      simulation as SorobanRpc.Api.SimulateTransactionSuccessResponse
    ).build();

    return prepared;
  }

  /**
   * Submit a signed transaction to the Stellar network.
   */
  async submitTransaction(
    tx: Transaction
  ): Promise<SorobanRpc.Api.SendTransactionResponse> {
    const response = await this.server.sendTransaction(tx);
    return response;
  }

  /**
   * Poll for transaction confirmation.
   * Stellar transactions are not immediately finalized — we need to poll.
   */
  async waitForConfirmation(
    hash: string,
    timeoutMs: number = 30000,
    intervalMs: number = 2000
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const response = await this.server.getTransaction(hash);

      if (response.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        return response;
      }

      if (response.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed: ${hash}`);
      }

      // NOT_FOUND means still pending
      await this.sleep(intervalMs);
    }

    throw new Error(`Transaction confirmation timeout: ${hash}`);
  }

  /**
   * Execute a full Soroban contract call lifecycle:
   * build -> simulate -> prepare -> (sign externally) -> submit -> poll
   *
   * Returns the prepared (unsigned) transaction for external signing.
   */
  async prepareContractCall(
    sourcePublicKey: string,
    contractId: string,
    method: string,
    args: xdr.ScVal[]
  ): Promise<{ transaction: Transaction; simulation: SorobanRpc.Api.SimulateTransactionResponse }> {
    const account = await this.getAccount(sourcePublicKey);
    const tx = this.buildContractCall(account, contractId, method, args);
    const simulation = await this.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(
        `Simulation failed: ${JSON.stringify((simulation as any).error)}`
      );
    }

    const prepared = this.prepareTransaction(tx, simulation);
    return { transaction: prepared, simulation };
  }

  /**
   * Get contract data from the ledger.
   */
  async getContractData(
    contractId: string,
    key: xdr.ScVal,
    durability: "persistent" | "temporary" = "persistent"
  ): Promise<SorobanRpc.Api.LedgerEntryResult | null> {
    const contract = new Contract(contractId);

    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contract.address().toScAddress(),
        key,
        durability:
          durability === "persistent"
            ? xdr.ContractDataDurability.persistent()
            : xdr.ContractDataDurability.temporary(),
      })
    );

    const entries = await this.server.getLedgerEntries(ledgerKey);

    if (entries.entries && entries.entries.length > 0) {
      return entries.entries[0];
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
