## MODIFIED Requirements

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
