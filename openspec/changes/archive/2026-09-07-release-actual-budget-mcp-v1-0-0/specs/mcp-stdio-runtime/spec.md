## MODIFIED Requirements

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

## ADDED Requirements

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
