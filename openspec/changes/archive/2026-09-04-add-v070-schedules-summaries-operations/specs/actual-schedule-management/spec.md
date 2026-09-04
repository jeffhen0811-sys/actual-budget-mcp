## Purpose

Define safe, typed MCP administration of Actual Budget one-time and recurring schedules without exposing internal schedule handlers or inventing recurrence behavior outside the pinned public SDK.

## ADDED Requirements

### Requirement: Schedule read surface
The system SHALL expose `actual_list_schedules` and `actual_get_schedule` as read-only tools. Schedule reads SHALL return a stable representation containing the schedule ID, optional name, account and payee references when resolvable, amount semantics, one-time or recurring date definition, next date, completion state, and transaction-posting behavior without exposing the underlying rule ID or raw rule conditions. `actual_list_schedules` SHALL support bounded pagination and optional account and completion filters; incompatible filter combinations SHALL be rejected. Because the pinned SDK has no public single-schedule getter, exact lookup SHALL use the public complete schedule list and SHALL return `SCHEDULE_NOT_FOUND` when the ID is absent.

#### Scenario: List schedules
- **WHEN** a caller lists schedules with valid filters and pagination
- **THEN** the system returns only matching projected schedules plus the applied scope and pagination metadata

#### Scenario: Get existing schedule
- **WHEN** a caller requests an existing schedule ID
- **THEN** the system returns the complete stable schedule representation obtained through the public schedule list

#### Scenario: Schedule not found
- **WHEN** a caller requests an ID absent from the complete public schedule list
- **THEN** the system returns `SCHEDULE_NOT_FOUND` without mutation

### Requirement: Typed schedule date model
Schedule writes SHALL accept exactly one of a one-time `YYYY-MM-DD` date or a discriminated recurring date with frequency `daily`, `weekly`, `monthly`, or `yearly`, a required `YYYY-MM-DD` start date, a positive safe-integer interval, optional supported monthly patterns, optional weekend movement, and a coherent end condition. Weekly and yearly dates SHALL derive their calendar position from `start`; the system MUST NOT invent independent weekday, month, cron, or arbitrary recurrence fields. Monthly day patterns SHALL use only installed supported weekday or day-of-month values, and invalid, empty, contradictory, or unsupported recurrence shapes SHALL return `INVALID_RECURRENCE` before the SDK is invoked.

#### Scenario: One-time schedule date
- **WHEN** a caller supplies a valid one-time date
- **THEN** the date is passed through as the installed SDK's one-time schedule representation

#### Scenario: Supported recurring date
- **WHEN** a caller supplies a coherent supported recurrence including any required end or weekend fields
- **THEN** the system maps it deterministically to the installed `RecurConfig` representation and preserves it on read-back

#### Scenario: Arbitrary recurrence rejected
- **WHEN** a caller supplies cron syntax, an unsupported frequency, an invalid pattern, or inconsistent end fields
- **THEN** the call fails with `INVALID_RECURRENCE` before any Actual operation

### Requirement: Explicit schedule amount semantics
Schedule creation SHALL require an explicit amount specification so the installed SDK cannot silently replace an omitted amount with zero. Exact and approximate amounts SHALL contain one signed safe integer in minor units; between amounts SHALL contain two signed safe integers in ascending order. Schedule reads SHALL preserve the installed exact, approximate, or between representation and MUST NOT describe zero, absent, formula-derived, or unknown shapes as dynamic or nullable amounts without evidence.

#### Scenario: Exact or approximate amount
- **WHEN** a caller supplies an exact or approximate signed safe integer
- **THEN** the schedule preserves the integer and corresponding installed amount operator

#### Scenario: Between amount
- **WHEN** a caller supplies two ordered signed safe integers for a between amount
- **THEN** the schedule preserves both bounds and the installed between operator

#### Scenario: Invalid amount
- **WHEN** an amount is omitted, fractional, unsafe, has reversed range bounds, or disagrees with its discriminant
- **THEN** input validation rejects it before the Actual adapter is invoked

### Requirement: Schedule reference safety
Schedule creation SHALL require an existing open account and MAY reference an existing ordinary payee. Schedule updates that change either reference SHALL perform the same preflight. Missing, closed, deleted, transfer-payee, or otherwise incompatible references SHALL return `SCHEDULE_REFERENCE_INVALID` without mutation. Category assignment SHALL NOT be accepted because the pinned public schedule model exposes no category field.

#### Scenario: Valid references
- **WHEN** a create or update request references an existing open account and an existing ordinary payee
- **THEN** reference preflight succeeds and the requested mutation may proceed

#### Scenario: Invalid reference
- **WHEN** a referenced account or payee is missing or incompatible
- **THEN** the system returns `SCHEDULE_REFERENCE_INVALID` before schedule mutation

#### Scenario: Transfer schedule requested
- **WHEN** a caller references a transfer payee
- **THEN** v0.7.0 rejects the request as unsupported rather than assuming reciprocal posting behavior

### Requirement: Verified schedule creation and update
The system SHALL expose `actual_create_schedule` and `actual_update_schedule` as mutation-capable tools. Creation SHALL accept only name, account, optional ordinary payee, explicit amount, typed date, and transaction-posting behavior. Update SHALL accept a non-empty subset of name, account, payee, amount, date, and transaction-posting behavior; it MUST NOT accept rule, category, completion, or next-date fields. A changed mutation SHALL synchronize once and read the complete public schedule list to verify the requested persisted state before returning. Installed mutation acknowledgements or returned IDs alone MUST NOT be treated as proof of completion.

#### Scenario: Create and verify schedule
- **WHEN** a valid creation succeeds, synchronizes, and read-back matches the request
- **THEN** the system returns the final projected schedule with `success: true` and `changed: true`

#### Scenario: Update and verify schedule
- **WHEN** a non-empty supported update changes an existing schedule and verified read-back matches
- **THEN** the system returns the final projected schedule and the fields that changed

#### Scenario: Empty or system-managed update
- **WHEN** an update contains no supported field or attempts to change completion, next date, rule, or category
- **THEN** the request is rejected before mutation

#### Scenario: Schedule synchronization uncertainty
- **WHEN** a schedule mutation may have changed local state but sync or read-back fails
- **THEN** the system returns the existing structured partial-state error contract and does not retry the mutation

### Requirement: Guarded schedule deletion
The system SHALL expose `actual_delete_schedule` as a destructive tool requiring both runtime destructive permission and literal `confirmDestructive: true`. Before deletion it SHALL prove the schedule exists and capture safe identifying and linked-transaction evidence; after deletion and synchronization it SHALL verify schedule absence and that previously posted historical transactions were not removed. The operation MUST NOT delete or rewrite unrelated transactions.

#### Scenario: Deletion confirmation missing
- **WHEN** a schedule deletion lacks literal confirmation
- **THEN** the system returns `DESTRUCTIVE_CONFIRMATION_REQUIRED` without mutation

#### Scenario: Runtime destructive permission disabled
- **WHEN** schedule deletion is requested while destructive operations are disabled
- **THEN** the system returns `DESTRUCTIVE_OPERATIONS_DISABLED` before schedule preflight or mutation

#### Scenario: Confirmed safe deletion
- **WHEN** an existing schedule is confirmed for deletion, the official deletion succeeds, sync succeeds, and read-back proves absence and historical transaction preservation
- **THEN** the system returns the captured schedule metadata and verified deletion result

### Requirement: Unsupported schedule execution remains unavailable
The MCP MUST NOT expose manual schedule posting, schedule-service execution, skip-next-date, schedule discovery, clock manipulation, category mutation through a linked rule, or a fabricated transaction that pretends a schedule ran. Automatic posting and schedule advancement SHALL remain responsibilities of the Actual runtime, and transfer schedules SHALL remain unsupported in v0.7.0 pending a separately approved contract backed by controlled real-server proof.

#### Scenario: Caller seeks manual posting
- **WHEN** a caller inspects the tool surface or requests manual execution of a schedule
- **THEN** no manual posting or equivalent mutation tool is available

