## MODIFIED Requirements

### Requirement: MCP tool surface
The server SHALL register exactly 62 tools at startup: all 53 v0.6.0 tools plus `actual_list_schedules`, `actual_get_schedule`, `actual_create_schedule`, `actual_update_schedule`, `actual_delete_schedule`, `actual_get_month_summary`, `actual_get_spending_summary`, `actual_get_income_summary`, and `actual_get_runtime_status`. Existing tools SHALL be enhanced only through backwards-compatible optional metadata where this change explicitly permits it. The server MUST NOT register raw ActualQL, raw schedule conditions, manual schedule posting, external cron, alert or notification engines, generic CRUD/query tools, internal handlers, or aliases added only to satisfy inventory counts.

#### Scenario: Client lists v0.7.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 62 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: Client lists v0.6.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 53 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: No unsupported or artificial aliases
- **WHEN** the v0.7.0 tool surface is inspected
- **THEN** it contains no raw query, raw recurrence, manual posting, internal API, generic CRUD/query, or artificial inventory alias

### Requirement: Tool behavioral annotations
All read tools, including schedule list/detail, the three financial summaries, runtime status, health, and existing diagnostic and preview reads, SHALL declare read-only, non-destructive, idempotent behavior. Schedule creation and update SHALL declare mutation-capable, non-destructive behavior; schedule creation SHALL be non-idempotent and schedule update SHALL use the conservative idempotency indicated by its verified desired-state contract. Schedule deletion and every existing destructive tool SHALL declare mutation-capable and destructive behavior. The authoritative tool capability registry SHALL derive these annotations and runtime guards together. Annotations MUST NOT replace input validation, centralized operational policy, preflight, protection, synchronization, read-back, or per-call confirmation.

#### Scenario: v0.7.0 tool metadata inspection
- **WHEN** a client inspects the 62-tool list
- **THEN** all read, write, and destructive hints match the authoritative capability registry and documented retry semantics

#### Scenario: v0.6.0 tool metadata inspection
- **WHEN** a client inspects the 53-tool list
- **THEN** lookup, search, preview, bulk, transfer, diagnostics, reconciliation, and existing tool hints match their documented behavior and retry semantics

#### Scenario: Guard and annotation consistency
- **WHEN** the tool registry is tested
- **THEN** no tool's annotation can classify it as read-only while the runtime policy classifies it as write or destructive

#### Scenario: Bulk dry-run metadata
- **WHEN** a client inspects or invokes bulk update in dry-run mode
- **THEN** the static annotation remains conservatively mutation-capable while the result clearly reports that no write occurred

#### Scenario: Transfer creation metadata
- **WHEN** a client inspects or invokes transfer creation in dry-run mode
- **THEN** the static annotation remains mutation-capable and non-idempotent while the result clearly reports whether a write occurred

#### Scenario: Schedule deletion metadata
- **WHEN** a client inspects `actual_delete_schedule`
- **THEN** it is described and annotated as destructive and its schema still requires literal per-call confirmation

### Requirement: Consistent tool-level errors
Operational failures SHALL be returned as MCP tool errors rather than malformed protocol responses or uncaught output. Errors SHALL preserve the existing public envelope with stable code, sanitized English message, operation name, and retryability, and MAY add safe `details`, `recoveryAction`, entity context, or state. Entity context SHALL support account, category group, category, transaction, payee, rule, schedule, and budget-month identities. Stable domain codes SHALL include `READ_ONLY_MODE`, `DESTRUCTIVE_OPERATIONS_DISABLED`, `SCHEDULE_NOT_FOUND`, `INVALID_RECURRENCE`, `SCHEDULE_REFERENCE_INVALID`, and `INVALID_SUMMARY_RANGE` in addition to existing codes. Raw SDK messages MUST NOT become the public contract.

#### Scenario: Connection failure before mutation
- **WHEN** an Actual operation fails because the server is unreachable
- **THEN** the caller receives a sanitized structured error with an accurate retryability value

#### Scenario: Deterministic domain refusal
- **WHEN** an operational policy, destructive precondition, schedule validation, reference check, summary-range rule, compatibility rule, or other validation rule fails
- **THEN** the caller receives a stable domain code with `retryable: false` and safe details explaining the observed condition

#### Scenario: Partial mutation failure
- **WHEN** an error occurs after a local mutation may have taken effect
- **THEN** the error identifies potential partial state and instructs safe synchronization and read recovery without encouraging the complete mutation to be replayed

#### Scenario: Unexpected failure
- **WHEN** an unexpected exception occurs
- **THEN** the caller receives a generic sanitized internal error while the detailed sanitized diagnostic is written to stderr

## ADDED Requirements

### Requirement: Preserve v0.6.0 public contracts
All 53 v0.6.0 tools MUST retain their names, previously required inputs, strictness, behavioral annotations, wrapper shapes, and compatible required output fields. `actual_health` and `actual_sync` MAY add only the optional metadata defined by this change. Operational policy errors MAY prevent a previously valid mutation only when the operator explicitly enables read-only mode or disables destructive operations; default configuration SHALL preserve prior authorization behavior.

#### Scenario: Existing v0.6.0 client under default modes
- **WHEN** a client invokes any v0.6.0 tool with a previously valid request and default operational modes
- **THEN** the request, required response fields, annotations, and existing safety behavior remain compatible in v0.7.0

#### Scenario: Optional health and sync metadata
- **WHEN** a v0.6.0 client ignores fields newly added to health or sync
- **THEN** it can continue consuming every previously required field unchanged

### Requirement: New tool schema strictness
Every schedule, financial-summary, and runtime-status tool SHALL have a strict Zod input and output schema. Unknown fields, raw recurrence data, unsafe amounts, invalid dates, unsupported references, unbounded limits, and inconsistent discriminated variants SHALL fail validation before any Actual-dependent operation.

#### Scenario: Invalid new-tool input
- **WHEN** a client supplies an unknown or malformed field to a v0.7.0 tool
- **THEN** the MCP returns a protocol-valid input error and performs no Actual operation
