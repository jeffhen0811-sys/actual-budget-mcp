# distribution-and-operations Specification

## Purpose

Define reproducible installation, execution, update, deployment, documentation, versioning, and verification behavior for distributing the MCP from GitHub and operating it with Hermes.
## Requirements
### Requirement: Package commands and executable
The project SHALL report version `0.7.0` consistently in package metadata, lockfile root metadata, MCP server metadata, README, CHANGELOG, Docker examples, and release-readiness documentation while keeping `@actual-app/api` exactly `26.8.1`. It SHALL preserve `npm run dev`, `npm run build`, `npm start`, `npm test`, `npm run test:coverage`, `npm run typecheck`, `npm run test:contract`, `npm run test:integration`, `npm run test:integration:read`, `npm run test:integration:write`, `npm run test:e2e`, `npm run test:e2e:read`, `npm run test:e2e:write`, and `npm run test:all`. `npm start` SHALL execute `node dist/index.js`, and package metadata SHALL keep the `actual-budget-mcp` executable targeting the compiled entry point.

#### Scenario: Production start
- **WHEN** dependencies are installed and the project has been built
- **THEN** `npm start` launches the v0.7.0 MCP stdio process from `dist/index.js`

#### Scenario: Type and coverage validation
- **WHEN** `npm run typecheck` or `npm run test:coverage` is executed
- **THEN** TypeScript is checked without emission or coverage is produced through the preserved supported command

#### Scenario: SDK version inspection
- **WHEN** package and lock metadata are inspected
- **THEN** `@actual-app/api` remains pinned exactly to `26.8.1`

### Requirement: GitHub installation script
The repository SHALL provide an executable `install.sh` using `set -euo pipefail`. It SHALL verify Node.js and npm, require a supported Node.js version of at least 22, run `npm ci` when `package-lock.json` exists, build the project, verify `dist/index.js`, create the resolved Actual data directory when necessary, and print a sanitized success message with a Hermes configuration example. It MUST NOT request, persist, or print the Actual password.

#### Scenario: Fresh supported installation
- **WHEN** a user clones the repository and runs `./install.sh` with Node.js 22 or newer and npm available
- **THEN** dependencies are installed reproducibly, the project is built, the data directory exists, and the script prints the next configuration step

#### Scenario: Unsupported Node.js
- **WHEN** the installed Node.js version is below 22
- **THEN** installation stops before dependency installation with a clear version requirement

#### Scenario: Build artifact missing
- **WHEN** the build command exits without producing `dist/index.js`
- **THEN** installation fails with a clear non-secret diagnostic

### Requirement: Predictable update script
The repository SHALL provide an executable `update.sh` that performs a fast-forward-only Git pull, updates locked dependencies when needed, builds, and runs the verification defined by the script's existing design. It MUST support a clean v0.6.0 to v0.7.0 update and MUST NOT reset, discard, or overwrite local changes, environment configuration, the local Actual runtime cache, integration cache, MCP E2E cache data, or Hermes configuration.

#### Scenario: Clean v0.6.0 to v0.7.0 update
- **WHEN** the checkout is clean and the remote branch can fast-forward
- **THEN** `update.sh` updates dependencies as required, builds and verifies v0.7.0, and preserves local environment and cache data

#### Scenario: Local runtime data exists
- **WHEN** integration data, E2E data, Actual cache data, or Hermes configuration exists before update
- **THEN** the update process leaves those resources intact

#### Scenario: Clean v0.5.0 to v0.6.0 update
- **WHEN** the checkout is clean and the remote branch can fast-forward
- **THEN** `update.sh` updates dependencies as required, builds and verifies v0.6.0, and preserves local environment and cache data

#### Scenario: Diverged or dirty checkout
- **WHEN** a safe fast-forward update cannot proceed
- **THEN** the script stops without destructive Git operations and reports how the operator can inspect the state

### Requirement: Hermes stdio deployment documentation
The README SHALL document installation under the Hermes persistent data volume, launching the absolute compiled entry path with `command`, `args`, and explicit `env`, and setting `supports_parallel_tool_calls: false`. The example SHALL use the NAS Actual endpoint without assuming that `localhost` reaches another container and SHALL contain placeholders rather than real credentials.

#### Scenario: Hermes configuration example
- **WHEN** an operator follows the documented example
- **THEN** Hermes launches the MCP as a local stdio child process and passes only the required Actual environment values

#### Scenario: Container-local localhost warning
- **WHEN** the Actual Server runs in a separate container
- **THEN** the documentation instructs the operator to use the NAS address or a shared Docker-network hostname instead of Hermes-container `localhost`

### Requirement: Optional Docker image
The repository SHALL include a Dockerfile that can build and run the MCP over stdio without making Docker mandatory. The runtime image SHALL support interactive stdin, use an unprivileged user where practical, and allow the Actual cache to be mounted separately from the Actual Server data.

#### Scenario: Containerized stdio run
- **WHEN** the image is built and started with interactive stdin, required environment variables, network reachability, and a cache volume
- **THEN** an MCP client can communicate with the process over stdio

### Requirement: Repository documentation and secret hygiene
The repository SHALL keep `.env.example`, `.gitignore`, `README.md`, `CHANGELOG.md`, and an installed SDK contract document. README SHALL document the complete 62-tool inventory, Actual schedules versus external cron, the supported date and amount models, unsupported manual and transfer posting, financial summary classification and scope, runtime status, MCP read-only limitations, and the destructive-operation kill switch. CHANGELOG SHALL contain a `0.7.0` entry with `Added`, `Changed`, and `Fixed`. The installed contract document SHALL record the exact 26.8.1 schedule exports, absent single-get and posting exports, returned shapes, nullability, editable fields, recurrence and amount representations, summary query semantics, server/package version availability, local-first synchronization behavior, and unavailable runtime metadata. All project-authored material SHALL remain in English and examples MUST NOT contain real credentials, sync IDs, private server addresses, complete private paths, or personal financial values.

#### Scenario: v0.7.0 documentation inspection
- **WHEN** the published repository is inspected
- **THEN** all nine new tools, operational flags, summary semantics, schedule limitations, SDK read-only boundary, and version changes are documented in English

#### Scenario: Schedule documentation
- **WHEN** an operator reads the schedule section
- **THEN** it distinguishes Actual schedules from cron, lists supported recurrence and amount variants, describes synchronized create/update/delete behavior, and identifies unsupported posting and transfer schedules

#### Scenario: v0.6.0 documentation inspection
- **WHEN** the published repository is inspected
- **THEN** all seven new tools, enhanced transfer-aware operations, safety rules, limitations, examples, and version changes are documented in English

#### Scenario: Safe import workflow
- **WHEN** preview and import are documented
- **THEN** documentation explains identical normalized payload/options including payee IDs, request fingerprint scope, preview-only IDs, review before confirmation, post-import exact verification, and the fact that preview never writes

#### Scenario: Operational-mode documentation
- **WHEN** an operator configures read-only or destructive-disabled mode
- **THEN** defaults, error behavior, per-call confirmation, and the SDK-internal sync limitation are explicit without revealing raw environment values

#### Scenario: Query boundary documentation
- **WHEN** financial summaries are documented
- **THEN** they describe typed fixed queries, signed minor-unit totals, category-driven classification, split and transfer treatment, bounded ranges, and off-budget separation without exposing raw ActualQL

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
The project SHALL include unit tests for schedule projection, recurrence and amount validation, reference checks, create/update/delete lifecycle, sync and read-back failures, financial classification, refunds, transfers, splits, uncategorized values, off-budget separation, date and result bounds, runtime telemetry, queue instrumentation, central capability policy, annotations, mode precedence, and sanitization. Installed-contract tests SHALL pin schedule declarations, exports, bundle behavior, system-managed fields, missing single-get and manual-posting exports, typed query shapes, budget semantics, and runtime-observable metadata. Opt-in real-server integration and compiled stdio E2E suites SHALL exercise schedule lifecycle, controlled summaries, runtime status, read-only and destructive-disabled processes, cleanup, and permanent fingerprint integrity. GitHub Actions SHALL continue to run only locked installation, type checking, unit tests, contract tests, and build without private-server dependencies or writes.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated on public GitHub-hosted CI
- **THEN** CI executes `npm ci`, type checking, unit tests, contract tests, and build without Actual credentials or real-server writes

#### Scenario: Credential sentinel test
- **WHEN** tests inject a recognizable sentinel as the Actual password and trigger failures
- **THEN** captured logs and MCP results contain no sentinel value

#### Scenario: Installed query, import, transfer, and balance contract
- **WHEN** contract tests inspect the pinned installed package
- **THEN** they verify public `q`, `aqlQuery`, `addTransactions`, `importTransactions`, `updateTransaction`, `deleteTransaction`, and `getAccountBalance`; fixed transaction query features; transfer payee and reciprocal-ID shapes; split options; `dryRun`, `defaultCleared`, and `reimportDeleted`; observed return evidence; canonical fields; and the absence of unsupported normalization, linking, merging, reconciliation-lock, and last-reconciled exports

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

#### Scenario: Installed schedule contract
- **WHEN** contract tests inspect the pinned package
- **THEN** they verify public schedule exports, date and amount types, editable and system-managed fields, mutation return values, deletion behavior evidence, and absent single-get and manual-posting exports

#### Scenario: Controlled summary fixtures
- **WHEN** unit and contract fixtures contain income, expenses, refunds, transfers, splits, uncategorized transactions, starting balances, and off-budget transactions
- **THEN** totals and breakdowns prove category-driven, signed, split-safe, transfer-free semantics without relying on personal data

#### Scenario: Real integration read verification
- **WHEN** the configured Actual Server is available without write authorization
- **THEN** read tests exercise schedule reads, all three summaries, runtime status, bounded performance observations, sanitization, and fingerprint purity

#### Scenario: Authorized real integration write verification
- **WHEN** `ACTUAL_INTEGRATION_ALLOW_WRITES=true` is scoped to an explicitly authorized local test process
- **THEN** integration tests exercise isolated schedule create, list, get, update, confirmation failure, delete, read-back, exact cleanup, controlled financial datasets, and permanent fingerprint integrity

#### Scenario: Real MCP stdio verification
- **WHEN** the authorized E2E read and write suites run
- **THEN** they discover exactly 62 tools and exercise schedules, summaries, runtime status, mode guards, existing v0.6.0 behavior, structured content, cleanup, and continued protocol health through a compiled MCP process

#### Scenario: Read-only process verification
- **WHEN** a second compiled MCP process starts with `ACTUAL_MCP_READ_ONLY=true`
- **THEN** reads and status work, every caller-invoked mutation including sync returns `READ_ONLY_MODE` before its adapter call, and the test reports the SDK-internal initialization boundary accurately

#### Scenario: Destructive-disabled process verification
- **WHEN** a compiled MCP process starts with `ACTUAL_MCP_ALLOW_DESTRUCTIVE=false`
- **THEN** a confirmed destructive call returns `DESTRUCTIVE_OPERATIONS_DISABLED`, the target remains present, and cleanup is completed through a separately authorized process

#### Scenario: Coverage quality
- **WHEN** coverage is measured after the change
- **THEN** global statements remain at least 80 percent and branches at least 70 percent without artificial tests added solely to inflate coverage

### Requirement: Manual Actual acceptance flow
The repository SHALL retain an explicitly authorized acceptance flow against the configured controlled Actual budget and SHALL automate v0.7.0 integration and compiled stdio E2E coverage where practical. The flow SHALL cover startup, exact 62-tool discovery, health, all compatible v0.6.0 behavior, schedule lifecycle and recurrence persistence, controlled month/spending/income summaries, transfer exclusion, refund handling, split safety, off-budget behavior, runtime and sync telemetry, process restart, read-only and destructive-disabled modes, synchronization, cleanup, repeated post-write reads, and permanent-fixture verification. Real-server destructive acceptance MUST NOT run in public CI.

#### Scenario: Controlled end-to-end acceptance
- **WHEN** an operator supplies test credentials and explicitly enables real writes for the test process
- **THEN** all required v0.7.0 read/write steps complete without corrupting permanent fixture data

#### Scenario: Public CI
- **WHEN** GitHub Actions runs without Actual credentials or private-network reachability
- **THEN** it performs no mutation against a real Actual Server

### Requirement: Per-run ownership and transaction cleanup
Every real integration and E2E write run SHALL create uniquely identified temporary accounts, category groups, categories, payees, rules, schedules, ordinary transactions, and transfer pairs as required, record every exact returned persistent ID immediately, and clean up by exact ID in dependency order. Schedule deletion SHALL occur after owned transactions and before owned rules, payees, categories, groups, and accounts unless controlled evidence requires a safer order. A transfer pair SHALL be registered as one cleanup unit containing both observed transaction IDs; because deleting either side may delete both, cleanup SHALL issue at most one delete and verify both IDs absent. Preview-only generated IDs and diagnostic candidate keys MUST NOT be registered as persistent cleanup targets. Prefix search MAY be used only as an additional leftover assertion and MUST NOT select primary deletion targets. Existing budget-state restoration guarantees SHALL remain in effect.

#### Scenario: Successful schedule cleanup
- **WHEN** a write suite completes or fails after creating schedules and supporting resources
- **THEN** its `finally` cleanup removes every owned transaction and schedule by exact ID before deleting dependent resources and verifies absence

#### Scenario: Safe dynamic month selection
- **WHEN** a write suite prepares budget test months
- **THEN** it chooses sufficiently future months from `getBudgetMonths`, verifies the source and target are suitable, and fails safely if protected data exists

#### Scenario: Successful cleanup
- **WHEN** a real write suite completes or fails after creating temporary data including transfer pairs
- **THEN** its `finally` cleanup removes owned resources by exact ID in dependency order, deletes each pair once, and confirms every observed side is absent

#### Scenario: Successful budget cleanup
- **WHEN** a real budget write suite completes or fails after creating temporary state
- **THEN** `finally` cleanup restores captured month-level state, removes owned budget configuration, deletes owned resources by exact ID, and confirms their absence

#### Scenario: Successful transfer cleanup
- **WHEN** cleanup includes an owned transfer pair
- **THEN** it deletes the pair once through an exact side ID and verifies both IDs absent

#### Scenario: Cleanup failure
- **WHEN** owned budget or entity state cannot be restored or removed
- **THEN** the suite fails and reports sanitized exact IDs and recovery context without deleting by a global prefix

#### Scenario: Proposed fallback to prefix cleanup
- **WHEN** exact-ID cleanup is shown during implementation to have disproportionate complexity or execution cost
- **THEN** implementation pauses and presents evidence, risks, and safeguards for explicit user approval before any prefix-based fallback is introduced

### Requirement: Permanent fixture integrity
Real write, preview, summary, status, and diagnostic suites SHALL NOT mutate or delete permanent accounts, category groups, categories, payees, rules, schedules, transactions, transfer relationships, or monthly budget configuration. Suites SHALL capture stable baseline fingerprints including accounts, transactions, reciprocal transfer identifiers, payees, categories, rules, schedules, and relevant budget-month shapes before writes or nominally read-only operations and verify after each purity boundary and after cleanup that every permanent component is unchanged. Temporary resources MUST be excluded only through exact run-owned IDs rather than broad name matching, and integration and E2E suites MUST NOT reuse each other's temporary entities.

#### Scenario: Read and diagnostic integrity check
- **WHEN** a schedule read, financial summary, runtime status, preview, or diagnostic operation finishes
- **THEN** the complete permanent-state fingerprint remains identical to baseline, subject to the explicitly documented SDK-internal schedule-service limitation

#### Scenario: Preview and diagnostic integrity check
- **WHEN** an import preview, bulk dry-run, transfer-creation dry-run, possible-transfer scan, duplicate scan, or reconciliation snapshot finishes
- **THEN** the complete permanent-state fingerprint remains identical to baseline before any subsequent real import or write

#### Scenario: Post-write integrity check
- **WHEN** cleanup finishes after an integration or E2E schedule, budget, or transaction write run
- **THEN** permanent entities, schedules, transactions, reciprocal identifiers, and budget configuration fingerprints are identical to baseline

#### Scenario: Leftover temporary data
- **WHEN** any owned temporary account, category group, category, payee, rule, schedule, transaction, or transfer side remains after cleanup
- **THEN** the suite fails readiness and reports the leftover resource

#### Scenario: Leftover temporary budget state
- **WHEN** an owned budget amount, carryover, hold, category, or group remains after cleanup
- **THEN** the suite fails readiness and reports the leftover state

### Requirement: Strict v0.7.0 readiness gate
The v0.7.0 release SHALL be declared ready only after typecheck, unit, coverage, installed-contract, build, real integration read/write, real stdio E2E read/write, read-only process, destructive-disabled process, controlled summary semantics, bounded performance observations, cleanup and fingerprint verification, backward compatibility, clean installation, v0.6.0-to-v0.7.0 update verification, Git hygiene, secret scans, and OpenSpec validation have actually passed. Missing credentials, an unavailable required server, a skipped supported suite, unsupported semantic claims, failed cleanup, changed fixture, leftover state, or an unexecuted mandatory test SHALL result in `ACTUAL BUDGET MCP v0.7.0 NOT READY`. Transfer schedules and manual posting SHALL be reported as `SKIPPED UNSUPPORTED` and SHALL not block readiness because this change explicitly excludes them.

#### Scenario: Every required check passes
- **WHEN** all supported local, real-server, stdio, operational-mode, cleanup, compatibility, installation, update, Git, secret-hygiene, and build checks complete successfully
- **THEN** the final report ends with exactly `ACTUAL BUDGET MCP v0.7.0 READY`

#### Scenario: Required verification unavailable
- **WHEN** any required supported integration, E2E, cleanup, mode, install, or update verification cannot be executed
- **THEN** the report lists the blocker and ends with exactly `ACTUAL BUDGET MCP v0.7.0 NOT READY`

#### Scenario: Explicitly unsupported schedule behavior
- **WHEN** transfer schedules or manual schedule posting are reported in readiness
- **THEN** they are listed as `SKIPPED UNSUPPORTED` with no fabricated test result and do not weaken supported mandatory gates
