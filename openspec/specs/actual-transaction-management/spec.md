# actual-transaction-management Specification

## Purpose

Define safe MCP write operations for idempotent transaction import, allowlisted transaction updates, and explicitly confirmed destructive deletion followed by synchronization.

## Requirements

### Requirement: Import transactions
The system SHALL preserve `actual_import_transactions` with an opaque `accountId` and a non-empty array of at most 500 transactions. Each transaction SHALL require valid `date`, integer `amount`, and non-empty `imported_id`, and MAY include `payee_name`, `imported_payee`, `notes`, `cleared`, and opaque `category`. The tool MAY add optional `defaultCleared`, `reimportDeleted`, and `expectedPreviewFingerprint` inputs, but MUST NOT require or rename any v0.4.0 input. It SHALL use the official import API rather than raw insertion and SHALL preserve the required `added`, `updated`, and sanitized `errors` result fields while MAY add exact audit counts and request fingerprint metadata.

#### Scenario: Existing v0.4.0 import request
- **WHEN** a caller submits an import request valid in v0.4.0 without new options
- **THEN** it remains valid, uses compatible defaults, and returns the established `added`, `updated`, and `errors` fields

#### Scenario: Installed import options
- **WHEN** a caller supplies `defaultCleared` or `reimportDeleted`
- **THEN** the values are passed through the shared normalized official import path and their observed behavior is represented without unsupported options

#### Scenario: Unsupported normalization option
- **WHEN** a caller supplies `payeeNameNormalization` or another field absent from the pinned installed contract
- **THEN** strict validation rejects the request before import rather than emulating or forwarding unsupported behavior

#### Scenario: Valid import
- **WHEN** the tool receives one or more valid transactions and any fingerprint matches
- **THEN** it imports them through the official reconciliation API, synchronizes once, and returns the official outcomes with only mathematically exact optional metadata

#### Scenario: Invalid amount
- **WHEN** a transaction amount is not an integer in Actual's amount representation
- **THEN** validation rejects the complete request before any transaction is imported

#### Scenario: Batch exceeds limit
- **WHEN** the request contains more than 500 transactions
- **THEN** validation rejects the complete request and reports the maximum batch size

### Requirement: Idempotent imported identifiers
Every imported transaction SHALL carry a stable `imported_id`. With options omitted, the system SHALL preserve the v0.4.0 policy of `reimportDeleted: false`, so an `imported_id` is not added more than once and a previously deleted imported transaction is not recreated automatically. A caller MAY explicitly request `reimportDeleted: true`, in which case only the installed official reconciliation behavior SHALL determine whether deleted items are recreated.

#### Scenario: Repeated import
- **WHEN** the same transaction with the same `imported_id` is imported more than once
- **THEN** the budget contains no duplicate transaction for that identifier

#### Scenario: Previously deleted import under compatible default
- **WHEN** a transaction with an `imported_id` was imported and then deleted and no new option is supplied
- **THEN** importing that same identifier again does not recreate it under the v0.4.0-compatible default policy

#### Scenario: Explicit reimport deleted
- **WHEN** a caller explicitly supplies `reimportDeleted: true`
- **THEN** the MCP passes that supported option to the installed official pipeline and reports the observed official result without custom reconciliation

#### Scenario: Future Pluggy identifier
- **WHEN** a caller supplies an identifier such as `pluggy:abc123`
- **THEN** the value is treated as an opaque stable identifier without invoking any Pluggy-specific logic

### Requirement: Update allowlisted fields
The system SHALL expose `actual_update_transaction` with a non-empty opaque `transactionId` and at least one update field. The only permitted fields SHALL be `category`, `payee`, `notes`, `cleared`, `date`, and integer `amount`.

#### Scenario: Valid partial update
- **WHEN** the request contains one or more permitted fields with valid values
- **THEN** only those fields are sent to the official update API and the change is synchronized

#### Scenario: Empty update
- **WHEN** no update field is supplied
- **THEN** validation rejects the request before any Actual operation executes

#### Scenario: Unknown update field
- **WHEN** the request contains a field outside the allowlist
- **THEN** strict input validation rejects the request

### Requirement: Protected transaction deletion
The system SHALL expose `actual_delete_transaction` as a destructive operation. Its input SHALL require both an opaque `transactionId` and `confirmDestructive: true`. The MCP tool description MUST contain `DESTRUCTIVE OPERATION`, and its MCP metadata SHALL mark it destructive.

#### Scenario: Confirmed deletion
- **WHEN** a caller supplies a transaction ID and `confirmDestructive: true`
- **THEN** the official delete API is invoked once and the deletion is synchronized before success is returned

#### Scenario: Missing confirmation
- **WHEN** `confirmDestructive` is absent or false
- **THEN** validation rejects the call without deleting any transaction

### Requirement: Transfer-aware import payees
`actual_import_transactions` SHALL add an optional opaque `payee` ID to each import item while preserving every existing input, default, request fingerprint rule, and required output field. A supplied payee MUST resolve exactly before mutation. When it is an official transfer payee, the installed reconciliation pipeline SHALL create the reciprocal transfer through its public behavior. The supported payee ID SHALL take precedence over optional `payee_name` exactly as established by the pinned SDK, and callers MUST NOT supply `transfer_id`.

#### Scenario: Import with ordinary payee
- **WHEN** an item supplies an existing non-transfer payee ID
- **THEN** the official import pipeline receives that exact payee while all established import behavior remains compatible

#### Scenario: Import with transfer payee
- **WHEN** an item supplies an existing transfer payee ID and otherwise passes validation
- **THEN** the official import pipeline determines the reciprocal transfer outcome and the MCP reports only observed added or updated evidence

#### Scenario: Unknown payee
- **WHEN** any import item supplies a payee ID that does not resolve exactly
- **THEN** the entire request fails preflight before import or synchronization

### Requirement: Transfer-aware single update reporting
`actual_update_transaction` SHALL continue to permit only category, payee, notes, cleared, date, and integer amount updates. Before updating a transaction with a meaningful `transfer_id`, it SHALL load the exact counterpart and reject relational updates when the relationship is missing or inconsistent. The result MAY add `linkedTransferAffected`, `counterpartTransactionId`, and exact `mirroredFields` metadata without removing its established required fields. Direct relationship identifier mutation remains prohibited.

#### Scenario: Update mirrored transfer field
- **WHEN** a valid transfer side receives an allowed field change that the official SDK mirrors to its counterpart
- **THEN** synchronization and read-back verify both observed sides and the result identifies the exact counterpart and mirrored fields

#### Scenario: Update independent transfer field
- **WHEN** a valid transfer side receives an allowed change that Actual keeps independent per side
- **THEN** the result reports the requested side without falsely claiming that the counterpart changed

#### Scenario: Broken transfer relationship update
- **WHEN** a transaction has a missing or inconsistent counterpart and the requested update could affect the relationship
- **THEN** the tool fails before mutation with stable integrity evidence

### Requirement: Transfer-aware deletion impact
Before deleting a transaction with a meaningful `transfer_id`, `actual_delete_transaction` SHALL resolve and validate the observed pair. A confirmed deletion SHALL continue to invoke the official delete API once, and its additive result metadata SHALL list every exact affected transaction ID and indicate whether a transfer pair was deleted. Post-sync read-back SHALL verify absence of both observed sides before success is returned.

#### Scenario: Confirmed transfer deletion
- **WHEN** a caller confirms deletion of one side of a valid transfer pair
- **THEN** the official delete operation is called once and the result verifies and reports deletion of both exact transaction IDs

#### Scenario: Inconclusive transfer deletion
- **WHEN** counterpart discovery is inconsistent or post-sync absence cannot be verified
- **THEN** the tool reports the failed phase and possible partial state without falsely claiming that only one side or both sides were deleted

### Requirement: Unsupported transfer mutations remain unavailable
Existing transaction tools MUST NOT expose caller-controlled `transfer_id`, link two existing transactions, merge duplicate candidates, repair reciprocal relationships, or change reconciliation locks. Candidate and integrity outputs are evidence only.

#### Scenario: Caller supplies a relationship field
- **WHEN** an import, update, or bulk request includes `transfer_id`, `transferId`, a candidate key, or a link instruction
- **THEN** strict validation rejects the request before any Actual operation executes

### Requirement: No implicit financial intelligence
Transaction write tools SHALL apply only explicitly supplied fields and SHALL NOT categorize through an LLM, infer categories, execute Pluggy integration, schedule work, or perform financial recommendations.

#### Scenario: Category omitted
- **WHEN** an import or update omits category information
- **THEN** the MCP layer does not invent or infer a category

### Requirement: Mutation failure reporting
Write operations SHALL return structured tool-level errors with stable MCP-facing codes and sanitized messages. Raw stack traces, credentials, and internal database details MUST NOT be returned.

#### Scenario: Actual rejects a mutation
- **WHEN** the official Actual API rejects an import, update, or deletion
- **THEN** the tool returns an error result that identifies the failed operation without leaking secrets or raw internals
