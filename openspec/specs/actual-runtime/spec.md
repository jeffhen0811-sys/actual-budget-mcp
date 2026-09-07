# actual-runtime Specification

## Purpose

Define the externally observable configuration, connection, lifecycle, synchronization, and health behavior required to access one Actual Budget safely from a long-lived MCP process.
## Requirements
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

### Requirement: Official Actual API boundary
The system SHALL perform every budget operation through the public API exported by the pinned `@actual-app/api@26.8.1`. The installed package's exported public types, declarations, and bundle behavior, supplemented by observed real-server tests, SHALL be the executable authority; current official documentation MAY provide context but MUST NOT override the installed contract. Application code MAY internally construct transaction queries only with public `q()` and `aqlQuery()` exports, a fixed `transactions` table, allowlisted fields, allowlisted operators, and MCP-owned typed inputs. Application code MUST NOT open, query, or modify Actual SQLite files directly, expose arbitrary ActualQL queries or expressions, call internal endpoints, accept raw query objects, or upgrade the dependency implicitly.

#### Scenario: Budget operation
- **WHEN** a tool needs to read or mutate Actual data
- **THEN** the operation is performed through a public method exported by the installed `@actual-app/api@26.8.1`

#### Scenario: Typed internal transaction query
- **WHEN** exact lookup, filtering, sorting, pagination, or totals require ActualQL
- **THEN** the MCP constructs the fixed transaction query internally from validated allowlisted inputs and exposes neither the query nor arbitrary query authority to the caller

#### Scenario: Documentation exceeds installed API
- **WHEN** current documentation describes a field or option absent from the installed public types and bundle
- **THEN** the system excludes that behavior from v0.5.0 rather than invoking an internal workaround or imitating a different SDK version

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

### Requirement: Serialized compound transaction lifecycle
Every advanced transaction lookup, search, preview, bulk preflight, bulk execution, and import execution SHALL occupy one uninterrupted serialized queue position for its complete SDK lifecycle. A confirmed bulk execution SHALL perform all local item updates serially, attempt at most one synchronization after local state may have changed, and complete official read-back verification before releasing the queue. Import preview SHALL remain in the read path and MUST NOT synchronize.

#### Scenario: Concurrent search and bulk write
- **WHEN** a search and confirmed bulk operation arrive concurrently
- **THEN** each complete operation executes in deterministic queue order without interleaving bulk preflight, writes, synchronization, or verification

#### Scenario: Bulk synchronization
- **WHEN** a confirmed bulk operation changes one or more transactions locally
- **THEN** one synchronization occurs after the local sequence rather than once per requested item

#### Scenario: Read-only preview
- **WHEN** import preview completes successfully
- **THEN** no synchronization is triggered and the operation releases the queue without persisted mutation

### Requirement: Recoverable compound transaction failure
When a compound transaction mutation fails after local changes may have occurred, the system SHALL preserve exact requested, completed, pending, and affected transaction IDs plus the failed phase and safe recovery action. It MUST distinguish local-update, synchronization, and post-sync verification failures, MUST NOT claim transactional rollback, and MUST NOT automatically retry the complete mutation.

#### Scenario: Local bulk failure
- **WHEN** a later local update fails after prior transaction updates completed
- **THEN** the structured error identifies completed and pending IDs, marks local partial state, and recommends synchronization followed by exact reads

#### Scenario: Bulk synchronization failure
- **WHEN** local updates complete but synchronization fails
- **THEN** the error identifies potential local changes, returns `actual_sync` as recovery action, and does not replay updates

#### Scenario: Bulk verification failure
- **WHEN** synchronization succeeds but exact read-back cannot verify all desired states
- **THEN** the error reports `synchronized_but_unverified` with affected IDs and no automatic retry

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

### Requirement: Stable runtime security boundary
Version 1.0.0 SHALL continue to access Actual only through the public exports of exact dependency `@actual-app/api@26.8.1`. Caller input MUST NOT select tables, fields, query operators, raw ActualQL, SQL, SQLite files, internal endpoints, command arguments, filesystem paths, transfer identifiers, reconciliation locks, or runtime environment values. Runtime and contract tests SHALL verify that public schemas expose no such authority and that allowlisted fixed queries cannot be converted into arbitrary access.

#### Scenario: Arbitrary access attempt
- **WHEN** a caller supplies query-shaped, path-shaped, command-shaped, raw database, or direct `transfer_id` input to a public tool
- **THEN** strict validation rejects it before any SDK operation or filesystem access

#### Scenario: Dependency inspection
- **WHEN** release contract tests inspect the installed SDK
- **THEN** they confirm version 26.8.1 exactly and verify only the documented public exports and known absent APIs used to define supported behavior

### Requirement: Bounded runtime work
Runtime implementations SHALL apply the shared public bounds before expensive collection, classification, reconciliation, summary, schedule, import, bulk, transfer, or budget-copy work. Fixed internal queries MAY request one sentinel result beyond a public maximum solely to detect overflow, but this relationship SHALL be named, tested, and documented. Performance acceptance SHALL record sanitized durations and counts for the required bounded workloads without recording personal financial values or imposing an arbitrary hard latency threshold.

#### Scenario: Sentinel overflow query
- **WHEN** an internal fixed query uses `maximum + 1` rows to detect an oversized result
- **THEN** the runtime returns the stable size error rather than exposing or processing an unbounded result

#### Scenario: Bounded performance observations
- **WHEN** release acceptance exercises search, totals, preview 100, bulk dry-run 50, transfer and duplicate diagnostics, reconciliation, month and annual summaries, schedule listing, and runtime status
- **THEN** it records sanitized duration/count observations and investigates material regressions without leaking financial data

### Requirement: Explicit mutation completion semantics
Every write SHALL declare whether it performs write-and-sync, write-without-sync, or sync-only behavior. Multi-step mutations including bulk update, import, budget copy, transfer creation, payee merge, and post-mutation synchronization MUST NOT silently retry, fabricate rollback, or hide partial success. When a local change may have succeeded, the runtime SHALL return exact known affected, completed, failed, or pending identifiers; sanitized synchronization state; and safe recovery instructions requiring sync and read-back before another mutation.

#### Scenario: Sync failure after local mutation
- **WHEN** a local mutation completes but its required synchronization fails
- **THEN** the result reports non-retryable partial state and instructs the operator to synchronize and inspect exact affected entities without replaying the original mutation automatically

#### Scenario: Verification failure after sync
- **WHEN** synchronization succeeds but final read-back cannot prove persisted desired state
- **THEN** the result identifies synchronized-but-unverified state and does not claim success or rollback

### Requirement: Read and dry-run purity
Import preview, diagnostics, summaries, lookups, searches, and runtime status SHALL remain read-only from the MCP caller's perspective. Bulk update, transfer creation, and budget copy dry-run paths SHALL perform no caller-requested persistence or synchronization. Controlled integration and E2E acceptance SHALL compare permanent fingerprints immediately before and after every required purity boundary, while accurately documenting unavoidable pinned-SDK initialization behavior.

#### Scenario: Dry-run fingerprint
- **WHEN** a mutation-capable tool executes its documented dry-run path against the controlled fixture
- **THEN** its result reports no execution and the permanent fingerprint is unchanged

#### Scenario: Intrinsic preview purity
- **WHEN** `actual_preview_import` runs without a dry-run argument
- **THEN** it performs no persistence or synchronization and the permanent fingerprint is unchanged

### Requirement: Privacy-preserving runtime logging
Application and SDK logs SHALL go to stderr and SHALL default to operation name, sanitized status, duration, count, and stable error code. Logs and errors MUST NOT contain passwords, tokens, sync IDs, encryption values, raw notes, personal financial amounts, transaction dumps, raw queries, complete private paths, or full environment objects. Synthetic credential-shaped strings MAY appear only in clearly synthetic redaction tests.

#### Scenario: Successful operation log
- **WHEN** a bounded operation records telemetry
- **THEN** the log contains only sanitized operation, duration, count, and status metadata

#### Scenario: Secret-bearing upstream error
- **WHEN** an upstream exception contains configured secrets or private runtime data
- **THEN** both client-visible errors and stderr replace or omit those values

### Requirement: Process restart state
Process-lifetime uptime, queue observations, cache-lock state, and MCP-observed synchronization telemetry SHALL describe only the current process and MUST NOT be persisted or inferred from unavailable SDK internals. Restarting the compiled MCP process SHALL reset process-lifetime telemetry while preserving the configured budget cache and ability to reconnect.

#### Scenario: Restart after synchronization
- **WHEN** acceptance synchronizes, observes telemetry, stops the process, and starts a new process on the preserved cache
- **THEN** health and budget access work while uptime and MCP-observed synchronization telemetry begin as new process state
