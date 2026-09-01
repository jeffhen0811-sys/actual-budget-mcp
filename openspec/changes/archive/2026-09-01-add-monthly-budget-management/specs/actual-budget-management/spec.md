## Purpose

Define stable, mode-aware monthly budget reads and guarded planning mutations that preserve Actual's official signed integer semantics and can be verified safely through MCP stdio.

## ADDED Requirements

### Requirement: Validate budget months and monetary amounts
The system SHALL accept budget months only as real calendar months in strict `YYYY-MM` form and SHALL accept monetary inputs only as safe integers in the budget currency's minor units. It MUST reject floats, malformed numeric values, invalid months, and unknown input fields before invoking Actual.

#### Scenario: Valid month and BRL amount
- **WHEN** a caller supplies month `2026-09` and amount `150000`
- **THEN** validation accepts the values as September 2026 and R$ 1.500,00 in integer minor units

#### Scenario: Invalid month
- **WHEN** a caller supplies `2026-9`, `2026-13`, `2026-09-01`, or a localized month label
- **THEN** validation rejects the request before any Actual operation

#### Scenario: Floating amount
- **WHEN** a caller supplies a floating monetary amount
- **THEN** validation rejects it without rounding or silent conversion

### Requirement: List available budget months
`actual_list_budget_months` SHALL call the official available-month operation, preserve its chronological order, and return `months` plus `count`. The tool SHALL describe the values as months available for budget queries rather than claiming each month contains configured planning data.

#### Scenario: Available months exist
- **WHEN** Actual returns one or more available budget months
- **THEN** the tool returns the same ordered month strings and their exact count

#### Scenario: No available months
- **WHEN** Actual returns an empty month list
- **THEN** the tool returns an empty `months` array and `count: 0` without creating planned amounts

### Requirement: Read a real budget month shape
`actual_get_budget_month` SHALL call the official month read and project only fields proven by the installed 26.8.1 contract. The result SHALL expose official month aggregates and nested groups and categories while preserving signed integers, booleans, nullability, absence, hidden status, and income/expense distinctions. It MUST NOT invent `available`, `income`, or `overspent` fields when only `incomeAvailable`, `totalIncome`, or `lastMonthOverspent` exists.

#### Scenario: Envelope budget month
- **WHEN** an envelope month contains expense and income categories
- **THEN** expense categories expose their observed budget, spending, balance, and carryover fields while income categories expose their observed received fields without fabricated budget values

#### Scenario: Tracking budget month
- **WHEN** a tracking month returns budgetable income and expense category shapes
- **THEN** the tool preserves each observed budgeted, received or spent, balance, and carryover field without coercing the result into the envelope shape

#### Scenario: Hidden category
- **WHEN** a month contains a hidden category with historical budget state
- **THEN** the category remains represented with `hidden: true` and its real observed budget fields

#### Scenario: Month outside the official range
- **WHEN** the requested month is validly formatted but Actual reports no available budget month for it
- **THEN** the tool returns a stable not-found or unsupported-month error without attempting to create planning data

### Requirement: Return an official-aggregate budget summary
`actual_get_budget_summary` SHALL return an agent-oriented summary derived primarily from official `getBudgetMonth` aggregates. Optional `groupId` and `categoryId` filters MAY narrow the included category detail but MUST NOT turn the tool into a generic query surface. Any derived field SHALL have documented semantics and SHALL be used only when no equivalent official aggregate exists and its sign behavior has been proven.

#### Scenario: Monthly summary
- **WHEN** the requested month is available
- **THEN** the result includes the month, official total budgeted, income, spent, balance, to-budget, next-month, and prior-overspending values that exist in the installed contract plus bounded category detail

#### Scenario: Signed overspending
- **WHEN** Actual returns negative spending, balance, or prior overspending
- **THEN** the summary preserves those signs exactly

#### Scenario: Month with no planned amounts
- **WHEN** an available month has zero planned amounts
- **THEN** the summary returns the official zero values and does not represent the month as absent

### Requirement: Set a category budget amount by desired state
`actual_set_budget_amount` SHALL validate the month and category, confirm from the month shape that the target category is budgetable, call the official set operation only when the desired signed integer differs, synchronize, read the month again, and return the persisted category state. Zero SHALL be a valid desired value and SHALL be the documented way to clear a planned amount.

#### Scenario: Set expense budget
- **WHEN** an existing expense category has a different budgeted amount
- **THEN** the system writes the requested integer, synchronizes once, verifies the read-back, and returns `changed: true` with the final category state

#### Scenario: Clear budget with zero
- **WHEN** a budgeted category receives amount `0`
- **THEN** the system clears the planned amount through the same operation and verifies a zero read-back

#### Scenario: Signed negative budget
- **WHEN** the installed official operation accepts a negative safe integer for a budgetable category
- **THEN** the system preserves and verifies that signed value without normalization

#### Scenario: Income category in envelope mode
- **WHEN** an income category does not expose a budgetable field in the target envelope month
- **THEN** the system refuses the mutation with a stable mode/category compatibility error

#### Scenario: Income category in tracking mode
- **WHEN** the target tracking-month shape proves the income category has a numeric budgeted field
- **THEN** the system permits the desired-state mutation and verifies the tracking income result

#### Scenario: Amount already matches
- **WHEN** the category already has the requested budgeted amount
- **THEN** the tool returns `changed: false` without mutation or synchronization

### Requirement: Set prospective expense carryover
`actual_set_budget_carryover` SHALL accept a valid month, existing expense category, and boolean flag. It SHALL document and enforce the official prospective behavior: the flag is effective from the selected month through later available months rather than only on one month. Income categories SHALL be rejected because the pinned public operation accepts only expense categories.

#### Scenario: Enable carryover
- **WHEN** carryover is false from the requested month and the caller requests true
- **THEN** the system applies the official operation, synchronizes, verifies the target and affected available months, and reports `effectiveFromMonth`

#### Scenario: Disable carryover
- **WHEN** carryover is true from the requested month and the caller requests false
- **THEN** the system applies and verifies the prospective false state

#### Scenario: Income carryover request
- **WHEN** the caller targets an income category
- **THEN** the tool returns a stable compatibility error without mutation

### Requirement: Hold a positive amount for the next month
`actual_hold_budget_for_next_month` SHALL expose the official hold operation as a positive incremental request, not an absolute desired amount. It SHALL require `amount > 0`, capture the current month state, invoke the official operation, synchronize only when the operation reports an applied change, read the month again, and return the requested amount, official applied result, and before/after `forNextMonth` aggregates. It SHALL reject budget modes whose returned shape does not support envelope holding.

#### Scenario: Hold available funds
- **WHEN** an envelope month has positive `toBudget` and the caller requests a positive hold
- **THEN** the tool applies up to the amount Actual allows and returns the observed before/after next-month aggregate

#### Scenario: Hold exceeds available funds
- **WHEN** the requested positive amount exceeds the available `toBudget`
- **THEN** the tool reports the official applied result and observed clamped outcome rather than claiming the entire request was held

#### Scenario: No funds can be held
- **WHEN** the official operation returns false because the month has no positive funds available
- **THEN** the tool returns `changed: false` without claiming a hold

#### Scenario: Zero or negative hold
- **WHEN** the caller supplies zero or a negative amount
- **THEN** input validation rejects the call and directs callers to the reset operation for removing a manual hold

#### Scenario: Tracking budget hold
- **WHEN** the month shape indicates tracking budget behavior
- **THEN** the tool returns a stable unsupported-budget-mode error without mutation

### Requirement: Reset only the manual budget hold
`actual_reset_budget_hold` SHALL invoke the official reset operation for an envelope month, synchronize, and read the month again. Its result SHALL use `previousForNextMonth` and `currentForNextMonth` aggregate names and MUST NOT claim these values are exclusively the manual hold because automatic income holding can also contribute to the aggregate.

#### Scenario: Reset existing manual hold
- **WHEN** an envelope month has a manual hold
- **THEN** the tool resets it, synchronizes, and returns the observed aggregate before and after

#### Scenario: Reset with no manual hold
- **WHEN** no manual hold exists
- **THEN** the operation remains safe and returns an idempotent no-change result when that state can be established

#### Scenario: Automatic hold remains
- **WHEN** automatic income holding contributes after the manual hold is reset
- **THEN** `currentForNextMonth` may remain nonzero and the tool does not report cleanup failure solely for that reason

### Requirement: Preview a bounded budget copy
`actual_copy_budget_month` SHALL require distinct available source and target months and SHALL default `dryRun` to true, `mode` to `fill-empty`, `includeCarryover` to false, and `includeHidden` to false. Preview SHALL perform no writes and SHALL return bounded per-category differences with total, set, skip, overwrite, hidden-skip, and omitted counts. It SHALL copy planning values only and MUST NOT copy transactions, actual income, spending, balances, or month holds.

#### Scenario: Fill-empty dry run
- **WHEN** source and target are distinct, the target contains zero planned amounts, and dry-run is omitted or true
- **THEN** the preview reports which budgetable categories would be set without invoking any mutation

#### Scenario: Hidden category default
- **WHEN** a source category is hidden and `includeHidden` is omitted or false
- **THEN** preview reports `skip-hidden` and execution leaves that category unchanged

#### Scenario: Hidden category opt-in
- **WHEN** `includeHidden: true` is supplied
- **THEN** the hidden category participates in the same fill-empty or overwrite rules and remains labeled hidden in the result

#### Scenario: Same source and target
- **WHEN** source and target months are equal
- **THEN** the tool rejects the request without mutation

#### Scenario: Bounded preview
- **WHEN** total category differences exceed the response limit
- **THEN** preview returns the bounded difference list, exact total counts, and `omittedDifferenceCount`

### Requirement: Guard and execute budget copying
Copy execution SHALL use only official category budget and carryover operations, capture target state before mutation, and track each attempted and completed category. `fill-empty` SHALL change only target categories whose observed budgeted amount is zero. `overwrite` SHALL require `confirmOverwrite: true` when any nonzero target value would change. Carryover copying SHALL occur only when explicitly enabled and SHALL disclose its prospective effect from the target month forward. The operation MUST NOT automatically retry or silently roll back a partial mutation.

#### Scenario: Fill-empty execution
- **WHEN** `dryRun: false` and fill-empty preflight finds eligible zero target categories
- **THEN** the tool changes only those categories, synchronizes, verifies all changed categories, and reports applied and skipped items

#### Scenario: Overwrite lacks confirmation
- **WHEN** overwrite would replace at least one different nonzero target amount and `confirmOverwrite` is not true
- **THEN** the tool returns a safe preview or confirmation-required error with no writes

#### Scenario: Confirmed overwrite
- **WHEN** overwrite differences exist and `confirmOverwrite: true` is supplied
- **THEN** execution applies and verifies those differences

#### Scenario: Explicit carryover copy
- **WHEN** `includeCarryover: true` is supplied
- **THEN** the preview and result identify that copied expense carryover becomes effective from the target month through later available months

#### Scenario: Repeated identical copy
- **WHEN** the same completed copy is executed again against unchanged source and target state
- **THEN** preflight finds zero effective changes and returns `changed: false` without mutation or synchronization

#### Scenario: Partial copy failure
- **WHEN** an error occurs after one or more local category changes may have succeeded
- **THEN** the tool returns safe attempted/completed category metadata, marks potential partial state, provides synchronization and read-back recovery guidance, and does not repeat the copy automatically
