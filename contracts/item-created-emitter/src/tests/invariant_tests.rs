/// Invariant Tests
///
/// Per DTCC requirement §4: Every security-sensitive contract must define invariants
/// — properties that remain true regardless of call ordering or input sequence.
///
/// Invariants for ItemCreatedEmitter:
/// 1. Item count never decreases (monotonically increasing)
/// 2. Paused state blocks all mutators regardless of call sequence
/// 3. Unauthorized callers can never emit events regardless of state
/// 4. Event count always equals item_count after any valid operation
/// 5. Controller change doesn't affect pause state
/// 6. Initialization can only happen once regardless of attempts
use super::helpers::*;
use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient};
use soroban_sdk::{
    testutils::{Address as _, Events},
    vec, Address, Env, String,
};

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT 1: Item count is monotonically non-decreasing
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn invariant_item_count_never_decreases() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    let mut previous_count = 0u64;

    // Perform a sequence of operations
    for _ in 0..10 {
        client.emit_item_created(
            &token_addr,
            &test_name(&env),
            &test_symbol(&env),
            &TEST_DECIMALS,
            &TEST_SUPPLY,
            &admin,
        );

        let current_count = client.get_item_count();
        assert!(
            current_count >= previous_count,
            "INVARIANT VIOLATED: item_count decreased from {} to {}",
            previous_count,
            current_count
        );
        previous_count = current_count;
    }
}

#[test]
fn invariant_item_count_non_decreasing_with_pause_cycles() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Emit, pause, unpause, emit — count should never go down
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
    assert_eq!(client.get_item_count(), 1);

    client.pause();
    assert_eq!(client.get_item_count(), 1); // Stays same

    client.unpause();
    assert_eq!(client.get_item_count(), 1); // Stays same

    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
    assert_eq!(client.get_item_count(), 2); // Increased

    // Control transfer doesn't affect count
    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);
    assert_eq!(client.get_item_count(), 2); // Same
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT 2: Paused contracts block ALL mutating operations
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn invariant_pause_blocks_all_mutators() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // emit_item_created must be blocked
    let result1 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.emit_item_created(
            &token_addr,
            &test_name(&env),
            &test_symbol(&env),
            &TEST_DECIMALS,
            &TEST_SUPPLY,
            &admin,
        );
    }));
    assert!(result1.is_err(), "INVARIANT VIOLATED: emit_item_created succeeded while paused");

    // emit_batch must be blocked
    let result2 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let addrs = vec![&env, Address::generate(&env)];
        let names = vec![&env, String::from_str(&env, "T")];
        let symbols = vec![&env, String::from_str(&env, "T")];
        let decimals = vec![&env, 7u32];
        let supplies = vec![&env, 100i128];
        client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
    }));
    assert!(result2.is_err(), "INVARIANT VIOLATED: emit_batch succeeded while paused");
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT 3: Event count matches item_count after any valid sequence
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn invariant_event_count_equals_item_count() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);

    // Single emits
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

    // Batch emit of 2
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

    // INVARIANT: event count == item_count
    let events = env.events().all();
    let item_count = client.get_item_count();

    assert_eq!(
        events.len() as u64, item_count,
        "INVARIANT VIOLATED: {} events emitted but item_count is {}",
        events.len(),
        item_count
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT 4: Controller change doesn't affect pause state
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn invariant_control_transfer_preserves_pause() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    // Pause first
    client.pause();
    assert!(client.is_paused());

    // Transfer control
    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);

    // INVARIANT: pause state unchanged
    assert!(
        client.is_paused(),
        "INVARIANT VIOLATED: control transfer changed pause state"
    );
}

#[test]
fn invariant_control_transfer_preserves_unpaused() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    assert!(!client.is_paused());

    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);

    assert!(
        !client.is_paused(),
        "INVARIANT VIOLATED: control transfer changed pause state"
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT 5: Initialization is idempotent (only once)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn invariant_initialization_only_once() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&controller, &factory);

    // Multiple attempts to reinitialize must all fail
    for _ in 0..5 {
        let new_ctrl = Address::generate(&env);
        let new_fact = Address::generate(&env);

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.initialize(&new_ctrl, &new_fact);
        }));
        assert!(
            result.is_err(),
            "INVARIANT VIOLATED: contract was reinitialized"
        );
    }

    // Original controller is still the controller
    assert_eq!(client.get_controller(), controller);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT 6: item_count increments by exactly the number of items created
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn invariant_count_increments_by_exact_amount() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let count_before = client.get_item_count();

    // Single emit: +1
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
    assert_eq!(client.get_item_count(), count_before + 1);

    let count_after_single = client.get_item_count();

    // Batch of 5: +5
    let mut addrs = soroban_sdk::Vec::new(&env);
    let mut names = soroban_sdk::Vec::new(&env);
    let mut symbols = soroban_sdk::Vec::new(&env);
    let mut decimals = soroban_sdk::Vec::new(&env);
    let mut supplies = soroban_sdk::Vec::new(&env);

    for _ in 0..5 {
        addrs.push_back(Address::generate(&env));
        names.push_back(String::from_str(&env, "T"));
        symbols.push_back(String::from_str(&env, "T"));
        decimals.push_back(7u32);
        supplies.push_back(100i128);
    }

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
    assert_eq!(
        client.get_item_count(),
        count_after_single + 5,
        "INVARIANT VIOLATED: batch of 5 did not increment count by exactly 5"
    );
}
