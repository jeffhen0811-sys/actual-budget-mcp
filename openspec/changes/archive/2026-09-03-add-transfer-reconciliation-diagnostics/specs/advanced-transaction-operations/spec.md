## ADDED Requirements

### Requirement: Canonical transfer awareness
Every canonical transaction projection used by transaction read and diagnostic tools SHALL preserve the installed raw `transfer_id` field and SHALL add an `isTransfer` boolean derived from whether that field is meaningful. It MUST NOT add a duplicate camel-case transfer identifier, infer a counterpart, or invent a transfer value when the raw field is absent or empty.

#### Scenario: Transfer projection
- **WHEN** a transaction has a meaningful raw `transfer_id`
- **THEN** its canonical projection preserves that value and reports `isTransfer: true`

#### Scenario: Ordinary projection
- **WHEN** a transaction lacks a meaningful raw `transfer_id`
- **THEN** its canonical projection reports `isTransfer: false` without a fabricated relationship

### Requirement: Transfer-payee import preview
`actual_preview_import` SHALL accept the same optional existing `payee` ID per item as `actual_import_transactions`, include it in normalized request fingerprinting, validate every supplied payee before invoking the official dry-run pipeline, and remain incapable of persistence or synchronization. Transfer outcomes SHALL be described only when evidenced by the installed preview result.

#### Scenario: Preview with transfer payee
- **WHEN** a valid item names an existing transfer payee
- **THEN** preview runs through the official dry-run reconciliation path and reports only observed evidence without presenting preview identifiers as persisted transfer sides

#### Scenario: Preview and import fingerprint
- **WHEN** preview and import use identical normalized items including payee IDs and options
- **THEN** they compute the same deterministic request fingerprint

## MODIFIED Requirements

### Requirement: Structured advanced transaction search
The system SHALL expose `actual_search_transactions` with required inclusive `startDate` and `endDate` plus optional allowlisted account IDs, transaction IDs, payee IDs, category IDs, uncategorized-only, cleared, import-source, transfer-state, signed integer amount, literal text, split mode, sort, limit, offset, and totals inputs. `transferState` SHALL accept only `any`, `transfer`, or `non-transfer` and default to `any`; transfer status SHALL be derived only from a meaningful raw `transfer_id`. The date range MUST use valid `YYYY-MM-DD`, MUST NOT be reversed, and MUST NOT exceed 366 inclusive days. Default limit SHALL be 100, maximum limit SHALL be 250, offset SHALL be between zero and 10000 inclusive, and no arbitrary table, field, operator, query object, expression, or regex SHALL be accepted.

#### Scenario: Bounded cross-account search
- **WHEN** a valid search omits account IDs
- **THEN** the system searches all accounts within the bounded date range in one official query path

#### Scenario: Invalid search bounds
- **WHEN** dates are malformed or reversed, the inclusive range exceeds 366 days, a signed amount is fractional, minimum amount exceeds maximum amount, limit exceeds 250, offset is outside its bounds, or transfer state is not an allowed enum
- **THEN** strict input validation rejects the entire call before an Actual operation executes

#### Scenario: Exact identifier filters
- **WHEN** account, transaction, payee, or category ID lists are provided
- **THEN** only exact opaque ID matches are returned and names are not treated as identifiers

#### Scenario: Transfer-state filter
- **WHEN** `transferState` is `transfer` or `non-transfer`
- **THEN** the result contains only transactions with or without a meaningful raw `transfer_id` respectively, while omitted or `any` preserves existing search behavior
