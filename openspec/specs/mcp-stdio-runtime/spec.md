# mcp-stdio-runtime Specification

## Purpose

Define a protocol-safe MCP stdio surface with discoverable tools, validated inputs, structured outputs, behavioral annotations, and consistently sanitized diagnostics.

## Requirements

### Requirement: MCP tool surface
The server SHALL register exactly 42 tools at startup: all 34 v0.3.0 tools plus `actual_list_budget_months`, `actual_get_budget_month`, `actual_set_budget_amount`, `actual_set_budget_carryover`, `actual_hold_budget_for_next_month`, `actual_reset_budget_hold`, `actual_copy_budget_month`, and `actual_get_budget_summary`. The server MUST NOT register `actual_run_rules`, `actual_preview_rule`, a generic CRUD/query tool, a public ActualQL tool, or an alias for any named operation.

#### Scenario: Client lists v0.4.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 42 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: No unsupported or artificial aliases
- **WHEN** the v0.4.0 tool surface is inspected
- **THEN** it contains no manual rule-run tool, rule-preview tool, reorder tool, generic CRUD/query tool, internal API tool, public ActualQL tool, or alias beyond the named set

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
The three monthly budget read tools SHALL declare read-only, non-destructive, idempotent behavior. Category budget amount and carryover desired-state tools plus reset hold SHALL declare mutating, non-destructive, idempotent behavior. Hold-for-next-month SHALL declare mutating, non-destructive, non-idempotent behavior because its amount is incremental. Budget copy SHALL declare mutating behavior and a conservative destructive hint because confirmed overwrite can replace planning values, even though dry-run is the default; its execution SHALL be idempotent for unchanged source and target state. Existing v0.3.0 annotations SHALL remain compatible. Annotations MUST NOT replace validation, preflight, mode checks, or confirmation.

#### Scenario: Tool metadata inspection
- **WHEN** a client inspects the 42-tool list
- **THEN** read, write, idempotent, and destructive hints match each tool's documented behavior and retry semantics

#### Scenario: Dry-run copy metadata
- **WHEN** a client inspects or invokes budget copy in dry-run mode
- **THEN** the static tool annotation remains conservatively mutating/destructive while the result clearly reports that no write occurred

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

### Requirement: Budget operation errors remain structured
Budget validation, unsupported-mode, incompatible-category, unavailable-month, overwrite-confirmation, result-size, partial-copy, synchronization, and verification failures SHALL use stable sanitized tool errors. Safe details MAY include month identifiers, category IDs, copy counts, and recovery instructions but MUST NOT include credentials or raw SDK internals.

#### Scenario: Unsupported tracking hold
- **WHEN** a hold operation targets a tracking budget
- **THEN** the caller receives a stable non-retryable mode error and the MCP process remains operational

#### Scenario: Copy partial state
- **WHEN** copy fails after local changes may have occurred
- **THEN** the structured error identifies potential partial state and safe recovery actions without instructing the caller to replay the mutation
