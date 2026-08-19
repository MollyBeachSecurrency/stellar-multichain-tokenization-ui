# ═══════════════════════════════════════════════════════════════════════════════
# ItemCreated Emitter — Build & Quality Checks
# Per DTCC/SEC Smart Contract Testing & Quality Requirements
# ═══════════════════════════════════════════════════════════════════════════════

PACKAGE := item-created-emitter
WASM_TARGET := wasm32-unknown-unknown
WASM_PATH := target/$(WASM_TARGET)/release/$(subst -,_,$(PACKAGE)).wasm

.PHONY: all build build-wasm test coverage fmt fmt-check clippy deny check clean deploy

# ─── Default ──────────────────────────────────────────────────────────────────

all: fmt-check clippy deny build test

# ─── Build ────────────────────────────────────────────────────────────────────

build:
	cargo build --release

build-wasm:
	cargo build --release --target $(WASM_TARGET)
	@echo "WASM: $(WASM_PATH)"
	@ls -la $(WASM_PATH)

build-optimized: build-wasm
	stellar contract optimize --wasm $(WASM_PATH)

# ─── Test ─────────────────────────────────────────────────────────────────────

test:
	cargo test --workspace

test-verbose:
	cargo test --workspace -- --nocapture

# ─── Coverage ─────────────────────────────────────────────────────────────────

coverage:
	cargo llvm-cov --workspace --lcov --output-path lcov.info
	cargo llvm-cov report --workspace

coverage-html:
	cargo llvm-cov --workspace --html
	@echo "Coverage report: target/llvm-cov/html/index.html"

coverage-check:
	@echo "Checking coverage threshold (98%)..."
	cargo llvm-cov --workspace --fail-under-lines 98

# ─── Formatting ───────────────────────────────────────────────────────────────

fmt:
	cargo fmt --all

fmt-check:
	cargo fmt --all -- --check

# ─── Linting ──────────────────────────────────────────────────────────────────

clippy:
	cargo clippy --all-targets -- -D warnings

# ─── Dependency Security ──────────────────────────────────────────────────────

deny:
	cargo deny check

# ─── Full CI Check (mirrors GitHub Actions) ───────────────────────────────────

check: fmt-check clippy deny build build-wasm test coverage-check
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "  ALL CHECKS PASSED"
	@echo "═══════════════════════════════════════════"

# ─── Mutation Testing ─────────────────────────────────────────────────────────

mutants:
	cargo mutants --workspace --timeout 120

mutants-report:
	cargo mutants --workspace --timeout 120 --output mutants-report

# ─── Deployment ───────────────────────────────────────────────────────────────

deploy: build-wasm
	./deploy.sh

# ─── Clean ────────────────────────────────────────────────────────────────────

clean:
	cargo clean
	rm -f lcov.info
