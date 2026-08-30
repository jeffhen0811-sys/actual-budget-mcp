## 1. Confirm the Pinned Actual API Contract

- [x] 1.1 Record the exported 26.8.1 account, category-group, category, transaction-history, and budget-month method signatures and nullable return shapes used by the change.
- [x] 1.2 Verify with read-only inspection/tests that complete account transaction history and all budget-month category relationships can be evaluated through the pinned public methods without ActualQL, SQLite, or internal endpoints.
- [x] 1.3 Confirm the observed 26.8.1 close/delete cascade behaviors and document a stop condition if any required public operation is missing or unusable before changing the dependency.

## 2. Define Contracts and Public Errors

- [x] 2.1 Add the shared trimmed 1–255 character entity-name schema and reuse the existing safe-integer amount and opaque-ID schemas.
- [x] 2.2 Add strict input schemas for the five account tools, including literal destructive confirmation and allowlisted update fields.
- [x] 2.3 Add strict input schemas for the three category-group and six category tools, including derived rather than caller-supplied type/visibility fields.
- [x] 2.4 Add normalized account, category-group, category, mutation, and immutable deletion output schemas while preserving the existing category-list schema exactly.
- [x] 2.5 Extend the public error envelope with optional safe details, recovery action, entity context, and partial-state fields without invalidating v0.1.0 errors.
- [x] 2.6 Define and sanitize the stable structural domain codes, including partial sync/read failure codes and non-retryable deterministic refusals.

## 3. Extend the Narrow Actual Adapter

- [x] 3.1 Add typed adapter entities for the complete installed account, category-group, and category shapes while keeping existing read-tool normalization compatible.
- [x] 3.2 Add wrappers for account create/update/close/reopen/delete and opening-balance argument handling using only exported 26.8.1 methods.
- [x] 3.3 Add wrappers for category-group and category get/create/update/delete operations without transfer, reorder, or internal endpoint fallbacks.
- [x] 3.4 Add official read wrappers needed for complete history and budget-month preflight scans.
- [x] 3.5 Add adapter contract tests for optional, null, absent, hidden, offbudget, closed, balance, income-type, and group-link fields returned by 26.8.1.

## 4. Implement the Serialized Mutation Lifecycle

- [x] 4.1 Refactor or extend the client mutation helper so preflight, idempotency comparison, mutation, sync, refetch, verification, and result construction remain in one FIFO queue position.
- [x] 4.2 Ensure idempotent no-op paths return `changed:false` without invoking mutation or sync.
- [x] 4.3 Map local-mutation/sync failure to non-retryable `MUTATION_SYNC_FAILED` with `actual_sync` recovery metadata and no automatic mutation retry.
- [x] 4.4 Map successful-sync/final-read failure to non-retryable `POST_MUTATION_READ_FAILED` with `synchronized_but_unverified` state.
- [x] 4.5 Add regression coverage proving overlapping structural operations cannot interleave and existing lazy initialization, cache locking, shutdown, and v0.1.0 operations still use the same client.

## 5. Implement Account Administration

- [x] 5.1 Implement account creation with normalized name, default `offbudget:false`, optional signed `initialBalance`, sync, ID refetch, and persisted output.
- [x] 5.2 Implement allowlisted account name/offbudget updates with `NOT_FOUND`, `NAME_CONFLICT`, and idempotent same-value behavior.
- [x] 5.3 Implement complete close preflight for existence, history, balance, and transfer targets, including `UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT` for zero-history accounts.
- [x] 5.4 Implement safe official close and reopen with idempotent desired-state handling and post-sync state verification.
- [x] 5.5 Implement confirmed account deletion only after complete history proves zero transactions, then sync, verify absence, and return the pre-delete summary.

## 6. Implement Category Structure Administration

- [x] 6.1 Implement category-group creation with optional `isIncome:false` default, `hidden:false`, and verified persisted output.
- [x] 6.2 Implement name-only category-group update with conflict mapping and idempotent same-name handling.
- [x] 6.3 Implement confirmed group deletion only when a complete read proves zero linked categories, without cascade or automatic moves.
- [x] 6.4 Implement category creation by validating the target group, deriving `is_income`, fixing `hidden:false`, and verifying the persisted category.
- [x] 6.5 Implement name-only category update with conflict mapping and idempotent same-name behavior.
- [x] 6.6 Implement same-type category moves and reject cross-type moves with `INCOMPATIBLE_CATEGORY_GROUP_TYPE` without converting the category.
- [x] 6.7 Implement semantic hide/unhide operations with idempotent no-op behavior and verified visibility state.
- [x] 6.8 Implement complete category-use preflight across every account history and returned budget month, failing closed on any incomplete or malformed result.
- [x] 6.9 Implement confirmed category deletion only after the preflight proves zero transaction, budget, and carryover relationships, without rewriting related data.

## 7. Register the Exact MCP Surface

- [x] 7.1 Add runtime interface methods and handlers for all fourteen new operations without changing the ten existing handler contracts.
- [x] 7.2 Register exactly the five account, three category-group, and six category tools with English titles, descriptions, strict schemas, and structured/text JSON results.
- [x] 7.3 Apply the agreed read-only, destructive, and idempotent annotations, including `DESTRUCTIVE OPERATION` descriptions and literal confirmation on all three structural deletes.
- [x] 7.4 Add tool-list contract coverage for the exact unordered set of 24 names and absence of reorder, aliases, generic CRUD, Account Groups, and internal operations.
- [x] 7.5 Add a regression assertion that `actual_list_categories` retains its v0.1.0 `groupId`/`groupName` and nested category output shape.

## 8. Add Unit and Contract Coverage

- [x] 8.1 Add account schema/handler/client unit tests for valid creation, signed balance, invalid names, allowlists, idempotency, safe close/reopen, destructive confirmation, empty-only deletion, and missing IDs.
- [x] 8.2 Add category-group schema/handler/client unit tests for typed creation, name-only update, idempotency, confirmation, non-empty refusal, empty deletion, and missing IDs.
- [x] 8.3 Add category schema/handler/client unit tests for derived type, invalid group, rename, compatible/incompatible move, hide/unhide, confirmation, in-use refusal, inconclusive scan, and unused deletion.
- [x] 8.4 Add unit tests proving mutation is not retried after partial failure and recovery metadata, retryability, redaction, structured content, and textual JSON match their schemas.
- [x] 8.5 Extend SDK contract fixtures with real optional/null/undefined account, category-group, and category values and confirm no fabricated defaults appear in outputs.
- [x] 8.6 Run the complete unit/contract suite and fix production behavior rather than weakening tests for any real SDK discrepancy.

## 9. Extend Real Integration Tests Safely

- [x] 9.1 Add a per-run resource registry that records every created ID immediately, maintains integration/E2E isolation, and performs exact-ID reverse-order cleanup while accumulating cleanup errors.
- [x] 9.2 Add baseline and post-cleanup fingerprints for `TESTE MCP - Conta Corrente`, `TESTE MCP - Cartão`, manual fixtures, and relevant original transactions.
- [x] 9.3 Add integration account scenarios for create/list/get/update, signed opening balance, safe close/reopen with temporary history, removal of that history, empty-only deletion, confirmation refusal, missing ID, and cleanup.
- [x] 9.4 Add integration group/category scenarios for create/rename, same-type move, hide/unhide, non-empty/in-use safety refusals, confirmed empty deletion, missing IDs, and cleanup.
- [x] 9.5 Measure complete category-use preflight on the configured real budget and stop for approval rather than introducing a recent-history shortcut or prefix-cleanup fallback if the safe design is disproportionately costly.
- [x] 9.6 Ensure write enablement is process-scoped through `ACTUAL_INTEGRATION_ALLOW_WRITES=true`, never persisted to `.env`, and every cleanup failure reports safe type/ID/name details.

## 10. Extend Real MCP Stdio E2E Tests

- [x] 10.1 Assert `tools/list` exposes exactly 24 tools with the agreed schemas, descriptions, and annotations through a real MCP stdio client.
- [x] 10.2 Exercise the complete account administration lifecycle through real stdio with owned resources and verify every structured and textual response as Hermes would receive it.
- [x] 10.3 Exercise the complete group/category lifecycle through real stdio, including idempotent operations and cross-type/in-use safety refusals.
- [x] 10.4 Verify all three missing-confirmation calls return structured errors, preserve their entities, and leave the MCP process operational.
- [x] 10.5 Reuse the exact-ID resource registry and permanent-fixture fingerprints while keeping E2E resources separate from integration resources.

## 11. Version, Documentation, and Operations

- [x] 11.1 Update package, lockfile root, and MCP metadata from 0.1.0 to 0.2.0 while keeping `@actual-app/api` pinned at 26.8.1.
- [x] 11.2 Add the `0.2.0` CHANGELOG entry with `Added`, `Changed`, and `Fixed` sections.
- [x] 11.3 Add the English README `Budget structure administration` section and document every new tool, input, output, example, destructive refusal, integer amount, API limitation, and recovery behavior.
- [x] 11.4 Verify `install.sh` still succeeds from a clean installation and does not require or expose credentials.
- [x] 11.5 Verify `update.sh` remains fast-forward-only and preserves environment configuration, Actual cache, `.actual-test-data`, and Hermes configuration during a 0.1.0-to-0.2.0 update.
- [x] 11.6 Confirm public GitHub-hosted CI still runs locked install, typecheck, unit/contract tests, and build without requiring real-server access.

## 12. Execute the Strict Readiness Gate

- [x] 12.1 Run `npm run typecheck`, `npm test`, `npm run test:integration:read`, and `npm run test:e2e:read` and record exact outcomes and counts where available.
- [x] 12.2 Run the process-scoped real integration write suite, confirm exact-ID cleanup and permanent-fixture fingerprints, and record outcomes.
- [x] 12.3 Run the process-scoped real stdio E2E write suite, confirm exact-ID cleanup and permanent-fixture fingerprints, and record outcomes.
- [x] 12.4 Re-run integration read and E2E read after writes, then run build and `test:all` where applicable.
- [x] 12.5 Inspect tracked changes and generated artifacts for credentials, tokens, sensitive sync IDs, credential-bearing URLs, unexpected SDK upgrades, and unintended v0.1.0 contract changes.
- [x] 12.6 Produce the required final report with version, new tools, files, API findings, test results, per-domain results, cleanup, compatibility, and secret hygiene, ending in `READY` only if every mandatory real check passed and otherwise `NOT READY`.
