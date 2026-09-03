# actual-transfer-management Specification

## Purpose

Define a safe, public-SDK-only contract for discovering transfer payees, inspecting reciprocal transfer pairs, searching transfers, and creating explicitly confirmed manual transfers.

## Requirements

### Requirement: Transfer payee discovery
The system SHALL expose `actual_list_transfer_payees` without inputs and SHALL return only payees whose installed Actual record has a meaningful `transfer_acct` that resolves to an existing account. Each result SHALL include the opaque payee ID, payee name, destination account ID and name, and the account's closed and off-budget state. Results SHALL be ordered by normalized account name and then opaque payee ID. The system MUST NOT add transfer fields to the strict `actual_list_payees` response.

#### Scenario: Valid transfer payees
- **WHEN** the budget contains transfer payees for existing accounts
- **THEN** the tool returns one deterministic item per valid transfer payee with its resolved account metadata

#### Scenario: Malformed transfer relationship
- **WHEN** a payee's meaningful `transfer_acct` cannot be resolved to an existing account
- **THEN** the tool returns a sanitized `QUERY_SHAPE_INVALID` error rather than omitting the defect or fabricating account metadata

### Requirement: Canonical transfer pair lookup
The system SHALL expose `actual_get_transfer` with exactly one non-empty opaque `transactionId`. A valid transfer SHALL be represented once as `transactionA` and `transactionB`, ordered by opaque transaction ID, with a versioned `pairKey`, reciprocal `transfer_id` evidence, account IDs, signed amounts, and integrity status. A valid pair MUST have two different accounts, reciprocal identifiers, and non-zero opposite integer amounts of equal magnitude. Directional `fromTransaction` and `toTransaction` fields SHALL be derived only for a valid pair from the negative and positive sides respectively.

#### Scenario: Valid reciprocal pair
- **WHEN** the requested transaction has a reciprocal counterpart with coherent accounts and amounts
- **THEN** the tool returns both exact transactions once, a stable `v1:` pair key, `integrity: VALID`, and an unambiguous from/to direction

#### Scenario: Ordinary transaction
- **WHEN** the requested transaction has no meaningful `transfer_id`
- **THEN** the tool returns a sanitized non-retryable `NOT_A_TRANSFER` error

#### Scenario: Missing or inconsistent counterpart
- **WHEN** the requested transaction references an absent counterpart or the relationship is not reciprocal or amount-coherent
- **THEN** the tool preserves every observed side, uses null for an unobserved side, emits deterministic integrity reason codes, and does not invent direction, values, or a repair

### Requirement: Bounded transfer search
The system SHALL expose `actual_search_transfers` with required inclusive `startDate` and `endDate` and optional exact account IDs, positive integer minimum and maximum magnitude, integrity state, sort, limit, and offset. The date range MUST NOT exceed 366 inclusive days; default limit SHALL be 100, maximum limit SHALL be 250, and offset SHALL be between zero and 10000 inclusive. A pair SHALL appear once when either observed side is in the date range and matches any account filter. Filtering, reciprocal pair assembly, integrity classification, de-duplication, and deterministic sorting SHALL occur before pagination.

#### Scenario: Pair matched from either side
- **WHEN** one side of a reciprocal pair matches the requested date and account filters
- **THEN** the pair is returned once even if both sides match

#### Scenario: Magnitude filter
- **WHEN** minimum or maximum amount is supplied
- **THEN** the system compares the positive transfer magnitude and rejects non-positive, fractional, or reversed bounds

#### Scenario: Stable transfer pagination
- **WHEN** an unchanged search is repeated with the same sort, limit, and offset
- **THEN** it returns the same pair keys in the same order

### Requirement: Safe manual transfer creation
The system SHALL expose `actual_create_transfer` with distinct opaque `fromAccountId` and `toAccountId`, a positive safe-integer `amount`, one valid `date`, and optional notes, category, and independent from/to cleared states. `dryRun` SHALL default to true. Execution SHALL require both `dryRun: false` and `confirmWrite: true`. The tool MUST reject imported identifiers, imported-payee text, caller-supplied transfer identifiers, closed accounts, unresolved transfer payees, invalid categories, and unsupported field combinations before mutation.

#### Scenario: Default creation preview
- **WHEN** the caller supplies a valid request and omits `dryRun`
- **THEN** the tool returns the exact planned signed sides, account placement, category placement, and clear states without mutation or synchronization

#### Scenario: Same budget-status accounts
- **WHEN** both accounts are on-budget or both accounts are off-budget
- **THEN** a category is prohibited because the movement is a category-neutral transfer

#### Scenario: Mixed budget-status accounts
- **WHEN** exactly one account is on-budget
- **THEN** a valid expense category is required and SHALL be placed only on the on-budget side of the transfer

#### Scenario: Confirmed creation
- **WHEN** preflight succeeds and the caller supplies `dryRun: false` and `confirmWrite: true`
- **THEN** the system creates the transfer through the exported official transfer-payee path, synchronizes, reads back both exact sides, and returns success only after pair, accounts, amounts, category placement, and requested clear states verify

#### Scenario: Inconclusive creation
- **WHEN** the official API acknowledges creation but exact pair discovery or post-sync verification is inconclusive
- **THEN** the tool reports the failed phase, known transaction IDs, possible partial state, and safe read/sync recovery without automatic retry or rollback

### Requirement: Public transfer API boundary
Transfer operations SHALL use only exports available from pinned `@actual-app/api@26.8.1`. They MUST NOT invoke internal handlers, raw SQL or SQLite, arbitrary ActualQL, direct `transfer_id` mutation, transaction merge, linking of two existing transactions, automatic candidate acceptance, or reconciliation lock and unlock behavior.

#### Scenario: Existing transactions resemble a transfer
- **WHEN** two existing unlinked transactions have opposite amounts and nearby dates
- **THEN** the MCP may report them as diagnostic candidates but does not link, merge, delete, or modify either transaction
