## MODIFIED Requirements

### Requirement: Environment configuration
The system SHALL read `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, and `ACTUAL_SYNC_ID` as required environment variables. The system SHALL read `ACTUAL_DATA_DIR`, `ACTUAL_MCP_READ_ONLY`, and `ACTUAL_MCP_ALLOW_DESTRUCTIVE` as optional environment variables. `ACTUAL_DATA_DIR` SHALL default to `/tmp/actual-budget-mcp`, `ACTUAL_MCP_READ_ONLY` SHALL default to `false`, and `ACTUAL_MCP_ALLOW_DESTRUCTIVE` SHALL default to `true` to preserve prior behavior. Boolean configuration SHALL accept only explicit documented boolean strings. Configuration errors MUST identify the invalid field without exposing any secret or raw environment value.

#### Scenario: Valid configuration
- **WHEN** all required variables and any operational-mode variables contain valid values
- **THEN** the system accepts the configuration, resolves a writable data directory, and derives the effective operational policy

#### Scenario: Required variable missing
- **WHEN** any required variable is absent or empty
- **THEN** startup-dependent Actual operations fail with a sanitized configuration error naming the missing variable

#### Scenario: Default data directory
- **WHEN** `ACTUAL_DATA_DIR` is omitted
- **THEN** the resolved cache directory is `/tmp/actual-budget-mcp`

#### Scenario: Default data directory and modes
- **WHEN** `ACTUAL_DATA_DIR`, `ACTUAL_MCP_READ_ONLY`, and `ACTUAL_MCP_ALLOW_DESTRUCTIVE` are omitted
- **THEN** the cache directory is `/tmp/actual-budget-mcp`, MCP mutations are allowed, and destructive operations remain allowed subject to per-call safeguards

#### Scenario: Invalid operational boolean
- **WHEN** an operational-mode variable contains an unsupported value
- **THEN** configuration fails with a sanitized error before an Actual operation

### Requirement: Synchronization behavior
The system SHALL expose explicit synchronization when MCP mutations are permitted and SHALL synchronize after every successful transaction, structural, or schedule mutation before reporting the mutation as complete. A structural or schedule success SHALL be followed by an official read that verifies the expected persisted state or confirmed absence. A successful explicit synchronization result SHALL preserve `success: true` and its existing ISO-8601 timestamp and MAY add completion time and duration metadata. Every explicit or post-mutation sync initiated by the MCP SHALL update process-lifetime sync telemetry. The system MUST NOT automatically retry a mutation. `actual_sync` SHALL be blocked with `READ_ONLY_MODE` when MCP read-only mode is active because the pinned local-first SDK can upload pending local changes and trigger internal services.

#### Scenario: Explicit synchronization
- **WHEN** `actual_sync` is called while writes are allowed and synchronization succeeds
- **THEN** the tool returns its existing success fields, optional duration/completion metadata, and updates the runtime's last successful sync observation

#### Scenario: Explicit synchronization in read-only mode
- **WHEN** `actual_sync` is called while MCP read-only mode is active
- **THEN** the system returns `READ_ONLY_MODE` before invoking the Actual sync API

#### Scenario: Synchronization after mutation
- **WHEN** an import, update, deletion, create, close, reopen, move, hide, unhide, or schedule operation changes the budget
- **THEN** synchronization, telemetry update, and required post-sync verification complete before the tool reports success

#### Scenario: Synchronization failure after mutation
- **WHEN** a mutation succeeds locally but the following synchronization fails
- **THEN** the tool returns `MUTATION_SYNC_FAILED`, `retryable: false`, `recoveryAction: "actual_sync"`, and safe optional entity context indicating that local state may have changed, while runtime telemetry records a sanitized error code

#### Scenario: Verification failure after successful synchronization
- **WHEN** synchronization succeeds but the final official read cannot verify the persisted state
- **THEN** the tool returns `POST_MUTATION_READ_FAILED`, `retryable: false`, and state `synchronized_but_unverified` without retrying the mutation

### Requirement: Health reporting
The system SHALL expose `actual_health` with `connected`, sanitized `server`, `budgetLoaded`, and the Actual Server version when available. It MAY add optional `mcpVersion`, `sdkVersion`, and `readOnlyMode` fields without removing or changing existing required fields. Connectivity SHALL reflect an active server check, while `budgetLoaded` SHALL reflect local client state. Health responses MUST remain concise and MUST NOT contain passwords, tokens, sync IDs, private paths, stack traces, or raw environment values.

#### Scenario: Healthy server and loaded budget
- **WHEN** the server check succeeds and the configured budget is loaded
- **THEN** health reports `connected: true`, `budgetLoaded: true`, the sanitized server URL, the available server version, and any supported optional version or mode metadata

#### Scenario: Server unavailable with local budget loaded
- **WHEN** the server check fails after a budget was loaded locally
- **THEN** health reports `connected: false` and `budgetLoaded: true` with a sanitized diagnostic code

#### Scenario: Backwards-compatible health consumer
- **WHEN** a client consumes only the fields required by the v0.6.0 health contract
- **THEN** the v0.7.0 result remains compatible

## ADDED Requirements

### Requirement: Central operational policy enforcement
Every registered MCP tool SHALL have exactly one authoritative capability classification of `read`, `write`, or `destructive`. The same complete registry SHALL drive discovery inventory, MCP read-only and destructive annotations, runtime policy enforcement, and regression assertions. When MCP read-only mode is active, every write or destructive tool SHALL return `READ_ONLY_MODE` before Actual initialization, preflight, query, sync, or mutation. When destructive operations are disabled, every destructive tool SHALL return `DESTRUCTIVE_OPERATIONS_DISABLED` before entity preflight or mutation even when per-call confirmation is true. Per-call destructive confirmation and all existing domain safeguards SHALL remain required when destructive runtime permission is enabled.

#### Scenario: Read succeeds in read-only mode
- **WHEN** a read-classified tool is invoked while MCP read-only mode is active
- **THEN** the policy gate permits the call to continue under the documented SDK initialization limitation

#### Scenario: Mutation blocked in read-only mode
- **WHEN** any write or destructive tool is invoked while MCP read-only mode is active
- **THEN** the tool returns `READ_ONLY_MODE` and the Actual adapter is not invoked for that call

#### Scenario: Destructive operation disabled
- **WHEN** a destructive tool is invoked while MCP writes are otherwise enabled but destructive operations are disabled
- **THEN** the tool returns `DESTRUCTIVE_OPERATIONS_DISABLED` before confirmation-dependent preflight or mutation

#### Scenario: Complete policy inventory
- **WHEN** the registered tool inventory is tested
- **THEN** every tool appears exactly once in the capability registry and no mutation-capable tool can bypass the central policy gate

### Requirement: MCP read-only guarantee boundary
MCP read-only mode SHALL mean that caller-invoked mutation and explicit-sync tools are blocked at the MCP boundary. Documentation and runtime status MUST disclose that this is not a server-enforced or SDK-global read-only mode: the pinned Actual client loads a local budget by performing an initial full sync, and the SDK may run its internal schedule service in response to sync. The system MUST NOT claim that read calls, initialization, or process startup are guaranteed mutation-free at the Actual runtime level.

#### Scenario: Operator inspects read-only semantics
- **WHEN** read-only mode is documented or reported
- **THEN** the operator can distinguish MCP tool authorization from the pinned SDK's internal initialization and schedule-service behavior

#### Scenario: Read-only E2E verification
- **WHEN** a second MCP process runs with read-only mode enabled against controlled fixtures
- **THEN** reads succeed, every caller-invoked mutation is blocked before its adapter call, and the verification does not overstate control over SDK-internal sync effects

### Requirement: Runtime operational status
The system SHALL expose `actual_get_runtime_status` as a read-only tool returning only reliably observable and sanitized process state. The result SHALL include MCP version, pinned SDK version, active server connectivity result, loaded-budget state, sanitized server URL, process uptime, cache configured state, MCP read-only mode, destructive-operation permission, effective write permission, and process-lifetime sync telemetry. It MAY include queue depth, active operation name, and cache-lock state when directly observable. It MUST NOT include credentials, raw sync or budget IDs, complete private paths, financial arguments, raw errors, tokens, or environment dumps, and MUST explicitly identify unavailable metadata rather than fabricate it.

#### Scenario: Connected runtime status
- **WHEN** runtime status can initialize the budget and actively reach the server
- **THEN** it returns connected and loaded state, package versions, sanitized mode/configuration state, uptime, and supported telemetry

#### Scenario: Runtime status under error
- **WHEN** initialization, connectivity, or the most recent observed sync fails
- **THEN** the status contains only stable sanitized diagnostic codes and remains free of credentials and raw upstream messages

#### Scenario: Runtime restart
- **WHEN** the MCP process restarts
- **THEN** process uptime and process-lifetime sync timestamps reset rather than pretending to be persisted history

### Requirement: Observable queue state
The serialized operation queue SHALL track queued-operation count and the non-sensitive name of the currently executing operation when this can be done without weakening serialization. Runtime-status introspection MUST NOT expose tool arguments, entity identifiers, financial values, or the status call itself as misleading business activity.

#### Scenario: Operation queued behind active work
- **WHEN** one operation is active and another waits in the serialized queue
- **THEN** a safe internal snapshot can distinguish the active operation and queue depth without exposing their inputs

### Requirement: Process-lifetime sync telemetry
The runtime SHALL track `lastSyncAttemptAt`, `lastSuccessfulSyncAt`, `lastSyncDurationMs`, and `lastSyncErrorCode` for sync attempts explicitly initiated by MCP operations after initialization. Successful attempts SHALL clear the prior sync error code. The telemetry MUST remain in memory only, MUST reset on restart, and MUST NOT claim to observe the initial full sync or other internal SDK syncs that bypass the MCP sync wrapper.

#### Scenario: Successful observed sync
- **WHEN** an explicit or post-mutation MCP sync succeeds
- **THEN** attempt, success, and duration fields reflect that attempt and the error code is absent

#### Scenario: Failed observed sync
- **WHEN** an MCP-initiated sync fails
- **THEN** attempt and duration fields update, the last successful timestamp remains unchanged, and a stable sanitized error code is recorded
