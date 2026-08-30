# actual-account-administration Specification

## Purpose

Define safe, explicit MCP operations for creating and administering Actual accounts without implicit deletion, uncontrolled field updates, or unverified mutations.

## Requirements

### Requirement: Create an account
The system SHALL expose `actual_create_account` with required `name`, optional `offbudget`, and optional `initialBalance`. The name SHALL be trimmed, contain 1 through 255 characters after trimming, and retain its internal characters and case. `offbudget` SHALL default to `false`. `initialBalance` SHALL be an Actual integer minor-unit amount, MAY be positive, zero, or negative, and SHALL be passed as the official create method's initial-balance argument without MCP-side currency conversion.

#### Scenario: Create an on-budget account with no opening balance
- **WHEN** a caller supplies a valid name and omits optional fields
- **THEN** the system creates an open on-budget account through the official API, synchronizes it, verifies it by ID, and returns `success: true`, `changed: true`, and the persisted account

#### Scenario: Create an account with a signed opening balance
- **WHEN** a caller supplies `initialBalance: -12030`
- **THEN** the system passes `-12030` as an integer minor-unit opening balance and returns the post-sync account without interpreting or rescaling the amount

#### Scenario: Invalid account name
- **WHEN** the account name is empty after trimming or exceeds 255 characters
- **THEN** strict input validation rejects the call before an Actual operation executes

#### Scenario: Actual rejects a conflicting name
- **WHEN** the official API rejects account creation because of a name conflict
- **THEN** the system returns sanitized code `NAME_CONFLICT` and does not invent an alternative name

### Requirement: Update allowlisted account fields
The system SHALL expose `actual_update_account` with an opaque `accountId` and at least one of `name` or `offbudget`. It MUST reject every other update field, including `id`, `closed`, `balance_current`, and arbitrary properties. Account names SHALL follow the account-name validation rules.

#### Scenario: Update permitted fields
- **WHEN** a caller supplies an existing account ID and one or both permitted fields with new values
- **THEN** only those fields are sent to the official update API, the change is synchronized and verified, and the result contains `changed: true` and the persisted account

#### Scenario: Empty or arbitrary update
- **WHEN** a caller supplies no permitted update or includes an unknown field
- **THEN** strict validation rejects the request before an Actual operation executes

#### Scenario: Account already has the requested values
- **WHEN** all requested fields already equal the persisted values
- **THEN** the system performs no mutation or synchronization and returns `success: true`, `changed: false`, and the current account

### Requirement: Close an account without implicit deletion
The system SHALL expose `actual_close_account` with `accountId` and the officially supported optional `transferAccountId` and `transferCategoryId`. Before mutation it SHALL verify the account, its balance, its complete transaction history, and any supplied transfer targets. It MUST NOT call the official close method when the account has no transactions because the pinned SDK would delete that account. A nonzero balance SHALL require a valid compatible transfer account and any transfer category required by the official operation.

#### Scenario: Empty account cannot be closed safely
- **WHEN** the target account has no transactions
- **THEN** the tool returns `UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT`, leaves the account unchanged, and does not call the close API

#### Scenario: Nonzero balance without transfer target
- **WHEN** the target account has a nonzero balance and no valid transfer account is supplied
- **THEN** the tool returns `TRANSFER_ACCOUNT_REQUIRED` without closing or deleting the account

#### Scenario: Safe account close
- **WHEN** the account has transaction history and all balance-transfer preconditions are satisfied
- **THEN** the system invokes the official close operation, synchronizes, verifies `closed: true`, and returns `success: true`, `changed: true`, and the persisted account

#### Scenario: Account already closed
- **WHEN** the target account is already closed
- **THEN** the system performs no mutation or synchronization and returns `success: true`, `changed: false`, and the current account

#### Scenario: Close preflight is inconclusive
- **WHEN** the system cannot completely verify history, balance, or required transfer compatibility
- **THEN** it returns `PREFLIGHT_INCONCLUSIVE` and does not invoke the close API

### Requirement: Reopen an account
The system SHALL expose `actual_reopen_account` with an opaque `accountId` and use the official reopen method for a closed account.

#### Scenario: Reopen a closed account
- **WHEN** the target account exists and is closed
- **THEN** the system reopens it, synchronizes, verifies `closed: false`, and returns `success: true`, `changed: true`, and the persisted account

#### Scenario: Account already open
- **WHEN** the target account is already open
- **THEN** the system performs no mutation or synchronization and returns `success: true`, `changed: false`, and the current account

### Requirement: Delete only a proven-empty account
The system SHALL expose `actual_delete_account` as a `DESTRUCTIVE OPERATION` requiring `confirmDestructive: true`. It SHALL verify the account and its complete transaction history through official read APIs and MUST call the official delete method only when the account is proven to contain zero transactions. It MUST NOT implement a cascading deletion.

#### Scenario: Confirmation is missing
- **WHEN** `confirmDestructive` is absent or not exactly `true`
- **THEN** validation rejects the request and the account remains present

#### Scenario: Account contains a transaction
- **WHEN** complete preflight finds one or more account transactions
- **THEN** the tool returns `ACCOUNT_NOT_EMPTY`, includes safe relationship details, and does not invoke account deletion

#### Scenario: Account history cannot be proven complete
- **WHEN** any required history read fails or is inconclusive
- **THEN** the tool returns `PREFLIGHT_INCONCLUSIVE` and leaves the account unchanged

#### Scenario: Confirmed empty-account deletion
- **WHEN** the account exists, confirmation is true, and complete preflight proves zero transactions
- **THEN** the system deletes it through the official API, synchronizes, verifies absence, and returns `success: true`, `deletedAccountId`, `deletedAccountName`, and `relatedTransactionCount: 0`

#### Scenario: Account is absent
- **WHEN** the supplied account ID does not exist
- **THEN** the tool returns `NOT_FOUND` and does not represent the repeated deletion as success

### Requirement: Normalized account mutation results
Successful non-delete account operations SHALL return both MCP structured content and equivalent textual JSON containing `success`, `changed`, and an account with `id`, `name`, `offbudget`, `closed`, and optional `balance` or `balanceError`. Values unavailable from Actual MUST remain absent or null according to the declared schema and MUST NOT be fabricated.

#### Scenario: Balance lookup fails after a verified mutation
- **WHEN** core account state is verified but its balance lookup fails safely
- **THEN** the account remains in the successful result with a sanitized `balanceError` and no invented balance
