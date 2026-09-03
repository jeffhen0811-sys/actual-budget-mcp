## Why

Actual Budget MCP 0.4.0 can read bounded account transactions and perform individual writes, but it cannot reliably look up one transaction, search across accounts with structured filters, preview reconciliation, or safely apply heterogeneous desired-state updates in bulk. Version 0.5.0 should add those capabilities through the pinned official Actual pipeline so a future bank-to-Alfred workflow can inspect, preview, approve, and import transactions without exposing arbitrary query access or inventing reconciliation behavior.

## What Changes

- Add `actual_get_transaction` for exact-ID lookup across normal, imported, transfer, split, and starting-balance transactions.
- Add `actual_search_transactions` with typed date, account, transaction, payee, category, uncategorized, import-source, cleared, signed-amount, literal-text, split-mode, sorting, pagination, and supported-total filters.
- Add `actual_bulk_update_transactions` with heterogeneous per-item desired states, dry-run by default, complete preflight, explicit write confirmation, conservative transfer/split protection, one final synchronization, read-back verification, idempotency, and partial-failure recovery metadata.
- Add `actual_preview_import`, always read-only, using `importTransactions(..., { dryRun: true })` and the same normalized request/options path as the existing import tool.
- Extend `actual_import_transactions` additively with optional installed-SDK-supported `defaultCleared` and `reimportDeleted` options, compatible result metadata, and optional preview-request fingerprint verification. Do not expose unsupported `payeeNameNormalization` behavior from newer or different API versions.
- Expand the canonical transaction projection additively with installed nullable/optional import, transfer, starting-balance, and split fields while preserving the established `actual_get_transactions` wrapper and existing fields.
- Use allowlisted `q()` plus `aqlQuery()` internally for fixed-table transaction lookup and search. Do not expose ActualQL, raw filters, raw operators, raw fields, regex input, raw SQL, or SQLite access.
- Increase the exact MCP inventory from 42 to 46 tools and version the package, lockfile, MCP metadata, documentation, and readiness reporting from 0.4.0 to 0.5.0 while keeping `@actual-app/api` exactly `26.8.1`.
- Expand unit, installed-contract, real-server integration, compiled stdio E2E, performance-observation, cleanup, fingerprint, backward-compatibility, install/update, and secret-hygiene verification.
- Keep Pluggy integration, cron, transfer reconciliation, custom duplicate detection, schedules, historical reporting, LLM classification, MCP HTTP, public ActualQL, raw SQL/SQLite, and bulk deletion out of scope.

## Capabilities

### New Capabilities

- `advanced-transaction-operations`: Exact transaction lookup, structured advanced search, safe heterogeneous bulk updates, official import preview, split/transfer semantics, pagination, totals, and preview-to-import request binding.

### Modified Capabilities

- `actual-read-tools`: Enrich the canonical transaction result additively with installed split, import, transfer, and starting-balance fields while preserving the existing bounded account transaction read contract.
- `actual-transaction-management`: Add installed import options and compatible audit metadata to `actual_import_transactions` while preserving all v0.4.0 requests and core result fields.
- `actual-runtime`: Permit fixed, internally constructed ActualQL through the installed public exports, preserve serialization, and define single-sync compound mutation and partial-state behavior.
- `mcp-stdio-runtime`: Expand the exact compatible stdio surface from 42 to 46 tools with strict schemas, correct annotations, structured results, and preserved v0.4.0 contracts.
- `distribution-and-operations`: Add the 0.5.0 version, transaction-focused real-server verification, dry-run purity and cleanup fingerprints, documentation, installation/update verification, and strict readiness gates.

## Impact

- Production code: Actual adapter types and public bindings, canonical transaction projection, import normalization/fingerprinting, serialized client reads and compound mutations, shared constants and Zod schemas, MCP contracts, tool registration, metadata, and partial-state errors.
- Verification: unit, installed declaration/bundle contract, real-server integration read/write, compiled MCP stdio E2E, negative-input, deterministic pagination, split/transfer, dry-run purity, idempotency, partial failure, cleanup, fingerprint, compatibility, and secret-scan coverage.
- Documentation and release files: `docs/actual-api-26.8.1-contract.md`, README, changelog, readiness report, package metadata, lockfile, install/update guidance, and safe import workflow.
- Dependency contract: `@actual-app/api` remains exactly `26.8.1`; the installed declaration and bundle remain authoritative over generic documentation, and no internal handler, direct database path, or arbitrary query surface is introduced.
