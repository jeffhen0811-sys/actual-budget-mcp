## MODIFIED Requirements

### Requirement: Package commands and executable
The project SHALL report version `0.5.0` consistently in package metadata, lockfile root metadata, MCP server metadata, README, and CHANGELOG while keeping `@actual-app/api` exactly `26.8.1`. It SHALL preserve `npm run dev`, `npm run build`, `npm start`, `npm test`, `npm run test:coverage`, `npm run typecheck`, `npm run test:contract`, `npm run test:integration`, `npm run test:integration:read`, `npm run test:integration:write`, `npm run test:e2e`, `npm run test:e2e:read`, `npm run test:e2e:write`, and `npm run test:all`. `npm start` SHALL execute `node dist/index.js`, and package metadata SHALL keep the `actual-budget-mcp` executable targeting the compiled entry point.

#### Scenario: Production start
- **WHEN** dependencies are installed and the project has been built
- **THEN** `npm start` launches the v0.5.0 MCP stdio process from `dist/index.js`

#### Scenario: Type and coverage validation
- **WHEN** `npm run typecheck` or `npm run test:coverage` is executed
- **THEN** TypeScript is checked without emission or coverage is produced through the preserved supported command

#### Scenario: SDK version inspection
- **WHEN** package and lock metadata are inspected
- **THEN** `@actual-app/api` remains pinned exactly to `26.8.1`

### Requirement: Predictable update script
The repository SHALL provide an executable `update.sh` that performs a fast-forward-only Git pull, updates locked dependencies when needed, builds, and runs the verification defined by the script's existing design. It MUST support a clean v0.4.0 to v0.5.0 update and MUST NOT reset, discard, or overwrite local changes, environment configuration, the local Actual runtime cache, integration cache, MCP E2E cache data, or Hermes configuration.

#### Scenario: Clean v0.4.0 to v0.5.0 update
- **WHEN** the checkout is clean and the remote branch can fast-forward
- **THEN** `update.sh` updates dependencies as required, builds and verifies v0.5.0, and preserves local environment and cache data

#### Scenario: Local runtime data exists
- **WHEN** integration data, E2E data, Actual cache data, or Hermes configuration exists before update
- **THEN** the update process leaves those resources intact

#### Scenario: Diverged or dirty checkout
- **WHEN** a safe fast-forward update cannot proceed
- **THEN** the script stops without destructive Git operations and reports how the operator can inspect the state

### Requirement: Repository documentation and secret hygiene
The repository SHALL keep `.env.example`, `.gitignore`, `README.md`, and `CHANGELOG.md`. README SHALL document advanced transaction search, exact lookup, bulk transaction updates, import preview, integer signed amounts, pagination, split modes, default bulk dry-run, protected transfers/splits, preview-only identifiers, and the recommended preview-review-import-verify workflow. CHANGELOG SHALL contain a `0.5.0` entry with `Added`, `Changed`, and `Fixed`. The installed API contract document SHALL record exact 26.8.1 ActualQL, split, nullability, import-option, dry-run, rule, reconciliation, deleted-import, identifier, and normalization findings, including unsupported options. All project-authored material SHALL remain in English and examples MUST NOT contain real credentials or financial fixture values.

#### Scenario: v0.5.0 documentation inspection
- **WHEN** the published repository is inspected
- **THEN** all four new tools, enhanced import options, safety rules, limitations, examples, and version changes are documented in English

#### Scenario: Safe import workflow
- **WHEN** preview and import are documented
- **THEN** documentation explains identical normalized payload/options, request fingerprint scope, preview-only IDs, review before confirmation, post-import exact verification, and the fact that preview never writes

#### Scenario: Query boundary documentation
- **WHEN** advanced search is documented
- **THEN** it describes typed MCP filters and official API use without documenting raw ActualQL as caller input

#### Scenario: Local environment file
- **WHEN** a developer creates a local environment file from the example
- **THEN** Git ignores the secret-bearing file

### Requirement: Automated verification
The project SHALL include unit tests for every advanced transaction schema, canonical projection, query builder, filter, null case, split mode, pagination and total rule, bulk plan and guard, partial failure phase, preview purity, fingerprint, import option, annotation, structured result, and backward-compatibility case; installed-contract tests for 26.8.1 query/import exports, declarations, serialized query shapes, split behavior, options, return shapes, and relevant bundle discrepancies; opt-in real-server integration read/write tests; and real MCP stdio E2E read/write and negative tests. GitHub Actions SHALL continue to run only locked installation, type checking, unit tests, contract tests, and build without private-server dependencies or writes.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated on public GitHub-hosted CI
- **THEN** CI executes `npm ci`, type checking, unit tests, contract tests, and build without Actual credentials or real-server writes

#### Scenario: Installed query and import contract
- **WHEN** contract tests inspect the pinned installed package
- **THEN** they verify public `q` and `aqlQuery`, fixed transaction query features, split options, `dryRun`, `defaultCleared`, `reimportDeleted`, returned import evidence, canonical fields, and the absence of unsupported `payeeNameNormalization`

#### Scenario: Real integration read verification
- **WHEN** the configured Actual Server is available without write authorization
- **THEN** read tests exercise exact lookup, structured search filters, deterministic ordering, pagination, nullability, and available split semantics without mutating state

#### Scenario: Authorized real integration write verification
- **WHEN** `ACTUAL_INTEGRATION_ALLOW_WRITES=true` is scoped to an explicitly authorized local test process
- **THEN** integration tests exercise isolated bulk dry-run/write/idempotency, import preview/reconciliation/options/rules, exact cleanup, and permanent fingerprint integrity

#### Scenario: Real MCP stdio verification
- **WHEN** the authorized E2E read/write suites run
- **THEN** they discover exactly 46 tools and exercise lookup, search, bulk, preview, enhanced import, negative inputs, and continued stdio health through a real MCP client and compiled process

#### Scenario: Dry-run purity verification
- **WHEN** preview import or bulk dry-run is exercised against controlled real fixtures
- **THEN** complete before/after fingerprints prove no persisted account, transaction, payee, category, or rule change

### Requirement: Per-run ownership and transaction cleanup
Every real integration and E2E write run SHALL create uniquely identified temporary accounts, category groups, categories, payees, rules, and transactions as required, record every exact returned persistent ID immediately, and clean up by exact ID in dependency order. Preview-only generated IDs MUST NOT be registered as persistent cleanup targets. Prefix search MAY be used only as an additional leftover assertion and MUST NOT select primary deletion targets. Existing budget-state restoration guarantees SHALL remain in effect.

#### Scenario: Immediate exact-ID ownership
- **WHEN** a write suite creates or imports a persistent temporary resource
- **THEN** its exact returned ID is recorded before the next dependent operation

#### Scenario: Preview-only outcome
- **WHEN** import preview returns generated would-add identifiers
- **THEN** they are not treated as persisted resources and no deletion is attempted for those IDs

#### Scenario: Successful transaction cleanup
- **WHEN** a real transaction write suite completes or fails after creating temporary state
- **THEN** `finally` cleanup removes owned transactions, rules, payees, categories, groups, and accounts by exact ID in dependency order and confirms their absence

#### Scenario: Cleanup failure
- **WHEN** owned state cannot be restored or removed
- **THEN** the suite fails and reports sanitized exact IDs and recovery context without broad prefix deletion

### Requirement: Permanent fixture integrity
Real write and preview suites SHALL NOT mutate or delete permanent accounts, category groups, categories, payees, rules, transactions, or monthly budget configuration. Suites SHALL capture stable baseline fingerprints including accounts, transactions, payees, categories, rules, and relevant budget-month shapes before writes or dry-runs and verify after preview and after cleanup that every permanent component is unchanged. Temporary resources MUST be excluded only through exact run-owned IDs rather than broad name matching, and integration and E2E suites MUST NOT reuse each other's temporary entities.

#### Scenario: Preview integrity check
- **WHEN** an import preview or bulk dry-run finishes
- **THEN** the complete permanent-state fingerprint remains identical to baseline before any subsequent real import or write

#### Scenario: Post-write integrity check
- **WHEN** cleanup finishes after an integration or E2E transaction write run
- **THEN** permanent entities, original transactions, rules, and relevant budget configuration fingerprints are identical to baseline

#### Scenario: Leftover temporary data
- **WHEN** any owned temporary account, category group, category, payee, rule, or transaction remains after cleanup
- **THEN** the suite fails readiness and reports the leftover resource

### Requirement: Strict v0.5.0 readiness gate
The v0.5.0 release SHALL be declared ready only after typecheck, unit, coverage, contract, build, real integration read/write, real stdio E2E read/write and negative tests, performance observations, preview and bulk dry-run purity, cleanup and fingerprint verification, backward compatibility, clean installation, v0.4.0-to-v0.5.0 update verification, Git hygiene, and secret scans have actually passed. Missing credentials, an unavailable required server, a skipped supported suite, unsupported semantic claims, failed cleanup, changed fixture, leftover state, or an unexecuted mandatory test SHALL result in `ACTUAL BUDGET MCP v0.5.0 NOT READY`.

#### Scenario: Every required check passes
- **WHEN** all local, real-server, stdio, purity, cleanup, compatibility, installation, update, Git, secret-hygiene, performance-observation, and build checks complete successfully
- **THEN** the final report ends with exactly `ACTUAL BUDGET MCP v0.5.0 READY`

#### Scenario: Required verification unavailable
- **WHEN** any required supported integration, E2E, cleanup, split, transfer, preview, option, install, or update verification cannot be executed
- **THEN** the report lists the blocker and ends with exactly `ACTUAL BUDGET MCP v0.5.0 NOT READY`
