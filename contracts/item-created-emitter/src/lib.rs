#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

/// Data structure for the ItemCreated event.
/// Matches what the real Factory contract will eventually emit.
///
/// Event topic: ("ItemCreated",)
/// Event data: ItemCreatedEvent struct
#[contracttype]
#[derive(Clone, Debug)]
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

#[contract]
pub struct ItemCreatedEmitter;

#[contractimpl]
impl ItemCreatedEmitter {
    /// Emit an ItemCreated event. This simulates what the Factory contract
    /// will do when a new tokenized asset is deployed.
    ///
    /// Derek's Substreams pipeline should listen for:
    ///   topic: ["ItemCreated", admin_address]
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

        // Emit the event with structured topics for Substreams filtering
        // Topic structure: ("ItemCreated", admin_address)
        env.events()
            .publish((symbol_short!("ItemCrtd"), admin), event);
    }

    /// Convenience: emit multiple ItemCreated events in a single transaction.
    /// Useful for seeding test data.
    pub fn emit_batch(
        env: Env,
        token_addresses: Vec<Address>,
        names: Vec<String>,
        symbols: Vec<String>,
        decimals_list: Vec<u32>,
        initial_supplies: Vec<i128>,
        admin: Address,
    ) {
        let count = token_addresses.len();

        for i in 0..count {
            let created_at = env.ledger().timestamp();

            let event = ItemCreatedEvent {
                token_address: token_addresses.get(i).unwrap(),
                name: names.get(i).unwrap(),
                symbol: symbols.get(i).unwrap(),
                decimals: decimals_list.get(i).unwrap(),
                initial_supply: initial_supplies.get(i).unwrap(),
                admin: admin.clone(),
                created_at,
            };

            env.events()
                .publish((symbol_short!("ItemCrtd"), admin.clone()), event);
        }
    }

    /// Simple health check / version query
    pub fn version(env: Env) -> u32 {
        let _ = env;
        1
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Events, vec, IntoVal};

    #[test]
    fn test_emit_item_created() {
        let env = Env::default();
        let contract_id = env.register(ItemCreatedEmitter, ());
        let client = ItemCreatedEmitterClient::new(&env, &contract_id);

        let token_addr = Address::generate(&env);
        let admin = Address::generate(&env);
        let name = String::from_str(&env, "DTCC Treasury Bond 2025");
        let symbol = String::from_str(&env, "DTB25");

        client.emit_item_created(
            &token_addr,
            &name,
            &symbol,
            &7u32,
            &1_000_000_0000000i128,
            &admin,
        );

        // Verify event was emitted
        let events = env.events().all();
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_emit_batch() {
        let env = Env::default();
        let contract_id = env.register(ItemCreatedEmitter, ());
        let client = ItemCreatedEmitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);

        let token_addresses = vec![
            &env,
            Address::generate(&env),
            Address::generate(&env),
            Address::generate(&env),
        ];
        let names = vec![
            &env,
            String::from_str(&env, "DTCC Treasury Bond 2025"),
            String::from_str(&env, "DTCC Corporate Note A"),
            String::from_str(&env, "DTCC Municipal Bond X"),
        ];
        let symbols = vec![
            &env,
            String::from_str(&env, "DTB25"),
            String::from_str(&env, "DCNA"),
            String::from_str(&env, "DMBX"),
        ];
        let decimals_list = vec![&env, 7u32, 7u32, 7u32];
        let initial_supplies = vec![
            &env,
            1_000_000_0000000i128,
            500_000_0000000i128,
            2_000_000_0000000i128,
        ];

        client.emit_batch(
            &token_addresses,
            &names,
            &symbols,
            &decimals_list,
            &initial_supplies,
            &admin,
        );

        let events = env.events().all();
        assert_eq!(events.len(), 3);
    }
}
