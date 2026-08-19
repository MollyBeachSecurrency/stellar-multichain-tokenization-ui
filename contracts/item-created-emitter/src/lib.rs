#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const CONTROLLER_KEY: &str = "controller";
const PAUSED_KEY: &str = "paused";
const FACTORY_KEY: &str = "factory";
const INITIALIZED_KEY: &str = "init";
const ITEM_COUNT_KEY: &str = "item_count";

/// Maximum number of items that can be emitted in a single batch call.
pub const MAX_BATCH_SIZE: u32 = 50;

// ─── Data Types ──────────────────────────────────────────────────────────────

/// Data structure for the ItemCreated event.
/// Matches what the real Factory contract will eventually emit.
///
/// Event topic: ("ItemCrtd", admin_address)
/// Event data: ItemCreatedEvent struct
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ItemCreatedEvent {
    /// The deployed token contract address
    pub token_address: Address,
    /// Human-readable token name (e.g. "DTCC Treasury Bond 2025")
    pub name: String,
    /// Token symbol (e.g. "DTB25")
    pub symbol: String,
    /// Number of decimals (typically 7 for Stellar)
    pub decimals: u32,
    /// Initial supply minted at creation
    pub initial_supply: i128,
    /// The admin/owner who created this token
    pub admin: Address,
    /// Ledger timestamp of creation
    pub created_at: u64,
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct ItemCreatedEmitter;

#[contractimpl]
impl ItemCreatedEmitter {
    // ─── Initialization ──────────────────────────────────────────────────────

    /// Initialize the contract. Can only be called once.
    /// Sets the controller (admin) and optionally a factory address.
    pub fn initialize(env: Env, controller: Address, factory: Address) {
        if env.storage().instance().has(&INITIALIZED_KEY) {
            panic!("already initialized");
        }

        controller.require_auth();

        env.storage().instance().set(&INITIALIZED_KEY, &true);
        env.storage().instance().set(&CONTROLLER_KEY, &controller);
        env.storage().instance().set(&FACTORY_KEY, &factory);
        env.storage().instance().set(&PAUSED_KEY, &false);
        env.storage().instance().set(&ITEM_COUNT_KEY, &0u64);
    }

    // ─── Controller Management ───────────────────────────────────────────────

    /// Transfer control to a new address. Only current controller can call.
    pub fn transfer_control(env: Env, new_controller: Address) {
        let controller = Self::require_controller(&env);
        controller.require_auth();
        env.storage().instance().set(&CONTROLLER_KEY, &new_controller);
    }

    /// Get the current controller address.
    pub fn get_controller(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&CONTROLLER_KEY)
            .expect("not initialized")
    }

    /// Get the factory address.
    pub fn get_factory(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&FACTORY_KEY)
            .expect("not initialized")
    }

    // ─── Pause / Unpause ─────────────────────────────────────────────────────

    /// Pause the contract. Only controller can call.
    /// When paused, emit_item_created and emit_batch are blocked.
    pub fn pause(env: Env) {
        let controller = Self::require_controller(&env);
        controller.require_auth();
        env.storage().instance().set(&PAUSED_KEY, &true);
    }

    /// Unpause the contract. Only controller can call.
    pub fn unpause(env: Env) {
        let controller = Self::require_controller(&env);
        controller.require_auth();
        env.storage().instance().set(&PAUSED_KEY, &false);
    }

    /// Check if contract is currently paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&PAUSED_KEY)
            .unwrap_or(false)
    }

    // ─── Core Functionality ──────────────────────────────────────────────────

    /// Emit an ItemCreated event. This simulates what the Factory contract
    /// will do when a new tokenized asset is deployed.
    ///
    /// Requirements:
    /// - Contract must be initialized
    /// - Contract must not be paused
    /// - Caller must be controller or factory
    ///
    /// Derek's Substreams pipeline should listen for:
    ///   topic: ["ItemCrtd", admin_address]
    ///   data: ItemCreatedEvent
    pub fn emit_item_created(
        env: Env,
        token_address: Address,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: i128,
        admin: Address,
    ) {
        Self::require_not_paused(&env);
        let caller = Self::require_authorized_caller(&env);
        caller.require_auth();

        // Validate inputs
        Self::validate_inputs(&env, &name, &symbol, decimals, initial_supply);

        let created_at = env.ledger().timestamp();

        let event = ItemCreatedEvent {
            token_address: token_address.clone(),
            name,
            symbol,
            decimals,
            initial_supply,
            admin: admin.clone(),
            created_at,
        };

        // Increment item count
        let count: u64 = env
            .storage()
            .instance()
            .get(&ITEM_COUNT_KEY)
            .unwrap_or(0);
        env.storage().instance().set(&ITEM_COUNT_KEY, &(count + 1));

        // Emit the event with structured topics for Substreams filtering
        env.events()
            .publish((symbol_short!("ItemCrtd"), admin), event);
    }

    /// Convenience: emit multiple ItemCreated events in a single transaction.
    /// Useful for seeding test data.
    ///
    /// Requirements:
    /// - Contract must not be paused
    /// - Caller must be controller or factory
    /// - Batch size must be <= MAX_BATCH_SIZE
    /// - All input vectors must have the same length
    pub fn emit_batch(
        env: Env,
        token_addresses: Vec<Address>,
        names: Vec<String>,
        symbols: Vec<String>,
        decimals_list: Vec<u32>,
        initial_supplies: Vec<i128>,
        admin: Address,
    ) {
        Self::require_not_paused(&env);
        let caller = Self::require_authorized_caller(&env);
        caller.require_auth();

        let count = token_addresses.len();

        // Validate batch constraints
        if count > MAX_BATCH_SIZE {
            panic!("batch size exceeds maximum");
        }
        if names.len() != count
            || symbols.len() != count
            || decimals_list.len() != count
            || initial_supplies.len() != count
        {
            panic!("input vector length mismatch");
        }

        for i in 0..count {
            let name = names.get(i).unwrap();
            let symbol = symbols.get(i).unwrap();
            let decimals = decimals_list.get(i).unwrap();
            let initial_supply = initial_supplies.get(i).unwrap();

            Self::validate_inputs(&env, &name, &symbol, decimals, initial_supply);

            let created_at = env.ledger().timestamp();

            let event = ItemCreatedEvent {
                token_address: token_addresses.get(i).unwrap(),
                name,
                symbol,
                decimals,
                initial_supply,
                admin: admin.clone(),
                created_at,
            };

            env.events()
                .publish((symbol_short!("ItemCrtd"), admin.clone()), event);
        }

        // Update item count
        let current_count: u64 = env
            .storage()
            .instance()
            .get(&ITEM_COUNT_KEY)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&ITEM_COUNT_KEY, &(current_count + count as u64));
    }

    /// Get the total number of items created through this contract.
    pub fn get_item_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&ITEM_COUNT_KEY)
            .unwrap_or(0)
    }

    /// Simple health check / version query. Works even when paused.
    pub fn version(_env: Env) -> u32 {
        1
    }

    // ─── Internal Helpers ────────────────────────────────────────────────────

    /// Require that the contract is not paused.
    fn require_not_paused(env: &Env) {
        let paused: bool = env
            .storage()
            .instance()
            .get(&PAUSED_KEY)
            .unwrap_or(false);
        if paused {
            panic!("contract is paused");
        }
    }

    /// Get the controller, panic if not initialized.
    fn require_controller(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&CONTROLLER_KEY)
            .expect("not initialized")
    }

    /// Return the authorized caller (controller or factory).
    /// Panics if the contract is not initialized.
    fn require_authorized_caller(env: &Env) -> Address {
        let controller: Address = env
            .storage()
            .instance()
            .get(&CONTROLLER_KEY)
            .expect("not initialized");
        // In a real Factory pattern, we'd also accept the factory address.
        // For this dummy contract, controller is the authorized caller.
        controller
    }

    /// Validate input parameters for item creation.
    fn validate_inputs(
        _env: &Env,
        name: &String,
        symbol: &String,
        decimals: u32,
        initial_supply: i128,
    ) {
        if name.len() == 0 {
            panic!("name cannot be empty");
        }
        if symbol.len() == 0 {
            panic!("symbol cannot be empty");
        }
        if decimals > 18 {
            panic!("decimals exceeds maximum (18)");
        }
        if initial_supply < 0 {
            panic!("initial_supply cannot be negative");
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests;
