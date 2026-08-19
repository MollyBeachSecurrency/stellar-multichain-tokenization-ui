/// Boundary and Edge-Case Tests
///
/// Per DTCC requirement §6: Every PR must explicitly test zero values,
/// minimum/maximum allowed, off-by-one, empty vectors, duplicate entries,
/// nonexistent entities, repeated operations, and boundary conditions.
use super::helpers::*;
use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient, MAX_BATCH_SIZE};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, String, Vec};

// ═══════════════════════════════════════════════════════════════════════════════
// Zero Values
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_zero_initial_supply_accepted() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Zero supply should be valid (e.g., a token with no pre-mint)
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &0i128,
        &admin,
    );

    assert_eq!(client.get_item_count(), 1);
}

#[test]
fn test_zero_decimals_accepted() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Zero decimals is valid (non-divisible token)
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &0u32,
        &TEST_SUPPLY,
        &admin,
    );

    assert_eq!(client.get_item_count(), 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Maximum Allowed Values
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_max_decimals_18_accepted() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // 18 is the maximum allowed
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &18u32,
        &TEST_SUPPLY,
        &admin,
    );

    assert_eq!(client.get_item_count(), 1);
}

#[test]
#[should_panic(expected = "decimals exceeds maximum")]
fn test_decimals_19_rejected() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // 19 exceeds the maximum
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &19u32,
        &TEST_SUPPLY,
        &admin,
    );
}

#[test]
fn test_max_i128_supply_accepted() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Maximum i128 value
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &i128::MAX,
        &admin,
    );

    assert_eq!(client.get_item_count(), 1);
}

#[test]
fn test_batch_exactly_at_max_size() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    // Create vectors with exactly MAX_BATCH_SIZE elements
    let mut addrs = Vec::new(&env);
    let mut names = Vec::new(&env);
    let mut symbols = Vec::new(&env);
    let mut decimals = Vec::new(&env);
    let mut supplies = Vec::new(&env);

    for _ in 0..MAX_BATCH_SIZE {
        addrs.push_back(Address::generate(&env));
        names.push_back(String::from_str(&env, "T"));
        symbols.push_back(String::from_str(&env, "T"));
        decimals.push_back(7u32);
        supplies.push_back(100i128);
    }

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
    assert_eq!(client.get_item_count(), MAX_BATCH_SIZE as u64);
}

#[test]
#[should_panic(expected = "batch size exceeds maximum")]
fn test_batch_one_above_max_size() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    let mut addrs = Vec::new(&env);
    let mut names = Vec::new(&env);
    let mut symbols = Vec::new(&env);
    let mut decimals = Vec::new(&env);
    let mut supplies = Vec::new(&env);

    for _ in 0..=MAX_BATCH_SIZE {
        // MAX_BATCH_SIZE + 1
        addrs.push_back(Address::generate(&env));
        names.push_back(String::from_str(&env, "T"));
        symbols.push_back(String::from_str(&env, "T"));
        decimals.push_back(7u32);
        supplies.push_back(100i128);
    }

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Empty Vectors / Lists
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_batch_empty_vectors_emits_nothing() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);
    let empty_addrs: Vec<Address> = Vec::new(&env);
    let empty_names: Vec<String> = Vec::new(&env);
    let empty_symbols: Vec<String> = Vec::new(&env);
    let empty_decimals: Vec<u32> = Vec::new(&env);
    let empty_supplies: Vec<i128> = Vec::new(&env);

    client.emit_batch(
        &empty_addrs,
        &empty_names,
        &empty_symbols,
        &empty_decimals,
        &empty_supplies,
        &admin,
    );

    // Nothing emitted, count stays at 0
    assert_eq!(client.get_item_count(), 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Off-by-One
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_decimals_at_boundary_17_accepted() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &17u32, // one below max
        &TEST_SUPPLY,
        &admin,
    );

    assert_eq!(client.get_item_count(), 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Duplicate Entries
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_duplicate_token_address_accepted() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Same token address emitted twice (the contract is an emitter, not a registry)
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
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
fn test_batch_with_duplicate_addresses() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);
    let same_addr = Address::generate(&env);

    let addrs = vec![&env, same_addr.clone(), same_addr.clone()];
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
    assert_eq!(client.get_item_count(), 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Single-Character Minimum Strings
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_single_char_name_and_symbol_accepted() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    client.emit_item_created(
        &token_addr,
        &String::from_str(&env, "X"),
        &String::from_str(&env, "Y"),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );

    assert_eq!(client.get_item_count(), 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Negative Supply (boundary at 0)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[should_panic(expected = "initial_supply cannot be negative")]
fn test_negative_one_supply_rejected() {
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

#[test]
#[should_panic(expected = "initial_supply cannot be negative")]
fn test_min_i128_supply_rejected() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &i128::MIN,
        &admin,
    );
}
