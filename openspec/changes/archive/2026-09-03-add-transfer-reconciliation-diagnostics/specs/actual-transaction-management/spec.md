## ADDED Requirements

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
