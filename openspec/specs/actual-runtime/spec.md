# actual-runtime Specification

## Purpose

Define the externally observable configuration, connection, lifecycle, synchronization, and health behavior required to access one Actual Budget safely from a long-lived MCP process.

## Requirements

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
The system SHALL perform every budget operation through the public API exported by the pinned `@actual-app/api@26.8.1`. The installed package's exported public types and signatures, supplemented by observed real-server tests, SHALL be the executable authority; current official documentation MAY provide context but MUST NOT override the installed contract. Application code MUST NOT open, query, or modify Actual SQLite files directly, expose arbitrary ActualQL queries, call internal endpoints, or upgrade the dependency implicitly.

#### Scenario: Budget operation
- **WHEN** a tool needs to read or mutate Actual data
- **THEN** the operation is performed through a public method exported by the installed `@actual-app/api@26.8.1`

#### Scenario: Documentation exceeds installed API
- **WHEN** current documentation describes a field or operation absent from the installed public types
- **THEN** the system excludes that behavior from v0.2.0 rather than invoking an internal workaround

#### Scenario: Mandatory method is unavailable
- **WHEN** a required capability cannot be implemented with the pinned public SDK
- **THEN** implementation stops and documents the limitation before any dependency upgrade or scope substitute is attempted

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
The system SHALL execute Actual API operations through a single serialized queue so reads, writes, synchronization, initialization, and shutdown do not race over shared SDK state. For each structural mutation, preflight reads, the optional mutation, synchronization, post-sync reads, state verification, and result construction SHALL occupy one uninterrupted queue position.

#### Scenario: Overlapping tool calls
- **WHEN** two tool handlers request Actual operations at the same time
- **THEN** their complete SDK operation lifecycles execute one at a time in deterministic queue order

#### Scenario: Structural preflight and mutation
- **WHEN** a structural mutation passes preflight
- **THEN** no other queued Actual operation can change the observed state before its mutation and verification complete

#### Scenario: Idempotent desired state
- **WHEN** preflight proves the target already has the requested state
- **THEN** the operation returns `changed: false` from the same queue position without mutation or synchronization

### Requirement: Synchronization behavior
The system SHALL expose explicit synchronization and SHALL synchronize after every successful transaction or structural mutation before reporting the mutation as complete. A structural success SHALL be followed by an official read that verifies the expected persisted state or confirmed absence. A successful explicit synchronization result SHALL include `success: true` and an ISO-8601 timestamp. The system MUST NOT automatically retry a mutation.

#### Scenario: Explicit synchronization
- **WHEN** `actual_sync` is called and synchronization succeeds
- **THEN** the tool returns `success: true` and the completion timestamp

#### Scenario: Synchronization after mutation
- **WHEN** an import, update, deletion, create, close, reopen, move, hide, or unhide operation changes the budget
- **THEN** synchronization and the required post-sync verification complete before the tool reports success

#### Scenario: Synchronization failure after mutation
- **WHEN** a mutation succeeds locally but the following synchronization fails
- **THEN** the tool returns `MUTATION_SYNC_FAILED`, `retryable: false`, `recoveryAction: "actual_sync"`, and safe optional entity context indicating that local state may have changed

#### Scenario: Verification failure after successful synchronization
- **WHEN** synchronization succeeds but the final official read cannot verify the persisted state
- **THEN** the tool returns `POST_MUTATION_READ_FAILED`, `retryable: false`, and state `synchronized_but_unverified` without retrying the mutation

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

### Requirement: Verified budget mutation lifecycle
Every single or compound budget mutation SHALL occupy one uninterrupted serialized queue position containing preflight reads, local mutation attempts, explicit synchronization when state may have changed, official post-sync reads, verification, and result construction. The system MUST NOT create a second Actual client or retry a budget mutation automatically.

#### Scenario: Single budget mutation
- **WHEN** a category budget, carryover, hold, or reset operation changes local state
- **THEN** no other Actual operation interleaves before synchronization and official read-back verification complete

#### Scenario: Compound budget copy
- **WHEN** a copy operation plans multiple category mutations
- **THEN** its complete preflight, mutation tracking, synchronization, and verification execute within one queue position

### Requirement: Recoverable compound mutation failure
When a compound budget mutation fails after any local change may have occurred, the system SHALL preserve safe per-item progress and original-target metadata sufficient to inspect and recover state. It MUST distinguish synchronization failure from successful synchronization followed by inconclusive verification and MUST NOT claim transactional rollback.

#### Scenario: Local failure after completed items
- **WHEN** a later copy item fails after earlier items completed locally
- **THEN** the error identifies attempted and completed category IDs, marks partial state, and instructs the caller to synchronize and read the target month before deciding on recovery

#### Scenario: Post-sync verification failure
- **WHEN** all planned local mutations and synchronization complete but read-back cannot verify the target
- **THEN** the error reports `synchronized_but_unverified` and does not replay any mutation
