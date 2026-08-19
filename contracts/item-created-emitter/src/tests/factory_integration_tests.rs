/// Factory Integration Tests
///
/// Per DTCC requirement §9: Any Factory-compatible contract must test
/// correct initialization by Factory, controller set correctly, factory address
/// stored, invalid/duplicate initialization fails, created contracts emit
/// required events, downstream discovery data is correct.
///
/// This contract mimics the Factory-style ItemCreated event and must
/// demonstrate that the initialization → emit → event pipeline works correctly.
use super::helpers::*;
use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient, ItemCreatedEvent};
use soroban_sdk::{
    testutils::{Address as _, Events},
    vec, Address, Env, IntoVal, String, Vec,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Correct Initialization by Factory
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_factory_initialization_sets_correct_state() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    // Verify all initialization state
    assert_eq!(client.get_controller(), controller);
    assert_eq!(client.get_factory(), factory);
    assert_eq!(client.is_paused(), false);
    assert_eq!(client.get_item_count(), 0);
    assert_eq!(client.version(), 1);
}

#[test]
fn test_controller_set_correctly_from_factory_call() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    // Controller should be the one passed during initialization
    assert_eq!(client.get_controller(), controller);
    // And NOT the factory
    assert_ne!(client.get_controller(), factory);
}

#[test]
fn test_factory_address_stored_and_accessible() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    assert_eq!(client.get_factory(), factory);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Invalid Initialization
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[should_panic(expected = "already initialized")]
fn test_duplicate_initialization_fails() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    // Second call must fail
    let new_controller = Address::generate(&env);
    let new_factory = Address::generate(&env);
    client.initialize(&new_controller, &new_factory);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory-Created Instances Emit Required Events
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_initialized_contract_emits_item_created_event() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    env.ledger().set_timestamp(1721234567);

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let (_contract, _topics, data) = events.get(0).unwrap();
    let decoded: ItemCreatedEvent = data.into_val(&env);

    // Verify complete event matches what downstream systems expect
    assert_eq!(decoded.token_address, token_addr);
    assert_eq!(decoded.name, test_name(&env));
    assert_eq!(decoded.symbol, test_symbol(&env));
    assert_eq!(decoded.decimals, TEST_DECIMALS);
    assert_eq!(decoded.initial_supply, TEST_SUPPLY);
    assert_eq!(decoded.admin, admin);
    assert_eq!(decoded.created_at, 1721234567);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Downstream Discovery / Indexing Data Correctness
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_event_data_matches_substreams_expected_schema() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);
    let name = String::from_str(&env, "DTCC Treasury Bond 2025");
    let symbol = String::from_str(&env, "DTB25");
    let decimals = 7u32;
    let supply = 1_000_000_0000000i128;

    env.ledger().set_timestamp(1721234567);

    client.emit_item_created(&token_addr, &name, &symbol, &decimals, &supply, &admin);

    let events = env.events().all();
    let (_contract, topics, data) = events.get(0).unwrap();

    // Substreams expects:
    // topics[0] = Symbol("ItemCrtd")
    // topics[1] = admin Address
    let topics: Vec<soroban_sdk::Val> = topics;
    assert_eq!(topics.len(), 2, "Substreams expects exactly 2 topics");

    // Data: ItemCreatedEvent with all fields present
    let decoded: ItemCreatedEvent = data.into_val(&env);
    // All fields must be populated (non-default)
    assert_ne!(decoded.name.len(), 0, "name must be non-empty for indexer");
    assert_ne!(decoded.symbol.len(), 0, "symbol must be non-empty for indexer");
    assert!(decoded.created_at > 0, "created_at must be set for indexer");
}

#[test]
fn test_three_test_tokens_emit_correct_discovery_data() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);
    env.ledger().set_timestamp(1721234567);

    // Simulate the 3 test token instances the deploy script creates
    let tokens = [
        ("DTCC Treasury Bond 2025", "DTB25", 1_000_000_0000000i128),
        ("DTCC Corporate Note A", "DCNA", 500_000_0000000i128),
        ("DTCC Municipal Bond X", "DMBX", 2_000_000_0000000i128),
    ];

    for (name, symbol, supply) in &tokens {
        let token_addr = Address::generate(&env);
        client.emit_item_created(
            &token_addr,
            &String::from_str(&env, name),
            &String::from_str(&env, symbol),
            &7u32,
            supply,
            &admin,
        );
    }

    // Verify all 3 events emitted with correct data
    let events = env.events().all();
    assert_eq!(events.len(), 3);
    assert_eq!(client.get_item_count(), 3);

    // Verify each event's payload
    for (idx, (expected_name, expected_symbol, expected_supply)) in tokens.iter().enumerate() {
        let (_contract, _topics, data) = events.get(idx as u32).unwrap();
        let decoded: ItemCreatedEvent = data.into_val(&env);

        assert_eq!(decoded.name, String::from_str(&env, expected_name));
        assert_eq!(decoded.symbol, String::from_str(&env, expected_symbol));
        assert_eq!(decoded.initial_supply, *expected_supply);
        assert_eq!(decoded.decimals, 7);
        assert_eq!(decoded.admin, admin);
        assert_eq!(decoded.created_at, 1721234567);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// End-to-End Pipeline Simulation
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_full_factory_pipeline_simulation() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();

    // Step 1: Factory deploys and initializes contract
    client.initialize(&controller, &factory);
    assert_eq!(client.version(), 1);

    // Step 2: Factory/controller creates a token
    let token_addr = Address::generate(&env);
    let admin = controller.clone();

    env.ledger().set_timestamp(1721234567);

    client.emit_item_created(
        &token_addr,
        &String::from_str(&env, "DTCC Test Asset"),
        &String::from_str(&env, "DTA"),
        &7u32,
        &5_000_000_0000000i128,
        &admin,
    );

    // Step 3: Verify event for Substreams consumption
    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let (event_contract, topics, data) = events.get(0).unwrap();

    // Event from correct contract
    assert_eq!(event_contract, client.address);

    // Correct topic structure
    let topics: Vec<soroban_sdk::Val> = topics;
    assert_eq!(topics.len(), 2);

    // Correct payload for downstream SQL/GraphQL
    let decoded: ItemCreatedEvent = data.into_val(&env);
    assert_eq!(decoded.token_address, token_addr);
    assert_eq!(decoded.name, String::from_str(&env, "DTCC Test Asset"));
    assert_eq!(decoded.symbol, String::from_str(&env, "DTA"));
    assert_eq!(decoded.decimals, 7);
    assert_eq!(decoded.initial_supply, 5_000_000_0000000i128);
    assert_eq!(decoded.admin, admin);
    assert_eq!(decoded.created_at, 1721234567);

    // Step 4: Item count reflects the creation
    assert_eq!(client.get_item_count(), 1);
}
