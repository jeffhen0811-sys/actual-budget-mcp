## Purpose

Define the externally observable configuration, connection, lifecycle, synchronization, and health behavior required to access one Actual Budget safely from a long-lived MCP process.

## ADDED Requirements

### Requirement: Environment configuration
The system SHALL read `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, and `ACTUAL_SYNC_ID` as required environment variables. The system SHALL read `ACTUAL_DATA_DIR` as optional and SHALL default it to `/tmp/actual-budget-mcp` when omitted. Configuration errors MUST identify the invalid field without exposing any secret value.

#### Scenario: Valid configuration
- **WHEN** all required variables contain non-empty valid values
- **THEN** the system accepts the configuration and resolves a writable data directory

#### Scenario: Required variable missing
- **WHEN** any required variable is absent or empty
- **THEN** startup-dependent Actual operations fail with a sanitized configuration error naming the missing variable

#### Scenario: Default data directory
- **WHEN** `ACTUAL_DATA_DIR` is omitted
- **THEN** the resolved cache directory is `/tmp/actual-budget-mcp`

### Requirement: Official Actual API boundary
The system SHALL perform every budget operation through the public API exported by `@actual-app/api`. Application code MUST NOT open, query, or modify the Actual SQLite files directly and MUST NOT expose arbitrary ActualQL queries.

#### Scenario: Budget operation
- **WHEN** a tool needs to read or mutate Actual data
- **THEN** the operation is performed through a documented public `@actual-app/api` method

### Requirement: Lazy single initialization
The MCP server SHALL become available for tool discovery without requiring the Actual Server to be reachable. The first Actual-dependent call SHALL initialize the client and load the configured budget, and concurrent calls SHALL share one initialization attempt. A failed attempt SHALL be cleared so a later call can retry.

#### Scenario: Tool discovery while Actual is unavailable
- **WHEN** an MCP client connects while the Actual Server is unavailable
- **THEN** the MCP client can still list all declared tools

#### Scenario: Concurrent first calls
- **WHEN** multiple Actual-dependent calls arrive before initialization completes
- **THEN** exactly one initialization and budget-load attempt is performed and all callers await it

#### Scenario: Retry after initialization failure
- **WHEN** initialization fails and the Actual Server later becomes reachable
- **THEN** a subsequent Actual-dependent call performs a new initialization attempt

### Requirement: Budget loading and cache isolation
The system SHALL load the budget identified by `ACTUAL_SYNC_ID` into `ACTUAL_DATA_DIR`. The MCP cache MUST remain separate from the Actual Server container's data volume, and the loaded-budget state SHALL be tracked independently from network connectivity.

#### Scenario: Budget loaded successfully
- **WHEN** initialization and budget download complete successfully
- **THEN** the client reports that the configured budget is loaded and operations use the local SDK-managed copy

#### Scenario: Encrypted budget without a key
- **WHEN** the configured budget requires end-to-end encryption credentials
- **THEN** the V1 client returns a sanitized `missing-key`-equivalent error and does not confuse the server password with an encryption password

### Requirement: Serialized Actual operations
The system SHALL execute Actual API operations through a single serialized queue so reads, writes, synchronization, initialization, and shutdown do not race over shared SDK state.

#### Scenario: Overlapping tool calls
- **WHEN** two tool handlers request Actual operations at the same time
- **THEN** their SDK operations execute one at a time in deterministic queue order

### Requirement: Synchronization behavior
The system SHALL expose explicit synchronization and SHALL synchronize after every successful transaction mutation before reporting the mutation as complete. A successful synchronization result SHALL include `success: true` and an ISO-8601 timestamp.

#### Scenario: Explicit synchronization
- **WHEN** `actual_sync` is called and synchronization succeeds
- **THEN** the tool returns `success: true` and the completion timestamp

#### Scenario: Synchronization after mutation
- **WHEN** an import, update, or deletion changes the budget
- **THEN** synchronization completes before the tool reports success

#### Scenario: Synchronization failure after mutation
- **WHEN** a mutation succeeds locally but the following synchronization fails
- **THEN** the tool returns a sanitized error that states the local change may require a later explicit synchronization

### Requirement: Health reporting
The system SHALL expose `actual_health` with `connected`, sanitized `server`, `budgetLoaded`, and the Actual Server version when available. Connectivity SHALL reflect an active server check, while `budgetLoaded` SHALL reflect local client state. Health responses MUST NOT contain passwords, tokens, or stack traces.

#### Scenario: Healthy server and loaded budget
- **WHEN** the server check succeeds and the configured budget is loaded
- **THEN** health reports `connected: true`, `budgetLoaded: true`, the sanitized server URL, and the available server version

#### Scenario: Server unavailable with local budget loaded
- **WHEN** the server check fails after a budget was loaded locally
- **THEN** health reports `connected: false` and `budgetLoaded: true` with a sanitized diagnostic code

### Requirement: Graceful shutdown
The system SHALL invoke the official shutdown operation at most once when the MCP process terminates normally or receives a supported termination signal. Shutdown errors SHALL be logged safely to stderr and MUST NOT write protocol-invalid output to stdout.

#### Scenario: Process termination
- **WHEN** the process receives `SIGINT` or `SIGTERM`
- **THEN** pending queued work is settled or rejected, the Actual client is shut down once, and the process exits
