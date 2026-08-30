## MODIFIED Requirements

### Requirement: MCP tool surface
The server SHALL register exactly 24 tools at startup: the ten v0.1.0 tools `actual_health`, `actual_list_accounts`, `actual_get_account`, `actual_list_categories`, `actual_list_payees`, `actual_get_transactions`, `actual_import_transactions`, `actual_update_transaction`, `actual_delete_transaction`, and `actual_sync`; five account tools `actual_create_account`, `actual_update_account`, `actual_close_account`, `actual_reopen_account`, and `actual_delete_account`; three category-group tools `actual_create_category_group`, `actual_update_category_group`, and `actual_delete_category_group`; and six category tools `actual_create_category`, `actual_update_category`, `actual_move_category`, `actual_hide_category`, `actual_unhide_category`, and `actual_delete_category`.

#### Scenario: Client lists v0.2.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 24 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: No additional administrative aliases
- **WHEN** the v0.2.0 tool surface is inspected
- **THEN** it contains no reorder tool, generic CRUD tool, internal API tool, or alias beyond the named set

### Requirement: Tool behavioral annotations
Read-only tools SHALL declare a read-only hint. Create operations SHALL declare mutating, non-destructive, non-idempotent behavior. Account and category desired-state update, close, reopen, move, hide, and unhide operations SHALL declare mutating, non-destructive, idempotent behavior. Structural deletion SHALL declare mutating, destructive, non-idempotent behavior. Sync SHALL remain non-destructive and idempotent. Annotations MUST accurately reflect retry semantics but SHALL NOT replace server-side validation, preflight, or destructive confirmation.

#### Scenario: Tool metadata inspection
- **WHEN** a client inspects the v0.2.0 tool list
- **THEN** read, write, idempotent, and destructive hints match each documented behavior

#### Scenario: Structural delete metadata
- **WHEN** a client inspects any account, category-group, or category delete tool
- **THEN** its description contains `DESTRUCTIVE OPERATION`, its annotation marks it destructive and non-idempotent, and its strict schema requires literal confirmation

#### Scenario: Safe account-close metadata
- **WHEN** a client inspects `actual_close_account`
- **THEN** it is non-destructive and idempotent because the server refuses the SDK path that would delete an empty account

### Requirement: Consistent tool-level errors
Operational failures SHALL be returned as MCP tool errors rather than malformed protocol responses or uncaught output. Errors SHALL preserve the v0.1.0 public envelope with stable code, sanitized English message, operation name, and retryability, and MAY add safe `details`, `recoveryAction`, entity context, or state. Structural errors SHALL use stable domain codes including `NOT_FOUND`, `NAME_CONFLICT`, `DESTRUCTIVE_CONFIRMATION_REQUIRED`, `ACCOUNT_NOT_EMPTY`, `CATEGORY_GROUP_NOT_EMPTY`, `CATEGORY_IN_USE`, `UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT`, `TRANSFER_ACCOUNT_REQUIRED`, `INCOMPATIBLE_CATEGORY_GROUP_TYPE`, `PREFLIGHT_INCONCLUSIVE`, `MUTATION_FAILED`, `MUTATION_SYNC_FAILED`, and `POST_MUTATION_READ_FAILED` as applicable. Raw SDK messages MUST NOT become the public contract.

#### Scenario: Connection failure before mutation
- **WHEN** an Actual read fails because the server is temporarily unreachable and retry is safe
- **THEN** the caller receives a sanitized structured error with an accurate retryability value

#### Scenario: Deterministic domain refusal
- **WHEN** a destructive precondition, compatibility rule, or validation rule fails
- **THEN** the caller receives a stable domain code with `retryable: false` and safe details explaining the observed condition

#### Scenario: Partial mutation failure
- **WHEN** an error occurs after a local mutation may have taken effect
- **THEN** the error instructs recovery without encouraging the complete mutation to be replayed

#### Scenario: Unexpected failure
- **WHEN** an unexpected exception occurs
- **THEN** the caller receives a generic sanitized internal error while the detailed sanitized diagnostic is written to stderr

## ADDED Requirements

### Requirement: Preserve v0.1.0 public contracts
The ten v0.1.0 tools MUST retain their names and compatible input and output contracts. In particular, `actual_list_categories` SHALL continue to return `categoryGroups` containing `groupId`, `groupName`, and nested categories with `id`, `name`, and `hidden`; richer internal models and new mutation outputs MUST NOT alter that established shape.

#### Scenario: Existing category-list consumer
- **WHEN** a v0.1.0 client validates a v0.2.0 `actual_list_categories` result against the existing schema
- **THEN** the result remains valid without accepting new or renamed fields

#### Scenario: Existing tool invocation
- **WHEN** a client invokes any of the ten existing tools with a previously valid request
- **THEN** the request and compatible response remain supported in v0.2.0
