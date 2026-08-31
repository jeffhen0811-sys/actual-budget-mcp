## Purpose

Define safe MCP administration of Actual payees, including exact reads, controlled naming, protected deletion, and official merge behavior without exposing transfer payees or referenced data to unexpected destructive changes.

## ADDED Requirements

### Requirement: Get one payee
The system SHALL expose `actual_get_payee` with an opaque `payeeId`. It SHALL locate the entity through the official payee-list API and return its `id`, `name`, and `transferAccountId` only when the installed public API supplies that relationship. It MUST preserve explicit nullability or field absence rather than inventing a value.

#### Scenario: Existing ordinary payee
- **WHEN** `actual_get_payee` receives the ID of an ordinary payee
- **THEN** it returns the exact ID and user-authored name without fabricating a transfer relationship

#### Scenario: Existing transfer payee
- **WHEN** the requested payee is backed by an Actual transfer account
- **THEN** the result identifies the official transfer account relationship

#### Scenario: Unknown payee
- **WHEN** the requested ID is absent from the official payee list
- **THEN** the tool returns a structured `NOT_FOUND` error

### Requirement: Create a named payee
The system SHALL expose `actual_create_payee` with a required name that is trimmed, non-empty, and no longer than the common entity-name limit. It SHALL send only the name to the official create API, synchronize, read the created ID back through the official payee API, and return the persisted payee.

#### Scenario: New exact name
- **WHEN** a valid trimmed name has no exact trimmed match among current payees
- **THEN** the tool creates one ordinary payee, synchronizes, verifies it by the returned ID, and returns `success: true`, `changed: true`, and the payee

#### Scenario: Repeated exact name
- **WHEN** the same trimmed name already identifies exactly one existing ordinary payee
- **THEN** the tool performs no mutation or synchronization and returns `success: true`, `changed: false`, and that payee

#### Scenario: Ambiguous exact name
- **WHEN** more than one current payee has the exact trimmed requested name
- **THEN** the tool refuses to guess which entity satisfies the request and returns a structured name-conflict error

#### Scenario: Empty or arbitrary create input
- **WHEN** the name is blank after trimming or the request contains an unsupported payee field
- **THEN** strict input validation rejects the call before any Actual operation mutates data

### Requirement: Rename an ordinary payee
The system SHALL expose `actual_update_payee` with a `payeeId` and an allowlisted non-empty `name`. It MUST NOT accept a caller-supplied transfer account, category, arbitrary metadata, or empty update. It SHALL refuse to rename transfer payees, synchronize a changed ordinary payee, and verify the final name.

#### Scenario: Rename existing ordinary payee
- **WHEN** a valid new name is supplied for an ordinary payee
- **THEN** only the official name field is updated and the verified synchronized payee is returned with `changed: true`

#### Scenario: Name already matches
- **WHEN** the persisted payee already has the requested trimmed name
- **THEN** the tool returns `changed: false` without mutating or synchronizing

#### Scenario: Transfer payee rename
- **WHEN** the requested payee has an official transfer-account relationship
- **THEN** the tool refuses the update because its visible identity is controlled by the related account

#### Scenario: Empty or arbitrary update
- **WHEN** no permitted field is supplied or an unknown field is present
- **THEN** validation rejects the request before mutation

### Requirement: Delete only a proven-unused ordinary payee
The system SHALL expose `actual_delete_payee` as a destructive operation requiring `confirmDestructive: true` before mutation. It SHALL use only official APIs to prove that the payee exists, is not a transfer payee, is not referenced by any complete account transaction history, and is not associated with any rule. An incomplete preflight MUST stop deletion. A successful deletion SHALL synchronize and verify absence.

#### Scenario: Confirmation is missing
- **WHEN** confirmation is absent or false
- **THEN** no mutation occurs and the tool returns `DESTRUCTIVE_CONFIRMATION_REQUIRED` with safe transaction and rule reference counts when the preflight can determine them

#### Scenario: Payee is referenced
- **WHEN** any transaction or rule references the payee
- **THEN** deletion is refused with stable safe details containing the observed relationship counts

#### Scenario: Payee is a transfer payee
- **WHEN** the payee has a transfer-account relationship
- **THEN** deletion is refused without invoking the official delete mutation

#### Scenario: Delete preflight is incomplete
- **WHEN** complete transaction history, associated rules, payee shape, or another required relationship cannot be verified
- **THEN** the tool returns `PREFLIGHT_INCONCLUSIVE` and leaves the payee unchanged

#### Scenario: Confirmed unused deletion
- **WHEN** an ordinary payee is proven unused and `confirmDestructive` is true
- **THEN** the official delete operation runs once, synchronization succeeds, absence is verified, and the result reports the deleted ID, name, and zero relationship counts

### Requirement: Merge payees through the official mapping operation
The system SHALL expose `actual_merge_payees` with a non-empty unique `sourcePayeeIds` array, a distinct `targetPayeeId`, and `confirmDestructive: true` before mutation. Every source and target MUST exist and MUST be an ordinary payee. The system SHALL report preflight transaction and rule reference counts when available, invoke the official merge once, synchronize, and verify the target remains while every source is absent and observable references resolve to the target.

#### Scenario: Merge preflight without confirmation
- **WHEN** valid source and target IDs are supplied without literal confirmation
- **THEN** no merge occurs and the structured confirmation error includes safe per-source impact counts obtained by the complete preflight

#### Scenario: Invalid merge relationship
- **WHEN** sources are empty or duplicated, the target appears among sources, an ID is absent, or any selected payee is a transfer payee
- **THEN** the tool refuses the operation before invoking the official merge

#### Scenario: Confirmed merge
- **WHEN** all preconditions hold and confirmation is true
- **THEN** the official merge runs once, the operation synchronizes, every source disappears, the target remains, and the result reports the affected source IDs and observed reference counts

#### Scenario: Merge result cannot be verified
- **WHEN** the official merge may have changed local state but throws, synchronization fails, or post-merge reads do not prove the complete expected state
- **THEN** the tool returns structured partial-state and recovery metadata, does not retry the merge, and does not claim complete success

### Requirement: Preserve the existing payee list contract
`actual_list_payees` SHALL retain its v0.2.0 input and output contract of an empty input and payee items containing exactly `id` and `name`. New transfer context and mutation metadata MUST NOT be added to that existing item shape.

#### Scenario: Existing list consumer
- **WHEN** a v0.2.0 client validates a v0.3.0 payee-list result against the old strict schema
- **THEN** the result remains valid without accepting any additional field
