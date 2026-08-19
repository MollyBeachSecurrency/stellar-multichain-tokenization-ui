/// Event Tests
///
/// Per DTCC requirement §10: Every externally consumed event must have tests for
/// event name, parameter order, parameter types, indexed/topic values, payload values,
/// emission conditions, no duplicate emission, and no emission on failure path.
///
/// This is CRITICAL for ItemCreated — Substreams, GraphQL Mesh, and the frontend
/// all depend on the event schema being stable and correct.
use super::helpers::*;
use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient, ItemCreatedEvent};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events},
    vec, Address, Env, IntoVal, String, Val, Vec,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Event Topic Structure
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_event_topic_contains_item_created_symbol() {
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

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let (event_contract, event_topics, _event_data) = events.get(0).unwrap();

    // Verify the event came from our contract
    assert_eq!(event_contract, client.address);

    // Verify topic structure: (Symbol("ItemCrtd"), admin_address)
    let topics: Vec<Val> = event_topics;
    assert_eq!(topics.len(), 2);

    // First topic is the symbol
    let expected_symbol: Val = symbol_short!("ItemCrtd").into_val(&env);
    assert_eq!(topics.get(0).unwrap(), expected_symbol);

    // Second topic is the admin address
    let expected_admin: Val = admin.into_val(&env);
    assert_eq!(topics.get(1).unwrap(), expected_admin);
}

#[test]
fn test_event_topic_admin_matches_input() {
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

    let events = env.events().all();
    let (_contract, topics, _data) = events.get(0).unwrap();
    let topics: Vec<Val> = topics;

    let topic_admin: Val = admin.into_val(&env);
    assert_eq!(topics.get(1).unwrap(), topic_admin);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Payload / Data Structure
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_event_payload_contains_all_fields() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);
    let name = test_name(&env);
    let symbol = test_symbol(&env);

    // Set a specific ledger timestamp
    env.ledger().set_timestamp(1721234567);

    client.emit_item_created(
        &token_addr,
        &name,
        &symbol,
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );

    let events = env.events().all();
    let (_contract, _topics, event_data) = events.get(0).unwrap();

    // Decode the event data as ItemCreatedEvent
    let decoded: ItemCreatedEvent = event_data.into_val(&env);

    assert_eq!(decoded.token_address, token_addr);
    assert_eq!(decoded.name, name);
    assert_eq!(decoded.symbol, symbol);
    assert_eq!(decoded.decimals, TEST_DECIMALS);
    assert_eq!(decoded.initial_supply, TEST_SUPPLY);
    assert_eq!(decoded.admin, admin);
    assert_eq!(decoded.created_at, 1721234567);
}

#[test]
fn test_event_created_at_uses_ledger_timestamp() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    env.ledger().set_timestamp(9999);

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );

    let events = env.events().all();
    let (_contract, _topics, event_data) = events.get(0).unwrap();
    let decoded: ItemCreatedEvent = event_data.into_val(&env);

    assert_eq!(decoded.created_at, 9999);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Emission Count
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_single_emit_produces_exactly_one_event() {
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

    let events = env.events().all();
    assert_eq!(events.len(), 1);
}

#[test]
fn test_batch_emits_exact_count_of_events() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    let addrs = vec![
        &env,
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];
    let names = vec![
        &env,
        String::from_str(&env, "A"),
        String::from_str(&env, "B"),
        String::from_str(&env, "C"),
    ];
    let symbols = vec![
        &env,
        String::from_str(&env, "A"),
        String::from_str(&env, "B"),
        String::from_str(&env, "C"),
    ];
    let decimals = vec![&env, 7u32, 7u32, 7u32];
    let supplies = vec![&env, 100i128, 200i128, 300i128];

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);

    let events = env.events().all();
    assert_eq!(events.len(), 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// No Emission on Failure Path
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_no_event_emitted_on_validation_failure() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);
    let empty_name = String::from_str(&env, "");

    // Attempt an emit with invalid input (should panic)
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.emit_item_created(
            &token_addr,
            &empty_name,
            &test_symbol(&env),
            &TEST_DECIMALS,
            &TEST_SUPPLY,
            &admin,
        );
    }));

    assert!(result.is_err());
    // No events should have been emitted
    let events = env.events().all();
    assert_eq!(events.len(), 0);
}

#[test]
fn test_no_event_emitted_when_paused() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.emit_item_created(
            &token_addr,
            &test_name(&env),
            &test_symbol(&env),
            &TEST_DECIMALS,
            &TEST_SUPPLY,
            &admin,
        );
    }));

    assert!(result.is_err());
    let events = env.events().all();
    assert_eq!(events.len(), 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Event Ordering
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_batch_events_maintain_order() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);
    let addr_a = Address::generate(&env);
    let addr_b = Address::generate(&env);
    let addr_c = Address::generate(&env);

    let addrs = vec![&env, addr_a.clone(), addr_b.clone(), addr_c.clone()];
    let names = vec![
        &env,
        String::from_str(&env, "First"),
        String::from_str(&env, "Second"),
        String::from_str(&env, "Third"),
    ];
    let symbols = vec![
        &env,
        String::from_str(&env, "1ST"),
        String::from_str(&env, "2ND"),
        String::from_str(&env, "3RD"),
    ];
    let decimals = vec![&env, 7u32, 7u32, 7u32];
    let supplies = vec![&env, 100i128, 200i128, 300i128];

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);

    let events = env.events().all();
    assert_eq!(events.len(), 3);

    // Verify ordering by checking token_address in each event
    let (_c, _t, data_0) = events.get(0).unwrap();
    let decoded_0: ItemCreatedEvent = data_0.into_val(&env);
    assert_eq!(decoded_0.token_address, addr_a);
    assert_eq!(decoded_0.initial_supply, 100);

    let (_c, _t, data_1) = events.get(1).unwrap();
    let decoded_1: ItemCreatedEvent = data_1.into_val(&env);
    assert_eq!(decoded_1.token_address, addr_b);
    assert_eq!(decoded_1.initial_supply, 200);

    let (_c, _t, data_2) = events.get(2).unwrap();
    let decoded_2: ItemCreatedEvent = data_2.into_val(&env);
    assert_eq!(decoded_2.token_address, addr_c);
    assert_eq!(decoded_2.initial_supply, 300);
}

// ═══════════════════════════════════════════════════════════════════════════════
// All Batch Events Share Same Topic Structure
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_batch_events_all_have_correct_topic() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);
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

    let events = env.events().all();
    let expected_symbol: Val = symbol_short!("ItemCrtd").into_val(&env);
    let expected_admin: Val = admin.into_val(&env);

    for i in 0..events.len() {
        let (_contract, topics, _data) = events.get(i).unwrap();
        let topics: Vec<Val> = topics;
        assert_eq!(topics.get(0).unwrap(), expected_symbol);
        assert_eq!(topics.get(1).unwrap(), expected_admin);
    }
}
