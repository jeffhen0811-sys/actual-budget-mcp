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

On 2026-08-31, the explicitly authorized guarded integration and compiled MCP E2E suites created and then read temporary ordinary payees and representative temporary rules through the official server. Persisted rules retained stable IDs, `and` condition arrays, an `imported_payee contains <string>` condition, a `set payee <id>` action, and `pre`, default, and `post` stage changes. The MCP default stage round-tripped through the installed SDK representation and read back as `default`; the imported transaction was assigned the expected payee by Actual's official rule engine. Conditions and actions remained arrays and omitted optional metadata remained absent. No advanced pre-existing rule was present, so advanced readable shapes remain pinned by the installed declaration/bundle fixtures rather than claimed as a real-budget observation. All temporary rules, payees, accounts, categories, groups, and transactions were removed by exact returned ID, and permanent fingerprints were unchanged.

## Complete public reads

The exported `getTransactions` implementation adds date filters only when `startDate` or `endDate` is truthy. Calling that exported function with only an account ID therefore returns the complete account history. The declaration still requires both dates, so the adapter contains one narrow, documented compatibility cast and exposes `getAllTransactions(accountId)`. No ActualQL, SQLite access, or internal endpoint is used by application code.

`getBudgetMonths()` returns the complete inclusive budget-bound month list. Each returned value is passed to `getBudgetMonth()` and its category arrays, category IDs, budgeted values, and carryover values are validated before a destructive decision. Any malformed or failed read stops deletion with `PREFLIGHT_INCONCLUSIVE`.

## Observed destructive behavior and stop condition

The installed 26.8.1 implementation confirms these unsafe native behaviors:

- `closeAccount` deletes an account when its transaction count is zero.
- `deleteAccount` invokes forced account close, which deletes the account transactions; it is also a no-op for an already closed account unless the account is reopened first.
- `deleteCategoryGroup` deletes every category in the group.
- `deleteCategory` may remap category relationships when a transfer category is supplied.

The MCP layer therefore proves emptiness/unused state first, never supplies a category transfer for deletion, refuses empty-account close, and reopens a proven-empty closed account immediately before official deletion. If a future pinned build removes the unbounded transaction behavior, budget-month fields, or any required exported mutation, implementation must stop and report the missing public capability before changing the dependency or introducing another data path.
