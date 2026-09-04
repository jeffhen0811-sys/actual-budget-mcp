## Context

See `proposal.md` for motivation and scope. The current server registers 53 tools directly in one MCP module, derives safety primarily from per-handler checks, executes all Actual work through one `FifoQueue`, initializes the pinned local-first SDK lazily, and performs post-mutation sync/read-back inside `ActualClient`. Transaction search already provides the safe foundation for fixed ActualQL compilation and split-aware projection.

The installed `@actual-app/api@26.8.1` schedule boundary is narrower and less regular than its documentation: it exports list/create/update/delete but no single-get or manual-post method; `updateSchedule` returns an ID; `next_date` and `completed` are system-managed; category is absent; omitted amount becomes zero; and the real date value is a string or `RecurConfig`. The SDK also starts services while loading a budget and runs the schedule service after a successful sync, so MCP policy cannot turn the SDK itself into a receive-only client.

## Goals / Non-Goals

**Goals:**

- Add the nine v0.7.0 tools without weakening the 53 existing contracts.
- Keep schedule and summary inputs narrower than the installed SDK whenever that produces a safer stable contract.
- Make operational authorization complete by construction through one tool-capability registry.
- Produce summary totals that are auditable, signed, bounded, transfer-free, and split-safe.
- Expose only runtime state that this process can measure reliably.
- Preserve one-client FIFO execution, exact-ID cleanup, real-server evidence, and protocol-safe stdio behavior.

**Non-Goals:**

- Expose SDK-internal schedule commands, raw rule conditions, raw ActualQL, or direct SQLite.
- Add schedule category editing, manual posting, skip-next-date, discovery, or transfer schedules.
- Reproduce the complete Reports UI or create a generic accounting/query engine.
- Claim that MCP read-only mode controls SDK-internal initialization, synchronization, or schedule services.
- Persist operational telemetry across process restarts.

## Decisions

### 1. Use one authoritative tool definition and policy registry

Introduce a typed definition for every tool containing its name, capability (`read`, `write`, or `destructive`), idempotency, schemas, metadata, and handler. A registration helper derives MCP annotations from the capability and wraps every handler in the operational policy gate before calling the runtime.

```text
tool definition
   ├── inventory name
   ├── capability ───────┬── MCP annotations
   ├── idempotency       ├── read-only guard
   ├── schemas           └── destructive guard
   └── handler
```

The registry, rather than a second hand-maintained list, becomes the source for `TOOL_NAMES`. A regression test compares registered names, registry names, annotations, and policy coverage exactly.

Alternative considered: retain direct `server.registerTool` calls and wrap only known mutation handlers. Rejected because a future tool could be registered without the guard and still pass ordinary handler tests.

Policy error precedence is `READ_ONLY_MODE`, then `DESTRUCTIVE_OPERATIONS_DISABLED`, then per-call confirmation and entity preflight. This makes runtime authorization decisive without removing established confirmation behavior.

### 2. Parse operational flags separately from Actual credentials

Split non-secret operational policy parsing from the existing lazy Actual connection configuration. `ACTUAL_MCP_READ_ONLY` and `ACTUAL_MCP_ALLOW_DESTRUCTIVE` can be resolved when the server is constructed without validating or loading Actual credentials, preserving tool discovery while the Actual Server is unavailable or unconfigured. Actual credentials and data-directory creation remain lazy.

Only explicit documented boolean strings are accepted. Defaults are read-only false and destructive allowed true. There is no third write flag because it would duplicate read-only semantics.

Alternative considered: extend the current `loadConfig` and load it at startup. Rejected because it would make missing Actual credentials prevent MCP discovery.

### 3. Treat read-only as an MCP authorization boundary

The policy wrapper blocks every `write` and `destructive` handler before `ActualClient`, including `actual_sync`. Read tools remain usable. Runtime status and documentation state that SDK initialization calls `downloadBudget`, which performs a full sync and can trigger the SDK's schedule service. No unsupported internal setting or monkey patch will be used to promise receive-only SDK behavior.

The read-only E2E suite therefore proves handler-level non-invocation and controlled-budget fingerprint behavior while reporting the SDK limitation. It must not use an overdue auto-post schedule to claim a guarantee the MCP cannot enforce.

Alternative considered: allow explicit sync in read-only mode because it is not a direct business edit. Rejected because sync uploads pending local messages and triggers internal services.

### 4. Add a strict schedule adapter around the public surface

Create a schedule domain module that parses installed schedule values as unknown at the adapter boundary and projects only stable MCP fields. Rule IDs, raw conditions, and internal actions are never exposed. `actual_get_schedule` calls the complete public list and performs an exact in-memory lookup because there is no public `getSchedule` export.

Creation requires an open account, optional ordinary payee, explicit amount specification, date specification, optional name, and posting flag. Transfer payees are rejected for v0.7.0. Update accepts only a non-empty subset of the same editable fields. Neither path accepts category, rule, completion, or next date.

The MCP date union maps as follows:

```text
oneTime { date }
   └── SDK date string

recurring { frequency, start, interval, patterns, weekend, end }
   └── SDK RecurConfig
```

Weekly and yearly calendar positions come from `start`. Monthly patterns preserve supported `day` and ordinal-weekday forms. The validator applies coherent bounds to interval, day values, ordinal weekday values, occurrence count, end date, and weekend mode before mapping.

The amount union maps `exact` to `is`, `approximate` to `isapprox`, and `between` to `isbetween`. Creation requires the union even though the SDK declaration marks amount optional because the installed conversion silently maps omission to zero. An explicit zero remains valid.

Create/update use the returned ID only as lookup identity, then sync once and verify projected read-back. Delete captures the schedule and exact linked historical transaction IDs through a fixed typed transaction query, invokes official deletion, syncs, and verifies schedule absence plus continued transaction existence. Any uncertainty uses the existing partial-state model.

Alternative considered: update the underlying schedule rule to add category or advanced actions. Rejected because it expands the public schedule contract, risks corrupting protected rules, and makes the tool a disguised arbitrary rule editor.

### 5. Build summaries from fixed effective-transaction queries

Add a summary query compiler beside the existing transaction compiler. Every query fixes the table to `transactions`, selects or groups only allowlisted fields, uses `splits: "inline"`, excludes `transfer_id` values and starting balances, and receives only validated date/account/category/group/limit values. Category income classification and account budget scope use validated public reference joins. Contract tests must pin each serialized query before real execution.

Use database-side fixed aggregates and groupings rather than loading every transaction for a year. Separate queries may be used for overall counts, category/group aggregates, payee aggregates, and off-budget cash flow so each returned envelope has a small strict parser. A query failure or unexpected aggregate shape fails the whole summary instead of returning partial arithmetic.

Classification order is:

```text
transfer or starting balance   -> excluded
off-budget account             -> separate cash-flow section
income category                -> signed income
expense category               -> signed expense
uncategorized amount > 0       -> uncategorized income
uncategorized amount < 0       -> uncategorized expense
zero uncategorized             -> counted cash-flow item, zero contribution
```

This causes positive expense refunds to reduce expense and negative income adjustments to reduce income. Signed totals are added directly: `netAmount = incomeAmount + expenseAmount`. No absolute-value conversion is used. Top expense payees are ranked by the most negative net expense first; top income payees are ranked by the greatest signed net income first, with deterministic ID tie-breakers. The requested limit applies only to the top-payee list and is clamped by the shared 10/50 defaults.

`actual_get_month_summary` uses the same ledger engine. It also calls `getBudgetMonth` only for the unfiltered, on-budget scope and returns those official fields in a distinct sourced section. Filtered requests omit that section with a reason rather than pretending the full budget is filtered.

Alternative considered: derive all month totals solely from `getBudgetMonth`. Rejected because it cannot honor account filters, count transactions, describe uncategorized cash flow, or support arbitrary bounded date ranges.

### 6. Keep off-budget data separate

`includeOffbudget` adds a separate `offbudgetCashFlow` object containing signed inflows, outflows, net change, and count. It does not alter on-budget income or expense totals. Explicit account IDs are validated and the response echoes the applied on/off-budget account scope.

Alternative considered: classify off-budget credits as income and debits as spending. Rejected because off-budget transactions are commonly uncategorized and sign alone cannot distinguish income from refunds or other balance movements.

### 7. Centralize observed sync and queue telemetry

Route every explicit and post-mutation `api.sync()` call through one `ActualClient` helper. The helper records monotonic duration plus ISO attempt/success timestamps and a stable mapped failure code; it never stores raw errors or secrets. Initialization's internal full sync is not included because it bypasses this helper. Telemetry resets naturally with the process.

Extend `FifoQueue` with queued count and active operation name. `ActualClient.run` passes only the stable tool operation name. Queue snapshots contain no arguments. Runtime status captures a meaningful snapshot without reporting itself as an active financial operation.

Versions come from package manifests through one version module so package, SDK, health, status, and MCP metadata do not accumulate unrelated constants. Runtime status performs an active server-version probe through the serialized client and merges it with local snapshot data. Cache status reports configuration and lock state but not the complete path or sync ID.

Alternative considered: infer last successful sync from private SDK preferences. Rejected because the field is not part of the public API and would include syncs outside the MCP's reliable observation boundary.

### 8. Extend real-test ownership without broad cleanup

Add `schedule` to the exact-ID resource registry and permanent fingerprint. Controlled schedule lifecycle tests create their own account/payee/schedule and remove transactions before schedules, then rules/payees/categories/groups/accounts according to observed dependencies. Summary fixtures use unique temporary entities and mathematically explicit signed transactions, including refund, transfer, split, uncategorized, and off-budget cases.

Transfer schedules and manual posting are reported as unsupported rather than silently skipped as if they were implemented. Existing transfer creation is used only to prove summary exclusion.

## Risks / Trade-offs

- [The pinned SDK can sync and auto-post schedules during initialization even in MCP read-only mode] → Name and document the mode as an MCP tool gate, block explicit sync, use controlled fixtures, and never claim SDK-global immutability.
- [Installed schedule values may contain legacy or advanced rule-derived shapes] → Parse reads defensively, preserve supported values, mark unknown shapes non-writable, and fail preflight rather than normalizing destructively.
- [Schedule deletion also deletes its linked rule] → Capture schedule and linked-transaction evidence, use only official deletion, and verify historical transactions remain after sync.
- [AQL grouped aggregate behavior may differ from assumed serialization or split behavior] → Pin query serialization and sanitized result fixtures before production code, then verify controlled real datasets through integration and stdio.
- [Multiple aggregate queries observe a moving local budget] → Execute the complete summary in one FIFO position so no MCP operation interleaves; document that external sync application is governed by the SDK lifecycle.
- [Signed expense values are less conversational than positive “spent” values] → Use explicit field names and documentation, preserve signs for auditability, and let clients format presentation values.
- [Status probes can be slow or alter the meaning of queue activity] → Keep status bounded, sanitize every failure, and snapshot queue state without reporting status itself as business work.
- [Centralizing registration touches every existing tool] → Add exact 53-tool backward-compatibility tests before adding the nine new definitions and compare old/new schemas and annotations.

## Migration Plan

1. Pin the installed schedule/query contract and add failing adapter, policy, telemetry, and summary tests without changing public inventory.
2. Introduce the capability registry and central policy wrapper while proving all 53 existing tool names and annotations remain compatible under default configuration.
3. Add schedule and summary domain adapters, runtime status, schemas, and nine registrations; move discovery expectation to 62.
4. Update versions, environment examples, installed contract documentation, README, CHANGELOG, fingerprints, resource cleanup, and readiness reporting.
5. Run local type, unit, coverage, contract, build, and OpenSpec gates, then read-only real reads, authorized real writes, compiled stdio E2E, operational-mode processes, cleanup/fingerprint checks, install/update verification, and secret hygiene in the required order.
6. Roll back by returning to the previous release commit and existing environment defaults. The new flags are optional, no persistent schema is introduced, and the Actual SDK pin and cache format remain unchanged. If a real write gate fails after partial state, complete exact-ID cleanup and verification before rollback.
