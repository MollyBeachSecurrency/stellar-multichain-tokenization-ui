/// Unit Tests — Positive path, negative path, state-transition, duplicate operations.
///
/// Per DTCC requirement §3: Every public contract method must have tests covering
/// positive path, negative path, invalid arguments, state-transition, and duplicates.
use super::helpers::*;
use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient, MAX_BATCH_SIZE};
use soroban_sdk::{
    testutils::{Address as _, Events},
    vec, Address, Env, String, Vec,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Initialization Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_initialize_success() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    assert_eq!(client.get_controller(), controller);
    assert_eq!(client.get_factory(), factory);
    assert_eq!(client.is_paused(), false);
    assert_eq!(client.get_item_count(), 0);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_duplicate_fails() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    // Second initialization must fail
    let controller2 = Address::generate(&env);
    let factory2 = Address::generate(&env);
    client.initialize(&controller2, &factory2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// emit_item_created Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_emit_item_created_success() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );

    assert_eq!(client.get_item_count(), 1);
}

#[test]
fn test_emit_item_created_increments_count() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    for i in 1..=5 {
        client.emit_item_created(
            &token_addr,
            &test_name(&env),
            &test_symbol(&env),
            &TEST_DECIMALS,
            &TEST_SUPPLY,
            &admin,
        );
        assert_eq!(client.get_item_count(), i);
    }
}

#[test]
#[should_panic(expected = "name cannot be empty")]
fn test_emit_item_created_empty_name_fails() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);
    let empty_name = String::from_str(&env, "");

    client.emit_item_created(
        &token_addr,
        &empty_name,
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
}

#[test]
#[should_panic(expected = "symbol cannot be empty")]
fn test_emit_item_created_empty_symbol_fails() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);
    let empty_symbol = String::from_str(&env, "");

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &empty_symbol,
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
}

#[test]
#[should_panic(expected = "decimals exceeds maximum")]
fn test_emit_item_created_decimals_too_high() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &19u32, // exceeds max of 18
        &TEST_SUPPLY,
        &admin,
    );
}

#[test]
#[should_panic(expected = "initial_supply cannot be negative")]
fn test_emit_item_created_negative_supply_fails() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &-1i128,
        &admin,
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// emit_batch Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_emit_batch_success() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    let token_addresses = vec![
        &env,
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];
    let names = vec![
        &env,
        String::from_str(&env, "Token A"),
        String::from_str(&env, "Token B"),
        String::from_str(&env, "Token C"),
    ];
    let symbols = vec![
        &env,
        String::from_str(&env, "TKA"),
        String::from_str(&env, "TKB"),
        String::from_str(&env, "TKC"),
    ];
    let decimals_list = vec![&env, 7u32, 7u32, 7u32];
    let initial_supplies = vec![&env, 1000i128, 2000i128, 3000i128];

    client.emit_batch(
        &token_addresses,
        &names,
        &symbols,
        &decimals_list,
        &initial_supplies,
        &admin,
    );

    assert_eq!(client.get_item_count(), 3);
}

#[test]
#[should_panic(expected = "batch size exceeds maximum")]
fn test_emit_batch_exceeds_max_size() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    // Create vectors with MAX_BATCH_SIZE + 1 elements
    let mut addrs = Vec::new(&env);
    let mut names = Vec::new(&env);
    let mut symbols = Vec::new(&env);
    let mut decimals = Vec::new(&env);
    let mut supplies = Vec::new(&env);

    for _ in 0..=(MAX_BATCH_SIZE) {
        addrs.push_back(Address::generate(&env));
        names.push_back(String::from_str(&env, "X"));
        symbols.push_back(String::from_str(&env, "X"));
        decimals.push_back(7u32);
        supplies.push_back(1000i128);
    }

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
}

#[test]
#[should_panic(expected = "input vector length mismatch")]
fn test_emit_batch_mismatched_lengths() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    let token_addresses = vec![&env, Address::generate(&env), Address::generate(&env)];
    let names = vec![&env, String::from_str(&env, "Token A")]; // Only 1
    let symbols = vec![&env, String::from_str(&env, "TKA"), String::from_str(&env, "TKB")];
    let decimals_list = vec![&env, 7u32, 7u32];
    let initial_supplies = vec![&env, 1000i128, 2000i128];

    client.emit_batch(
        &token_addresses,
        &names,
        &symbols,
        &decimals_list,
        &initial_supplies,
        &admin,
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Controller Management Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_transfer_control_success() {
    let env = Env::default();
    let (client, controller, _factory) = setup_initialized(&env);

    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);

    assert_eq!(client.get_controller(), new_controller);
    // Old controller should no longer be the controller
    assert_ne!(client.get_controller(), controller);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Version / Read-Only Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_version_returns_1() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    assert_eq!(client.version(), 1);
}

#[test]
fn test_get_item_count_starts_at_zero() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    assert_eq!(client.get_item_count(), 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// State Transition Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_state_transition_emit_then_pause_then_unpause() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Can emit when not paused
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
    assert_eq!(client.get_item_count(), 1);

    // Pause
    client.pause();
    assert!(client.is_paused());

    // Unpause
    client.unpause();
    assert!(!client.is_paused());

    // Can emit again
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
    assert_eq!(client.get_item_count(), 2);
}

#[test]
fn test_state_transition_multiple_items_maintain_count() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    // Emit 3 individual items
    for _ in 0..3 {
        let token_addr = Address::generate(&env);
        client.emit_item_created(
            &token_addr,
            &test_name(&env),
            &test_symbol(&env),
            &TEST_DECIMALS,
            &TEST_SUPPLY,
            &admin,
        );
    }
    assert_eq!(client.get_item_count(), 3);

    // Emit a batch of 2
    let addrs = vec![&env, Address::generate(&env), Address::generate(&env)];
    let names = vec![
        &env,
        String::from_str(&env, "A"),
        String::from_str(&env, "B"),
    ];
    let symbols = vec![
        &env,
        String::from_str(&env, "A"),
        String::from_str(&env, "B"),
    ];
    let decimals = vec![&env, 7u32, 7u32];
    let supplies = vec![&env, 100i128, 200i128];

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
    assert_eq!(client.get_item_count(), 5);
}
