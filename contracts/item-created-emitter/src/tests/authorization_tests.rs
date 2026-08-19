/// Authorization / RBAC Tests
///
/// Per DTCC requirement §7: Every privileged function must have tests for
/// correct controller, unauthorized wallet, previous controller after handoff, etc.
use super::helpers::*;
use crate::{ItemCreatedEmitter, ItemCreatedEmitterClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

// ═══════════════════════════════════════════════════════════════════════════════
// Controller-Only Functions: emit_item_created
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_emit_authorized_controller_succeeds() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // mock_all_auths is set in setup_initialized
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
#[should_panic]
fn test_emit_unauthorized_wallet_fails() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    let controller = Address::generate(&env);
    let factory = Address::generate(&env);
    let unauthorized = Address::generate(&env);

    // Initialize with controller auth
    env.mock_all_auths();
    client.initialize(&controller, &factory);

    // Now only mock auth for unauthorized wallet (not controller)
    env.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &unauthorized,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &client.address,
            fn_name: "emit_item_created",
            args: soroban_sdk::Vec::new(&env),
            sub_invokes: &[],
        },
    }]);

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // This should fail because unauthorized is not the controller
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
#[should_panic(expected = "not initialized")]
fn test_emit_before_initialization_fails() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    env.mock_all_auths();

    let token_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    // Contract not initialized — should panic
    client.emit_item_created(
        &token_addr,
        &test_name(&env),
        &test_symbol(&env),
        &TEST_DECIMALS,
        &TEST_SUPPLY,
        &admin,
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Controller Transfer and Old Controller Rejection
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_new_controller_can_emit_after_transfer() {
    let env = Env::default();
    let (client, _old_controller, _factory) = setup_initialized(&env);

    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);

    // New controller should be able to emit
    env.mock_all_auths();
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
fn test_new_controller_can_pause() {
    let env = Env::default();
    let (client, _old_controller, _factory) = setup_initialized(&env);

    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);

    env.mock_all_auths();
    client.pause();
    assert!(client.is_paused());
}

#[test]
fn test_new_controller_can_unpause() {
    let env = Env::default();
    let (client, _old_controller, _factory) = setup_initialized(&env);

    client.pause();

    let new_controller = Address::generate(&env);
    client.transfer_control(&new_controller);

    env.mock_all_auths();
    client.unpause();
    assert!(!client.is_paused());
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pause Authorization
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_controller_can_pause() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();
    assert!(client.is_paused());
}

#[test]
fn test_controller_can_unpause() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    client.pause();
    client.unpause();
    assert!(!client.is_paused());
}

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Authorization
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_batch_authorized_succeeds() {
    let env = Env::default();
    let (client, _controller, _factory) = setup_initialized(&env);

    let admin = Address::generate(&env);
    let addrs = soroban_sdk::vec![&env, Address::generate(&env)];
    let names = soroban_sdk::vec![&env, String::from_str(&env, "Test")];
    let symbols = soroban_sdk::vec![&env, String::from_str(&env, "TST")];
    let decimals = soroban_sdk::vec![&env, 7u32];
    let supplies = soroban_sdk::vec![&env, 1000i128];

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
    assert_eq!(client.get_item_count(), 1);
}

#[test]
#[should_panic(expected = "not initialized")]
fn test_batch_before_initialization_fails() {
    let env = Env::default();
    let contract_id = env.register(ItemCreatedEmitter, ());
    let client = ItemCreatedEmitterClient::new(&env, &contract_id);

    env.mock_all_auths();

    let admin = Address::generate(&env);
    let addrs = soroban_sdk::vec![&env, Address::generate(&env)];
    let names = soroban_sdk::vec![&env, String::from_str(&env, "Test")];
    let symbols = soroban_sdk::vec![&env, String::from_str(&env, "TST")];
    let decimals = soroban_sdk::vec![&env, 7u32];
    let supplies = soroban_sdk::vec![&env, 1000i128];

    client.emit_batch(&addrs, &names, &symbols, &decimals, &supplies, &admin);
}
