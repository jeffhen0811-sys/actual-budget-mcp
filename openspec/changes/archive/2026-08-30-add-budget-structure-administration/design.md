## Context

See `proposal.md` for motivation. The current process registers ten stdio tools, lazily initializes one `@actual-app/api` client, and serializes Actual work through a FIFO queue. The MCP layer owns strict Zod contracts and protocol results; `ActualClient` owns lifecycle and orchestration; a narrow adapter owns SDK calls. Transaction mutations already use local mutation followed by sync, and real integration/E2E suites already separate read and explicitly enabled write execution.

The installed dependency is `@actual-app/api@26.8.1`. Its public surface supports account, category-group, and category CRUD plus account close/reopen, but some destructive methods have unsafe native behavior: closing an account with no transactions deletes it, deleting an account removes its transactions, and group/category deletion can alter related data. The implementation therefore cannot equate “officially supported” with “safe to expose directly.” Current online documentation also describes newer concepts absent from the installed package, so the installed exported types and observed real behavior must remain authoritative.

## Goals / Non-Goals

**Goals:**

- Extend the existing adapter/client/MCP layers rather than create another SDK client or execution path.
- Make every structural mutation explicit, allowlisted, serialized, synchronized, and verified.
- Prevent an MCP agent from causing implicit cascades or repeating an uncertain destructive mutation.
- Preserve every v0.1.0 public contract while adding exactly fourteen tools.
- Make real-server tests self-owned, diagnosable, and safe for permanent fixtures.

**Non-Goals:**

- Upgrade the Actual SDK or expose behavior from documentation that is absent in 26.8.1.
- Add Account Groups, reorder, payee CRUD, rules, schedules, monthly-budget writes, transfer reconciliation, ActualQL, direct SQLite access, HTTP transport, bulk mutations, or financial intelligence.
- Generalize the semantic tools into an arbitrary entity patch or CRUD interface.

## Decisions

### 1. Keep the installed public SDK as the hard boundary

The adapter will add only typed wrappers around the public 26.8.1 methods required by the specs: account get/create/update/close/reopen/delete/balance, category-group get/create/update/delete, category get/create/update/delete, transaction history reads, and budget-month reads. Inputs sent to the SDK will be constructed from explicit allowlists rather than forwarding MCP objects.

The package stays pinned. If implementation proves that a required operation is absent or unusable through this surface, work stops with evidence and a documented limitation. Upgrading the package or invoking an internal endpoint is not an automatic fallback. This is preferred over tracking current documentation because it makes the build, types, and real tests describe one reproducible contract.

### 2. Treat a mutation as one queued lifecycle

`ActualClient` will expose structural methods that enqueue one callback containing:

```text
initialize → preflight → compare desired state
                         ├─ already equal → return changed:false
                         └─ mutation → sync → refetch → verify → changed:true
```

Delete uses the same shape but captures an immutable pre-delete summary and verifies absence. Nothing can interleave between preflight and postcondition verification. The shared lifecycle helper may centralize sync and error conversion, but entity-specific preflight and postconditions remain explicit so an unsafe default cannot be hidden by a generic mutation abstraction.

No mutation is automatically retried. A local mutation followed by sync failure yields `MUTATION_SYNC_FAILED`, `retryable:false`, and `recoveryAction:"actual_sync"`. A successful sync followed by a failed verification yields `POST_MUTATION_READ_FAILED` with `synchronized_but_unverified`. This is safer than marking partial mutation failure retryable because an agent could otherwise create duplicates or repeat a destructive call.

### 3. Use semantic tools and separate compatibility models

The MCP server will register the exact 24-tool inventory in the specs. Create/delete operations are non-idempotent annotations; desired-state operations are idempotent; only deletes are destructive. Descriptions and literal confirmation remain enforcement-visible, while actual protection lives in schemas and client preflight.

The existing `actual_list_categories` schema remains unchanged. Internal category/group records will carry the richer fields needed for mutation validation, while new tool outputs use dedicated normalized models:

- Account: `id`, `name`, `offbudget`, `closed`, optional `balance`/`balanceError`.
- Category group: `id`, `name`, `isIncome`, `hidden`.
- Category: `id`, `name`, `groupId`, `isIncome`, `hidden`.

This deliberate duplication is preferable to enriching the old strict output and risking a v0.1.0 client rejection.

### 4. Enforce narrow create and update contracts

One reusable name schema trims outer whitespace, accepts 1–255 characters, preserves case and internal characters, and never creates alternative names. SDK duplicate behavior remains authoritative; recognized rejection is mapped to `NAME_CONFLICT`.

Account creation maps `{name, offbudget?, initialBalance?}` to the SDK account object plus its separate initial-balance argument. `offbudget` defaults false; opening balance reuses the existing safe-integer amount schema and may be signed. Account update permits only `name` and `offbudget`.

Group creation maps `isIncome` to `is_income`, defaults it false, and fixes `hidden:false`; group update permits only name. Category creation first reads the target group, derives `is_income`, and fixes `hidden:false`; category update permits only name. Move and visibility are separate tools over the SDK's category update method. Cross-type moves fail before mutation rather than converting `is_income`.

### 5. Fail closed around destructive SDK behavior

Account close reads the current entity, balance, complete history, and transfer targets before calling the SDK. An already closed account is an idempotent success. An account with zero transactions returns `UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT`. A nonzero balance requires a compatible transfer account and any category required by the SDK. Any incomplete conclusion returns `PREFLIGHT_INCONCLUSIVE`.

Account delete requires literal confirmation and a complete official history scan proving zero transactions. Category-group delete requires literal confirmation and a complete group/category read proving zero categories. Neither path supplies an SDK transfer target or performs a cascade.

Category delete requires literal confirmation and scans:

1. every account returned by the official account API;
2. complete transaction history for each account through the public transaction-read method;
3. every month returned by `getBudgetMonths` through `getBudgetMonth`, including the category's budget and carryover representation.

Any read failure, malformed shape, unsafe date-bound assumption, or incomplete scan yields `PREFLIGHT_INCONCLUSIVE`. Any relationship yields `CATEGORY_IN_USE`. The implementation does not replace a category, rewrite transactions, or clear budget data to make deletion succeed. An initial performance investigation against the real configured budget must validate the complete-history strategy; a recent-history shortcut is prohibited.

### 6. Return persisted state and stable errors

Create/update/close/reopen/move/hide/unhide return the post-sync entity plus `success` and `changed`. Idempotent no-ops return the preflight entity with `changed:false` and do not sync. Delete returns captured ID/name and zero related counts because the entity can no longer be fetched.

The existing error envelope remains valid. Optional safe extensions carry relationship counts/identifiers, recovery action, entity context, or partial state. Domain codes are centrally defined and raw SDK text is used only for sanitized classification/logging, never as a stable client contract. Deterministic refusals are non-retryable. Only failures that happen before mutation and are genuinely transient may be retryable.

### 7. Reuse test infrastructure with per-run ownership

Unit tests will mock the adapter and cover schemas, allowlists, idempotent branches, preflight refusals, SDK invocation, sync, verification, partial failures, redaction, and nullability. Contract tests will exercise real 26.8.1-compatible shapes. Existing v0.1.0 tests remain and exact `actual_list_categories` compatibility gets a regression assertion.

Integration and E2E write suites each create isolated resources named `MCP_INTEGRATION_TEST_<ENTITY>_<runId>` and immediately register returned IDs. Cleanup runs in `finally` in dependency-reverse order: transactions, categories, groups, accounts. The close/reopen scenario creates history, reaches a compatible balance, closes and reopens, then removes the temporary transaction before empty-only account deletion. Category/group deletion fixtures remain unused.

Permanent fixtures are fingerprinted before writes and checked after cleanup. `ACTUAL_INTEGRATION_ALLOW_WRITES=true` is process-scoped and never persisted to `.env`. Cleanup failure fails the suite with exact safe identifiers. Global prefix cleanup is not implemented unless exact-ID cleanup proves disproportionately complex, implementation pauses, and the user explicitly approves the documented fallback and safeguards.

## Risks / Trade-offs

- **[Complete category-use scanning may be slow on large budgets]** → Keep it serialized, measure it against the real budget, fail closed on timeout/incomplete results, and require approval before changing the safety model.
- **[The pinned SDK can behave differently from its broad TypeScript signatures]** → Add narrow adapter contracts, inspect returned values, and require unit, contract, integration, and stdio E2E regressions for every real discrepancy.
- **[A sync failure leaves uncertain local state]** → Never retry the mutation, return recovery metadata, and direct the client to explicit sync/read recovery.
- **[Exact-ID cleanup can leave dependency-blocked resources after an earlier failure]** → Track resources immediately, clean in reverse order, continue cleanup attempts while accumulating errors, then fail with every remaining safe identifier.
- **[Preserving the old category-list shape creates two public representations]** → Document the distinction and keep conversion functions and contract tests explicit.
- **[Name-conflict behavior can differ by entity or Actual version]** → Let the pinned SDK decide validity and map only positively identified conflicts; do not preemptively impose global uniqueness.

## Migration Plan

1. Extend contracts, adapter types, client orchestration, and MCP registration without changing the ten existing tool signatures.
2. Add unit and contract coverage before enabling real writes.
3. Add isolated integration and stdio E2E scenarios and run read-only suites first.
4. Advance project and MCP metadata to 0.2.0; update README and CHANGELOG while keeping the SDK lock unchanged.
5. Execute the strict verification sequence: typecheck, unit/contract, integration read, E2E read, process-scoped integration write, cleanup, process-scoped E2E write, cleanup, repeated read suites, build, and `test:all` where applicable.
6. Report `READY` only after every required check and fixture-integrity assertion passes.

No stored-data migration is required. Rollback is a code/package rollback to v0.1.0; any structural data intentionally created through successful v0.2.0 calls remains user-owned Actual data and is not automatically reversed.
