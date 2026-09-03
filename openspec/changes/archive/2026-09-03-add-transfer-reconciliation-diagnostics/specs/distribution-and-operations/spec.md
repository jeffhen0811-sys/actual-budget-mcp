## ADDED Requirements

### Requirement: Strict v0.6.0 readiness gate
The v0.6.0 release SHALL be declared ready only after typecheck, unit, coverage, installed-contract, build, real integration read/write, real stdio E2E read/write and negative tests, bounded diagnostic performance observations, preview and every dry-run purity check, transfer-aware cleanup and fingerprint verification, backward compatibility, clean installation, v0.5.0-to-v0.6.0 update verification, Git hygiene, and secret scans have actually passed. Missing credentials, an unavailable required server, a skipped supported suite, unsupported semantic claims, failed cleanup, changed fixture, leftover state, or an unexecuted mandatory test SHALL result in `ACTUAL BUDGET MCP v0.6.0 NOT READY`.

#### Scenario: Every required check passes
- **WHEN** all local, real-server, stdio, cleanup, compatibility, installation, update, Git, secret-hygiene, and build checks complete successfully
- **THEN** the final report ends with exactly `ACTUAL BUDGET MCP v0.6.0 READY`

#### Scenario: Required verification unavailable
- **WHEN** any required supported integration, E2E, cleanup, mode, install, or update verification cannot be executed
- **THEN** the report lists the blocker and ends with exactly `ACTUAL BUDGET MCP v0.6.0 NOT READY`

## MODIFIED Requirements

### Requirement: Package commands and executable
The project SHALL report version `0.6.0` consistently in package metadata, lockfile root metadata, MCP server metadata, README, and CHANGELOG while keeping `@actual-app/api` exactly `26.8.1`. It SHALL preserve `npm run dev`, `npm run build`, `npm start`, `npm test`, `npm run test:coverage`, `npm run typecheck`, `npm run test:contract`, `npm run test:integration`, `npm run test:integration:read`, `npm run test:integration:write`, `npm run test:e2e`, `npm run test:e2e:read`, `npm run test:e2e:write`, and `npm run test:all`. `npm start` SHALL execute `node dist/index.js`, and package metadata SHALL keep the `actual-budget-mcp` executable targeting the compiled entry point.

#### Scenario: Production start
- **WHEN** dependencies are installed and the project has been built
- **THEN** `npm start` launches the v0.6.0 MCP stdio process from `dist/index.js`

#### Scenario: Type and coverage validation
- **WHEN** `npm run typecheck` or `npm run test:coverage` is executed
- **THEN** TypeScript is checked without emission or coverage is produced through the preserved supported command

#### Scenario: SDK version inspection
- **WHEN** package and lock metadata are inspected
- **THEN** `@actual-app/api` remains pinned exactly to `26.8.1`

### Requirement: Predictable update script
The repository SHALL provide an executable `update.sh` that performs a fast-forward-only Git pull, updates locked dependencies when needed, builds, and runs the verification defined by the script's existing design. It MUST support a clean v0.5.0 to v0.6.0 update and MUST NOT reset, discard, or overwrite local changes, environment configuration, the local Actual runtime cache, integration cache, MCP E2E cache data, or Hermes configuration.

#### Scenario: Clean v0.5.0 to v0.6.0 update
- **WHEN** the checkout is clean and the remote branch can fast-forward
- **THEN** `update.sh` updates dependencies as required, builds and verifies v0.6.0, and preserves local environment and cache data

#### Scenario: Local runtime data exists
- **WHEN** integration data, E2E data, Actual cache data, or Hermes configuration exists before update
- **THEN** the update process leaves those resources intact

#### Scenario: Diverged or dirty checkout
- **WHEN** a safe fast-forward update cannot proceed
- **THEN** the script stops without destructive Git operations and reports how the operator can inspect the state

### Requirement: Repository documentation and secret hygiene
The repository SHALL keep `.env.example`, `.gitignore`, `README.md`, and `CHANGELOG.md`. README SHALL document advanced transaction search, exact lookup, bulk transaction updates, import preview, transfer payees and reciprocal pairs, manual transfer dry-run and confirmation, possible-transfer and duplicate diagnostics, reconciliation snapshots, integer signed amounts, pagination, split modes, protected transfers/splits, preview-only identifiers, and the recommended preview-review-execute-verify workflows. CHANGELOG SHALL contain a `0.6.0` entry with `Added`, `Changed`, and `Fixed`. The installed API contract document SHALL record exact 26.8.1 ActualQL, transfer-payee, reciprocal transfer, account-balance, split, nullability, import-option, dry-run, rule, reconciliation, deleted-import, identifier, and normalization findings, including absent public linking, merging, last-reconciled, and reconciliation-lock APIs. All project-authored material SHALL remain in English and examples MUST NOT contain real credentials or financial fixture values.

#### Scenario: v0.6.0 documentation inspection
- **WHEN** the published repository is inspected
- **THEN** all seven new tools, enhanced transfer-aware operations, safety rules, limitations, examples, and version changes are documented in English

#### Scenario: Safe import workflow
- **WHEN** preview and import are documented
- **THEN** documentation explains identical normalized payload/options including payee IDs, request fingerprint scope, preview-only IDs, review before confirmation, post-import exact verification, and the fact that preview never writes

#### Scenario: Query boundary documentation
- **WHEN** advanced or diagnostic search is documented
- **THEN** it describes typed MCP filters, fixed scan limits, deterministic classification, and official API use without documenting raw ActualQL as caller input

#### Scenario: Copy and mutation warnings
- **WHEN** budget copy, carryover, hold, reset, transfer creation, update, or deletion is documented
- **THEN** documentation explains dry-run defaults where applicable, confirmation, side effects on reciprocal transactions, prospective or incremental effects, and recovery behavior

#### Scenario: Destructive tool documentation
- **WHEN** payee deletion, payee merge, rule deletion, or transaction deletion is documented
- **THEN** the documentation identifies it as destructive, requires explicit confirmation, and explains its preflight or protected-refusal behavior

#### Scenario: Local environment file
- **WHEN** a developer creates a local environment file from the example
- **THEN** Git ignores the secret-bearing file

### Requirement: Automated verification
The project SHALL include unit tests for every transfer, advanced transaction, diagnostic, and reconciliation schema, canonical projection, fixed query compiler, filter, null case, split mode, pair integrity, classification, pagination and total rule, creation plan and guard, bulk plan and guard, partial failure phase, preview purity, fingerprint, import option, annotation, structured result, and backward-compatibility case; installed-contract tests for 26.8.1 query, import, transfer-payee, transaction mutation, deletion, account-balance exports and declarations, serialized query shapes, split behavior, options, return shapes, and relevant online-documentation or bundle discrepancies; opt-in real-server integration read/write tests; and real MCP stdio E2E read/write and negative tests. GitHub Actions SHALL continue to run only locked installation, type checking, unit tests, contract tests, and build without private-server dependencies or writes.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated on public GitHub-hosted CI
- **THEN** CI executes `npm ci`, type checking, unit tests, contract tests, and build without Actual credentials or real-server writes

#### Scenario: Credential sentinel test
- **WHEN** tests inject a recognizable sentinel as the Actual password and trigger failures
- **THEN** captured logs and MCP results contain no sentinel value

#### Scenario: Installed query, import, transfer, and balance contract
- **WHEN** contract tests inspect the pinned installed package
- **THEN** they verify public `q`, `aqlQuery`, `addTransactions`, `importTransactions`, `updateTransaction`, `deleteTransaction`, and `getAccountBalance`; fixed transaction query features; transfer payee and reciprocal-ID shapes; split options; `dryRun`, `defaultCleared`, and `reimportDeleted`; observed return evidence; canonical fields; and the absence of unsupported normalization, linking, merging, reconciliation-lock, and last-reconciled exports

#### Scenario: Real integration read verification
- **WHEN** the configured Actual Server is available without write authorization
- **THEN** read tests exercise exact lookup, structured searches, pair integrity, candidate classifications, reconciliation aggregates, deterministic ordering, pagination, nullability, and split semantics without mutating state

#### Scenario: Authorized real integration write verification
- **WHEN** `ACTUAL_INTEGRATION_ALLOW_WRITES=true` is scoped to an explicitly authorized local test process
- **THEN** integration tests exercise isolated transfer creation dry-run/write, pair side effects, transfer-aware deletion, bulk dry-run/write/idempotency, import preview/reconciliation/options/rules including transfer payees, exact cleanup, and permanent fingerprint integrity

#### Scenario: Real MCP stdio verification
- **WHEN** the authorized E2E read/write suites run
- **THEN** they discover exactly 53 tools and exercise lookup, search, bulk, preview, enhanced import, transfer management, diagnostics, reconciliation, negative inputs, and continued stdio health through a real MCP client and compiled process

#### Scenario: Dry-run purity verification
- **WHEN** preview import, bulk dry-run, transfer-creation dry-run, or a diagnostic tool is exercised against controlled real fixtures
- **THEN** complete before/after fingerprints prove no persisted account, transaction, payee, category, rule, or budget-state change

#### Scenario: Real budget read verification
- **WHEN** the configured Actual Server is available
- **THEN** integration and compiled stdio E2E reads validate available months, month shapes, summaries, reconciliation aggregates, nullability, signs, and structural coherence without fragile permanent financial-value assertions

#### Scenario: Authorized real budget writes
- **WHEN** `ACTUAL_INTEGRATION_ALLOW_WRITES=true` is scoped to an explicitly authorized local process
- **THEN** integration and compiled stdio E2E suites exercise isolated amount, zero, carryover, hold/reset, copy, guard, idempotency, negative, synchronization, cleanup, and fingerprint cases through the official API

#### Scenario: Exact MCP discovery
- **WHEN** the compiled stdio E2E client lists tools
- **THEN** it discovers exactly 53 tools and exercises budget, transaction, transfer, diagnostic, and reconciliation operations through the MCP client rather than direct handlers

### Requirement: Manual Actual acceptance flow
The project SHALL retain an explicitly authorized acceptance flow against the configured controlled Actual budget and SHALL automate the v0.6.0 integration and stdio E2E coverage where practical. The flow SHALL cover startup, exact 53-tool discovery, health, every compatible v0.5.0 behavior, transfer payee discovery, valid and malformed pair reads, transfer search and creation, possible-transfer and duplicate diagnostics, reconciliation snapshots, transfer-aware import/update/delete behavior, payee and rule administration, import-time functional execution, synchronization, cleanup, repeated post-write reads, and permanent-fixture verification. Real-server destructive acceptance MUST NOT run in public CI.

#### Scenario: Controlled end-to-end acceptance
- **WHEN** an operator supplies test credentials and explicitly enables real writes for the test process
- **THEN** all required v0.5.0 and v0.6.0 read/write steps complete without corrupting permanent fixture data

#### Scenario: Public CI
- **WHEN** GitHub Actions runs without Actual credentials or private-network reachability
- **THEN** it performs no mutation against a real Actual Server

### Requirement: Per-run ownership and transaction cleanup
Every real integration and E2E write run SHALL create uniquely identified temporary accounts, category groups, categories, payees, rules, ordinary transactions, and transfer pairs as required, record every exact returned persistent ID immediately, and clean up by exact ID in dependency order. A transfer pair SHALL be registered as one cleanup unit containing both observed transaction IDs; because deleting either side may delete both, cleanup SHALL issue at most one delete and verify both IDs absent. Preview-only generated IDs and diagnostic candidate keys MUST NOT be registered as persistent cleanup targets. Prefix search MAY be used only as an additional leftover assertion and MUST NOT select primary deletion targets. Existing budget-state restoration guarantees SHALL remain in effect.

#### Scenario: Safe dynamic month selection
- **WHEN** a write suite prepares budget test months
- **THEN** it chooses sufficiently future months from `getBudgetMonths`, verifies the source and target are suitable, and fails safely if protected data exists

#### Scenario: Successful budget cleanup
- **WHEN** a real budget write suite completes or fails after creating temporary state
- **THEN** `finally` cleanup restores captured month-level state, removes owned budget configuration, deletes owned resources by exact ID, and confirms their absence

#### Scenario: Successful cleanup
- **WHEN** a real write suite completes or fails after creating temporary data including transfer pairs
- **THEN** its `finally` cleanup removes owned resources by exact ID in dependency order, deletes each pair once, and confirms every observed side is absent

#### Scenario: Cleanup failure
- **WHEN** owned budget or entity state cannot be restored or removed
- **THEN** the suite fails and reports sanitized exact IDs, months, pair membership, and recovery context without deleting by a global prefix

#### Scenario: Proposed fallback to prefix cleanup
- **WHEN** exact-ID cleanup is shown during implementation to have disproportionate complexity or execution cost
- **THEN** implementation pauses and presents evidence, risks, and safeguards for explicit user approval before any prefix-based fallback is introduced

### Requirement: Permanent fixture integrity
Real write, preview, and diagnostic suites SHALL NOT mutate or delete permanent accounts, category groups, categories, payees, rules, transactions, transfer relationships, or monthly budget configuration. Suites SHALL capture stable baseline fingerprints including accounts, transactions, reciprocal transfer identifiers, payees, categories, rules, and relevant budget-month shapes before writes or dry-runs and verify after preview or diagnostics and after cleanup that every permanent component is unchanged. Temporary resources MUST be excluded only through exact run-owned IDs rather than broad name matching, and integration and E2E suites MUST NOT reuse each other's temporary entities.

#### Scenario: Preview and diagnostic integrity check
- **WHEN** an import preview, bulk dry-run, transfer-creation dry-run, possible-transfer scan, duplicate scan, or reconciliation snapshot finishes
- **THEN** the complete permanent-state fingerprint remains identical to baseline before any subsequent real import or write

#### Scenario: Post-write integrity check
- **WHEN** cleanup finishes after an integration or E2E budget or transfer write run
- **THEN** permanent entities, original transactions, reciprocal transfer identifiers, and relevant permanent budget configuration fingerprints are identical to baseline

#### Scenario: Leftover temporary data
- **WHEN** any owned temporary account, category group, category, payee, rule, transaction, or transfer side remains after cleanup
- **THEN** the suite fails readiness and reports the leftover resource

#### Scenario: Leftover temporary budget state
- **WHEN** an owned budget amount, carryover, hold, category, or group remains after cleanup
- **THEN** the suite fails readiness and reports the leftover state

## REMOVED Requirements

### Requirement: Strict v0.5.0 readiness gate
**Reason**: The release target and complete verification contract move to v0.6.0.

**Migration**: Use `Strict v0.6.0 readiness gate`, which retains all prior checks and adds transfer, diagnostic, reconciliation, cleanup, and 53-tool verification.
