# advanced-transaction-operations Specification

## Purpose

Define safe exact lookup, structured advanced search, heterogeneous bulk desired-state updates, and official import preview behavior for transaction-focused MCP clients.

## Requirements

### Requirement: Exact transaction lookup
The system SHALL expose `actual_get_transaction` with one opaque non-empty `transactionId` and SHALL return exactly the transaction identified by that ID using the canonical transaction model. It MUST distinguish a split parent from each split child and MUST return a structured not-found error when the exact ID is absent.

#### Scenario: Ordinary transaction lookup
- **WHEN** a caller supplies the ID of an existing ordinary, manual, imported, transfer, or starting-balance transaction
- **THEN** the tool returns that exact transaction without requiring an account ID or date

#### Scenario: Split child lookup
- **WHEN** a caller supplies the ID of a split child
- **THEN** the returned transaction has the child ID and is not silently replaced by its parent or sibling

#### Scenario: Split parent lookup
- **WHEN** a caller supplies the ID of a split parent
- **THEN** the returned parent may include its canonical nested `subtransactions` without changing the requested identity

#### Scenario: Unknown transaction
- **WHEN** no transaction has the supplied ID
- **THEN** the tool returns a sanitized non-retryable `NOT_FOUND` error

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

### Requirement: Transaction search filter semantics
The search SHALL preserve Actual signed integer amounts and SHALL compare negative and positive amounts mathematically without absolute-value conversion. `importSource` SHALL accept only `any`, `manual`, or `imported`; manual transactions SHALL be those without a meaningful `imported_id`, and imported transactions SHALL have a meaningful `imported_id`. `uncategorizedOnly` SHALL exclude transfer transactions and split parents as well as require an absent category, and it MUST be rejected when non-empty category IDs are also supplied.

#### Scenario: Signed expense range
- **WHEN** a caller searches from `-50000` through `-10000`
- **THEN** the system compares the stored signed amounts directly and does not reinterpret them as positive spending magnitudes

#### Scenario: Manual and imported filters
- **WHEN** `importSource` is `manual` or `imported`
- **THEN** null, absent, and empty imported identifiers are handled according to the installed runtime behavior without inventing sentinel values

#### Scenario: Uncategorized-only search
- **WHEN** `uncategorizedOnly` is true
- **THEN** ordinary uncategorized transactions are returned while transfers and split parents are not mislabeled as uncategorized

#### Scenario: Incompatible category inputs
- **WHEN** `uncategorizedOnly` is true and category IDs are non-empty
- **THEN** the call is rejected as an incompatible input combination

### Requirement: Literal text search
Optional search text SHALL perform a bounded, case-insensitive, diacritic-normalized literal substring search over payee name, imported payee, and notes where supported by the installed query engine. The system MUST escape query wildcard characters, MUST treat null text fields safely, and MUST NOT interpret caller text as a regular expression or arbitrary expression.

#### Scenario: Literal wildcard characters
- **WHEN** search text contains `%`, `?`, or a backslash
- **THEN** those characters are matched literally rather than expanding the caller's search authority

#### Scenario: Null searchable fields
- **WHEN** one or more searchable fields are null or absent
- **THEN** the query remains valid and matches only the non-null fields containing the literal substring

### Requirement: Deterministic split-aware pagination and totals
Search SHALL support only `inline` and `grouped` split modes. The default SHALL be `inline`. Inline results SHALL omit split parents and return ordinary transactions and matching split children as independently countable items. Grouped results SHALL return each matching ordinary transaction or split group once with nested subtransactions. Sorting SHALL accept only documented enums, default to date descending, and use transaction ID as a deterministic tie-breaker. Page metadata SHALL include limit, offset, and returned count. When `includeTotals` is true, exact matched count and signed amount SHALL be returned for inline mode; grouped totals MUST be reported as unsupported or omitted rather than using a unit that disagrees with grouped items.

#### Scenario: Stable pagination
- **WHEN** the same search is executed twice without intervening mutation
- **THEN** identical limit and offset values return the same transaction IDs in the same order

#### Scenario: Inline totals
- **WHEN** `includeTotals` is true with inline mode
- **THEN** total matched and total amount use the same leaf-item semantics as the inline result and do not double-count a split parent

#### Scenario: Grouped filter match
- **WHEN** a child satisfies a grouped search filter
- **THEN** the containing split group is returned once with nested children and unmatched members remain distinguishable if the installed result exposes that state

#### Scenario: Grouped totals requested
- **WHEN** `includeTotals` is true with grouped mode
- **THEN** the result explicitly indicates that totals are unsupported or omits them without fabricating a count or sum

### Requirement: Heterogeneous bulk transaction preflight
The system SHALL expose `actual_bulk_update_transactions` with one to 100 unique transaction updates. Each item SHALL contain a transaction ID and a non-empty desired-state subset of `category`, `payee`, `notes`, and `cleared`, with explicit null distinct from omission where the installed SDK proves clearing is supported. Before any write, the system MUST validate the complete request, load every exact transaction, validate referenced categories and payees, identify unchanged items, analyze transfer and split state, and calculate bounded canonical before/after projections.

#### Scenario: Different updates per item
- **WHEN** a valid request gives different allowlisted desired states to different transaction IDs
- **THEN** preflight evaluates each item independently and returns a combined auditable plan

#### Scenario: Duplicate or missing transaction
- **WHEN** transaction IDs repeat or any requested ID is absent
- **THEN** preflight fails before every mutation and synchronization attempt

#### Scenario: Invalid reference
- **WHEN** any supplied non-null category or payee ID does not exist
- **THEN** the complete operation is refused before any item is updated

#### Scenario: Idempotent desired state
- **WHEN** every requested field already equals its desired state
- **THEN** the result reports zero effective changes and performs no mutation or synchronization

### Requirement: Conservative bulk transfer and split protection
Bulk updates MUST NOT reconstruct, reconcile, or partially rewrite splits or transfers. Every split parent and split child SHALL be blocked in v0.5.0. For transfer transactions, only `cleared` SHALL be permitted; category, payee, and notes changes SHALL be blocked because they can be incompatible or affect related state. Protected items SHALL report stable `SPLIT_TRANSACTION_PROTECTED` or `TRANSFER_PROTECTED` reasons.

#### Scenario: Split update requested
- **WHEN** any bulk item targets a split parent or child
- **THEN** the item is blocked with `SPLIT_TRANSACTION_PROTECTED` and a write-mode call changes nothing

#### Scenario: Transfer cleared update
- **WHEN** a transfer item changes only its independent cleared state
- **THEN** preflight may permit that desired-state update after exact read verification

#### Scenario: Transfer relational field update
- **WHEN** a transfer item attempts to change category, payee, or notes
- **THEN** the item is blocked with `TRANSFER_PROTECTED` and a write-mode call changes nothing

### Requirement: Bulk dry-run and confirmed execution
Bulk update SHALL default `dryRun` to true. Dry-run MUST perform no mutation or synchronization and SHALL return requested, matched, would-update, unchanged, blocked, and per-item before/after/status information. Execution SHALL require both `dryRun: false` and `confirmWrite: true`; it SHALL write nothing if any preflight item is blocked or invalid, apply effective updates serially within one operation, synchronize once after local updates, read back every requested transaction, and verify the final desired states.

#### Scenario: Default dry-run
- **WHEN** the caller omits `dryRun`
- **THEN** complete preview information is returned and no transaction changes

#### Scenario: Missing write confirmation
- **WHEN** `dryRun` is false and `confirmWrite` is not true
- **THEN** the operation returns a structured confirmation error before any write

#### Scenario: Confirmed write
- **WHEN** preflight is fully executable and the caller supplies `dryRun: false` and `confirmWrite: true`
- **THEN** effective updates run serially, one final synchronization occurs, read-back verifies the desired states, and the response reports updated and unchanged IDs

#### Scenario: Repeated desired-state write
- **WHEN** a successful bulk request is repeated unchanged
- **THEN** the second call reports all items unchanged with zero effective mutations

### Requirement: Recoverable bulk partial failure
Bulk execution SHALL NOT claim ACID behavior or automatic rollback. If a later local update, synchronization, or verification fails, the system MUST report requested IDs, locally completed IDs, pending IDs, the phase that failed, whether state may be partial, and safe synchronization/read recovery guidance. It MUST NOT automatically retry or instruct the caller to replay the complete bulk request.

#### Scenario: Local update fails after earlier updates
- **WHEN** an item fails after prior items changed locally
- **THEN** the error identifies completed and pending IDs, marks partial state, and directs the caller to synchronize and read affected IDs before deciding on recovery

#### Scenario: Post-sync verification fails
- **WHEN** local updates and synchronization complete but read-back is inconclusive
- **THEN** the error reports `synchronized_but_unverified` without replaying any update

### Requirement: Official read-only import preview
The system SHALL expose `actual_preview_import` using the same import-item and installed-option normalization as `actual_import_transactions`, but it SHALL always invoke the official reconciliation pipeline in dry-run mode and SHALL expose no caller-controlled way to disable dry-run. The preview MUST NOT synchronize or persist transactions, payees, categories, rules, or other budget state.

#### Scenario: New and matching transaction preview
- **WHEN** valid import items are previewed
- **THEN** the result faithfully reports installed-SDK evidence for would-add, would-update, ignored, affected-existing, and error outcomes without inventing duplicate, skipped, or conflict classifications

#### Scenario: Preview cannot be made writable
- **WHEN** a caller supplies an unknown `dryRun` field or another unsupported option
- **THEN** strict validation rejects the call rather than changing preview behavior

#### Scenario: Preview purity
- **WHEN** a complete permanent-state fingerprint is captured before and after preview
- **THEN** accounts, transactions, payees, categories, and rules remain identical

#### Scenario: Preview rules
- **WHEN** an import item activates an official Actual rule during dry-run
- **THEN** the preview uses the official rule-enabled pipeline while exposing only rule effects evidenced by the installed return shape

### Requirement: Truthful preview identifiers and request binding
Identifiers generated for would-be additions during preview MUST NOT be presented as persisted transaction IDs. Existing IDs affected by reconciliation MAY be returned as existing transaction IDs. Preview SHALL return a deterministic SHA-256 request fingerprint computed from the normalized account ID, supported options, and transactions without credentials. Import SHALL optionally accept `expectedPreviewFingerprint`, recompute the same fingerprint, and reject a mismatch before mutation. Documentation MUST state that this binds request equality only and does not prove unchanged budget state.

#### Scenario: Would-add preview IDs
- **WHEN** the installed SDK returns generated IDs for dry-run additions
- **THEN** the MCP omits them or labels them explicitly as preview-only and never describes them as persisted IDs

#### Scenario: Matching preview fingerprint
- **WHEN** import receives a fingerprint for the identical normalized request and options
- **THEN** fingerprint validation passes and normal import preflight continues

#### Scenario: Mismatched preview fingerprint
- **WHEN** import receives a fingerprint that differs from the normalized request
- **THEN** it returns `PREVIEW_FINGERPRINT_MISMATCH` before calling the official import mutation
