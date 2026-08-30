# Actual Budget MCP 0.2.0 readiness report

Date: 2026-08-30

## Version and public surface

- Package, lockfile root, MCP metadata, README, and changelog report `0.2.0`.
- `@actual-app/api` remains exactly pinned at `26.8.1` in package and lock metadata.
- MCP exposes exactly 24 tools: the ten compatible 0.1.0 tools plus five account, three category-group, and six category administration tools.
- The existing `actual_list_categories` `groupId`/`groupName`/nested-category representation remains unchanged.

New tools: `actual_create_account`, `actual_update_account`, `actual_close_account`, `actual_reopen_account`, `actual_delete_account`, `actual_create_category_group`, `actual_update_category_group`, `actual_delete_category_group`, `actual_create_category`, `actual_update_category`, `actual_move_category`, `actual_hide_category`, `actual_unhide_category`, and `actual_delete_category`.

## Installed API findings

- All required account, category-group, category, transaction-history, and budget-month methods are public exports of 26.8.1.
- The exported transaction implementation supports an omitted date range for complete account history even though the declaration requires dates; the compatibility cast is isolated in the adapter and contract-tested.
- The exported category-group create handler drops `is_income`, and the exported category/category-group partial update paths require `name`; the adapter supplies the persisted name, applies income type through the public update method, and rolls back the exact group ID if that compatibility step fails.
- Real `getBudgetMonth` expense records expose numeric `budgeted` and boolean `carryover`; the complete category-use preflight validates that observed shape.
- Installed behavior confirms that closing a zero-transaction account deletes it, forced account deletion removes its transactions, group deletion deletes linked categories, and category deletion may transfer relationships. MCP preflights block those cascades.
- No ActualQL, direct SQLite access, internal endpoint, reorder fallback, Account Groups surface, or dependency upgrade was introduced.

## Verification results

| Gate | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 9 files, 47 tests |
| `npm run test:contract` | Passed: 2 files, 8 tests |
| `npm run build` | Passed |
| clean locked `install.sh` | Passed; build and cache creation completed without credentials |
| update-script contract | Passed static regression: dirty-check, `git pull --ff-only`, no reset/clean/runtime-data removal |
| public CI contract | Passed static regression: locked install, typecheck, unit, contract, build; no real-server commands |
| `npm run test:integration:read` (post-write run within `test:all`) | Passed: 6/6 |
| `npm run test:e2e:read` (post-write run within `test:all`) | Passed: 5/5 |
| `npm run test:integration:write` | Passed: 6/6; exact-ID cleanup and permanent-fixture fingerprint passed |
| `npm run test:e2e:write` | Passed: 8/8; exact-ID cleanup and permanent-fixture fingerprint passed |
| `npm run test:all` | Passed: typecheck, 47 unit tests, 8 contract tests, 12 integration tests, 13 E2E tests, and build |

## Domain results

- Accounts: schema, adapter, client, handler, MCP contract, idempotency, safe close/reopen, empty-only deletion, signed opening balance, partial-failure unit coverage, and real lifecycle passed.
- Category groups: typed creation (including the 26.8.1 income-type compatibility path), rename, idempotency, empty-only deletion, and real lifecycle passed.
- Categories: derived type, rename, same-type move, cross-type refusal, hide/unhide, complete transaction/budget/carryover scan, measured preflight, unused-only deletion, and real lifecycle passed.
- Runtime: one-position FIFO lifecycle, no mutation retry, non-retryable sync/read recovery metadata, lazy initialization, cache locking, shutdown, and existing operations passed locally.
- MCP stdio: exact inventory, strict schemas, annotations, old category-list compatibility, matching text/structured success results, and structured entity-preserving missing-confirmation errors passed. Server-dependent calls remain blocked by connectivity.

## Cleanup and fixture integrity

Integration and E2E suites registered exact returned IDs immediately, cleaned transactions/categories/groups/accounts in reverse dependency order, accumulated sanitized cleanup failures, and verified permanent fixture fingerprints. The complete category-use preflight was instrumented with elapsed-time measurement against the configured 15-month budget; the integration write suite completed in 2.03 seconds. No owned resources remained and both permanent-fixture fingerprints matched after the successful write runs.

## Compatibility and secret hygiene

- `git diff --check` passed.
- Tracked changes contain no detected credential-bearing URL, bearer token, access-key pattern, or literal password/token assignment.
- Local `.env`, Actual cache data, E2E data, and integration data remain ignored and untracked.
- The dependency lock shows no unexpected Actual SDK upgrade.
- All project-authored additions are in English and public errors remain sanitized.

## Release blockers

None. All mandatory local and real-server checks passed with process-scoped writes enabled; no credentials were persisted or exposed.

ACTUAL BUDGET MCP v0.2.0 READY
