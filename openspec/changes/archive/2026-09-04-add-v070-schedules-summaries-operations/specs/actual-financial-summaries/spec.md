## Purpose

Define bounded and auditable financial summaries that follow Actual Budget transaction and category semantics without creating a separate accounting engine or exposing raw query authority.

## ADDED Requirements

### Requirement: Common summary scope and limits
Financial summary tools SHALL accept validated calendar ranges and optional account scope, SHALL default to on-budget accounts, and SHALL disclose the effective dates, account IDs, and off-budget policy in every result. Month input SHALL use valid `YYYY-MM`; range input SHALL use inclusive `YYYY-MM-DD` boundaries with start not after end and at most 366 days. `includeOffbudget` SHALL default to false. Invalid or oversized ranges SHALL return `INVALID_SUMMARY_RANGE` before querying Actual.

#### Scenario: Default on-budget scope
- **WHEN** a caller omits account IDs and `includeOffbudget`
- **THEN** the result covers all on-budget accounts only and reports that applied scope

#### Scenario: Explicit bounded scope
- **WHEN** a caller supplies valid dates, account IDs, and an off-budget policy
- **THEN** only compatible requested accounts are included and the exact applied scope is returned

#### Scenario: Invalid summary range
- **WHEN** dates are malformed, reversed, or span more than 366 inclusive days
- **THEN** the system returns `INVALID_SUMMARY_RANGE` without executing a financial query

### Requirement: Ledger classification semantics
Summary totals SHALL exclude reciprocal transfers and starting-balance transactions. Split transactions SHALL be evaluated once through their effective leaf rows and MUST NOT count both a parent and its children. Categorized transactions SHALL be classified by the category's income flag rather than amount sign: positive refunds in expense categories reduce net expense and negative adjustments in income categories reduce net income. Uncategorized on-budget transactions SHALL be classified by sign while remaining explicitly identified as uncategorized contributions. All amounts SHALL remain signed safe integers in Actual minor units.

#### Scenario: Expense refund
- **WHEN** a positive transaction is assigned to an expense category in the requested range
- **THEN** it reduces the signed expense total and does not increase income

#### Scenario: Negative income adjustment
- **WHEN** a negative transaction is assigned to an income category
- **THEN** it reduces the signed income total and does not increase expense

#### Scenario: Transfer exclusion
- **WHEN** either side of a reciprocal transfer is within scope
- **THEN** neither side contributes to income, expense, spending, or top-payee totals

#### Scenario: Split transaction
- **WHEN** a split parent and its children exist in scope
- **THEN** category totals and transaction counts reflect the effective children without double-counting the parent

#### Scenario: Uncategorized cash flow
- **WHEN** a non-transfer on-budget transaction has no category
- **THEN** a negative amount contributes to uncategorized expense or a positive amount contributes to uncategorized income and the relevant uncategorized count is incremented

### Requirement: Monthly financial summary
The system SHALL expose `actual_get_month_summary` as a read-only tool returning the requested month, applied scope, signed ledger income, signed ledger expense, net amount, transaction counts, categorized and uncategorized counts, and explicit transfer and starting-balance exclusion flags. When the scope is the complete on-budget budget, the result SHALL additionally include an official budget section from `getBudgetMonth` with original field names and a declared source; when account filters or off-budget inclusion make that budget scope incompatible, the budget section SHALL be omitted with an explicit availability reason. Budgeted and spent values MUST NOT be presented as interchangeable.

#### Scenario: Complete on-budget month
- **WHEN** a caller requests a month without account filters or off-budget inclusion
- **THEN** the result contains ledger totals and the official full-budget month section with separate source labels

#### Scenario: Account-filtered month
- **WHEN** a caller requests selected accounts
- **THEN** ledger totals reflect only those accounts and the result does not misrepresent full-budget values as account-filtered values

#### Scenario: Empty month
- **WHEN** no qualifying transactions exist in the requested month
- **THEN** the result returns zero signed totals and counts with the requested scope intact

### Requirement: Spending summary
The system SHALL expose `actual_get_spending_summary` as a read-only tool returning signed net expense, qualifying transaction count, uncategorized expense contribution, category and group breakdowns, and a bounded list of top expense payees. It SHALL support optional account, category, and category-group filters. Refunds SHALL reduce the same category, group, and payee aggregates as their associated expense classification; income categories and transfers SHALL not contribute.

#### Scenario: Category and group breakdown
- **WHEN** expense transactions span multiple categories and groups
- **THEN** the returned signed breakdowns reconcile exactly to the signed net expense total

#### Scenario: Bounded top payees
- **WHEN** more payees qualify than the requested limit
- **THEN** the result returns only the requested deterministic top-payee count and reports the applied limit

#### Scenario: Refund offsets expense
- **WHEN** an expense category contains both an outflow and a positive refund
- **THEN** the category, group, payee, and total values reflect their signed net amount

### Requirement: Income summary
The system SHALL expose `actual_get_income_summary` as a read-only tool returning signed net income, qualifying transaction count, uncategorized income contribution, income-category breakdown, and a bounded list of top income payees. Expense-category refunds, transfers, and starting balances SHALL not contribute to income. Negative adjustments in income categories SHALL reduce the corresponding category and payee totals.

#### Scenario: Income categories
- **WHEN** categorized income transactions exist in the requested range
- **THEN** the income total and category breakdown use the category income flag and reconcile exactly

#### Scenario: Expense refund excluded from income
- **WHEN** a positive refund belongs to an expense category
- **THEN** it does not appear in income totals, income categories, or top income payees

#### Scenario: Empty income range
- **WHEN** no qualifying income exists
- **THEN** the system returns zero signed income and empty bounded breakdowns

### Requirement: Separate off-budget cash flow
When `includeOffbudget` is true, off-budget transactions SHALL be reported in a separate signed cash-flow section containing inflows, outflows, net change, and transaction count. The system MUST NOT relabel uncategorized off-budget credits as income or debits as categorized spending, and off-budget values MUST NOT alter the on-budget income and expense totals.

#### Scenario: Off-budget inclusion
- **WHEN** off-budget inclusion is requested and qualifying off-budget transactions exist
- **THEN** they appear only in the separate cash-flow section and reconcile to its net change

### Requirement: Controlled summary query boundary
Financial summaries SHALL use official budget reads and MCP-owned fixed typed queries over the public transaction query surface. Callers MUST NOT select tables, fields, joins, operators, expressions, grouping instructions, raw queries, or raw ActualQL. Summary queries and returned breakdowns SHALL be bounded with shared limits: at most 366 days, a default top-payee limit of 10, and a maximum top-payee limit of 50. Category and group results MAY include the bounded configured budget taxonomy but MUST NOT return raw transaction rows or query representations.

#### Scenario: Summary query construction
- **WHEN** a valid summary request is executed
- **THEN** only fixed allowlisted queries constructed from validated scope are sent to Actual

#### Scenario: Attempted query injection
- **WHEN** a caller supplies an unknown query, field, operator, or grouping property
- **THEN** strict input validation rejects it before the Actual adapter is invoked

