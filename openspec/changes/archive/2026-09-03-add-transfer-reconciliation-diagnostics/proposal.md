## Why

Actual Budget MCP 0.5.0 exposes transaction reads, imports, updates, and deletion but does not model transfers as reciprocal pairs or provide conservative reconciliation diagnostics. Version 0.6.0 must prevent own-account movements from being interpreted as income and expense, while giving MCP clients read-only evidence about unlinked transfers, duplicate candidates, and statement-to-ledger differences without expanding into bank sync or unsupported Actual internals.

## What Changes

- Add exactly seven tools: `actual_list_transfer_payees`, `actual_get_transfer`, `actual_search_transfers`, `actual_create_transfer`, `actual_find_possible_transfers`, `actual_find_possible_duplicates`, and `actual_get_account_reconciliation`, increasing the inventory from 46 to 53 while preserving every 0.5.0 tool.
- Model a transfer as two transactions with reciprocal `transfer_id` values, opposite integer amounts, and different accounts; represent incomplete or inconsistent relationships diagnostically without repairing them.
- Create new transfers only through an exported `@actual-app/api@26.8.1` transfer-payee path. Creation is a manual intent operation with positive amount input, read-only dry-run by default, explicit write confirmation, account/category validation, and verified pair read-back.
- Keep imported metadata in the import domain rather than overloading manual transfer creation. Add optional existing-payee IDs to `actual_import_transactions` and `actual_preview_import` so callers can select official transfer payees while preserving all existing import inputs, defaults, fingerprints, and outputs.
- Add bounded, deterministic, read-only diagnostics for possible unlinked transfers and possible duplicates. Results use reason codes and unique/ambiguous classifications rather than probabilistic confidence and never auto-link, merge, or delete.
- Add split-safe account reconciliation diagnostics for ledger, cleared, reconciled, and uncleared state, optional signed statement differences, and separately labeled bank-reported balance metadata. The tool does not lock, unlock, or perform UI reconciliation.
- Make existing transaction search, update, bulk update, delete, import, preview, and canonical output transfer-aware without exposing direct `transfer_id` mutation or weakening existing guards.
- Pin the installed SDK behavior in contract documentation and tests, including public capabilities that are absent. Preserve stdio, lazy initialization, serialization, cache locking, failure reporting, cleanup ownership, secret hygiene, and real-server verification.
- Update release metadata and documentation from 0.5.0 to 0.6.0 while keeping `@actual-app/api` exactly `26.8.1`, and replace stale 34/42/46-tool acceptance statements with the single 53-tool 0.6.0 contract.

## Capabilities

### New Capabilities

- `actual-transfer-management`: Transfer-payee discovery, reciprocal pair lookup and search, integrity diagnostics, and safe manually confirmed transfer creation.
- `actual-transaction-diagnostics`: Conservative possible-transfer and possible-duplicate detection with bounded scans, deterministic classifications, and no mutation.
- `actual-reconciliation-diagnostics`: Split-safe account balance, cleared/reconciled/uncleared, statement-difference, and bank-balance diagnostics without reconciliation mutation.

### Modified Capabilities

- `actual-transaction-management`: Allow official transfer payees in import, report transfer update/delete impact, and preserve the prohibition on direct relationship mutation.
- `advanced-transaction-operations`: Add transfer-state search, transfer-aware canonical output, preview behavior, and proven-safe bulk handling while preserving old requests.
- `mcp-stdio-runtime`: Expand the exact tool inventory from 46 to 53 with accurate annotations and unchanged stdio lifecycle guarantees.
- `distribution-and-operations`: Version and document 0.6.0, extend contract/real-server/stdio verification and transfer-aware cleanup, and make all inventory expectations consistently 53.

## Impact

- **MCP surface:** Seven new tools plus additive optional fields and metadata on existing transaction tools; no removed or renamed tool or required legacy input.
- **Code:** New transfer and diagnostic domain modules; extensions to the Actual adapter, serialized client orchestration, fixed ActualQL compilers, MCP contracts/registration, fingerprints, and cleanup helpers.
- **Installed dependency:** No upgrade; `@actual-app/api@26.8.1` remains authoritative where current online documentation differs.
- **Data safety:** No raw SQL or SQLite access, arbitrary ActualQL, internal handlers, direct `transfer_id` mutation, automatic candidate linking, duplicate merge, or reconciliation lock/unlock.
- **Verification:** Unit, installed-contract, controlled real-server integration, compiled MCP stdio E2E, preview purity, exact-ID cleanup, permanent fingerprint, install/update, and secret-hygiene coverage.
