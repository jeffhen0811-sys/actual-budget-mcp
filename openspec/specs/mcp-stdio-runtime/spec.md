# mcp-stdio-runtime Specification

## Purpose

Define a protocol-safe MCP stdio surface with discoverable tools, validated inputs, structured outputs, behavioral annotations, and consistently sanitized diagnostics.

## Requirements

### Requirement: MCP tool surface
The server SHALL register exactly the V1 tools `actual_health`, `actual_list_accounts`, `actual_get_account`, `actual_list_categories`, `actual_list_payees`, `actual_get_transactions`, `actual_import_transactions`, `actual_update_transaction`, `actual_delete_transaction`, and `actual_sync` at startup.

#### Scenario: Client lists tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all ten V1 tools are present with descriptions and declared input schemas

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
Read-only tools SHALL declare a read-only hint. Import and update tools SHALL declare that they mutate state, sync SHALL declare non-destructive idempotent behavior, and deletion SHALL declare destructive behavior. Annotations MUST accurately reflect V1 retry semantics but SHALL NOT replace server-side validation.

#### Scenario: Tool metadata inspection
- **WHEN** a client inspects the tool list
- **THEN** read, write, idempotent, and destructive hints match the documented behavior of each tool

### Requirement: Consistent tool-level errors
Operational failures SHALL be returned as MCP tool errors rather than malformed protocol responses or uncaught output. Errors SHALL use a stable public code, sanitized message, operation name, and retryability indicator where known.

#### Scenario: Connection failure
- **WHEN** an Actual operation fails because the server is unreachable
- **THEN** the caller receives a structured retryable connection error

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
