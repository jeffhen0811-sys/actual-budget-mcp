## MODIFIED Requirements

### Requirement: MCP tool surface
The server SHALL register exactly 53 tools at startup: all 46 v0.5.0 tools plus `actual_list_transfer_payees`, `actual_get_transfer`, `actual_search_transfers`, `actual_create_transfer`, `actual_find_possible_transfers`, `actual_find_possible_duplicates`, and `actual_get_account_reconciliation`. The existing `actual_import_transactions`, `actual_preview_import`, `actual_search_transactions`, `actual_update_transaction`, `actual_bulk_update_transactions`, and `actual_delete_transaction` SHALL be enhanced additively rather than replaced or aliased. The server MUST NOT register raw search-by-field aliases, bulk field-specific aliases, `actual_run_query`, `actual_actualql`, `actual_raw_query`, a generic CRUD/query tool, internal transfer or reconciliation handlers, or an alias for any named operation.

#### Scenario: Client lists v0.6.0 tools
- **WHEN** a compatible MCP client requests the tool list
- **THEN** all 53 named tools are present with descriptions and declared strict input and output schemas, regardless of list order

#### Scenario: No unsupported or artificial aliases
- **WHEN** the v0.6.0 tool surface is inspected
- **THEN** it contains no public ActualQL, raw query, field-specific search, field-specific bulk, generic CRUD/query, internal API, relationship mutation, or artificial inventory alias

### Requirement: Tool behavioral annotations
`actual_get_transaction`, `actual_search_transactions`, `actual_preview_import`, `actual_list_transfer_payees`, `actual_get_transfer`, `actual_search_transfers`, `actual_find_possible_transfers`, `actual_find_possible_duplicates`, and `actual_get_account_reconciliation` SHALL declare read-only, non-destructive, idempotent behavior. `actual_bulk_update_transactions` SHALL declare mutation-capable, non-destructive, idempotent behavior because MCP annotations are static even though dry-run is the default. `actual_create_transfer` SHALL declare mutation-capable, non-destructive, non-idempotent behavior because a confirmed call creates financial transactions. Mutation-capable tool titles, descriptions, and schemas SHALL make default dry-run or explicit confirmation behavior clear. All 42 v0.4.0 annotations SHALL remain compatible, and annotations MUST NOT replace validation, preflight, protection, or confirmation.

#### Scenario: v0.6.0 tool metadata inspection
- **WHEN** a client inspects the 53-tool list
- **THEN** lookup, search, preview, bulk, transfer, diagnostics, reconciliation, and existing tool hints match their documented behavior and retry semantics

#### Scenario: Bulk dry-run metadata
- **WHEN** a client inspects or invokes bulk update in dry-run mode
- **THEN** the static annotation remains conservatively mutation-capable while the result clearly reports that no write occurred

#### Scenario: Transfer creation metadata
- **WHEN** a client inspects or invokes transfer creation in dry-run mode
- **THEN** the static annotation remains mutation-capable and non-idempotent while the result clearly reports whether a write occurred
