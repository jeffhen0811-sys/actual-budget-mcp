## 1. Installed SDK contract and schemas

- [x] 1.1 Expand the installed-contract documentation and contract tests to pin the seven budget methods, the official month aggregate fields, envelope/tracking category variants, carryover and hold behavior, batch limitations, and the supported month range.
- [x] 1.2 Extend the Actual adapter types and bindings for the installed budget methods without changing the pinned `@actual-app/api` version.
- [x] 1.3 Add strict input schemas for budget months, positive hold amounts, copy modes, confirmation, filtering, and bounded preview/execution sizes, including the documented copy defaults.
- [x] 1.4 Add output schemas for month aggregates, category projections, mutation results, copy plans, and partial execution metadata while preserving optional or absent SDK fields.

## 2. Budget read domain

- [x] 2.1 Implement a runtime projector for budget groups and categories that preserves official names and signs and derives only explicitly reported mode capabilities.
- [x] 2.2 Implement queued client operations for listing the official budget-month range and reading a single budget month.
- [x] 2.3 Implement budget summaries from official aggregate fields with optional group/category filters and bounded output.
- [x] 2.4 Add unit tests for envelope and tracking shapes, hidden categories, income/expense differences, null or absent fields, signs, filtering, and bounds.

## 3. Single budget mutations

- [x] 3.1 Extend domain error codes and safe metadata for unsupported mode operations, invalid values, failed verification, and partial mutation outcomes.
- [x] 3.2 Implement desired-state budget amount updates with category validation, tracking-income compatibility checks, sync, and read-back verification, including zero and negative values.
- [x] 3.3 Implement expense carryover updates that apply prospectively from the selected month, synchronize, and verify the selected-month state.
- [x] 3.4 Implement positive incremental hold and manual-hold reset for envelope budgets, preserving SDK clamping and the distinction between manual hold and automatic next-month allocation.
- [x] 3.5 Add unit tests for successful writes, unsupported budget modes and category types, validation failures, synchronization, read-back mismatches, hold clamping, and reset semantics.

## 4. Budget copy planning and execution

- [x] 4.1 Implement a pure copy planner that copies only planning `budgeted` values and excludes transactions, actual income, spending, balances, holds, and goals.
- [x] 4.2 Implement bounded dry-run previews with defaults `dryRun: true`, `mode: fill-empty`, `includeCarryover: false`, and `includeHidden: false`.
- [x] 4.3 Add guards for identical source/target months, hidden-category opt-in, unsupported category shapes, nonzero overwrite confirmation, and optional carryover copying.
- [x] 4.4 Execute accepted copy plans sequentially inside one mutation-queue lifecycle, synchronizing and verifying writes while returning completed and failed item metadata on partial failure.
- [x] 4.5 Add unit tests for fill-empty and overwrite modes, confirmation, hidden categories, carryover opt-in, repeat execution, bounds, and partial execution reporting.

## 5. MCP tool surface

- [x] 5.1 Extend `ToolRuntime`, `TOOL_NAMES`, version expectations, and annotations for the eight budget tools, bringing the exact tool inventory from 34 to 42.
- [x] 5.2 Register handlers for listing months, reading a month, summarizing a month, setting a budget amount, setting carryover, holding funds, resetting hold, and copying a budget month.
- [x] 5.3 Add MCP and stdio unit tests for strict schemas, structured output, text content, annotations, errors, and mutation verification metadata.
- [x] 5.4 Preserve compatibility tests proving that the existing 34 tools retain their names, schemas, annotations, and behavior.

## 6. Real-budget integration and E2E coverage

- [x] 6.1 Extend sanitized installed-contract fixtures and documentation with observed envelope and tracking shapes while excluding personal data and credentials.
- [x] 6.2 Add read-only integration coverage for month discovery, month detail, summaries, hidden filtering, and mode projection.
- [x] 6.3 Implement a dynamic test-month selector using the end of the official `getBudgetMonths` range, with registry-aware checks that refuse writes when protected planning data is present.
- [x] 6.4 Add authorized integration coverage for amount, carryover, hold/reset, and copy mutations with `finally` cleanup and before/after fingerprints.
- [x] 6.5 Add compiled stdio E2E coverage for exact discovery of 42 tools and the budget read workflows.
- [x] 6.6 Add authorized compiled stdio E2E coverage for budget writes, copy execution, validation failures, and unsupported-mode failures.
- [x] 6.7 Expand the permanent-state fingerprint to include budget planning state and fail the suite when cleanup does not restore the original fingerprint.

## 7. Documentation, release metadata, and installation

- [x] 7.1 Bump the MCP package and reported server version to `0.4.0` while keeping `@actual-app/api` pinned at `26.8.1`.
- [x] 7.2 Update the README with the eight tools, budget-mode compatibility, sign conventions, copy defaults, confirmation rules, and mutation safety model.
- [x] 7.3 Add the `0.4.0` changelog entry with compatibility notes and the exact 42-tool inventory.
- [x] 7.4 Update contract and operations documentation for installed SDK observations, non-transactional copy behavior, partial outcomes, test-month selection, cleanup, and recovery.
- [x] 7.5 Verify fresh installation and update flows in isolated temporary directories without altering the user's configured MCP installation.

## 8. Final verification

- [x] 8.1 Run type checking, unit tests, installed-contract tests, and the production build.
- [x] 8.2 Run read-only real-budget integration and compiled stdio E2E suites.
- [x] 8.3 Run explicitly authorized real-budget write suites and verify cleanup fingerprints after every suite.
- [x] 8.4 Reset write authorization, rerun read-only checks and the complete aggregate test command, and confirm no residual budget changes.
- [x] 8.5 Run isolated install and update verification for the `0.4.0` package behavior.
- [x] 8.6 Review the final diff, tracked files, generated artifacts, and secret scan, then record the exact verification evidence and any remaining limitations.
