# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 - 2026-09-07

### Foundation

- Froze the compatible 62-tool public contract and generated inventory, limits, error, idempotency, synchronization, and public-model references.
- Kept `@actual-app/api` pinned exactly to 26.8.1.

### Domains

- Revalidated transactions, imports, transfers, reconciliation, budgets, payees, rules, accounts, categories, schedules, summaries, and runtime status.

### Security

- Added exhaustive policy/schema threat coverage, stronger cleanup fingerprints, sanitized error/logging checks, and protocol resilience coverage.

### Testing and operations

- Added v1 contract, import, security, support, acceptance, Hermes, and performance documentation plus safe release checks.

### Known limitations

- No Pluggy/direct bank sync, cron, MCP HTTP transport, raw ActualQL/SQL/SQLite, manual rule execution/preview, transfer schedules, manual schedule posting, or reconciliation locking.
- Real integration/E2E writes remain separately authorized and are required before production readiness.

## 0.7.0 - 2026-09-03

### Added

- Five schedule tools for bounded reads and verified create/update/delete through the pinned public SDK.
- Three signed, bounded financial summaries and one sanitized runtime-status tool.
- Central capability policy, MCP read-only mode, destructive-operation kill switch, safe queue observations, and in-memory sync telemetry.

### Changed

- Expanded discovery from 53 to exactly 62 tools while preserving the previous public names and required result fields.
- Centralized MCP/SDK versions and kept `@actual-app/api` pinned exactly at 26.8.1.
- Extended installed-contract, unit, integration/E2E ownership, environment, acceptance, and readiness documentation.

### Fixed

- Prevented mutation tools from bypassing process policy, unsafe schedule reference/shape changes, omitted schedule amounts, and rule-internal leakage.
- Prevented transfers, starting balances, split parents, refunds, income adjustments, and off-budget cash flow from being misclassified in summaries.

## 0.6.0 - 2026-09-03

### Added

- Seven tools for transfer payees, reciprocal pair lookup/search, dry-run-first manual transfer creation, possible-transfer and possible-duplicate diagnostics, and account reconciliation snapshots.
- Deterministic pair/candidate keys, integrity reason codes, bounded classification, split-safe reconciliation, cutoff balance cross-checks, and phase-aware transfer recovery evidence.

### Changed

- Expanded the exact MCP inventory from 46 to 53 tools while preserving all v0.5.0 tools and required contracts.
- Made canonical reads, import/preview fingerprints, search, update, bulk update, deletion, cleanup, and permanent fingerprints transfer-aware while keeping `@actual-app/api` pinned exactly at 26.8.1.
- Package, lockfile, MCP metadata, README, CHANGELOG, acceptance guidance, traceability, and readiness metadata now report 0.6.0.

### Fixed

- Prevented reciprocal account movements from being treated as unrelated income/expense evidence and prevented broken relationships from being silently fabricated or repaired.
- Prevented unbounded candidate scans, amount-only duplicate claims, ambiguous automatic matching, direct relationship mutation, unsupported reconciliation mutation, unverified transfer creation/deletion success, and automatic retry or rollback after partial creation.
- Refreshed transfer deletion state once before final exact-ID verification when the pinned SDK temporarily retains a removed counterpart in its local query view, without repeating the delete call.

## 0.5.0 - 2026-09-02

### Added

- Exact transaction lookup and fixed-table advanced search with typed filters, literal text matching, signed ranges, deterministic pagination, split-aware results, and supported inline totals.
- Dry-run-first heterogeneous bulk desired-state updates with complete preflight, split/transfer protection, explicit write confirmation, one synchronization, exact read-back, and phased partial-state recovery.
- Official read-only import preview, shared option normalization, truthful preview-only identifiers, and versioned SHA-256 preview-to-import request binding.
- Installed ActualQL/import contract coverage plus unit, guarded integration, and compiled stdio E2E coverage for the advanced transaction surface.

### Changed

- Expanded the exact MCP inventory from 42 to 46 tools while preserving every v0.4.0 name, required input, annotation, wrapper, and required output field.
- Enriched canonical transactions with installed split identity/nesting and resolved payee/category names while preserving null separately from absence.
- Added supported `defaultCleared` and `reimportDeleted` options and exact optional audit metadata to `actual_import_transactions` while keeping `@actual-app/api` pinned exactly at 26.8.1.
- Package, lockfile, MCP metadata, documentation, examples, and readiness gates now report 0.5.0.

### Fixed

- Prevented exact split-child lookup from being replaced by a grouped parent and prevented split-parent double counting in inline totals.
- Prevented caller-controlled raw ActualQL, wildcard expansion, unsupported normalization options, unconfirmed bulk writes, split rewrites, and relational transfer edits.
- Prevented preview-generated IDs from being described as persisted, preview from synchronizing, fingerprint mismatches from reaching mutation, and compound failures from claiming rollback or automatic retry.

## 0.4.0 - 2026-09-01

### Added

- Eight budget tools for official month discovery, month detail, bounded summaries, verified amount/carryover writes, envelope hold/reset, and guarded month copy.
- Runtime-validated envelope and tracking projections that preserve official signed aggregates, hidden state, nullability/absence, and shape-proven category capabilities.
- Dry-run-first `fill-empty` and confirmed `overwrite` copy planning with hidden opt-in, optional prospective carryover, bounded differences, sequential verification, and partial-state metadata.
- Sanitized installed-contract fixtures, budget-aware real integration and compiled stdio E2E coverage, dynamic safe-month selection, exact cleanup, and permanent planning fingerprints.

### Changed

- Expanded the exact compatible MCP surface from 34 to 42 tools while preserving every v0.3.0 name, strict schema, annotation, and output contract.
- Package, lockfile, server metadata, documentation, and Docker examples now report 0.4.0 while `@actual-app/api` remains pinned exactly at 26.8.1.
- Real write suites now refuse protected future planning state and restore owned budget amounts, carryover, holds, categories, and groups before fingerprint verification.

### Fixed

- Prevented envelope income budgeting, tracking hold emulation, same-month copies, hidden-category copying by default, and unconfirmed nonzero overwrites.
- Prevented copy batching from being presented as transactional; partial local, sync, and post-sync verification outcomes now remain distinguishable and non-retryable.
- Prevented fabricated budget aggregates, sign normalization, implicit hold resets, copied transaction activity, and automatic mutation replay.

## 0.3.0 - 2026-08-30

### Added

- Five payee tools for exact reads, idempotent create, protected rename, proven-unused deletion, and verified official merge.
- Five rule tools for ranked reads, conservative creation, desired-state full-object updates, and protected deletion.
- Strict rule condition/action unions, reference validation, default-stage translation, advanced-rule writability, and import-time functional execution coverage.
- Exact-ID payee/rule ownership, dependency-ordered cleanup, permanent-payee guards, complete fingerprints, and sanitized leftover diagnostics in real suites.

### Changed

- Expanded the exact compatible MCP surface from 24 to 34 tools while preserving all v0.2.0 contracts, especially `actual_list_payees`.
- Package, lockfile, MCP metadata, Docker examples, and release documentation now report 0.3.0 while `@actual-app/api` remains pinned at 26.8.1.
- Real integration and compiled stdio E2E suites cover payee/rule reads, lifecycles, negative paths, restart-safe verification, and automatic categorization through official import.

### Fixed

- Prevented silent transfer-payee delete/merge no-ops from being reported as successful mutations.
- Interpreted the installed boolean `deleteRule` result and protected schedule-owned rules instead of following the website's nullable return description.
- Prevented arbitrary rule JSON, destructive actions, missing references, advanced-rule rewrites, merge retries, and unverified partial mutations.
- Isolated installed SDK discrepancies for payee shape, full-object rule updates, ranked ordering, and `default` stage nullability behind contract-tested adapters.

## 0.2.0 - 2026-08-30

### Added

- Five account administration tools for create, allowlisted update, safe close, reopen, and confirmed empty-only deletion.
- Three category-group and six category administration tools with typed creation, rename, same-type moves, semantic visibility, and confirmed unused-only deletion.
- Complete-history and budget-month destructive preflights, persisted-state verification, stable recovery metadata, and owned-resource real-test infrastructure.

### Changed

- Expanded the exact MCP surface from 10 to 24 tools while keeping the ten 0.1.0 contracts compatible.
- Structural mutation lifecycles now keep preflight, mutation, synchronization, refetch, and verification in one FIFO queue position.
- Package and MCP metadata now report 0.2.0 while `@actual-app/api` remains pinned at 26.8.1.

### Fixed

- Prevented the installed SDK's zero-transaction close path from implicitly deleting an account.
- Prevented account, category-group, and category delete cascades unless complete public reads prove the entity empty or unused.
- Marked mutation/sync and post-sync/read partial failures non-retryable and returned explicit safe recovery state.

## 0.1.0 - Unreleased

### Added

- Initial MCP stdio server for Actual Budget.
- Ten tools for health, synchronization, account, category, payee, and transaction operations.
- Strict validation, serialized SDK access, secret redaction, tests, and deployment guidance.
