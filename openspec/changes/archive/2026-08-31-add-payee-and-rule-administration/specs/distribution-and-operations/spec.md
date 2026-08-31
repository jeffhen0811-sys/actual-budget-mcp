## MODIFIED Requirements

### Requirement: Package commands and executable
The project SHALL report version `0.3.0` consistently in package metadata, lockfile root metadata, MCP server metadata, README, and CHANGELOG. It SHALL preserve `npm run dev`, `npm run build`, `npm start`, `npm test`, `npm run typecheck`, `npm run test:contract`, `npm run test:integration`, `npm run test:integration:read`, `npm run test:integration:write`, `npm run test:e2e`, `npm run test:e2e:read`, `npm run test:e2e:write`, and `npm run test:all`. `npm start` SHALL execute `node dist/index.js`, and package metadata SHALL keep the `actual-budget-mcp` executable targeting the compiled entry point.

#### Scenario: Production start
- **WHEN** dependencies are installed and the project has been built
- **THEN** `npm start` launches the v0.3.0 MCP stdio process from `dist/index.js`

#### Scenario: Type validation
- **WHEN** `npm run typecheck` is executed
- **THEN** the TypeScript project is checked without emitting build artifacts

### Requirement: Predictable update script
The repository SHALL provide an executable `update.sh` that performs a fast-forward-only Git pull, updates locked dependencies when needed, builds, and runs the verification defined by the script's existing design. It MUST support a clean v0.2.0 to v0.3.0 update and MUST NOT reset, discard, or overwrite local changes, environment configuration, the local Actual cache, `.actual-test-data`, MCP E2E cache data, or Hermes configuration.

#### Scenario: Clean v0.2.0 to v0.3.0 update
- **WHEN** the checkout is clean and the remote branch can fast-forward
- **THEN** `update.sh` updates dependencies as required, builds and verifies v0.3.0, and preserves local environment and cache data

#### Scenario: Local runtime data exists
- **WHEN** test data, Actual cache data, or Hermes configuration exists before update
- **THEN** the update process leaves those resources intact

#### Scenario: Diverged or dirty checkout
- **WHEN** a safe fast-forward update cannot proceed
- **THEN** the script stops without destructive Git operations and reports how the operator can inspect the state

### Requirement: Repository documentation and secret hygiene
The repository SHALL keep `.env.example`, `.gitignore`, `README.md`, and `CHANGELOG.md`. README SHALL document `Payees`, `Rules`, and `Automatic categorization foundation` sections; every new tool's purpose, input, output, example, and destructive warning where applicable; the `default` stage translation; conservative authoring limits; and unsupported manual rule run and preview. CHANGELOG SHALL contain a `0.3.0` entry with `Added`, `Changed`, and `Fixed`. All project-authored documentation, code comments, script messages, test descriptions, examples, and configuration guidance SHALL be written in English. Examples MUST NOT contain real credentials.

#### Scenario: v0.3.0 documentation inspection
- **WHEN** the published repository is inspected
- **THEN** all ten new tools, safety constraints, automatic-categorization flow, API compatibility discoveries, unsupported features, and version changes are documented in English

#### Scenario: Destructive tool documentation
- **WHEN** payee deletion, payee merge, or rule deletion is documented
- **THEN** the documentation identifies it as destructive, requires explicit confirmation, and explains its preflight or protected-refusal behavior

#### Scenario: Local environment file
- **WHEN** a developer creates `.env` from `.env.example`
- **THEN** Git ignores the local secret-bearing file

### Requirement: Automated verification
The project SHALL include unit tests for every new schema, adapter behavior, client path, tool result, error, annotation, and compatibility case; contract tests for installed payee and rule exports, nullability, stages, conditions, actions, IDs, arrays, transfer payees, merge behavior, and delete outcomes; real-server integration read/write tests; and real MCP stdio E2E read/write tests. GitHub Actions SHALL continue to run `npm ci`, type checking, unit tests, contract tests, and build without requiring access to the private Actual Server. Real integration and E2E suites MUST NOT become mandatory on a GitHub-hosted runner that cannot reach the configured server.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated on public GitHub-hosted CI
- **THEN** CI installs locked dependencies and executes type checking, unit tests, contract tests, and build without real-server writes

#### Scenario: Credential sentinel test
- **WHEN** tests inject a recognizable sentinel as the Actual password and trigger failures
- **THEN** captured logs and MCP results contain no sentinel value

#### Scenario: Real integration write verification
- **WHEN** `ACTUAL_INTEGRATION_ALLOW_WRITES=true` is scoped to an explicitly authorized local test process
- **THEN** integration tests exercise payee CRUD, protected merge, rule CRUD, import-time functional rule execution, negative paths, synchronization, exact-ID cleanup, and permanent-fixture integrity against the configured Actual Server

#### Scenario: Real MCP stdio verification
- **WHEN** the authorized E2E read/write suites run
- **THEN** they discover exactly 34 tools and exercise the new operations through a real MCP client, compiled stdio process, official Actual API, and configured Actual Server rather than direct handlers

### Requirement: Manual Actual acceptance flow
The project SHALL retain an explicitly authorized acceptance flow against the configured controlled Actual budget and SHALL automate the v0.3.0 integration and stdio E2E coverage where practical. The flow SHALL cover startup, exact 34-tool discovery, health, all compatible v0.2.0 behaviors, payee administration, rule administration, import-time functional execution, synchronization, cleanup, repeated post-write reads, and permanent-fixture verification. Real-server destructive acceptance MUST NOT run in public CI.

#### Scenario: Controlled end-to-end acceptance
- **WHEN** an operator supplies test credentials and explicitly enables real writes for the test process
- **THEN** all required v0.2.0 and v0.3.0 read/write steps complete without corrupting permanent fixture data

#### Scenario: Public CI
- **WHEN** GitHub Actions runs without Actual credentials or private-network reachability
- **THEN** it performs no mutation against a real Actual Server

### Requirement: Per-run ownership and cleanup
Every real integration and E2E write run SHALL create uniquely named temporary entities using a run identifier, record each exact returned ID immediately, and clean only entities whose IDs were recorded by that run. Cleanup SHALL respect dependency order: temporary transactions, rules, payees, categories, category groups, and accounts. The primary strategy MUST NOT discover and delete entities solely by a global prefix search, and payees explicitly designated as permanent fixtures MUST never be registered for mutation or cleanup.

#### Scenario: Successful cleanup
- **WHEN** a real write suite completes or fails after creating temporary data
- **THEN** its `finally` cleanup removes owned resources by exact ID in dependency order and confirms their absence

#### Scenario: Cleanup failure
- **WHEN** an owned entity cannot be removed
- **THEN** the suite fails and reports the sanitized entity type, ID, and name that remain

#### Scenario: Proposed fallback to prefix cleanup
- **WHEN** exact-ID cleanup is shown during implementation to have disproportionate complexity or execution cost
- **THEN** implementation pauses and presents evidence, risks, and safeguards for explicit user approval before any prefix-based fallback is introduced

### Requirement: Permanent fixture integrity
Real write suites SHALL NOT mutate or delete permanent accounts, category groups, categories, payees, rules, or transactions. Permanent payees include `Empresa Teste`, `Supermercado Teste`, `Companhia de Energia Teste`, `Posto Teste`, `Netflix Teste`, `Restaurante Teste`, and `Loja Online Teste`. Suites SHALL capture stable baseline fingerprints including all current rules and payees before writes and verify after cleanup that permanent fixtures and original transactions remain unchanged. Integration and E2E suites SHALL own isolated resources and MUST NOT reuse each other's temporary entities.

#### Scenario: Post-write integrity check
- **WHEN** cleanup finishes after an integration or E2E write run
- **THEN** permanent accounts, groups, categories, payees, rules, and original transaction fingerprints remain present and unchanged

#### Scenario: Leftover temporary data
- **WHEN** any owned temporary account, category group, category, payee, rule, or transaction remains after cleanup
- **THEN** the suite fails readiness and reports the leftover resource

### Requirement: Strict v0.3.0 readiness gate
The v0.3.0 release SHALL be declared ready only after typecheck, unit, contract, build, real integration read/write, real stdio E2E read/write, post-write cleanup verification, repeated read suites, compatibility checks, and secret-hygiene checks have actually passed. An unavailable server, missing credential, skipped required supported suite, failed cleanup, changed fixture, leftover resource, or unexecuted real test SHALL produce final result `ACTUAL BUDGET MCP v0.3.0 NOT READY`. Only a fully verified release SHALL produce `ACTUAL BUDGET MCP v0.3.0 READY`.

#### Scenario: Every required check passes
- **WHEN** all local, real-server, stdio, cleanup, compatibility, secret-hygiene, and build checks complete successfully
- **THEN** the final report ends with exactly `ACTUAL BUDGET MCP v0.3.0 READY`

#### Scenario: Required real test is unavailable
- **WHEN** a required integration or E2E suite for a supported capability cannot be executed against the real configured server
- **THEN** the report identifies the blocker and ends with exactly `ACTUAL BUDGET MCP v0.3.0 NOT READY`

## RENAMED Requirements

- FROM: `### Requirement: Strict v0.2.0 readiness gate`
- TO: `### Requirement: Strict v0.3.0 readiness gate`
