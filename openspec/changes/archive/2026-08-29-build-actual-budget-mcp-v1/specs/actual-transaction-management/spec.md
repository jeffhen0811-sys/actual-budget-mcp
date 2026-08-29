## Purpose

Define safe MCP write operations for idempotent transaction import, allowlisted transaction updates, and explicitly confirmed destructive deletion followed by synchronization.

## ADDED Requirements

### Requirement: Import transactions
The system SHALL expose `actual_import_transactions` with an opaque `accountId` and a non-empty array of at most 500 transactions. Each transaction SHALL require valid `date`, integer `amount`, and non-empty `imported_id`, and MAY include `payee_name`, `imported_payee`, `notes`, `cleared`, and opaque `category`. The system SHALL use the official import API rather than raw insertion.

#### Scenario: Valid import
- **WHEN** the tool receives one or more valid transactions
- **THEN** it imports them through the official reconciliation API and returns the `added`, `updated`, and sanitized `errors` outcomes

#### Scenario: Invalid amount
- **WHEN** a transaction amount is not an integer in Actual's amount representation
- **THEN** validation rejects the complete request before any transaction is imported

#### Scenario: Batch exceeds limit
- **WHEN** the request contains more than 500 transactions
- **THEN** validation rejects the complete request and reports the maximum batch size

### Requirement: Idempotent imported identifiers
Every imported transaction SHALL carry a stable `imported_id`. The system SHALL configure reconciliation so an `imported_id` is not added more than once and a previously deleted imported transaction is not recreated automatically.

#### Scenario: Repeated import
- **WHEN** the same transaction with the same `imported_id` is imported more than once
- **THEN** the budget contains no duplicate transaction for that identifier

#### Scenario: Previously deleted import
- **WHEN** a transaction with an `imported_id` was imported and then deleted
- **THEN** importing that same identifier again does not recreate it under the V1 default policy

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
