## MODIFIED Requirements

### Requirement: Package commands and executable
The project SHALL report version `1.0.0` consistently in package metadata, lockfile root metadata, MCP server metadata, README, CHANGELOG, Docker examples, release documentation, and applicable OpenSpec requirements while keeping `@actual-app/api` exactly `26.8.1`. It SHALL preserve the existing development, build, start, unit, coverage, contract, integration, E2E, and aggregate test commands and SHALL add a non-destructive `npm run release:check`. `npm start` SHALL execute `node dist/index.js`, package metadata SHALL keep the `actual-budget-mcp` executable targeting the compiled entry point, and the compiled entry SHALL remain executable.

#### Scenario: Build and start
- **WHEN** an operator runs the documented build and start commands on Node 22 or a separately tested supported version
- **THEN** the executable 1.0.0 MCP stdio server starts from `dist/index.js`

#### Scenario: Version inspection
- **WHEN** package metadata, lockfile metadata, MCP discovery, runtime status, documentation, Docker examples, and release evidence are inspected
- **THEN** every MCP version is `1.0.0` and the SDK version is exactly `26.8.1`

#### Scenario: SDK remains pinned
- **WHEN** locked dependencies are installed for release acceptance
- **THEN** the installed `@actual-app/api` version equals `26.8.1` without a range or implicit upgrade

#### Scenario: Production start
- **WHEN** dependencies are installed and the project has been built
- **THEN** `npm start` launches the v1.0.0 MCP stdio process from `dist/index.js`

#### Scenario: Type and coverage validation
- **WHEN** `npm run typecheck` or `npm run test:coverage` is executed
- **THEN** TypeScript is checked without emission or coverage is produced through the supported command

#### Scenario: SDK version inspection
- **WHEN** package and lock metadata are inspected
- **THEN** `@actual-app/api` remains pinned exactly to `26.8.1`

## ADDED Requirements

### Requirement: Safe release check
`npm run release:check` SHALL execute only default-safe local gates: type checking, unit tests, installed-contract tests, build, generated-artifact verification, and appropriate static Git/distribution hygiene. It MUST NOT require Actual credentials, contact a private Actual Server, enable writes, invoke real mutation suites, or call itself recursively through another script. Hosted CI SHALL either call this command once after locked installation or run the same nonduplicative gates explicitly.

#### Scenario: Release check without private environment
- **WHEN** `npm run release:check` runs on hosted CI without Actual credentials
- **THEN** all local gates execute and no real Actual read or write is attempted

#### Scenario: Release check passes alone
- **WHEN** the safe release check passes but mandatory real acceptance has not run
- **THEN** the project is not declared ready for production

### Requirement: Aggregate test semantics
`npm run test:all` SHALL run type checking, unit, contract, configured real integration read, compiled stdio E2E read, and build behavior while real write suites remain explicitly opt-in. Its output and documentation SHALL distinguish executed, skipped, unavailable, and unsupported suites. A successful aggregate development command MUST NOT convert a skipped mandatory release suite into readiness evidence.

#### Scenario: Configured reads with writes disabled
- **WHEN** real environment configuration is available and write authorization is false
- **THEN** aggregate testing executes read integration and read E2E, keeps write suites skipped, and reports both states accurately

#### Scenario: No real environment
- **WHEN** aggregate testing runs without Actual configuration
- **THEN** local gates may pass but real suites are reported as skipped and final readiness remains blocked

### Requirement: Reproducible installation and update acceptance
The documented primary installation SHALL remain `git clone`, repository entry, and `./install.sh` with Node and npm requirements, locked installation, build, executable verification, cache creation, credential-free output, and safe Hermes configuration guidance. `./update.sh` SHALL refuse a dirty checkout, use fast-forward-only pull, install from the lockfile, verify and build, preserve ignored environment, cache, E2E/integration, and Hermes files, and perform no reset, clean, forced checkout, or automatic rollback. An isolated test SHALL prove the exact clean 0.7.0-to-1.0.0 path from an immutable baseline. Rollback documentation SHALL use an explicit Git tag or commit and manual operator steps.

#### Scenario: Fresh installation
- **WHEN** installation runs in a clean isolated checkout with supported Node and npm
- **THEN** it produces an executable compiled server without reading, storing, or printing credentials

#### Scenario: Clean v0.7.0 update
- **WHEN** an isolated client starts from the recorded 0.7.0 baseline with ignored runtime sentinels and the remote can fast-forward to 1.0.0
- **THEN** update succeeds and every environment, cache, integration, E2E, and Hermes sentinel remains unchanged

#### Scenario: Dirty or diverged update
- **WHEN** the checkout is dirty or cannot fast-forward
- **THEN** update stops without discarding local or runtime state and provides safe inspection guidance

### Requirement: Package and container hygiene
Release verification SHALL run a package dry-run and inspect its file list, build the Docker image, and start the stdio entry in a controlled configuration when the local Docker runtime is available. The package and tracked repository MUST NOT contain local environment files, credentials, Actual runtime databases, caches, private Hermes configuration, temporary integration/E2E state, logs, private paths, or personal financial data. Docker remains optional for operators but mandatory readiness evidence when this release claims Docker support.

#### Scenario: Package dry-run
- **WHEN** the release package contents are listed without publication
- **THEN** only intended runtime, documentation, license, and metadata files are included and no private runtime artifact appears

#### Scenario: Docker validation
- **WHEN** the release image is built and its stdio executable is started under controlled configuration
- **THEN** it runs as the documented non-root stdio process without exposing an HTTP port or embedding credentials

#### Scenario: Docker unavailable during final acceptance
- **WHEN** mandatory Docker evidence cannot be executed
- **THEN** readiness reports the unavailable gate and does not declare production readiness

### Requirement: Version 1 documentation set
The release SHALL provide generated tool, error, limits, idempotency, sync, acceptance, and support references plus narrative public-contract, import-workflow, security-review, Hermes-upgrade, Hermes-smoke-test, README, CHANGELOG, troubleshooting, and readiness documentation. README SHALL provide a concise Quick Start and domain navigation rather than duplicating the full 62-tool inventory. Documentation SHALL define the three operational modes, signed integer money, dates, nullability, confirmation, dry-run, synchronization and recovery semantics, semver policy, pinned SDK, update rollback, and all known limitations. Examples MUST use placeholders and MUST NOT contain credentials or private infrastructure data.

#### Scenario: Operator follows Quick Start
- **WHEN** a new operator follows README installation, configuration, and Hermes steps
- **THEN** they can build and configure the stdio server without storing credentials in tracked files

#### Scenario: Existing Alfred or Hermes operator upgrades
- **WHEN** the operator follows `docs/hermes-upgrade-v1.md` and the non-destructive smoke guide
- **THEN** they update, reload, verify version and tool discovery, and perform representative reads without reorganizing or importing real data

#### Scenario: Known limitations
- **WHEN** support documentation is inspected
- **THEN** Pluggy, cron, MCP HTTP, direct bank sync, raw ActualQL, direct SQLite, manual rule execution/preview, transfer schedules, manual schedule posting, reconciliation locking, and any unexercised tracking fixture are explicit rather than hidden

### Requirement: Comprehensive final acceptance
The final 1.0.0 commit SHALL complete typecheck, unit, coverage, contract, build, safe release check, real integration read/write, compiled stdio E2E read/write, exhaustive read-only and destructive-disabled modes, protocol resilience, process restart, cleanup failure recovery, fresh installation, isolated update, Docker, package dry-run, secret and tracked-file scans, Git diff checking, and strict OpenSpec validation. Real writes SHALL require process-scoped `ACTUAL_INTEGRATION_ALLOW_WRITES=true`, create only uniquely owned temporary resources, clean up by exact captured IDs in `finally`, report exact leftovers safely, and restore the permanent fingerprint. Write authorization SHALL then be removed before final read and aggregate reruns.

#### Scenario: Authorized write campaign
- **WHEN** the operator explicitly authorizes the integration and E2E write processes against the controlled Actual fixture
- **THEN** every mutable domain lifecycle completes, cleanup removes exact run-owned resources, and the permanent fingerprint equals its baseline

#### Scenario: Cleanup assertion fails mid-run
- **WHEN** a test fails after creating persistent resources
- **THEN** deterministic `finally` cleanup runs, and any cleanup failure reports exact sanitized leftover IDs and fails readiness

#### Scenario: Mandatory gate skipped
- **WHEN** any supported mandatory gate is failed, skipped, unavailable, or not executed on the final release commit
- **THEN** the readiness report lists it as a release blocker

### Requirement: Version 1 readiness decision
The final `docs/release-readiness-1.0.0.md` SHALL record the date, source commit, release and SDK identity, 62-tool freeze, contract compatibility, verification counts and coverage, domain acceptance, security acceptance, cleanup integrity, distribution evidence, known limitations, and blockers. It SHALL end with exactly `ACTUAL BUDGET MCP v1.0.0 READY FOR PRODUCTION USE` only when every supported mandatory gate passed on the final commit; otherwise it SHALL end with exactly `ACTUAL BUDGET MCP v1.0.0 NOT READY`. Tag `v1.0.0` SHALL be prepared but MUST NOT be created or pushed automatically.

#### Scenario: Every mandatory gate passes
- **WHEN** all final-commit supported gates have executed successfully with no cleanup or compatibility blocker
- **THEN** the readiness report ends with exactly `ACTUAL BUDGET MCP v1.0.0 READY FOR PRODUCTION USE`

#### Scenario: Required evidence missing
- **WHEN** any mandatory evidence is missing or the permanent fingerprint changed
- **THEN** the report identifies the blockers and ends with exactly `ACTUAL BUDGET MCP v1.0.0 NOT READY`

### Requirement: Stable semantic versioning policy
The public contract documentation SHALL state that 1.x patch releases contain compatible bug fixes, 1.x minor releases may add backward-compatible tools or fields only under the documented compatibility policy, and 2.0 is required for removal, rename, newly required input, incompatible input restriction, or incompatible output change. No 1.x release may silently weaken safety guards or break the frozen contract.

#### Scenario: Proposed incompatible change after v1
- **WHEN** a future change would break a valid v1 request or required response contract
- **THEN** maintainers classify it for 2.0 or redesign it compatibly rather than publishing it silently in 1.x
