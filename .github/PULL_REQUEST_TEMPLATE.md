## Summary

<!-- Brief description of changes -->

## Type of Change

- [ ] Smart contract change
- [ ] Frontend change
- [ ] Documentation
- [ ] CI/Infrastructure
- [ ] Bug fix
- [ ] New feature

---

## Smart Contract PR Checklist

<!-- Required for all PRs that modify code under contracts/ -->
<!-- Per DTCC/SEC Smart Contract Testing & Quality Requirements (Aug 19, 2026) -->

### Build & Lint (§1)

- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy` passes (no unresolved warnings)
- [ ] Contract builds successfully (native + WASM)
- [ ] `cargo deny check` passes (no dependency vulnerabilities)

### Testing (§3–§10)

- [ ] Unit tests pass
- [ ] Coverage >= 98% or documented exception
- [ ] Authorization negative tests included
- [ ] Boundary tests included
- [ ] Invariant tests included (security-sensitive contracts)
- [ ] Property/fuzz tests included (where applicable)
- [ ] Pause/emergency behavior tested
- [ ] Events tested for name, type, order, and payload
- [ ] Factory/CoreContext integration tested (if applicable)

### Mutation Testing (§11)

- [ ] Mutation testing performed or tracked before audit
- [ ] Security-relevant mutations are caught by tests

### Documentation (§15)

- [ ] TESTING.md updated
- [ ] SECURITY.md updated (if auth/security changes)
- [ ] Security assumptions documented
- [ ] No unexplained skipped/ignored tests

### Security

- [ ] No secrets/private keys committed
- [ ] No `#[allow(...)]` suppressions without justification comment
- [ ] Authorization model documented for new functions

---

## Frontend PR Checklist

<!-- Required for all PRs that modify code under src/ -->

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Tests pass (`npm run test`)
- [ ] No secrets committed
- [ ] Event schema changes coordinated with contract team

---

## Testing Summary

<!-- Describe what was tested and how -->

## Security Considerations

<!-- Any security implications of this change -->

## Related Issues

<!-- Link to related issues/tickets -->
