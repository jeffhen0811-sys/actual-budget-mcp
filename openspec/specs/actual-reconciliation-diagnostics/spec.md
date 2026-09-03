# actual-reconciliation-diagnostics Specification

## Purpose

Define split-safe, read-only account reconciliation evidence that distinguishes ledger, cleared, reconciled, uncleared, statement, and bank-reported balances without changing Actual state.

## Requirements

### Requirement: Account reconciliation snapshot
The system SHALL expose `actual_get_account_reconciliation` with one opaque `accountId`, an optional valid cutoff date, and an optional signed safe-integer `statementBalance`. The cutoff SHALL default to the current local calendar date resolved once per request. The result SHALL identify the account and cutoff and report signed integer ledger, cleared, reconciled, and uncleared balances together with leaf transaction counts for each state.

#### Scenario: Snapshot without statement
- **WHEN** a valid account and cutoff are supplied without a statement balance
- **THEN** the result reports the four ledger-state balances and counts with status `NO_STATEMENT`

#### Scenario: Unknown account
- **WHEN** the account ID does not resolve exactly
- **THEN** the tool returns a sanitized non-retryable `NOT_FOUND` error

### Requirement: Split-safe balance semantics
Reconciliation aggregates SHALL count ordinary transactions and split children as leaf items, exclude split parents from monetary sums and counts, and include starting-balance leaf transactions. Reconciled transactions SHALL be a subset of cleared state; cleared balance SHALL include both cleared and reconciled leaves; and uncleared balance SHALL equal ledger balance minus cleared balance. The implementation SHALL compare its ledger total with the installed public account-balance API for the same cutoff and MUST fail with `QUERY_SHAPE_INVALID` if either this invariant or the direct uncleared sum is inconsistent.

#### Scenario: Split transaction
- **WHEN** an account contains a split parent with children
- **THEN** only the children contribute to reconciliation sums and counts, so the parent is not double-counted

#### Scenario: Reconciled transaction
- **WHEN** a leaf transaction is reconciled
- **THEN** it contributes to ledger, cleared, and reconciled values but not uncleared values

#### Scenario: Aggregate inconsistency
- **WHEN** canonical leaf sums disagree with public account balance or ledger-minus-cleared disagrees with the direct uncleared sum
- **THEN** the tool reports a structured integrity failure rather than returning misleading reconciliation numbers

### Requirement: Statement comparison
When `statementBalance` is present, the result SHALL return signed integer `differenceFromLedger` and `differenceFromCleared` as statement balance minus the respective balance. Status SHALL be `MATCHES_BOTH` when both differences are zero, `MATCHES_CLEARED` when only cleared matches, `MATCHES_LEDGER` when only ledger matches, and `DIFFERENCE` otherwise.

#### Scenario: Statement matches both balances
- **WHEN** ledger and cleared balances are equal to the supplied statement balance
- **THEN** status is `MATCHES_BOTH` and both differences are zero

#### Scenario: Statement differs
- **WHEN** neither ledger nor cleared balance equals the supplied statement balance
- **THEN** status is `DIFFERENCE` and both signed differences are returned without financial recommendation

### Requirement: Separate bank-reported metadata
If the installed account record exposes a bank-reported current balance, the tool MAY return it as separately labeled optional metadata with a signed difference from the computed ledger balance. It MUST NOT substitute bank-reported metadata for the caller's statement balance, infer its timestamp or cutoff, or use it to change reconciliation status.

#### Scenario: Bank-reported balance exists
- **WHEN** `balance_current` is available on the account
- **THEN** it is returned as bank-reported metadata distinct from computed balances and statement comparison

#### Scenario: Bank-reported balance absent
- **WHEN** no current bank balance is exposed
- **THEN** the optional metadata is absent rather than fabricated as zero

### Requirement: Read-only reconciliation boundary
The reconciliation tool SHALL perform no mutation or synchronization and MUST NOT claim or implement UI reconciliation state, last-reconciled date, account locking, unlocking, transaction state changes, or bank synchronization because those capabilities are not exported by the pinned public SDK.

#### Scenario: Caller requests reconciliation mutation
- **WHEN** a caller supplies an unknown lock, reconcile, clear, or bank-sync field
- **THEN** strict input validation rejects the request and budget state remains unchanged
