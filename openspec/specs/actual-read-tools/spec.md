# actual-read-tools Specification

## Purpose

Define the read-only MCP capabilities that let clients inspect accounts, balances, categories, payees, and bounded transaction periods from the configured Actual Budget.

## Requirements

### Requirement: List accounts
The system SHALL expose `actual_list_accounts` and return every account available from the official Actual API with `id`, `name`, `offbudget`, and `closed`. The system SHALL include the ledger balance when it can be retrieved through the official account-balance API. Monetary values SHALL use Actual's integer amount representation.

#### Scenario: Accounts returned
- **WHEN** `actual_list_accounts` is called with a loaded budget
- **THEN** the result contains the required fields for every account and any officially retrieved balance

#### Scenario: Balance lookup failure
- **WHEN** an account is returned but its balance cannot be retrieved
- **THEN** the account remains in the result with an explicit sanitized balance error instead of a fabricated balance

### Requirement: Get one account
The system SHALL expose `actual_get_account` with an opaque string `accountId`. The tool SHALL locate the account through the official account-list API and SHALL return its required account fields and officially retrieved balance.

#### Scenario: Existing account
- **WHEN** `actual_get_account` receives an ID present in the account list
- **THEN** the matching account and its available balance are returned

#### Scenario: Unknown account
- **WHEN** `actual_get_account` receives an ID not present in the account list
- **THEN** the tool returns a structured not-found error without attempting a raw database query

### Requirement: List category groups
The system SHALL expose `actual_list_categories` and return category groups as `groupId`, `groupName`, and nested `categories`. Each nested category SHALL include `id`, `name`, and `hidden`.

#### Scenario: Visible and hidden categories
- **WHEN** `actual_list_categories` is called
- **THEN** all groups and categories returned by the official category-group API are normalized into the documented nested shape, including hidden status

### Requirement: List payees
The system SHALL expose `actual_list_payees` and return each payee with at least `id` and `name`.

#### Scenario: Payees returned
- **WHEN** `actual_list_payees` is called
- **THEN** every payee returned by the official payee API is represented with its opaque ID and name

### Requirement: Read transactions by bounded date range
The system SHALL expose `actual_get_transactions` with `accountId`, `startDate`, and `endDate`. Dates MUST use the `YYYY-MM-DD` format, the start MUST NOT follow the end, and the inclusive interval MUST NOT exceed 366 days. The result SHALL include each officially available transaction field among `id`, `account`, `date`, `amount`, `payee`, `category`, `notes`, `cleared`, and `imported_id`.

#### Scenario: Valid date range
- **WHEN** the tool receives a valid account ID and an inclusive range of at most 366 days
- **THEN** it returns the transactions supplied by the official API for that account and range

#### Scenario: Invalid date format
- **WHEN** either date does not represent a valid calendar date in `YYYY-MM-DD` format
- **THEN** input validation rejects the call before any Actual operation executes

#### Scenario: Reversed date range
- **WHEN** `startDate` is later than `endDate`
- **THEN** input validation rejects the call with a clear range error

#### Scenario: Excessive date range
- **WHEN** the inclusive interval exceeds 366 days
- **THEN** input validation rejects the call and asks the client to request a narrower period

### Requirement: Opaque identifiers and bounded outputs
All account, category, payee, and transaction identifiers SHALL be treated as opaque non-empty strings. The system MUST NOT require UUID formatting and MUST NOT silently truncate oversized transaction results.

#### Scenario: Non-UUID identifier
- **WHEN** a non-empty identifier accepted by Actual is supplied
- **THEN** the MCP layer passes it through without UUID-specific rejection

#### Scenario: Oversized result
- **WHEN** a transaction query would exceed the configured safe response limit
- **THEN** the tool returns a structured error directing the client to narrow the date range rather than returning a silently partial result
