## Why

Actual Budget MCP 0.3.0 exposes structural, transaction, payee, and rule operations but does not expose monthly budget planning. Version 0.4.0 should let MCP clients inspect and safely change monthly budgets through the pinned official Actual API while preserving the existing 34-tool surface and its runtime, synchronization, testing, cleanup, and secret-safety guarantees.

## What Changes

- Add read operations to list available budget months, inspect one month, and obtain an agent-oriented monthly summary.
- Add verified write operations for category budget amounts, prospective expense-category carryover, manual next-month holds, and hold reset.
- Add guarded month-to-month budget copying with dry-run by default, `fill-empty` and confirmed `overwrite` modes, bounded differences, idempotent execution, explicit carryover behavior, and hidden-category opt-in.
- Preserve signed integer minor-unit amounts and the real nullable/optional shapes returned by `@actual-app/api@26.8.1` without inventing aggregates or normalizing signs.
- Support envelope and tracking budget reads, allow income budgeting only when the returned tracking-budget shape proves it is budgetable, and reject hold/reset operations where the budget mode does not support them.
- Expand unit, installed-contract, real-server integration, compiled stdio E2E, cleanup, permanent-fixture fingerprint, documentation, installation/update, and release-readiness coverage.
- Increase the exact MCP inventory from 34 to 42 tools and version the package, lockfile, MCP metadata, README, and changelog from 0.3.0 to 0.4.0 without changing the pinned Actual SDK.
- Keep Pluggy, schedules, cron, advanced transaction search, bulk transaction operations, import preview, transfer reconciliation, complex historical reports, investments, public ActualQL, LLM categorization, and MCP HTTP out of scope.

## Capabilities

### New Capabilities

- `actual-budget-management`: Monthly budget reads, summaries, category planning, carryover, next-month holds, safe copying, mode-aware behavior, and stable MCP contracts.

### Modified Capabilities

- `actual-runtime`: Extend serialized official-API execution, synchronization, read-back verification, and partial-state recovery to single and compound budget mutations.
- `mcp-stdio-runtime`: Expand the exact compatible stdio surface from 34 to 42 tools with strict schemas, budget-aware annotations, structured errors, and preserved v0.3.0 contracts.
- `distribution-and-operations`: Add the 0.4.0 version, real budget test isolation, budget-aware fingerprints and cleanup, documentation, install/update verification, and strict readiness gates.

## Impact

- Production code: Actual adapter declarations/bindings, serialized client operations, shared schemas, MCP contracts, tool registration, metadata, and error recovery metadata.
- Verification: unit, SDK contract, real-server integration, compiled MCP stdio E2E, negative-input, idempotency, cleanup, fingerprint, secret-scan, install, and update checks.
- Documentation and release files: `docs/actual-api-26.8.1-contract.md`, README, changelog, readiness report, package metadata, and lockfile.
- Dependency contract: `@actual-app/api` remains exactly `26.8.1`; production code continues to avoid SQLite, internal handlers/endpoints, and ActualQL workarounds.
