## MODIFIED Requirements

### Requirement: MCP tool surface
The server SHALL register exactly 34 tools at startup: all 24 v0.2.0 tools; five new payee tools `actual_get_payee`, `actual_create_payee`, `actual_update_payee`, `actual_delete_payee`, and `actual_merge_payees`; and five rule tools `actual_list_rules`, `actual_get_rule`, `actual_create_rule`, `actual_update_rule`, and `actual_delete_rule`. The server MUST NOT register `actual_run_rules`, `actual_preview_rule`, a generic CRUD tool, or an alias for any named operation.

#### Scenario: Client lists v0.3.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 34 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: No unsupported or artificial aliases
- **WHEN** the v0.3.0 tool surface is inspected
- **THEN** it contains no manual rule-run tool, rule-preview tool, reorder tool, generic CRUD tool, internal API tool, or alias beyond the named set

### Requirement: Tool behavioral annotations
Read-only tools SHALL declare a read-only hint. `actual_create_payee` SHALL declare mutating, non-destructive, idempotent behavior because an exact existing name is a no-op; other entity create operations, including `actual_create_rule`, SHALL remain non-idempotent. Desired-state updates SHALL declare mutating, non-destructive, idempotent behavior. Account close/reopen, category move/visibility, and explicit sync SHALL retain their current idempotency annotations. Transaction, account, category-group, category, payee, and rule deletions plus payee merge SHALL declare mutating, destructive, non-idempotent behavior. Annotations MUST accurately reflect retry semantics but SHALL NOT replace server-side validation, preflight, or destructive confirmation.

#### Scenario: Tool metadata inspection
- **WHEN** a client inspects the tool list
- **THEN** read, write, idempotent, and destructive hints match the documented behavior of each of the 34 tools

### Requirement: Consistent tool-level errors
Operational failures SHALL be returned as MCP tool errors rather than malformed protocol responses or uncaught output. Errors SHALL preserve the existing public envelope with stable code, sanitized English message, operation name, and retryability, and MAY add safe `details`, `recoveryAction`, entity context, or state. Entity context SHALL support account, category group, category, transaction, payee, and rule identities. Stable domain codes SHALL cover not-found, name conflict, invalid reference, unsupported entity or rule shape, protected Actual entity, destructive confirmation, in-use relationships, preflight failure, mutation failure, synchronization failure, and post-mutation verification failure as applicable. Raw SDK messages MUST NOT become the public contract.

#### Scenario: Connection failure before mutation
- **WHEN** an Actual operation fails because the server is unreachable
- **THEN** the caller receives a sanitized structured error with an accurate retryability value

#### Scenario: Deterministic domain refusal
- **WHEN** a destructive precondition, transfer-payee protection, rule-shape restriction, reference check, compatibility rule, or validation rule fails
- **THEN** the caller receives a stable domain code with `retryable: false` and safe details explaining the observed condition

#### Scenario: Partial mutation failure
- **WHEN** an error occurs after a local mutation, including a payee merge, may have taken effect
- **THEN** the error identifies potential partial state and instructs safe synchronization and read recovery without encouraging the complete mutation to be replayed

#### Scenario: Unexpected failure
- **WHEN** an unexpected exception occurs
- **THEN** the caller receives a generic sanitized internal error while the detailed sanitized diagnostic is written to stderr

## ADDED Requirements

### Requirement: Preserve v0.2.0 public contracts
All 24 v0.2.0 tools MUST retain their names and compatible strict input and output contracts. In particular, `actual_list_payees` SHALL continue to return items containing exactly `id` and `name`, and existing account, category, transaction, health, synchronization, and structural-administration results MUST remain valid for previous consumers.

#### Scenario: Existing payee-list consumer
- **WHEN** a v0.2.0 client validates a v0.3.0 `actual_list_payees` response
- **THEN** the response remains valid without accepting transfer or administration fields

#### Scenario: Existing tool invocation
- **WHEN** a client invokes any of the 24 v0.2.0 tools with a previously valid request
- **THEN** the request and compatible response remain supported in v0.3.0
