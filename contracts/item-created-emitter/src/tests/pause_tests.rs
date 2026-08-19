/// Pause / Emergency-Control Tests
///
/// Per DTCC requirement §8: For every contract using pause functionality:
/// - Pause blocks every protected mutator
/// - Read-only getters remain callable when paused
/// - Only authorized controller can pause/unpause
/// - Pause → unpause → operations resume correctly
use super::helpers::*;
use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, String};

// ═══════════════════════════════════════════════════════════════════════════════
// Pause Blocks Mutators
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
#[should_panic(expected = "contract is paused")]
fn test_emit_item_created_blocked_when_paused() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // This must fail
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
}

#[test]
#[should_panic(expected = "contract is paused")]
fn test_emit_batch_blocked_when_paused() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();

    let admin = Address::generate(&env);
    let addrs = vec![&env, Address::generate(&env)];
    let names = vec![&env, String::from_str(&env, "Test")];
    let symbols = vec![&env, String::from_str(&env, "TST")];
    let decimals = vec![&env, 7u32];
    let supplies = vec![&env, 1000i128];

    // This must fail
    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Read-Only Functions Remain Available When Paused
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_version_callable_when_paused() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();
    assert_eq!(client.version(), 1);
}

#[test]
fn test_get_controller_callable_when_paused() {
    let env = Env::default();
    let (client, controller, _factory) = setup_initialized(&env);

    client.pause();
    assert_eq!(client.get_controller(), controller);
}

#[test]
fn test_get_factory_callable_when_paused() {
    let env = Env::default();
    let (client, _controller, factory) = setup_initialized(&env);

    client.pause();
    assert_eq!(client.get_factory(), factory);
}

#[test]
fn test_is_paused_callable_when_paused() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();
    assert!(client.is_paused());
}

#[test]
fn test_get_item_count_callable_when_paused() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    // Emit one item, then pause
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

    client.pause();

    // Should still be able to read count
    assert_eq!(client.get_item_count(), 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pause State Survives Unrelated Operations
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_pause_survives_control_transfer() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();

    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);

    // Still paused after control transfer
    assert!(client.is_paused());
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pause → Unpause → Resume
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_pause_unpause_operations_resume() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Emit works
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

    // Emit works again
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
fn test_repeated_pause_unpause_cycles() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    for _ in 0..5 {
        client.pause();
        assert!(client.is_paused());
        client.unpause();
        assert!(!client.is_paused());
    }

    // Can still emit after repeated cycles
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
