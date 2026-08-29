## Context

See `proposal.md` for motivation and the delta specs for behavioral contracts. The repository currently contains only OpenSpec configuration. The target deployment runs Hermes and Actual Budget as separate ZimaOS applications on the same NAS. Hermes launches local MCP servers as stdio child processes; Actual is reachable through the NAS-published endpoint `http://192.168.3.99:15006`. The selected budget does not use end-to-end encryption.

`@actual-app/api` is local-first: it operates on an SDK-managed local budget copy and synchronizes that copy with the Actual Server. The MCP cache therefore belongs in the Hermes persistent volume and must not share the Actual Server container's `/data` volume. The official Hermes image includes Node.js 22 and npm, establishing Node 22 as the minimum supported runtime even though development may use Node 24.

## Goals / Non-Goals

**Goals:**

- Keep the MCP protocol layer independent from Hermes while documenting a first-class Hermes deployment.
- Make Actual lifecycle, concurrency, synchronization, and failure behavior deterministic in a long-lived stdio process.
- Make tool contracts safe for an autonomous agent through strict schemas, bounded operations, annotations, explicit destructive confirmation, and secret redaction.
- Keep the implementation small enough to review while providing adapter boundaries that support isolated tests.
- Produce a reproducible GitHub installation under Hermes' persistent `/opt/data` volume.
- Use English consistently for project-authored artifacts and all MCP-authored client-facing content.

**Non-Goals:**

- Expose ActualQL, SQLite, generic CRUD, or the complete `@actual-app/api` surface.
- Add an HTTP MCP transport or run the MCP as a separate sidecar service in V1.
- Support multiple budgets, multiple simultaneous processes sharing one cache, or encrypted budgets in V1.
- Embed Alfred, Hermes, Pluggy, scheduling, LLM categorization, or financial reasoning into the server.

## Decisions

### 1. Use an ESM Node.js package and MCP TypeScript SDK v2

The package will use `type: module`, TypeScript with `module` and `moduleResolution` set to `NodeNext`, and the stable split MCP v2 packages. Runtime dependencies will be limited to `@actual-app/api`, `@modelcontextprotocol/server`, and Zod 4. `@modelcontextprotocol/client` will be a development dependency for integration tests.

Node.js 22 is the minimum because it is present in the official Hermes image and satisfies the current Actual and MCP SDK requirements. CI will exercise Node 22 and Node 24. Exact dependency versions will be selected from the current official releases during implementation and frozen by `package-lock.json`.

**Alternatives considered:** the v1 monolithic `@modelcontextprotocol/sdk` package was rejected because new code should use the stable v2 server package. Requiring Node 24 was rejected because it would make the standard Hermes container require a separate runtime installation.

### 2. Separate protocol, use cases, and Actual integration without a framework

The implementation will use this dependency direction:

```text
src/index.ts
    │
    ▼
mcp/server.ts ── registers tools and stdio transport
    │
    ▼
tools/* ─────── schemas + tool orchestration
    │
    ▼
actual/client.ts ── lifecycle, queue, sync policy
    │
    ▼
actual/actual-api.ts ── narrow mockable adapter
    │
    ▼
@actual-app/api
```

Configuration, public errors, logging, and redaction remain cross-cutting leaf modules. Dependency injection will use plain constructor or factory parameters; no container or framework is needed.

**Alternatives considered:** importing `@actual-app/api` directly in every handler would reduce files but couple tests and lifecycle to tool registration. A repository/domain-entity architecture was rejected as unnecessary for a thin integration layer.

### 3. Start MCP immediately and initialize Actual lazily

The server will register and serve tools before contacting Actual. `ActualClient.ensureReady()` will own a shared initialization promise and a small state machine:

```text
uninitialized ──call──▶ initializing ──success──▶ ready
      ▲                      │                     │
      └────── reset ◀── failure                     ├─ sync/write/read
                                                   │
                                              shutting-down
                                                   │
                                                   ▼
                                                 closed
```

Initialization will validate configuration, create/verify the cache directory, call the official initialization API with verbose logging disabled, and download/load `ACTUAL_SYNC_ID`. A rejected promise is cleared after cleanup so a later call can retry. Startup health can therefore remain diagnosable even when Actual is unavailable.

**Alternatives considered:** eager process startup would make Hermes tool discovery fail whenever Actual is temporarily offline. Initializing and shutting down per tool call would add latency and repeatedly cycle stateful SDK internals.

### 4. Serialize all Actual SDK operations

`ActualClient` will expose one promise-based FIFO operation queue. Initialization, reads, writes, explicit sync, automatic sync, and shutdown will enter this queue. This is intentionally conservative because the SDK manages a shared local budget and module-level state.

Hermes documentation will set `supports_parallel_tool_calls: false`, but the internal queue remains required because other MCP clients may issue overlapping calls. V1 supports one MCP process for each `ACTUAL_DATA_DIR`; concurrent processes sharing the same directory are an operational error rather than a supported topology.

**Alternatives considered:** parallelizing independent account balance reads may reduce latency but introduces uncertainty around shared SDK state. Read/write locks were rejected until the SDK's concurrency guarantees are explicit.

### 5. Synchronize every successful mutation

Import, update, and delete will execute their documented Actual mutation followed by `sync()` in the same queued operation. Success is returned only after sync completes. `actual_sync` remains available to pull/flush changes explicitly.

If mutation succeeds locally but sync fails, the response will use a distinct public error code and state that the local copy may contain a pending change. It will not retry the mutation automatically, because retry safety differs by operation. A later explicit sync is safe.

**Alternatives considered:** requiring callers to invoke `actual_sync` after every write was rejected because agents can omit a second step. Background or debounced sync was rejected because it weakens the meaning of a successful write response.

### 6. Treat Actual amounts and identifiers without financial reinterpretation

The MCP public contract will use the same integer amount representation as Actual. No floating currency conversion or display formatting occurs in V1. IDs are strict, bounded, non-empty strings but are not UUID-validated.

`actual_get_account` will compose `getAccounts()` with an ID lookup because the official API has no standalone `getAccount()` method. Account balances will come from `getAccountBalance()` rather than the bank-reported `balance_current` field. `actual_list_categories` will normalize `getCategoryGroups()` into the requested nested structure.

**Alternatives considered:** accepting decimal currency values is friendlier for humans but risks ambiguous currency precision and floating-point rounding. ActualQL was rejected because it would create an unrestricted query surface and violate the narrow API boundary.

### 7. Make transaction imports deterministically idempotent

`actual_import_transactions` requires `imported_id` for every transaction and calls the official reconciliation API with `reimportDeleted: false`. The outer `accountId` is the authoritative account, and each item is limited to the supported import fields. Batches are capped at 500.

The response preserves the official `added`, `updated`, and `errors` outcome after sanitization. Future values such as `pluggy:<transaction-id>` remain opaque; no Pluggy code is introduced.

**Alternatives considered:** optional `imported_id` would rely on Actual's amount/date/payee heuristics and could not provide a strong retry guarantee. Raw `addTransactions()` was rejected because it does not reconcile duplicates.

### 8. Protect destructive deletion in three layers

`actual_delete_transaction` will use:

1. a description beginning with `DESTRUCTIVE OPERATION`;
2. MCP `destructiveHint: true` metadata;
3. a schema requiring the literal value `confirmDestructive: true`.

The handler then invokes only the official transaction-delete API and synchronizes. Import and update tools will declare mutating annotations, while read tools declare `readOnlyHint: true`.

**Alternatives considered:** metadata and descriptions alone are advisory and may be ignored by a client. A free-form confirmation string was rejected because a boolean literal is easier to validate and document.

### 9. Centralize schemas, result projection, and error sanitation

Each tool owns Zod input and output schemas, but shared primitives cover opaque IDs, calendar dates, integer amounts, bounded text, and standard errors. Schemas use strict objects so unknown fields are rejected.

All server-authored tool titles, descriptions, schema descriptions, response labels, status messages, validation messages, and public errors will be written in English. Values originating from the user's Actual budget, such as account names, payee names, category names, transaction notes, and imported error payload fields, will remain verbatim after sanitization; the MCP will not translate or reinterpret stored data.

Successful handlers return both `structuredContent` and a JSON text content block derived from the same projected public object. Errors pass through one mapper that recognizes stable Actual connection/download codes, converts unknown failures to a generic code, marks retryability, and redacts:

- the exact configured password;
- URL user-info;
- common `password=`, `token=`, bearer-token, and secret patterns;
- stack traces from client-visible content.

A minimal structured logger writes through `process.stderr.write`. Application code never calls `console.log`; an early stdout-safety guard will redirect accidental console diagnostics to stderr without interfering with the MCP transport's direct stdout frames.

**Alternatives considered:** returning raw upstream errors would speed debugging but violates the credential and abstraction boundary. Translating user-authored Actual data was rejected because it would alter source fidelity and could change identifiers or financial meaning. A general logging dependency was rejected because its default stream behavior could corrupt stdio.

### 10. Bound read and write payloads

Transaction reads accept inclusive ranges of at most 366 days. The adapter still receives the official range query; after retrieval, an oversized result triggers an explicit error instead of silent truncation. The initial response-count ceiling will be a named internal constant covered by tests and documented in troubleshooting. Import batches are capped at 500 transactions, and strings receive reasonable length limits.

**Alternatives considered:** pagination would be preferable for unbounded history but the official method returns the full range and V1's primary use case is a monthly query. Silent truncation was rejected because an agent could mistake incomplete data for complete data.

### 11. Install inside the persistent Hermes data volume

The primary production layout is:

```text
/opt/data/mcps/actual-budget-mcp/      # clone, node_modules, dist
/opt/data/actual-budget-mcp/cache/     # ACTUAL_DATA_DIR
```

Hermes launches `node /opt/data/mcps/actual-budget-mcp/dist/index.js`. The MCP connects to `http://192.168.3.99:15006`; `localhost` is explicitly avoided because Actual runs in another container. A future shared Docker network may replace the URL with `http://actual-budget:5006` without code changes.

The repository README uses the public GitHub URL `https://github.com/jeffhen0811-sys/actual-budget-mcp.git`. Local development on the current Mac may use the configured `github.com-personal` SSH alias, but deployment documentation does not assume that alias exists on the NAS.

**Alternatives considered:** a separate MCP container cannot be launched directly as a local stdio child without a cross-container process bridge. HTTP transport or a sidecar is deferred beyond V1. Installing into a non-persistent Hermes image layer would lose updates when the container is recreated.

### 12. Test through adapter, in-memory protocol, child process, and manual E2E layers

The test strategy has four layers:

- unit tests for environment schemas, shared schemas, error mapping, redaction, queue/lifecycle behavior, and individual handlers using a fake Actual adapter;
- MCP integration tests with an in-memory client/server pair for discovery, annotations, validation, structured results, and tool errors;
- a child-process stdio smoke test proving stdout remains protocol-safe and diagnostics use stderr;
- an opt-in manual E2E flow against a controlled Actual account for the create/find/update/delete/sync/restart acceptance path.

No real Actual credentials or destructive E2E calls run in GitHub Actions. CI runs typecheck, unit/integration tests, and build on Node 22 and 24.

## Risks / Trade-offs

- **[Actual API and server version drift]** → Pin the API through `package-lock.json`, report server version in health, test against current declarations, and document the `out-of-sync-migrations` upgrade path.
- **[Local mutation succeeds but sync fails]** → Return a distinct partial-success diagnostic, never retry the mutation automatically, and allow explicit `actual_sync` recovery.
- **[Two MCP processes share the cache]** → Document one process per data directory and fail clearly when cache ownership cannot be established; do not share the Actual Server data volume.
- **[Large transaction ranges consume memory]** → Enforce the 366-day range and reject oversized results without silent truncation.
- **[Hermes or another client ignores tool annotations]** → Enforce destructive confirmation and strict schemas server-side.
- **[Secrets appear in upstream messages]** → Redact exact configured values and common secret patterns in both logger and public error projection; verify with sentinel tests.
- **[Official Hermes image changes Node version]** → Keep `install.sh` version checks authoritative and test both supported LTS lines in CI.
- **[NAS endpoint or port changes]** → Keep server URL fully environment-driven and document both published-port and shared-network forms.

## Migration Plan

1. Implement and verify locally with mocked Actual operations and MCP protocol tests.
2. Run the opt-in acceptance flow against a controlled account on the NAS Actual instance.
3. Clone the repository into the Hermes persistent `/opt/data/mcps` directory and run `install.sh`.
4. Configure Hermes with the absolute compiled entry path, explicit Actual environment variables, persistent cache path, and parallel calls disabled.
5. Reload Hermes MCP configuration, verify tool discovery, then run `actual_health` and read-only tools before enabling write tools for Alfred.
6. Roll back by disabling/removing the Hermes MCP configuration and checking out the previous Git tag or commit; retain the cache directory for diagnosis or remove it only after confirming all changes are synchronized.
