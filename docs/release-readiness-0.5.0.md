# Actual Budget MCP 0.5.0 release readiness

This report records executed evidence only. A pending or skipped mandatory gate keeps the release not ready. It must never contain credentials, private server addresses, personal financial values, or raw query data.

## Release identity

- Target version: `0.5.0`
- Required SDK: `@actual-app/api@26.8.1` exactly
- Required MCP inventory: 46 tools (all 42 v0.4.0 tools plus the four specified advanced transaction tools)
- Commit/revision inspected: working tree based on `370a80d`
- Verification date and operator: 2026-09-02, Codex

## Installed contract findings

- Public `q` and preferred `aqlQuery`: confirmed by installed declarations and contract tests.
- Fixed transaction filters, joins, deterministic ordering, pagination, count/sum, and `inline`/`grouped`/`all` shapes: confirmed by installed declaration/bundle tests.
- Canonical null, transfer, starting-balance, split identity/nesting, and resolved joins: confirmed by installed-contract tests and real-server inline/grouped query execution.
- Import options are exactly `defaultCleared`, `dryRun`, and `reimportDeleted`; `payeeNameNormalization` is absent.
- Preview planning runs normalization, Rules, matching, and reconciliation while installed guards skip payee creation and transaction batch writes.
- Category/payee null clearing: not enabled; mandatory controlled proof is pending, so the MCP rejects these clears deterministically.

## Local deterministic gates

| Gate | Result | Sanitized evidence |
| --- | --- | --- |
| `npm run typecheck` | Pass | TypeScript completed with no diagnostics. |
| `npm test` | Pass | 16 files, 117 tests passed. |
| `npm run test:coverage` | Pass | 117 tests; 82.20% statements, 75.62% branches, 87.31% functions, 85.80% lines. |
| `npm run test:contract` | Pass | 3 files, 18 installed-contract tests passed. |
| `npm run build` | Pass | Production TypeScript build and executable permission step completed. |
| v0.4.0 contract regression | Pass | All 42 legacy tool names and compatibility assertions passed in the unit/contract suites. |
| Exact 46-tool discovery and annotations | Pass | Unit and compiled-client discovery assertions passed. |

## Real-server and compiled stdio gates

| Gate | Result | Sanitized evidence |
| --- | --- | --- |
| Integration read | Pass | 1 file, 12 tests passed before writes and again after cleanup with authorization false. |
| Integration authorized write | Pass | 1 file, 15 tests passed with process-scoped authorization; exact cleanup and final fingerprint passed. |
| Compiled stdio E2E read | Pass | 1 file, 8 tests passed before writes and again after cleanup; exact 46-tool discovery included. |
| Compiled stdio E2E authorized write | Pass | 1 file, 15 tests passed through the compiled MCP process with exact cleanup and fingerprint verification. |
| Negative-input continued protocol health | Pass | Unit, integration, and compiled stdio negative cases completed while subsequent health checks remained valid. |
| Search 100 items / totals observation | Pass | Limit 100 returned 8 controlled items; cold page observation 1148 ms and warm totals observation 2 ms. No threshold was applied. |
| Preview 100 items / bulk dry-run 50 items observation | Pass | Preview 100: 29 ms. Bulk dry-run 50: 1 ms. Both complete before/after fingerprints were identical. |

## Purity, ownership, and integrity

- Preview import before/after complete fingerprint: pass for individual, complete reconciliation-matrix, and 100-item previews.
- Bulk dry-run before/after complete fingerprint: pass for heterogeneous 3-item and 50-item plans.
- Exact run-owned accounts/groups/categories/payees/rules/transactions registered before dependent operations: pass.
- Preview-only IDs excluded from cleanup registry: pass.
- Exact dependency-order cleanup and no leftovers: pass. One development-run title-case assertion failed before payee registration; the single exact temporary payee was recovered, the prior fingerprint was restored, and the strengthened final suite then passed completely.
- Permanent accounts, transactions, payees, categories, rules, and relevant budget state unchanged: pass after both integration and E2E cleanup.
- Write authorization was process-scoped for write suites, remained `false` in the saved environment, and read suites plus `test:all` passed afterward.

## Distribution and operational gates

- Clean `install.sh` verification: pass in an isolated temporary copy.
- Clean fast-forward-only v0.4.0-to-v0.5.0 `update.sh` verification: pass in isolated temporary upstream/client repositories; a dirty checkout was also refused safely.
- `.env`, Actual cache, integration/E2E caches, and Hermes configuration preservation: pass using ignored sentinel files.
- `git diff --check`, tracked-file inspection, and status review: pass; only the two example environment files are tracked.
- Secret-pattern scan without printing values: pass, no matches in authored release files.
- GitHub Actions configuration remains local-only (`npm ci`, typecheck, unit, contract, build): confirmed.

## Compatibility

- All 42 v0.4.0 tool names remain present: confirmed by exact inventory regression tests.
- Previously required inputs, strictness, annotations, and wrapper/required result fields remain compatible: confirmed by unit and contract regression tests.
- `actual_get_transactions.transactions` and import `added`/`updated`/`errors` remain required: confirmed by schema and regression tests.

## Blockers

- None.

ACTUAL BUDGET MCP v0.5.0 READY
