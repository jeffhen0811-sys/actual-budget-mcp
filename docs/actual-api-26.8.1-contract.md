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
```

`APIAccountEntity` requires `id` and `name`; `offbudget` and `closed` are optional booleans and `balance_current` is optional and may be `number | null`. `APICategoryGroupEntity` requires `id` and `name`; `is_income`, `hidden`, and nested `categories` are optional. `APICategoryEntity` requires `id`, `name`, and `group_id`; `is_income` and `hidden` are optional. Transaction payee/category/notes/import/transfer fields may be absent or null at runtime even where the broad model declarations are narrower.

`getBudgetMonth` returns top-level totals and `categoryGroups`. Expense category records include numeric `budgeted` and boolean `carryover`; income category records may omit those fields. Category groups always need runtime validation because the public declaration deliberately represents their extra budget fields as `Record<string, unknown>`.

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
