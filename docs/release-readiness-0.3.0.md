# Actual Budget MCP 0.3.0 readiness report

Date: 2026-08-31

## Version and public surface

- Before version: `0.2.0`
- Target version: `0.3.0`
- Installed `@actual-app/api`: `26.8.1` (must remain exact)
- Expected MCP inventory: exactly 34 tools; all 24 v0.2.0 tools plus five payee and five rule tools
- Compatibility check: `actual_list_payees` items remain exactly `id` and `name`
- Unsupported inventory check: `actual_run_rules` and `actual_preview_rule` are absent

## Installed API findings

- Payee declarations/exports and transfer behavior: verified; see `docs/actual-api-26.8.1-contract.md`.
- Rule declarations/exports, ranked order, full-object update, boolean deletion, stage nullability, and protected deletion: verified in the installed bundle.
- Public manual run and preview exports: absent.
- Sanitized real observation: 11 payees, 2 transfer payees, explicit null/string `transfer_acct`; no pre-existing rules were available before guarded write verification.

## Verification results

| Gate | Required evidence | Result |
| --- | --- | --- |
| `npm run typecheck` | Exit 0 | Passed |
| `npm test` | Exit 0 and exact test count | Passed: 13 files, 78 tests |
| `npm run test:contract` | Exit 0 and exact test count | Passed: 2 files, 11 tests |
| `npm run build` | Exit 0; executable `dist/index.js` | Passed |
| `npm run test:integration:read` before writes | Real configured server | Passed: 1 file, 8 tests |
| `npm run test:e2e:read` before writes | Compiled stdio and exactly 34 tools | Passed: 1 file, 6 tests |
| `npm run test:integration:write` | Explicit process-scoped write authorization | Passed: 1 file, 10 tests |
| Integration cleanup/fingerprint | Exact IDs; no leftovers; unchanged permanent fingerprint | Passed after correcting opening-balance date discovery |
| `npm run test:e2e:write` | Explicit process-scoped write authorization; MCP-only flows | Passed: 1 file, 12 tests |
| E2E cleanup/fingerprint | Exact IDs; no leftovers; unchanged permanent fingerprint | Passed after using an MCP-valid 60-day opening-balance window |
| Read suites after writes | Both read suites pass again | Passed: integration 8 tests; compiled E2E 6 tests |
| `npm run test:all` | Every configured suite and final build | Passed: local 78, contract 11, integration read 8/write 10 skipped, E2E read 6/write 12 skipped, final build passed |
| clean `install.sh` | Locked install/build in a clean path | Passed in an isolated temporary path |
| safe v0.2.0 → v0.3.0 `update.sh` | Fast-forward only; preserves env/caches/Hermes data | Passed in isolated local origin/consumer checkouts; all sentinel hashes preserved |
| `git diff --check`, status, tracked files | No whitespace or unexpected tracked runtime data | Passed; only expected implementation and OpenSpec changes are present |
| secret-pattern scan | No printed or tracked secret values | Passed; only documented/example placeholders matched |

## Real-server corrections

- The first guarded integration attempt showed that Actual dates an opening-balance transaction at account creation time, not at the transaction fixture date. Exact-ID corrective cleanup removed the one temporary opening transaction and account; the permanent-suite transaction was already absent. The integration regression now discovers the opening transaction from complete official account history.
- The first guarded E2E attempt then proved that the public MCP transaction-read contract correctly limits inclusive ranges to 366 days. Exact-ID corrective cleanup removed the one temporary opening transaction and account; the E2E regression now uses a dynamic 60-day window.
- Both corrected write suites passed on rerun, then passed again with real default-stage round-trip coverage. These findings required test-harness corrections only; no production-code expectation was weakened.

## Capability outcomes

- Payee reads and administration: implemented; local, MCP, real integration, and compiled E2E lifecycles passed.
- Payee merge: implemented with per-source impact and non-retryable partial-state recovery; real integration and compiled E2E merge passed.
- Rule reads and administration: implemented; persisted `pre`, default, and `post` lifecycle passed through integration and compiled E2E.
- Automatic categorization: Actual's official import pipeline applied the MCP-created rule in both real integration and compiled E2E.
- Manual rule execution and preview: unsupported by the pinned public SDK and intentionally absent.
- v0.2.0 compatibility: local contract coverage and the final full gate passed.

## Cleanup, integrity, and secrets

- Cleanup order is transactions, rules, payees, categories, category groups, accounts.
- All temporary resources must be registered by exact returned ID; prefix discovery/deletion is forbidden.
- Permanent accounts, categories, payees, rules, and original transactions must have identical before/after fingerprints.
- Local environment files, Actual caches, E2E caches, integration caches, and Hermes configuration must remain untracked and preserved.
- Final logs, results, and this report must contain no credential values.

## Release blockers

- None.

ACTUAL BUDGET MCP v0.3.0 READY
