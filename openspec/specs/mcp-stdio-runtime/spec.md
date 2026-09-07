# mcp-stdio-runtime Specification

## Purpose

Define a protocol-safe MCP stdio surface with discoverable tools, validated inputs, structured outputs, behavioral annotations, and consistently sanitized diagnostics.
## Requirements
### Requirement: MCP tool surface
The server SHALL register exactly the 62 tools captured by the immutable 0.7.0 compatibility baseline and SHALL advertise MCP version `1.0.0`. Every tool SHALL have a nonempty English title and description, one strict input schema, one output schema, and annotations derived from its authoritative capability definition. The server MUST NOT add, remove, merge, rename, or alias a tool during this consolidation release. It MUST NOT register raw ActualQL, raw schedule conditions, manual schedule posting, external cron, alert or notification engines, generic CRUD/query tools, internal handlers, or aliases added only to satisfy inventory counts.

#### Scenario: Client lists v1.0.0 tools
- **WHEN** a compatible MCP client requests the final tool list
- **THEN** exactly the 62 baseline names appear once with complete schemas, descriptions, and matching annotations regardless of list order

#### Scenario: Client lists v0.7.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 62 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: Client lists v0.6.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 53 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: Existing v0.7.0 client
- **WHEN** a client invokes any baseline tool with a request valid in 0.7.0
- **THEN** the request and compatible response remain supported under default 1.0.0 operational modes unless it exceeds one of the reviewed safety ceilings for an array that was unbounded in v0.7.0

#### Scenario: No unsupported or artificial aliases
- **WHEN** the 1.0.0 tool surface is inspected
- **THEN** it contains no raw query, raw recurrence, manual posting, internal API, generic CRUD/query, or artificial inventory alias

### Requirement: Standard stdio transport
The server SHALL communicate with clients through MCP stdio. Stdout MUST contain only protocol frames, while application and SDK diagnostics MUST be written to stderr.

#### Scenario: Server starts
- **WHEN** the server process starts under an MCP client
- **THEN** startup diagnostics appear only on stderr and stdout remains protocol-valid

#### Scenario: Tool emits diagnostic logging
- **WHEN** a tool logs progress or an error
- **THEN** no diagnostic text is written outside the MCP protocol on stdout

### Requirement: Strict input validation
Every tool input SHALL be validated by a strict Zod schema before the handler performs an Actual operation. Unknown fields SHALL be rejected, strings SHALL be bounded and non-empty where required, and date and amount rules SHALL be enforced by the advertised schema or its validation refinements.

#### Scenario: Invalid tool arguments
- **WHEN** a client supplies malformed, missing, or unknown arguments
- **THEN** the call returns an MCP-visible input error and the Actual adapter is not invoked

### Requirement: Structured and compatible results
Every successful tool SHALL return machine-readable structured content conforming to a declared output schema and SHALL also provide a text content representation for clients that do not consume structured content.

#### Scenario: Structured-capable client
- **WHEN** a client calls a successful tool and reads structured content
- **THEN** the returned object validates against the tool's declared output schema

#### Scenario: Text-only client
- **WHEN** a client consumes only text content
- **THEN** it receives a valid JSON representation of the same public result without secret fields

### Requirement: English MCP-authored content
The server SHALL provide all tool titles, tool descriptions, schema descriptions, response labels, status messages, validation messages, and public error messages in English. Values read from or written to user-owned Actual fields SHALL remain verbatim and MUST NOT be translated by the MCP server.

#### Scenario: Server-authored response and error text
- **WHEN** a tool returns a success response, validation failure, or operational error
- **THEN** every server-authored label and message is in English

#### Scenario: User-authored Actual data
- **WHEN** a returned account, payee, category, or transaction contains text stored by the user in a language other than English
- **THEN** the stored value is returned verbatim without translation or reinterpretation

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

### Requirement: Credential redaction
The server MUST redact the configured Actual password and common secret-bearing patterns from logs, errors, health data, and tool results. The system MUST NOT log complete environment objects.

#### Scenario: Error contains configured password
- **WHEN** an upstream error message unexpectedly contains the configured password
- **THEN** every client-facing result and stderr log replaces that value with a redaction marker

#### Scenario: Health response
- **WHEN** `actual_health` returns its status
- **THEN** the result contains no password, token, environment dump, or URL user-info credentials

### Requirement: Client independence
The MCP server SHALL remain independent of Alfred and Hermes-specific runtime APIs. Hermes-specific material SHALL be limited to deployment documentation and configuration examples.

#### Scenario: Non-Hermes MCP client
- **WHEN** another standards-compatible MCP client launches the process over stdio
- **THEN** it can discover and invoke the V1 tools without Alfred or Hermes libraries

### Requirement: Preserve v0.1.0 public contracts
The ten v0.1.0 tools MUST retain their names and compatible input and output contracts. In particular, `actual_list_categories` SHALL continue to return `categoryGroups` containing `groupId`, `groupName`, and nested categories with `id`, `name`, and `hidden`; richer internal models and new mutation outputs MUST NOT alter that established shape.

#### Scenario: Existing category-list consumer
- **WHEN** a v0.1.0 client validates a v0.2.0 `actual_list_categories` result against the existing schema
- **THEN** the result remains valid without accepting new or renamed fields

#### Scenario: Existing tool invocation
- **WHEN** a client invokes any of the ten existing tools with a previously valid request
- **THEN** the request and compatible response remain supported in v0.2.0

### Requirement: Preserve v0.2.0 public contracts
All 24 v0.2.0 tools MUST retain their names and compatible strict input and output contracts. In particular, `actual_list_payees` SHALL continue to return items containing exactly `id` and `name`, and existing account, category, transaction, health, synchronization, and structural-administration results MUST remain valid for previous consumers.

#### Scenario: Existing payee-list consumer
- **WHEN** a v0.2.0 client validates a v0.3.0 `actual_list_payees` response
- **THEN** the response remains valid without accepting transfer or administration fields

#### Scenario: Existing tool invocation
- **WHEN** a client invokes any of the 24 v0.2.0 tools with a previously valid request
- **THEN** the request and compatible response remain supported in v0.3.0

### Requirement: Preserve v0.3.0 public contracts
All 34 v0.3.0 tools MUST retain their names, required inputs, strictness, behavioral annotations, and compatible output contracts. New budget types or error metadata MUST NOT add fields to established strict outputs.

#### Scenario: Existing v0.3.0 client
- **WHEN** a client invokes any v0.3.0 tool with a previously valid request and validates the response against its existing schema
- **THEN** the invocation and compatible response remain supported in v0.4.0

#### Scenario: Existing payee and rule consumers
- **WHEN** clients use the v0.3.0 payee or rule tools
- **THEN** their established list, detail, authoring, mutation, and error contracts remain unchanged

### Requirement: Preserve v0.4.0 public contracts
All 42 v0.4.0 tools MUST retain their names, previously required inputs, strictness, behavioral annotations, wrapper shapes, and compatible required output fields. Additive optional transaction fields, import options, and import metadata MUST NOT invalidate a previously valid v0.4.0 request or remove the established `actual_get_transactions.transactions` and `actual_import_transactions` `added`, `updated`, and `errors` fields.

#### Scenario: Existing v0.4.0 transaction reader
- **WHEN** a v0.4.0 client invokes `actual_get_transactions` and consumes its established wrapper and fields
- **THEN** the invocation remains valid and the required prior fields retain their names and meanings in v0.5.0

#### Scenario: Existing v0.4.0 importer
- **WHEN** a v0.4.0 client invokes `actual_import_transactions` without new options
- **THEN** the request remains valid and the response still contains compatible `added`, `updated`, and `errors` fields

#### Scenario: Existing non-transaction tool
- **WHEN** a client invokes any other v0.4.0 tool with a previously valid request
- **THEN** its request, result, annotation, and error contracts remain compatible in v0.5.0

### Requirement: Budget operation errors remain structured
Budget validation, unsupported-mode, incompatible-category, unavailable-month, overwrite-confirmation, result-size, partial-copy, synchronization, and verification failures SHALL use stable sanitized tool errors. Safe details MAY include month identifiers, category IDs, copy counts, and recovery instructions but MUST NOT include credentials or raw SDK internals.

#### Scenario: Unsupported tracking hold
- **WHEN** a hold operation targets a tracking budget
- **THEN** the caller receives a stable non-retryable mode error and the MCP process remains operational

#### Scenario: Copy partial state
- **WHEN** copy fails after local changes may have occurred
- **THEN** the structured error identifies potential partial state and safe recovery actions without instructing the caller to replay the mutation

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

### Requirement: Complete capability-policy enforcement
Every registered tool SHALL belong to exactly one authoritative capability class: read, write, or destructive. Read-only annotations SHALL be true only for read tools; destructive annotations SHALL be true only for destructive tools; and idempotency annotations SHALL match reviewed operation semantics. `ACTUAL_MCP_READ_ONLY=true` MUST reject all 35 mutation-capable baseline tools, including synchronization and tools whose default call is a dry-run, before their runtime handler can execute. `ACTUAL_MCP_ALLOW_DESTRUCTIVE=false` MUST reject all nine destructive baseline tools before confirmation or domain preflight can mutate state.

#### Scenario: Exhaustive read-only matrix
- **WHEN** a generated safe harness invokes every mutation-capable tool under read-only mode
- **THEN** every call returns `READ_ONLY_MODE`, no runtime mutation handler is called, and controlled state remains unchanged

#### Scenario: Exhaustive destructive-disabled matrix
- **WHEN** a generated safe harness invokes every destructive tool with an otherwise valid confirmed request while destructive operations are disabled
- **THEN** every call returns `DESTRUCTIVE_OPERATIONS_DISABLED`, no destructive handler is called, and controlled state remains unchanged

#### Scenario: Read remains available in safe modes
- **WHEN** either operational guard is enabled
- **THEN** all read-only domains remain discoverable and representative valid reads continue to work

### Requirement: Explicit per-call destructive consent
Every delete and payee merge SHALL require `confirmDestructive: true` for each call and SHALL return the stable destructive-confirmation error when consent is absent or false without invoking the mutation. Budget copy SHALL remain conservatively destructive because it can overwrite planning state; execution SHALL require `dryRun: false`, and an overwrite SHALL additionally require `confirmOverwrite: true`. Runtime permission alone MUST NOT constitute per-call consent.

#### Scenario: Delete without confirmation
- **WHEN** any delete or payee merge is invoked without literal per-call confirmation
- **THEN** it returns `DESTRUCTIVE_CONFIRMATION_REQUIRED` and performs no mutation

#### Scenario: Fill-empty budget copy
- **WHEN** a caller explicitly executes a fill-empty budget copy with `dryRun: false`
- **THEN** execution may proceed without `confirmOverwrite` only when preflight proves no populated target value will be overwritten

#### Scenario: Overwrite budget copy
- **WHEN** copy preflight finds an overwrite and `confirmOverwrite` is not true
- **THEN** execution is refused before the first budget mutation

### Requirement: Global input and output contract audit
All 62 tools SHALL reject unknown input fields and SHALL use typed, bounded inputs for identifiers, dates, months, signed integer minor-unit amounts, enums, arrays, pagination, confirmations, and dry-run options. No mutation input SHALL accept `any`, `unknown`, arbitrary records, raw query objects, raw ActualQL, or raw SQLite instructions. Every success result SHALL validate against its advertised output schema, and text content SHALL be valid JSON deeply equivalent to structured content. Read projections that preserve bounded installed rule values MAY use explicitly documented unknown value slots only when callers cannot use them for mutation.

#### Scenario: Unknown mutation field
- **WHEN** a client supplies an unrecognized field to any mutation tool
- **THEN** the request is rejected before the runtime or Actual adapter is invoked

#### Scenario: Output conformance
- **WHEN** any tool succeeds in unit, integration, or compiled stdio acceptance
- **THEN** its structured and textual results both validate against the same advertised public schema and are deeply equivalent

### Requirement: Protocol resilience after errors
The compiled stdio process SHALL remain protocol-valid and responsive after validation, missing-entity, invalid-range, invalid-amount, missing-confirmation, read-only, destructive-disabled, recurrence, transfer, budget, connection, and sanitized internal errors. Stdout MUST contain only MCP protocol traffic throughout the process lifetime.

#### Scenario: Sequential failure recovery
- **WHEN** the E2E client invokes the required sequence of invalid and policy-blocked calls
- **THEN** each call returns a protocol-valid error and a following `actual_health` call succeeds without restarting the process

#### Scenario: Accidental stdout logging
- **WHEN** compiled E2E monitors stdout framing while tools and SDK code emit diagnostics
- **THEN** any non-protocol stdout noise fails the acceptance test

### Requirement: Discovery before Actual initialization
Tool discovery SHALL remain available without valid Actual credentials or server connectivity. Startup and first-use failures for missing environment, invalid URL, wrong password, invalid sync ID, cache lock, decryption failure, and unavailable Actual Server SHALL be sanitized, identify only safe corrective context, and MUST NOT terminate a protocol-capable process when lazy initialization permits continued discovery.

#### Scenario: Missing configuration discovery
- **WHEN** an MCP client starts the server without complete Actual configuration and requests the tool list
- **THEN** it can discover all 62 tools and receives a sanitized configuration error only when an Actual-dependent operation is invoked

#### Scenario: Failed initialization remains private
- **WHEN** initialization fails with a credential-bearing or path-bearing upstream error
- **THEN** the MCP result and stderr omit credentials, sync IDs, private paths, and raw stacks
