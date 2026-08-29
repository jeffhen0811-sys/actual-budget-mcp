## Purpose

Define reproducible installation, execution, update, deployment, documentation, versioning, and verification behavior for distributing the MCP from GitHub and operating it with Hermes.

## ADDED Requirements

### Requirement: Package commands and executable
The project SHALL start at version `0.1.0` and provide `npm run dev`, `npm run build`, `npm start`, `npm test`, and `npm run typecheck`. `npm start` SHALL execute `node dist/index.js`, and package metadata SHALL declare a future-facing `actual-budget-mcp` executable targeting the compiled entry point.

#### Scenario: Production start
- **WHEN** dependencies are installed and the project has been built
- **THEN** `npm start` launches the MCP stdio process from `dist/index.js`

#### Scenario: Type validation
- **WHEN** `npm run typecheck` is executed
- **THEN** the TypeScript project is checked without emitting build artifacts

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
The repository SHALL provide an executable `update.sh` that performs a fast-forward-only Git pull, a clean dependency installation, build/type verification, and tests. It MUST NOT reset, discard, or overwrite local changes automatically.

#### Scenario: Clean fast-forward update
- **WHEN** the checkout is clean and the remote branch can fast-forward
- **THEN** `update.sh` updates the checkout and completes dependency, type, test, and build verification

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
The repository SHALL include `.env.example`, `.gitignore`, `README.md`, and `CHANGELOG.md`. README SHALL contain Quick Start, Features, Requirements, Installation, Configuration, Hermes setup, Available tools with inputs and examples, Development, Tests, Updating, Security, and Troubleshooting. All project-authored documentation, code comments, script messages, test descriptions, examples, and configuration guidance SHALL be written in English. Example files and documentation MUST NOT contain real credentials.

#### Scenario: Repository inspection
- **WHEN** the published repository is inspected
- **THEN** all required documentation sections and support files exist in English with placeholders only

#### Scenario: Project-authored artifacts
- **WHEN** a maintainer reviews source comments, test descriptions, script output, examples, or configuration guidance
- **THEN** all project-authored language is English

#### Scenario: Local environment file
- **WHEN** a developer creates `.env` from `.env.example`
- **THEN** Git ignores the local secret-bearing file

### Requirement: Automated verification
The project SHALL include unit tests for environment validation, tool schemas, error conversion, transaction validation, and credential redaction. It SHALL include an MCP integration test for tool discovery and protocol-safe responses. GitHub Actions SHALL run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` for pushes and pull requests.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated
- **THEN** CI installs locked dependencies and executes type checking, tests, and build

#### Scenario: Credential sentinel test
- **WHEN** tests inject a recognizable sentinel as the Actual password and trigger failures
- **THEN** captured logs and MCP results contain no sentinel value

### Requirement: Manual Actual acceptance flow
The project SHALL document a manual, explicitly authorized acceptance flow against a controlled Actual budget/account that covers MCP startup, tool discovery, health, reads, import, lookup, update, deletion, sync, and process restart. Real-server destructive acceptance MUST NOT run in public CI.

#### Scenario: Controlled end-to-end acceptance
- **WHEN** an operator supplies test credentials and explicitly runs the documented acceptance flow against a controlled account
- **THEN** all V1 read/write steps complete and restarting the MCP neither duplicates nor corrupts the controlled transaction data

#### Scenario: Public CI
- **WHEN** the GitHub Actions workflow runs without Actual credentials
- **THEN** it uses mocks or in-memory transports and performs no mutation against a real Actual Server
