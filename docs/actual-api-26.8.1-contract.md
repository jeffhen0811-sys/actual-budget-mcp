# Actual API 26.8.1 structural contract

This release uses only public functions exported by the pinned `@actual-app/api@26.8.1`. The installed declarations and bundled implementation are the executable authority.

## Exported methods used

```ts
getAccounts(): Promise<APIAccountEntity[]>
createAccount(account: Omit<APIAccountEntity, 'id'>, initialBalance?: number): Promise<string>
updateAccount(id: string, fields: Partial<APIAccountEntity>): Promise<void>
closeAccount(id: string, transferAccountId?: string, transferCategoryId?: string): Promise<void>
reopenAccount(id: string): Promise<void>
deleteAccount(id: string): Promise<void>
getAccountBalance(id: string, cutoff?: Date): Promise<number>

getCategoryGroups(options?: { hidden?: boolean }): Promise<APICategoryGroupEntity[]>
createCategoryGroup(group: Omit<APICategoryGroupEntity, 'id'>): Promise<string>
updateCategoryGroup(id: string, fields: Partial<APICategoryGroupEntity>): Promise<void>
deleteCategoryGroup(id: string, transferCategoryId?: string): Promise<void>

getCategories(options?: { hidden?: boolean }): Promise<APICategoryEntity[]>
createCategory(category: Omit<APICategoryEntity, 'id'>): Promise<string>
updateCategory(id: string, fields: Partial<APICategoryEntity>): Promise<void>
deleteCategory(id: string, transferCategoryId?: string): Promise<void>

getTransactions(accountId: string, startDate: string, endDate: string): Promise<TransactionEntity[]>
getBudgetMonths(): Promise<string[]>
getBudgetMonth(month: string): Promise<BudgetMonth>
setBudgetAmount(month: string, categoryId: string, value: number): Promise<void>
setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void>
holdBudgetForNextMonth(month: string, amount: number): Promise<boolean>
resetBudgetHold(month: string): Promise<void>
batchBudgetUpdates(action: () => Promise<void>): Promise<void>

getPayees(): Promise<APIPayeeEntity[]>
createPayee(payee: Omit<APIPayeeEntity, 'id'>): Promise<string>
updatePayee(id: string, fields: Partial<APIPayeeEntity>): Promise<void>
deletePayee(id: string): Promise<void>
mergePayees(targetId: string, mergeIds: string[]): Promise<void>
getPayeeRules(payeeId: string): Promise<RuleEntity[]>

getRules(): Promise<RuleEntity[]>
createRule(rule: Omit<RuleEntity, 'id'>): Promise<RuleEntity>
updateRule(rule: RuleEntity): Promise<RuleEntity>
deleteRule(id: string): Promise<boolean>
```

`APIAccountEntity` requires `id` and `name`; `offbudget` and `closed` are optional booleans and `balance_current` is optional and may be `number | null`. `APICategoryGroupEntity` requires `id` and `name`; `is_income`, `hidden`, and nested `categories` are optional. `APICategoryEntity` requires `id`, `name`, and `group_id`; `is_income` and `hidden` are optional. Transaction payee/category/notes/import/transfer fields may be absent or null at runtime even where the broad model declarations are narrower.

`getBudgetMonth` returns top-level totals and `categoryGroups`. Expense category records include numeric `budgeted` and boolean `carryover`; income category records may omit those fields. Category groups always need runtime validation because the public declaration deliberately represents their extra budget fields as `Record<string, unknown>`.

## Monthly budget observations

The installed 26.8.1 declaration requires these top-level safe integer fields: `incomeAvailable`, `lastMonthOverspent`, `forNextMonth`, `totalBudgeted`, `toBudget`, `fromLastMonth`, `totalIncome`, `totalSpent`, and `totalBalance`. The MCP preserves their official names and signs. It does not invent friendly aliases such as `available`, `income`, or `overspent`.

The bundled public handler confirms two sanitized category variants:

- Envelope expense groups/categories expose `budgeted`, `spent`, and `balance`; expense categories also expose boolean `carryover`. Envelope income exposes `received` and omits `budgeted`.
- Tracking groups/categories expose `budgeted`, `balance`, and either `spent` or `received`. Tracking income can therefore be budgetable when its returned category has a numeric `budgeted` field. Income carryover remains unsupported by the public setter even when a raw tracking cell is present.

Identity fields are `id`, `name`, `is_income`, `hidden`, and category `group_id`. Hidden categories remain in month reads. Optional financial fields remain absent rather than becoming zero or null. Negative spending, balances, and overspending are meaningful and remain signed.

`getBudgetMonths` returns an engine-computed inclusive range, typically extending roughly twelve months beyond the current month; it is not a list of months containing explicit planning. Every requested month is checked against this range before a read or mutation.

`setBudgetCarryover` validates an expense category and applies from `startMonth` prospectively. `holdBudgetForNextMonth` rejects nonpositive amounts, applies a positive increment, may clamp it to available funds, and returns a boolean. `forNextMonth` can include both manual and automatic income holding, so reset results never label the aggregate as exclusively manual.

`batchBudgetUpdates` sends a start message, executes the callback, and always sends an end message in `finally`. It exposes no transaction, rollback, or per-item outcome. Budget copy deliberately uses sequential public amount/carryover methods, records attempted/completed IDs, synchronizes once, and verifies the complete target instead of using this batch helper.

## Payee and rule documentation discrepancies

The current official API reference documents payee CRUD, merge, payee-rule reads, and rule CRUD. The installed 26.8.1 declarations and bundled exports confirm those method families, with these release-relevant differences:

- The website's `Payee` table includes `category`, but installed `APIPayeeEntity` is exactly `id`, `name`, and optional/null `transfer_acct`. The bundled create handler forwards only `name`.
- The `getPayeeRules` declaration names its argument with `RuleEntity['id']`, while the public documentation and bundled handler confirm that it is semantically a payee ID.
- The website describes the default rule stage as `default`; installed `RuleEntity` uses `pre | null | post`. The MCP maps `default` to and from `null` without exposing that representation to callers.
- The website describes rule fields generically, while the installed public model contains discriminated condition fields/operators plus optional condition metadata and advanced actions such as split amount, schedule link, formula/template-backed set, and transaction deletion. Reads preserve those installed shapes; MCP writes use a narrower allowlist.
- `updateRule` is the documented exception to partial updates and requires the complete rule object, including its stable ID. Both create and update return complete rule objects with the ID.
- The website currently describes `deleteRule` as returning `Promise<null>`, but the installed declaration and handler return `Promise<boolean>`. `false` protects rules owned by schedules.
- The installed bundle contains internal `rule-get` and `rules-run` handlers, but neither is exported by `@actual-app/api`; no public preview export exists. Production code does not call those internal handlers, and the MCP registers neither manual-run nor preview tools.

The bundled implementation also confirms safety behavior that the public signatures do not express: deleting a transfer payee returns without mutation, merging into a transfer target returns without mutation, transfer sources are filtered out, payee merges rewrite `payee_mapping` rows before deleting ordinary sources, and `getRules` returns the engine's ranked `pre`, default, then `post` order. These details are pinned only by contract tests and are not imported into production code.

## Sanitized real-budget observation

On 2026-08-30, a read-only check against the configured controlled budget returned 11 payees, including 2 transfer payees. Every payee had `id`, `name`, and `transfer_acct`; the transfer field was explicitly either `null` or a string ID. The budget initially returned zero rules, so no pre-existing advanced-action variant was available to observe.

Sanitized contract fixtures pin both budget variants without personal names, credentials, or real financial values. Real read suites validate the configured budget's current official range, signed aggregates, hidden flags, and shape coherence without recording fixture amounts. Tracking behavior is contract-covered; it is not claimed as real-server evidence unless the configured fixture actually returns a tracking income shape.

On 2026-08-31, the explicitly authorized guarded integration and compiled MCP E2E suites created and then read temporary ordinary payees and representative temporary rules through the official server. Persisted rules retained stable IDs, `and` condition arrays, an `imported_payee contains <string>` condition, a `set payee <id>` action, and `pre`, default, and `post` stage changes. The MCP default stage round-tripped through the installed SDK representation and read back as `default`; the imported transaction was assigned the expected payee by Actual's official rule engine. Conditions and actions remained arrays and omitted optional metadata remained absent. No advanced pre-existing rule was present, so advanced readable shapes remain pinned by the installed declaration/bundle fixtures rather than claimed as a real-budget observation. All temporary rules, payees, accounts, categories, groups, and transactions were removed by exact returned ID, and permanent fingerprints were unchanged.

## Complete public reads

The exported `getTransactions` implementation adds date filters only when `startDate` or `endDate` is truthy. Calling that exported function with only an account ID therefore returns the complete account history. The declaration still requires both dates, so the adapter contains one narrow, documented compatibility cast and exposes `getAllTransactions(accountId)`. No ActualQL, SQLite access, or internal endpoint is used by application code.

`getBudgetMonths()` returns the complete inclusive budget-bound month list. Each returned value is passed to `getBudgetMonth()` and its category arrays, category IDs, budgeted values, and carryover values are validated before a destructive decision. Any malformed or failed read stops deletion with `PREFLIGHT_INCONCLUSIVE`.

## ActualQL transaction query contract

The installed package publicly exports `q` from `@actual-app/api/@types/app/query` and the preferred `aqlQuery(query)` executor. `runQuery(query)` is also exported but explicitly deprecated and is not used by this release. The MCP keeps these exports behind a typed adapter boundary: callers can provide only the documented transaction filters, sort enums, pagination values, and split mode. They cannot provide a table, field, operator, expression, query object, raw SQL, or raw ActualQL.

The installed query builder serializes a transaction query into a `QueryState` containing `table`, `tableOptions`, filter/select/group/order expressions, calculation/raw/dead/reference flags, and nullable `limit` and `offset`. The v0.5.0 compiler fixes the table to `transactions` and selects only canonical fields: `id`, `account`, `date`, `amount`, `payee`, `payee.name`, `imported_payee`, `category`, `category.name`, `notes`, `imported_id`, `transfer_id`, `cleared`, `reconciled`, `starting_balance_flag`, `is_parent`, `is_child`, and `parent_id`.

Installed declaration and bundle findings used by advanced transaction operations:

- Filters support equality and inequality (including null), `$oneof`, signed `$gte`/`$lte` ranges, `$and`, `$or`, and `$like`. The MCP escapes literal-like input and never accepts an operator from the caller.
- `payee.name` and `category.name` are resolved joins. The transaction view preserves explicit nullable payee/category/parent relationships and maps installed storage names to the public field names.
- Explicit multi-field ordering is preserved and the installed schema customizer appends `id` when any order is supplied. The MCP nevertheless emits `id` explicitly as its deterministic final tie-breaker.
- `limit` and `offset` are part of the serialized query state. MCP limits are stricter than the generic builder and are validated before execution.
- `calculate({ $count: 'id' })` and `calculate({ $sum: '$amount' })` serialize as a single `result` expression. The installed compiler requires the `$` field-reference prefix for the sum operand; using the literal string `amount` fails at runtime. Aggregate results are treated as unknown and strictly parsed.
- Transaction split modes are `inline`, `grouped`, `all`, and `none`. `inline` is the installed default and removes split parents; `grouped` returns parents with nested `subtransactions` and can include the whole group when a child matches; `all` exposes parent and child rows independently; `none` is installed but is not part of the public v0.5.0 search surface.
- Exact lookup uses an `all` identity query so a requested child cannot be replaced by its parent. A matching parent can then be enriched with a second grouped query.

Canonical transaction projection preserves explicit null separately from absence for payee, category, notes, imported ID/payee, transfer ID, and parent ID. It preserves `is_parent`, `is_child`, `parent_id`, and nested `subtransactions` recursively, plus resolved `payee_name` and `category_name` when selected. Internal fields such as `tombstone`, `_unmatched`, `_deleted`, `raw_synced_data`, rule diagnostics, schedule internals, and split error diagnostics are not exposed.

## Import and preview contract

`ImportTransactionsOpts` in the installed declaration contains exactly optional `defaultCleared`, `dryRun`, and `reimportDeleted`. There is no installed `payeeNameNormalization` option. The public wrapper defaults to `defaultCleared: true` and `dryRun: false` only when the entire options object is omitted, so the MCP normalizes both supported behavioral defaults explicitly for every import and preview request. The v0.4.0-compatible deleted-import policy is explicitly `reimportDeleted: false`.

The installed return value contains `added`, `updated`, `updatedPreview`, and sanitized `errors`. Each preview entry contains the normalized `transaction`, optionally an `existing` transaction, and optional `ignored` or `tombstone` evidence. New transaction identifiers are generated in memory before the preview branch, so `added` IDs from dry-run are preview-only and are never described as persisted IDs. Updated IDs refer to existing transactions.

The bundle normalizes payee input before reconciliation: non-empty `payee_name` is trimmed and title-cased, while `imported_payee` preserves the trimmed imported description. It runs Rules on normalized transactions before imported-ID and fuzzy matching. Imported-ID matching consults live or tombstoned transaction views according to `reimportDeleted`; manual matching proceeds through the installed reconciliation stages. Reconciled matches become ignored preview entries, unchanged matches are also reported as ignored, changed matches include sanitized existing evidence, tombstoned preview input is marked, and `TransactionError` becomes an `errors` entry.

When `dryRun` is true, the public wrapper sets the internal preview flag. The reconciler still performs normalization, Rules, matching, and planning, but the installed `if (!isPreview)` guard skips both `createNewPayees(...)` and `batchUpdateTransactions(...)`. A would-be payee can therefore receive an in-memory ID used by preview planning without being persisted. The MCP does not synchronize after preview and proves purity separately through unit, real-server, and compiled stdio fingerprints.

## Observed destructive behavior and stop condition

The installed 26.8.1 implementation confirms these unsafe native behaviors:

- `closeAccount` deletes an account when its transaction count is zero.
- `deleteAccount` invokes forced account close, which deletes the account transactions; it is also a no-op for an already closed account unless the account is reopened first.
- `deleteCategoryGroup` deletes every category in the group.
- `deleteCategory` may remap category relationships when a transfer category is supplied.

The MCP layer therefore proves emptiness/unused state first, never supplies a category transfer for deletion, refuses empty-account close, and reopens a proven-empty closed account immediately before official deletion. If a future pinned build removes the unbounded transaction behavior, budget-month fields, or any required exported mutation, implementation must stop and report the missing public capability before changing the dependency or introducing another data path.
