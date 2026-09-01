## MODIFIED Requirements

### Requirement: MCP tool surface
The server SHALL register exactly 42 tools at startup: all 34 v0.3.0 tools plus `actual_list_budget_months`, `actual_get_budget_month`, `actual_set_budget_amount`, `actual_set_budget_carryover`, `actual_hold_budget_for_next_month`, `actual_reset_budget_hold`, `actual_copy_budget_month`, and `actual_get_budget_summary`. The server MUST NOT register `actual_run_rules`, `actual_preview_rule`, a generic CRUD/query tool, a public ActualQL tool, or an alias for any named operation.

#### Scenario: Client lists v0.4.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 42 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: No unsupported or artificial aliases
- **WHEN** the v0.4.0 tool surface is inspected
- **THEN** it contains no manual rule-run tool, rule-preview tool, reorder tool, generic CRUD/query tool, internal API tool, public ActualQL tool, or alias beyond the named set

### Requirement: Tool behavioral annotations
The three monthly budget read tools SHALL declare read-only, non-destructive, idempotent behavior. Category budget amount and carryover desired-state tools plus reset hold SHALL declare mutating, non-destructive, idempotent behavior. Hold-for-next-month SHALL declare mutating, non-destructive, non-idempotent behavior because its amount is incremental. Budget copy SHALL declare mutating behavior and a conservative destructive hint because confirmed overwrite can replace planning values, even though dry-run is the default; its execution SHALL be idempotent for unchanged source and target state. Existing v0.3.0 annotations SHALL remain compatible. Annotations MUST NOT replace validation, preflight, mode checks, or confirmation.

#### Scenario: Tool metadata inspection
- **WHEN** a client inspects the 42-tool list
- **THEN** read, write, idempotent, and destructive hints match each tool's documented behavior and retry semantics

#### Scenario: Dry-run copy metadata
- **WHEN** a client inspects or invokes budget copy in dry-run mode
- **THEN** the static tool annotation remains conservatively mutating/destructive while the result clearly reports that no write occurred

## ADDED Requirements

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
