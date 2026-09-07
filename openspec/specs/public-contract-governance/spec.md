# public-contract-governance Specification

## Purpose
Define how Actual Budget MCP records, verifies, documents, and preserves the stable public contract promised to all 1.x MCP clients.
## Requirements
### Requirement: Immutable v0.7.0 compatibility baseline
Before changing the public surface, the project SHALL record an immutable machine-readable baseline tied to the clean 0.7.0 source commit. The baseline SHALL contain all 62 unique tool names, descriptions, annotations, strict input schemas, and output schemas. Version 1.0.0 MUST preserve every tool name and every request valid under that baseline except requests exceeding the explicitly reviewed finite ceilings on the 17 previously unbounded array paths documented in `breaking-change-review-unbounded-input-arrays.md`; it MUST preserve all required output fields, types, wrapper shapes, nullability, and meanings. A removal, merge, rename, newly required input, tightened accepted input outside that exact reviewed exception set, removed output, changed required output type, or changed nullability SHALL be treated as a breaking change and MUST stop release work for explicit review.

#### Scenario: Compare final contract with baseline
- **WHEN** the compatibility regression compares the final 1.0.0 contract with the recorded 0.7.0 baseline
- **THEN** it finds exactly the same 62 names and no unreviewed incompatible input, output, or annotation change

#### Scenario: Reviewed unbounded-array correction
- **WHEN** compatibility verification encounters one of the 17 approved baseline array paths
- **THEN** it accepts only the documented `maxItems` value and rejects a lower value, a different path, or any unrelated tightening

#### Scenario: Essential gap requires a breaking change
- **WHEN** an audit finds a tool that cannot be supported correctly without changing the frozen contract
- **THEN** implementation stops and documents the tool, evidence, compatibility impact, and alternatives before changing or removing it

### Requirement: Generated tool inventory
The project SHALL generate or deterministically verify `docs/tool-inventory-v1.md` from runtime contract definitions combined with a versioned verification manifest. Every tool entry SHALL identify name, domain, description, read-only status, mutation capability, destructive status, input schema, output schema, bounds, confirmation requirements, runtime guards, synchronization behavior, partial-failure behavior, and unit, contract, integration, and compiled stdio E2E evidence. Generated documentation verification MUST fail when a registered tool is missing, duplicated, unclassified, undocumented, or references nonexistent evidence.

#### Scenario: Inventory generation
- **WHEN** the inventory generator runs against the final registry and verification manifest
- **THEN** it produces exactly 62 complete entries in deterministic order without hand-maintained name duplication

#### Scenario: Registry and evidence drift
- **WHEN** a tool is registered without complete contract metadata or its verification reference no longer exists
- **THEN** release verification fails before the documentation can be accepted

### Requirement: Canonical public entity and nullability contract
The stable contract SHALL define canonical public projections for Account, Transaction, CategoryGroup, Category, Payee, Rule, BudgetMonth, Schedule, TransferPair, and RuntimeStatus. Tools returning the same entity semantics MUST reuse the canonical projection or explicitly document a distinct bounded view. Schemas and adapters MUST preserve upstream `null`, absent optional values, and guaranteed required values without fabricating replacements. A regression matrix SHALL cover transaction, account, schedule, rule, budget, transfer, and split nullability observed from the pinned SDK and controlled real fixtures.

#### Scenario: Same entity from multiple tools
- **WHEN** two tools return the same canonical entity
- **THEN** both results validate against the same public model and preserve equivalent field semantics

#### Scenario: Upstream nullable field
- **WHEN** the pinned SDK returns an explicit null or omits an optional field
- **THEN** the public projection preserves that distinction and does not invent a value

### Requirement: Stable public error catalog
The project SHALL maintain and document one exhaustive typed catalog of public error codes grouped by common and functional domains. Every MCP failure SHALL return a stable code, sanitized English message, operation, and accurate retryability; partial-state failures SHALL additionally report safe state, affected or pending identifiers where known, and recovery guidance without claiming rollback. Core envelope fields are part of the v1 contract. Arbitrary upstream errors, stack traces, credentials, and raw internal objects MUST NOT be exposed. Safe `details` MAY vary by documented error code and SHALL NOT be presented as one globally stable arbitrary object contract.

#### Scenario: Documented domain failure
- **WHEN** a supported operation fails in a known deterministic way
- **THEN** the returned code exists in `docs/error-codes-v1.md` with its domain, retryability, stable fields, and safe recovery semantics

#### Scenario: Unknown upstream exception
- **WHEN** an unexpected SDK exception contains private or internal data
- **THEN** the client receives a generic stable sanitized error and no raw exception data

### Requirement: Central resource bounds
All public array, string, date-range, pagination, batch, summary, diagnostic, candidate-window, schedule, and budget-copy limits SHALL be defined by one shared limits source and documented in `docs/limits-v1.md`. Handlers, schemas, descriptions, tests, and generated inventory MUST agree with that source. No caller-controlled request SHALL enable unbounded query results, arbitrary query structure, unsafe integer values, or unconstrained memory growth.

#### Scenario: Limit consistency
- **WHEN** release verification inspects schemas, runtime checks, descriptions, and documentation
- **THEN** every supported limit resolves to the same named value and no unexplained repeated magic limit remains

#### Scenario: Oversized request
- **WHEN** a caller exceeds any documented resource bound
- **THEN** validation or preflight rejects the request before unbounded work or mutation occurs

### Requirement: Truthful operation-semantics catalogs
The project SHALL publish `docs/idempotency-v1.md` and `docs/sync-semantics-v1.md` from reviewed operation metadata. Each mutation-capable tool SHALL state whether repeated execution is idempotent, which confirmation is required, whether it supports an intrinsically pure preview or an explicit dry-run, whether it writes and synchronizes, and which partial states are possible. The documentation MUST NOT claim idempotency, rollback, atomicity, or synchronization that is not proven by implementation and tests.

#### Scenario: Multi-step mutation documentation
- **WHEN** an operator reviews bulk update, import, budget copy, payee merge, or transfer creation
- **THEN** the catalog identifies its actual write, synchronization, verification, retry, partial-failure, and recovery behavior

#### Scenario: Preview classification
- **WHEN** import preview is documented
- **THEN** it is described as an intrinsically read-only operation without a caller `dryRun` switch, while mutation-capable tools with dry-run defaults retain conservative mutation annotations

### Requirement: Traceable acceptance evidence
The project SHALL maintain `docs/acceptance-matrix-v1.md` and `docs/support-matrix-v1.md` with evidence for Accounts, Categories, Payees, Rules, Transactions, Import, Budget, Transfers, Reconciliation, Schedules, Summaries, and Runtime/Security. Acceptance cells SHALL use only `PASS`, `FAIL`, `N/A`, or `UNSUPPORTED`; `N/A` SHALL mean a test class cannot apply to that behavior, while `UNSUPPORTED` SHALL name an intentional product limitation. A supported mandatory cell MUST NOT be marked `PASS` when its test was skipped, unavailable, or not executed.

#### Scenario: Read-only feature matrix
- **WHEN** a diagnostic-only feature has no write lifecycle
- **THEN** its write cell is `N/A` rather than a fabricated pass or unsupported claim

#### Scenario: Missing mandatory evidence
- **WHEN** a supported mandatory acceptance test is skipped or unavailable
- **THEN** its cell is not `PASS` and the final readiness decision is blocked

