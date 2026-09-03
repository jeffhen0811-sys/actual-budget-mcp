## MODIFIED Requirements

### Requirement: MCP tool surface
The server SHALL register exactly 46 tools at startup: all 42 v0.4.0 tools plus `actual_get_transaction`, `actual_search_transactions`, `actual_bulk_update_transactions`, and `actual_preview_import`. The existing `actual_import_transactions` SHALL be enhanced additively rather than replaced or aliased. The server MUST NOT register raw search-by-field aliases, bulk field-specific aliases, `actual_run_query`, `actual_actualql`, `actual_raw_query`, a generic CRUD/query tool, or an alias for any named operation.

#### Scenario: Client lists v0.5.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 46 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: No unsupported or artificial aliases
- **WHEN** the v0.5.0 tool surface is inspected
- **THEN** it contains no public ActualQL, raw query, field-specific search, field-specific bulk, generic CRUD/query, internal API, or artificial inventory alias

### Requirement: Tool behavioral annotations
`actual_get_transaction`, `actual_search_transactions`, and `actual_preview_import` SHALL declare read-only, non-destructive, idempotent behavior. `actual_bulk_update_transactions` SHALL declare mutation-capable, non-destructive, idempotent behavior because MCP annotations are static even though dry-run is the default. Its title, description, and schema SHALL make the default dry-run and explicit write confirmation clear. All 42 v0.4.0 annotations SHALL remain compatible, and annotations MUST NOT replace validation, preflight, protection, or confirmation.

#### Scenario: Advanced tool metadata inspection
- **WHEN** a client inspects the 46-tool list
- **THEN** lookup, search, preview, bulk, and existing tool hints match their documented behavior and retry semantics

#### Scenario: Bulk dry-run metadata
- **WHEN** a client inspects or invokes bulk update in dry-run mode
- **THEN** the static annotation remains conservatively mutation-capable while the result clearly reports that no write occurred

## ADDED Requirements

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
