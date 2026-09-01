## Context

See `proposal.md` for motivation and scope. The current server has one lazily initialized `ActualClient`, a FIFO queue, an adapter restricted to public `@actual-app/api@26.8.1` exports, strict Zod contracts, dual MCP results, explicit sync/read-back mutation patterns, partial-state errors, exact-ID real-test cleanup, and 34 registered tools.

The installed SDK exposes all required budget primitives, but their behavior is broader than the public signatures suggest:

- Available months are an engine-computed range ending approximately twelve months after the current month, not only months with explicit planning values.
- `getBudgetMonth` returns different income-category shapes for envelope and tracking budgets.
- Envelope expense spending and several aggregates use signed values; negative values are meaningful.
- Carryover applies from a selected month through future materialized months.
- Hold accepts a positive incremental amount, clamps it to available funds, and returns a boolean in 26.8.1.
- `forNextMonth` can combine manual and automatic holding.
- `batchBudgetUpdates` coalesces messages but is not a transaction and exposes no per-item outcome.

## Goals / Non-Goals

**Goals:**

- Add exactly eight budget tools without altering the established 34 contracts.
- Model the installed shapes faithfully enough for envelope and tracking reads.
- Keep every Actual-dependent lifecycle on the existing single queue and client.
- Make copy previewable, bounded, guarded, idempotent, and recoverable after partial failure.
- Prove the compiled stdio surface and real-server cleanup before readiness.

**Non-Goals:**

- Expose arbitrary ActualQL, internal handlers, SQLite, or a second Actual client.
- Add a generic budget query language or historical reporting engine.
- Emulate envelope hold behavior for tracking budgets.
- Copy transactions, actual income, spending, balances, automatic holds, manual holds, or goal templates.
- Provide atomic rollback that the public SDK cannot guarantee.

## Decisions

### 1. Use runtime-validated adapter shapes

The adapter will bind the seven installed public budget methods and represent `getBudgetMonth` as an unknown-rich SDK object. A dedicated projector will validate top-level aggregates, groups, and category variants before exposing stable public objects. Optional and absent fields will remain distinct; no blanket null-to-zero normalization will occur.

Alternative considered: type the desired MCP shape directly as the SDK return. Rejected because 26.8.1 deliberately types nested category data as `Record<string, unknown>` and envelope/tracking fields differ.

### 2. Infer capabilities from the returned category shape

Reads will support both budget modes. A category is eligible for amount writes only when its target-month record has a numeric `budgeted` field. This permits tracking income budgeting and rejects envelope income budgeting without relying on an unexported budget-type API. Carryover remains expense-only because the public SDK explicitly validates that restriction. Hold/reset require the envelope shape; an inconclusive shape fails preflight.

Alternative considered: expose an inferred `budgetMode` as authoritative public data. Rejected because the SDK does not return that field; mode is used only to enforce capability safety.

### 3. Preserve official field names and signs

Month reads and summaries will prefer `incomeAvailable`, `lastMonthOverspent`, `forNextMonth`, `totalBudgeted`, `toBudget`, `fromLastMonth`, `totalIncome`, `totalSpent`, and `totalBalance`. Category-level projections will use stable camelCase identity fields while retaining only observed financial fields. Schemas will accept safe signed integers and will not apply absolute value or semantic re-summing.

Alternative considered: return friendly positive totals such as `totalSpentAbs`. Rejected because it would normalize signs and could misrepresent envelope versus tracking semantics.

### 4. Separate positive hold increments from desired-state mutations

Amount and carryover tools compare preflight state and can return `changed: false`. Hold is non-idempotent: its positive amount is an increment, the SDK may clamp it, and its boolean return indicates whether it acted. Reset is idempotent but verifies only the observable `forNextMonth` aggregate; automatic income holding can keep that aggregate nonzero.

### 5. Make carryover propagation explicit

Direct carryover and copy-with-carryover will describe the setting as effective from the requested month forward. Verification will inspect the target and later available months rather than implying a target-only toggle.

Alternative considered: emulate one-month carryover by later compensating writes. Rejected because that would add surprising mutations and race with user planning.

### 6. Plan copy before executing it

One pure planner will compare projected source and target categories by stable ID and produce actions: `set`, `overwrite`, `skip`, `skip-hidden`, `skip-incompatible`, or `unchanged`. Defaults are `dryRun: true`, `mode: fill-empty`, `includeCarryover: false`, and `includeHidden: false`. Explicit zero is treated as fillable because the public month result does not distinguish absent planning from a stored zero. Differences will be bounded while exact aggregate counts remain available.

Execution will reject same-month copies, unavailable months, incompatible shapes, and unconfirmed nonzero overwrites. It will never include holds. When carryover is enabled, the preview will describe its future-month reach.

### 7. Prefer traceable sequential public mutations over SDK batching

The initial copy executor will invoke public amount/carryover mutations sequentially inside one `ActualClient` queue position, recording each attempt and completion, then perform explicit sync and complete read-back verification. It will not use `batchBudgetUpdates` because that helper provides neither atomic rollback nor per-item outcomes and can apply accumulated messages when the callback exits through failure.

Alternative considered: use SDK batching for speed. Deferred until evidence shows a meaningful performance need and equivalent partial-recovery guarantees.

### 8. Report partial state instead of automatic rollback or replay

Before mutation, copy captures target values for every planned item. If a later item, sync, or verification fails, the error will include safe attempted/completed identifiers, original values, target month, state classification, and recovery guidance. The system will not automatically replay or roll back because either action could compound an unknown synchronized state.

### 9. Select real-test months from the official range

Real write tests will select the final two suitable future months returned by `getBudgetMonths`, not hard-coded dates or unsupported `+18–24` offsets. Preflight will require no protected nonzero planning, no protected carryover, no relevant transactions, and safe month-level hold state before any write. If no pair qualifies, the write suite fails safe or reports an explicit readiness blocker.

### 10. Extend exact cleanup and fingerprinting to budget state

The test harness will register temporary group/category IDs and separately capture owned month-level changes. Cleanup order is: restore/reset run-owned holds, clear owned amounts, disable owned carryover, delete temporary categories, then delete groups. Permanent fingerprints will include relevant budget-month projections before and after the run. Integration and E2E caches remain isolated.

### 11. Keep public annotations conservative

The three budget reads are read-only. Amount, carryover, and reset are idempotent writes; hold is non-idempotent. Copy is statically marked mutating and destructive because it can overwrite even though its default invocation is dry-run. Server-side checks remain authoritative.

## Risks / Trade-offs

- **[Tracking mode is not represented by the current real fixture]** → Cover installed tracking shapes in contract fixtures and declare full real tracking support only when a dedicated tracking fixture is actually exercised.
- **[Available-month bounds move over time]** → Derive test months from the official list on every run and fail safe when no clean pair exists.
- **[Hidden categories can contain historical planning]** → Preserve them in reads and require `includeHidden: true` for copy.
- **[Carryover affects later months]** → Show affected semantics in previews and verify later available months.
- **[Hold aggregate can include automatic income holding]** → Use `forNextMonth` terminology and avoid claiming direct manual-hold observability.
- **[Sequential copy can be slower]** → Bound category counts and output; revisit SDK batching only with measured evidence and unchanged recovery guarantees.
- **[Partial local state cannot be made atomic]** → Capture original values, report per-item progress, sync/read before recovery, and never auto-retry.

## Migration Plan

1. Add and contract-test the adapter surface and runtime projectors while retaining the 0.3.0 metadata and tool inventory.
2. Add client read operations, then single budget mutations, then the copy planner/executor.
3. Register the eight tools and raise the inventory to 42 only after schemas and unit tests are complete.
4. Expand real read tests, then run isolated writes with explicit authorization and exact cleanup.
5. Update versioned documentation, metadata, install/update checks, and readiness evidence.
6. Roll back by reverting the 0.4.0 change; no data migration is required. If real verification leaves uncertain budget state, use captured recovery metadata and official reads before any manual restoration.
