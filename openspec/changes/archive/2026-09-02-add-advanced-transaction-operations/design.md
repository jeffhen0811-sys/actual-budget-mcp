## Context

See `proposal.md` for motivation and scope. The current client serializes all Actual operations through one FIFO queue, uses an adapter to isolate public SDK discrepancies, synchronizes each existing mutation, and projects a strict canonical transaction shape. The installed `@actual-app/api@26.8.1` exports `q`, deprecated `runQuery`, preferred `aqlQuery`, `getTransactions`, `updateTransaction`, and `importTransactions`; its import options are exactly `defaultCleared`, `dryRun`, and `reimportDeleted`.

The installed transaction query executor supports `inline`, `grouped`, `all`, and `none` split modes. `inline` removes split parents, `grouped` returns a whole group when a parent or child matches, and `all` exposes parent and children as separate rows. The public import dry-run executes normalization, Rules, matching, and reconciliation planning but skips payee creation and transaction batch writes. Would-add IDs are generated in memory, whereas updated IDs identify existing records. These installed behaviors, not generic or newer documentation, define this design.

## Goals / Non-Goals

**Goals:**

- Keep a single canonical transaction representation across the existing read, exact lookup, search, bulk previews, and read-back verification.
- Provide useful cross-account filtering and deterministic pagination without granting arbitrary query authority.
- Make bulk desired-state changes auditable, idempotent, serialized, single-sync, and recoverable after non-atomic failure.
- Make import preview use the real reconciliation pipeline while proving persisted-state purity and truthfully representing limited SDK evidence.
- Share import validation, normalization, option defaults, and fingerprinting between preview and execution.
- Preserve all 42 v0.4.0 tools and the exact installed SDK dependency.

**Non-Goals:**

- Providing transaction-level ACID guarantees or automatic rollback across multiple SDK calls.
- Editing or reconstructing split structure, reconciling transfers, or exposing bulk date/amount/account/import metadata changes.
- Returning arbitrary ActualQL fields, accepting raw expressions, or making ActualQL a public MCP capability.
- Reproducing an unsupported payee-normalization option outside the official import pipeline.
- Deriving duplicate, skipped, or conflict classifications that the installed result cannot prove.

## Decisions

### 1. Extend one recursive canonical transaction projection

The adapter transaction type and strict public schema will add optional `is_parent`, `is_child`, `parent_id`, `subtransactions`, resolved `payee_name`, and resolved `category_name` fields while retaining current field names and nullability. Projection will recurse into `subtransactions`, preserve explicit null separately from absence, and strip internal fields such as raw synced data, tombstones, rule diagnostics, and query-only match markers from ordinary public results unless a result contract explicitly needs a sanitized match indicator.

The existing `actual_get_transactions` wrapper remains `{ transactions: [...] }`. New lookup returns `{ transaction }`; search returns its own page envelope but embeds the same transaction schema.

Alternative considered: separate schemas for lookup, search, and legacy reads. Rejected because the same entity would acquire incompatible null and split representations and read-back verification could disagree with public reads.

### 2. Isolate typed ActualQL behind the adapter

The adapter will expose narrowly typed operations for executing transaction queries and will bind the installed public `q` and `aqlQuery` exports. Production code will never accept a query object from MCP input. A dedicated query builder will own:

- fixed table `transactions`;
- fixed selected fields and resolved join fields;
- fixed filter mappings and operator choices;
- fixed split options;
- fixed sort mappings;
- bounded limit/offset;
- supported aggregate expressions.

The query result is `unknown` at the installed boundary, so runtime parsers will validate row and aggregate shapes before projection. Contract tests will pin serialized query state and sanitized bundle behavior.

Alternative considered: continue composing `getTransactions` per account and filter in memory. Rejected because it creates N account reads, cannot provide authoritative pagination/totals, and can return excessive history. `runQuery` is also rejected because the installed declaration marks it deprecated in favor of `aqlQuery`.

### 3. Anchor exact lookup with `all`, then enrich parents

Exact lookup first runs an ID equality query with `splits: "all"`. This produces the row whose ID actually matched, avoiding grouped behavior that can substitute a parent group when a child matched. If the exact row is a parent, a second internal grouped lookup enriches it with nested subtransactions. A child remains the exact child rather than acquiring a different top-level identity.

Alternative considered: grouped lookup only. Rejected because exact child identity is a hard requirement and grouped queries intentionally return the containing group.

### 4. Define search modes by their counting unit

`inline` is the default because each returned top-level item is independently countable and summable: ordinary transactions plus split children, excluding split parents. `grouped` is available for display and inspection, returning one top-level ordinary transaction or split group with children.

Pagination applies at the mode's top-level item boundary. User-visible sort enums map to date, amount, `payee.name`, or `category.name`; query order always adds ID as the final tie-breaker. Inline count and sum queries reuse the identical filter and leaf semantics. Grouped totals are not computed because the installed grouped item executor and aggregate executor do not share the same unit when a child filter causes a whole group to be returned.

Alternative considered: expose `all`. Rejected because it invites parent-plus-child double counting with no required v0.5.0 use case. Alternative grouped totals based on a separate unbounded ID fetch was rejected due response-size and performance risk.

### 5. Compile search filters from validated values

The search compiler will build an `$and` list from known inputs. ID lists use exact one-of semantics. Dates and amounts use bounded comparisons. `manual` treats null/absent/empty imported identifiers as non-imported; `imported` requires a meaningful non-empty identifier. `uncategorizedOnly` composes missing category with non-transfer and non-parent constraints, mirroring Actual's own special treatment rather than equating every null category with an ordinary uncategorized transaction.

Text search builds an `$or` across `payee.name`, `imported_payee`, and `notes`. Before surrounding the input with substring wildcards, it escapes backslash, `%`, and `?` in that order. The installed Unicode-like implementation handles case and diacritic normalization and treats null values safely. No caller regex is accepted.

IDs supplied for filters remain opaque. Referential existence validation is mandatory for bulk mutation references; for search filters it can be omitted where an empty exact-match result is unambiguous and avoids extra calls.

### 6. Separate bulk planning from bulk execution

A pure planner consumes fully loaded exact transactions, category/payee reference sets, and normalized desired-state items. It returns a bounded plan with before/after projections, changed fields, status, and stable reason. Duplicate IDs, missing transactions, invalid references, unsupported null clears, or malformed items are global preflight failures. Protected split/transfer items make the plan non-executable.

All split parents and children are protected for v0.5.0. For transfers, only `cleared` is allowed. Although the installed application can propagate notes and relational fields, allowing hidden related mutations would make a one-item before/after preview incomplete. Clearing category or payee with explicit null is enabled only after declaration, bundle, and real-server tests prove the installed update behavior.

Dry-run returns the plan and never calls update or sync. Confirmed execution reuses the already completed plan in the same queue position, skips unchanged items, calls the public update method sequentially, records the SDK's actual affected IDs, synchronizes once if at least one local update completed, and exact-reads all requested IDs for desired-state verification.

Alternative considered: invoke the existing per-transaction client method in a loop. Rejected because it synchronizes after each item and loses compound progress. A production rollback loop is rejected because inverse updates may affect transfers/splits or fail independently.

### 7. Model bulk failures by phase

The compound executor tracks `requestedIds`, `attemptedIds`, `completedIds`, `pendingIds`, and SDK-reported `affectedIds`. Failures use explicit phases: `local_update`, `sync`, or `read_back`. If any local call completed, the operation treats state as potentially changed. It attempts the single final sync when that is the safest way to preserve completed local changes, but it never retries an update. Sync failure returns `local_change_may_have_succeeded`; post-sync read or comparison failure returns `synchronized_but_unverified`.

Unit fault injection will cover deterministic partial failure. Real-server tests attempt it only when a safe natural failure can be induced; no production test hook will be added.

### 8. Share one import request normalizer and fingerprint

A shared import module will validate the existing item schema, attach the target account as required by the SDK, normalize supported options to explicit defaults, produce the SDK request, and calculate a deterministic fingerprint. Defaults are `defaultCleared: true` and `reimportDeleted: false`, preserving current MCP behavior. `dryRun` is controlled by the chosen operation, not caller data. `payeeNameNormalization` is intentionally absent.

The fingerprint is SHA-256 over a versioned canonical JSON structure containing account ID, normalized supported options, and normalized transactions. Object keys are stable; array order is preserved because import order can affect reconciliation. Credentials, server URL, sync ID, and local paths are excluded. The version prefix allows later canonicalization changes without silent equivalence.

Preview returns the fingerprint. Import optionally verifies `expectedPreviewFingerprint` before the mutation call. This proves request equality only; docs and output metadata will not imply snapshot isolation or unchanged budget state.

Alternative considered: hash the raw caller JSON. Rejected because omitted defaults and property ordering would create false mismatches for semantically identical requests.

### 9. Project preview evidence without inventing classifications

Preview calls the public import method once with `dryRun: true` through the read queue path and does not call sync. The projection uses `added`, `updated`, `updatedPreview`, and `errors` only as supported by the installed return shape:

- would-add count is derived from added outcomes under the MCP's non-split import-item contract;
- would-update item count and ignored count use `updatedPreview` evidence;
- affected existing IDs may use official updated IDs;
- generated addition IDs are omitted or explicitly labeled preview-only;
- errors are sanitized exactly as in real import;
- no duplicate, skipped, or conflict count is emitted without a future proven mapping.

Rules execute inside the official reconciliation pipeline. Tests may assert only effects visible in returned evidence or a controlled subsequent real import; they will not claim that preview exposes final categories for new additions if the SDK does not return them.

### 10. Verify dry-run purity at multiple layers

Unit tests prove preview never invokes client mutation/sync paths. Contract tests pin that the installed reconciler skips payee creation and batch transaction writes when previewing. Real integration and compiled stdio E2E tests capture complete controlled fingerprints before and after preview, including accounts, transactions, payees, categories, and rules. The preview result alone is not accepted as proof of purity.

## Risks / Trade-offs

- [Installed query behavior is weakly typed and partly undocumented] → Parse every query result, pin serialized queries and bundle behavior in contract tests, and verify representative cases against the real server.
- [Grouped filter semantics can return unmatched siblings] → Preserve grouping for display, keep exact lookup anchored in `all`, document group matching, and do not expose grouped totals.
- [Literal-like wildcard escaping could regress] → Centralize escaping and test `%`, `?`, backslash, accents, casing, and null fields against the installed implementation.
- [Bulk is not atomic] → Complete preflight, protect complex relationships, serialize updates, sync once, expose exact progress, and never claim rollback.
- [A transfer update may affect more rows than requested] → Permit only independently safe `cleared` in v0.5.0 and capture SDK-reported affected IDs.
- [Preview IDs look persistent] → Omit them by default or mark them explicitly preview-only; never mix them with existing transaction IDs.
- [Preview and import can diverge because budget state changes] → Fingerprint the normalized request while explicitly documenting that it is not a state lock.
- [SDK defaults change when an options object is partially supplied] → Normalize every supported option explicitly before preview or import.
- [New optional canonical fields could break consumers with locally strict schemas] → Preserve wrappers and required fields, add fields only where the MCP's declared v0.5.0 schema advertises them, and regression-test all 42 existing tools.
- [The complete real-server matrix is expensive] → Keep public CI deterministic and local, separate read-only and authorized-write gates, record timings without hard performance thresholds, and require actual execution before readiness.

## Migration Plan

1. Extend installed-contract documentation and tests before changing public handlers; stop if required behavior differs materially from the pinned package.
2. Add canonical models, typed query/import modules, schemas, client operations, and tools behind the existing serialized runtime.
3. Run typecheck, unit, coverage, contract, and build gates before connecting to the configured server.
4. Run real read and compiled stdio read suites; then explicitly authorize isolated writes for bulk and import preview/import suites.
5. Verify exact cleanup and permanent fingerprints, return write authorization to false, and repeat read suites.
6. Update versioned documentation and execute clean install, v0.4.0-to-v0.5.0 fast-forward update, Git hygiene, and secret scans.

Rollback is a source rollback to v0.4.0 with no data migration. Any partial real-test mutation must be recovered and cleaned by exact ID before code rollback; update scripts must never reset caches or user configuration.
