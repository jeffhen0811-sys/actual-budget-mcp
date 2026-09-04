## ADDED Requirements

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
