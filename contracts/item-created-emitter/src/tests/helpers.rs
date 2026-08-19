use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

/// Set up a test environment with the contract deployed and initialized.
pub fn setup_initialized(env: &Env) -> (ItemCreatedEmitterClient, Address, Address) {
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(env, &contract_id);

    let controller = Address::generate(env);
    let factory = Address::generate(env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    (client, controller, factory)
}

/// Create a standard test token name.
pub fn test_name(env: &Env) -> String {
    String::from_str(env, "DTCC Treasury Bond 2025")
}

/// Create a standard test token symbol.
pub fn test_symbol(env: &Env) -> String {
    String::from_str(env, "DTB25")
}

/// Standard decimals for tests.
pub const TEST_DECIMALS: u32 = 7;

/// Standard initial supply for tests (1,000,000 with 7 decimals).
pub const TEST_SUPPLY: i128 = 1_000_000_0000000;
