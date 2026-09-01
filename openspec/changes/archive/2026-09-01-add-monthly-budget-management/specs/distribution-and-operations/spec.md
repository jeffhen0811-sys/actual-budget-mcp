## MODIFIED Requirements

### Requirement: Package commands and executable
The project SHALL report version `0.4.0` consistently in package metadata, lockfile root metadata, MCP server metadata, README, and CHANGELOG while keeping `@actual-app/api` exactly `26.8.1`. It SHALL preserve `npm run dev`, `npm run build`, `npm start`, `npm test`, `npm run typecheck`, `npm run test:contract`, `npm run test:integration`, `npm run test:integration:read`, `npm run test:integration:write`, `npm run test:e2e`, `npm run test:e2e:read`, `npm run test:e2e:write`, and `npm run test:all`. `npm start` SHALL execute `node dist/index.js`, and package metadata SHALL keep the `actual-budget-mcp` executable targeting the compiled entry point.

#### Scenario: Production start
- **WHEN** dependencies are installed and the project has been built
- **THEN** `npm start` launches the v0.4.0 MCP stdio process from `dist/index.js`

#### Scenario: Type validation
- **WHEN** `npm run typecheck` is executed
- **THEN** the TypeScript project is checked without emitting build artifacts

#### Scenario: SDK version inspection
- **WHEN** package and lock metadata are inspected
- **THEN** `@actual-app/api` remains pinned exactly to `26.8.1`

### Requirement: Predictable update script
The repository SHALL provide an executable `update.sh` that performs a fast-forward-only Git pull, updates locked dependencies when needed, builds, and runs the verification defined by the script's existing design. It MUST support a clean v0.3.0 to v0.4.0 update and MUST NOT reset, discard, or overwrite local changes, environment configuration, the local Actual runtime cache, integration cache, MCP E2E cache data, or Hermes configuration.

#### Scenario: Clean v0.3.0 to v0.4.0 update
- **WHEN** the checkout is clean and the remote branch can fast-forward
- **THEN** `update.sh` updates dependencies as required, builds and verifies v0.4.0, and preserves local environment and cache data

#### Scenario: Local runtime data exists
- **WHEN** integration data, E2E data, Actual cache data, or Hermes configuration exists before update
- **THEN** the update process leaves those resources intact

#### Scenario: Diverged or dirty checkout
- **WHEN** a safe fast-forward update cannot proceed
- **THEN** the script stops without destructive Git operations and reports how the operator can inspect the state

### Requirement: Repository documentation and secret hygiene
The repository SHALL keep `.env.example`, `.gitignore`, `README.md`, and `CHANGELOG.md`. README SHALL include a `Budget` section documenting integer minor units, strict month format, all eight budget tools, mode-aware income behavior, prospective carryover, incremental hold, reset semantics, dry-run copy, hidden-category opt-in, and overwrite protection. CHANGELOG SHALL contain a `0.4.0` entry with `Added`, `Changed`, and `Fixed`. The installed API contract document SHALL record exact 26.8.1 budget shapes and behavioral findings. All project-authored material SHALL remain in English and examples MUST NOT contain real credentials or financial fixture values.

#### Scenario: v0.4.0 documentation inspection
- **WHEN** the published repository is inspected
- **THEN** all eight budget tools, safety rules, mode limitations, API discoveries, examples, and version changes are documented in English

#### Scenario: Copy and mutation warnings
- **WHEN** budget copy, carryover, hold, or reset is documented
- **THEN** documentation explains dry-run defaults, overwrite confirmation, hidden opt-in, prospective or incremental effects, and recovery behavior

#### Scenario: Local environment file
- **WHEN** a developer creates a local environment file from the example
- **THEN** Git ignores the secret-bearing file

### Requirement: Automated verification
The project SHALL include unit tests for every budget schema, shape, client path, tool result, mode rule, error, annotation, copy mode, idempotency case, and compatibility case; contract tests for installed 26.8.1 exports and sanitized raw budget shapes; opt-in real-server integration read/write tests; and real MCP stdio E2E read/write and negative tests. GitHub Actions SHALL continue to run only locked installation, type checking, unit tests, contract tests, and build without private-server dependencies or writes.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated on public GitHub-hosted CI
- **THEN** CI executes `npm ci`, type checking, unit tests, contract tests, and build without Actual credentials or real-server writes

#### Scenario: Real budget read verification
- **WHEN** the configured Actual Server is available
- **THEN** integration and compiled stdio E2E reads validate available months, month shapes, summaries, nullability, signs, and structural coherence without fragile permanent financial-value assertions

#### Scenario: Authorized real budget writes
- **WHEN** `ACTUAL_INTEGRATION_ALLOW_WRITES=true` is scoped to an explicitly authorized local process
- **THEN** integration and compiled stdio E2E suites exercise isolated amount, zero, carryover, hold/reset, copy, guard, idempotency, negative, synchronization, cleanup, and fingerprint cases through the official API

#### Scenario: Exact MCP discovery
- **WHEN** the compiled stdio E2E client lists tools
- **THEN** it discovers exactly 42 tools and exercises budget operations through the MCP client rather than direct handlers

### Requirement: Per-run ownership and budget cleanup
Every real integration and E2E write run SHALL create uniquely named temporary budget category groups and categories, record exact returned IDs immediately, and select source and target months dynamically from the official available-month range. Before writing, the suite MUST prove the selected future months contain no protected permanent planning state. Cleanup SHALL restore captured month-level state, clear owned category budget amounts, disable owned carryover, reset only holds created by the run, and then remove temporary entities by exact ID in dependency order.

#### Scenario: Safe dynamic month selection
- **WHEN** a write suite prepares budget test months
- **THEN** it chooses sufficiently future months from `getBudgetMonths`, verifies the source and target are suitable, and fails safely if protected data exists

#### Scenario: Successful budget cleanup
- **WHEN** a real budget write suite completes or fails after creating temporary state
- **THEN** `finally` cleanup restores captured month-level state, removes owned budget configuration, deletes owned resources by exact ID, and confirms their absence

#### Scenario: Cleanup failure
- **WHEN** owned budget or entity state cannot be restored or removed
- **THEN** the suite fails and reports sanitized exact IDs, months, and recovery context without deleting by a global prefix

### Requirement: Permanent fixture integrity
Real write suites SHALL NOT mutate or delete permanent accounts, category groups, categories, payees, rules, transactions, or monthly budget configuration. Suites SHALL capture stable baseline fingerprints including relevant permanent budget-month shapes before writes and verify after cleanup that every permanent component is unchanged. Temporary resources MUST be excluded only through exact run-owned IDs rather than broad name matching.

#### Scenario: Post-write integrity check
- **WHEN** cleanup finishes after an integration or E2E budget write run
- **THEN** permanent entities, original transactions, and relevant permanent budget configuration fingerprints are identical to baseline

#### Scenario: Leftover temporary budget state
- **WHEN** an owned budget amount, carryover, hold, category, or group remains after cleanup
- **THEN** the suite fails readiness and reports the leftover state

## REMOVED Requirements

### Requirement: Strict v0.3.0 readiness gate
**Reason**: The release gate is superseded by the complete v0.4.0 budget-aware gate.

**Migration**: Use `Strict v0.4.0 readiness gate`, which retains every prior verification and adds budget-specific evidence.

## ADDED Requirements

### Requirement: Strict v0.4.0 readiness gate
The v0.4.0 release SHALL be declared ready only after typecheck, unit, contract, build, real integration read/write, real stdio E2E read/write and negative tests, repeated post-write reads, budget cleanup and fingerprint verification, backward compatibility, install/update checks, Git hygiene, and secret scans have actually passed. Missing credentials, an unavailable required server, a skipped supported suite, tracking claims without required evidence, failed cleanup, changed fixture, leftover state, or an unexecuted mandatory test SHALL result in `ACTUAL BUDGET MCP v0.4.0 NOT READY`.

#### Scenario: Every required check passes
- **WHEN** all local, real-server, stdio, cleanup, compatibility, installation, update, Git, secret-hygiene, and build checks complete successfully
- **THEN** the final report ends with exactly `ACTUAL BUDGET MCP v0.4.0 READY`

#### Scenario: Required verification unavailable
- **WHEN** any required supported integration, E2E, cleanup, mode, install, or update verification cannot be executed
- **THEN** the report lists the blocker and ends with exactly `ACTUAL BUDGET MCP v0.4.0 NOT READY`
