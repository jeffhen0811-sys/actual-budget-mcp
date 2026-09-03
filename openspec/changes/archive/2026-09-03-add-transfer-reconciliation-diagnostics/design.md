## Context

See `proposal.md` for motivation. The server currently has a strict 46-tool MCP surface, a pinned `@actual-app/api@26.8.1` adapter, a serialized `ActualClient`, fixed ActualQL builders and canonical transaction projections, and unit/contract/real-server/compiled-stdio verification layers. The installed package is the executable contract: its public `addTransactions` accepts `{ runTransfers: true }` but returns `"ok"`, `importTransactions` returns added/updated evidence and can create transfers from a transfer payee, `getAccountBalance` accepts an optional cutoff date, and transaction records expose reciprocal `transfer_id`. It does not publicly export linking or merging of existing transactions, reconciliation lock/unlock, or account last-reconciled state.

Transfer work crosses adapter, query, domain, orchestration, MCP schema/registration, compatibility, cleanup, and release layers. Existing FIFO serialization and cache ownership must remain the concurrency boundary; no second database access path is introduced.

## Goals / Non-Goals

**Goals:**

- Make transfer identity and integrity one reusable domain model shared by lookup, search, mutation impact, cleanup, and diagnostics.
- Keep all scans bounded and all classifications deterministic, explainable, and testable as pure logic.
- Make compound transfer writes auditable by separating preflight, local mutation, synchronization, and read-back verification phases.
- Extend existing strict contracts only through optional inputs or additive output metadata.

**Non-Goals:**

- Reproduce Actual's UI reconciliation workflow or bank-sync behavior.
- Repair corrupt transfer relationships, link existing transactions, merge duplicates, or produce confidence scores and financial recommendations.
- Add arbitrary ActualQL, raw database access, background scheduling, or a new dependency.

## Decisions

### 1. Treat installed public exports as the capability gate

Production code will call only methods declared and exported by the pinned package. Contract tests will pin signatures, serialized query shapes, observed return values, transfer side effects, and important discrepancies with online documentation or bundled internal handlers. Unsupported capabilities will remain explicit MCP exclusions.

**Alternatives considered:** Calling bundled internal `transactions-merge` code was rejected because it is not a public compatibility boundary. Raw SQLite access was rejected because it bypasses Actual synchronization and invariants. Upgrading the SDK was rejected because this release has no dependency-upgrade requirement and would combine two sources of behavioral change.

### 2. Introduce pure transfer and diagnostic domain modules

`src/actual/transfers.ts` will own meaningful-ID normalization, versioned pair/candidate keys, reciprocal-pair assembly, integrity reason codes, direction derivation, and deterministic pair sorting. `src/actual/transaction-diagnostics.ts` will own possible-transfer and duplicate grouping/classification. `src/actual/reconciliation.ts` will own leaf aggregation and statement status. These modules will consume canonical records and contain no SDK calls.

Keys will use `v1:` plus SHA-256 of the sorted opaque member IDs with unambiguous length-delimited input. Pair integrity will preserve observed sides and use null for missing evidence. Direction exists only for a valid non-zero opposite-sign pair.

**Alternatives considered:** Embedding algorithms in MCP handlers was rejected because it would duplicate semantics and weaken unit testing. Using one transaction as an implicit authoritative side was rejected because broken reciprocal relationships would be misrepresented.

### 3. Extend fixed queries, then classify locally under hard caps

`src/actual/transactions.ts` will add fixed, allowlisted query compilers for relationship lookup and bounded leaf scans. Callers will never supply fields, operators, expressions, tables, or regex. Diagnostic queries will request one item beyond the 5000-item cap so overflow fails instead of silently truncating. Date-query boundaries will be extended by the requested comparison window where needed, while eligibility remains anchored to the caller's requested range.

Pair assembly, graph degree, classification, de-duplication, classification filtering, sorting, totals, and pagination will occur in that order. Amount/date/imported-ID/payee grouping keeps the normal path near O(n log n + candidates); the hard cap prevents unbounded work when many equal amounts produce dense candidate graphs.

**Alternatives considered:** Paginating database rows before pair assembly was rejected because pairs would duplicate or disappear and ambiguity counts would depend on the page. An unbounded all-history scan was rejected for latency and memory safety. Probabilistic scoring was rejected because it would be difficult to audit and could be mistaken for authorization to mutate.

### 4. Create manual transfers through a transfer payee and `addTransactions`

Preflight will load both exact accounts, categories, and transfer payees and build the two-sided preview. The initiating side will be chosen to minimize follow-up mutation: the on-budget side for mixed on/off-budget transfers, otherwise the from-account side. Its signed amount and official destination-account transfer payee are passed to public `addTransactions(accountId, [transaction], { runTransfers: true })`. Mixed-budget category placement therefore starts on the on-budget side.

Because the installed wrapper returns `"ok"` rather than created IDs, orchestration will capture exact transaction ID sets for both accounts at the target date immediately before and after the serialized local call. The set difference must contain exactly one new side in each account that forms a valid pair. Independent side state, such as cleared state, is then applied with allowlisted public updates if needed. One synchronization follows local changes, then exact read-back verifies the complete requested state.

Each response or error records the last completed phase: `preflight`, `created_unverified`, `pair_discovered`, `side_updates_applied`, `synchronized`, or `verified`. Once creation may have happened, the MCP will not retry or roll back automatically.

**Alternatives considered:** `importTransactions` was rejected for manual creation because import reconciliation, rule execution, and imported-ID semantics belong to bank/import workflows. Inventing IDs was rejected. Returning success on the SDK acknowledgement alone was rejected because it cannot prove pair identity or final state.

### 5. Keep imported transfer metadata in import and preview

The shared import-item normalizer will accept optional `payee`, validate all referenced IDs before invoking the SDK, and include the field in the canonical SHA-256 preview fingerprint. `actual_import_transactions` and `actual_preview_import` will pass the same normalized item to the official reconciliation path; preview always forces SDK dry-run. The pinned SDK's payee-over-payee-name precedence will be documented and contract-tested.

**Alternatives considered:** Adding imported IDs or imported payee text to `actual_create_transfer` was rejected because it would blur manual intent with bank reconciliation. Reimplementing import matching in MCP code was rejected because the installed API is authoritative.

### 6. Centralize transfer-aware impact analysis for existing mutations

Single update, bulk preflight, and delete will use the same pair loader before mutation. Direct relationship fields remain absent from strict schemas. Update read-back compares both sides and reports only observed mirrored fields. Bulk retains its v0.5.0 rule: only independent `cleared` changes are permitted for transfer items. Delete resolves both IDs before its one official delete call and verifies both absent afterward.

**Alternatives considered:** Broadening bulk transfer edits was rejected because category, payee, notes, date, and amount can alter or invalidate pair semantics. Treating delete as a one-row operation was rejected because installed behavior removes both sides.

### 7. Compute reconciliation from canonical leaves and cross-check the public balance

The adapter will expose `getAccountBalance(accountId, cutoff)` and fixed account/transaction reads, including optional `balance_current`. The reconciliation domain will exclude split parents, include ordinary and split-child leaves, include starting balances, treat reconciled as a cleared subset, and calculate ledger/cleared/reconciled/direct-uncleared sums. It will require ledger to equal the public cutoff balance and direct uncleared to equal ledger minus cleared before returning a result.

Statement status uses a fixed precedence so equal ledger and cleared values produce `MATCHES_BOTH`. Bank-reported current balance remains optional metadata and never affects cutoff or statement status.

**Alternatives considered:** Returning only `getAccountBalance` was rejected because it cannot explain cleared/reconciled state. Treating a split parent and its children as monetary rows was rejected due to double counting. Inferring a last reconciliation date was rejected because the public account contract does not expose one.

### 8. Preserve server architecture and compatibility mechanically

`ActualApiAdapter` remains the narrow SDK seam, `ActualClient` remains the FIFO operation boundary, and `src/mcp/contracts.ts` plus `src/mcp/server.ts` remain the strict public schema and registration seams. New output fields on old tools will be optional; old required inputs, wrapper shapes, and annotations stay unchanged. The exact tool inventory will be asserted once from the registration source and reused by contract, E2E, documentation, and release checks to prevent another 34/42/46 drift.

**Alternatives considered:** A separate MCP server or alternate client was rejected because it would duplicate initialization, locking, redaction, and lifecycle behavior. Manually repeating tool counts without a shared assertion was rejected because the existing specs already demonstrate count drift.

### 9. Verify through the existing four-layer test strategy

Pure unit tests will cover pair matrices, candidate graph classification, sorting/pagination, split-safe sums, fingerprints, and failure phases. Adapter contract tests will inspect the installed 26.8.1 declarations and run focused probes against controlled stubs or fixtures. Opt-in integration will prove actual pair creation, import transfer behavior, update/delete side effects, balance cross-checks, and exact cleanup. Compiled stdio E2E will prove the 53-tool surface, schemas, annotations, dry-run purity, negative inputs, and process health.

Real write runs will own both transfer IDs as one cleanup unit, call delete at most once per pair, and verify both absent. Baseline fingerprints will include reciprocal transfer IDs so a relationship change cannot hide behind unchanged transaction counts.

## Risks / Trade-offs

- **[External activity can make post-create ID-set discovery ambiguous]** → Keep the full operation inside the existing FIFO client, query only exact accounts/date, require exactly one valid new reciprocal pair, and return `created_unverified` recovery evidence instead of guessing.
- **[A dense equal-amount candidate set can approach quadratic size]** → Use grouping, deterministic early validation, a 5000-leaf scan cap, bounded date windows, and performance tests; fail rather than truncate.
- **[Side-specific updates make creation a compound non-atomic operation]** → Minimize updates by selecting the anchor side, record completed phases and exact IDs, synchronize once, verify both sides, and never auto-retry or claim rollback.
- **[Actual rules or future SDK behavior can change mirrored fields]** → Contract-test 26.8.1, compare pre/post canonical sides, and report observed effects rather than hard-code unsupported assumptions.
- **[Broken historical relationships can prevent broad reads]** → Pair lookup/search preserve observed data with reason codes; only operations that require reliable relational mutation fail preflight.
- **[Public balance semantics may diverge from canonical transaction sums]** → Treat disagreement as an integrity error, capture sanitized counts/differences, and do not return a reconciliation status.
- **[Additive fields can still break overly strict external consumers]** → Preserve established strict wrapper schemas where promised, add only explicitly optional fields, and retain backward-compatibility fixtures for all 46 existing tools.

## Migration Plan

1. Add installed-contract probes and document the 26.8.1 capability matrix before production behavior changes.
2. Add canonical fields and pure domain modules with unit tests, then extend the adapter and serialized client orchestration.
3. Add optional fields to existing schemas and handlers, register the seven new tools, and enforce the shared 53-tool inventory assertion.
4. Run typecheck, unit, coverage, installed-contract, and build gates before any real-server write test.
5. Run authorized integration and compiled stdio E2E against isolated run-owned fixtures; verify dry-run purity, exact pair cleanup, and permanent fingerprints.
6. Update version metadata, README, CHANGELOG, install/update acceptance, and the final v0.6.0 readiness report.

Deployment is an in-place package update with no data migration and no SDK upgrade. Rollback restores the prior v0.5.0 package/build while preserving the Actual cache and user configuration. If a test transfer was created before a failed verification, rollback does not mutate it automatically; the operator uses the returned exact IDs and recovery instructions to inspect, synchronize, and remove only confirmed run-owned state.
