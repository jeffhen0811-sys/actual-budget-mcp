## Why

Actual Budget MCP 0.6.0 has a validated 53-tool foundation but still lacks the recurring-transaction, financial-summary, and operational controls needed for day-to-day Alfred use. Version 0.7.0 closes those final functional gaps while preserving the pinned Actual SDK, existing safety guarantees, and the intent that v1.0.0 focus on consolidation rather than new major modules.

## What Changes

- Add five tools for listing, reading, creating, updating, and safely deleting Actual schedules through the public `@actual-app/api@26.8.1` schedule surface.
- Represent one-time and recurring schedule dates with a strict MCP adapter derived from the installed `date | RecurConfig` contract, including exact, approximate, and between amount variants; do not expose unsupported category assignment, system-managed completion/next-date mutation, arbitrary recurrence JSON, or manual schedule posting.
- Add bounded monthly, spending, and income summaries using official budget reads and fixed typed ActualQL queries, with category-driven classification, signed minor-unit totals, transfer exclusion, split-safe aggregation, refund handling, explicit account scope, on-budget defaults, and separately identified off-budget cash flow.
- Add a detailed runtime-status tool and backwards-compatible health/sync metadata for package versions, connectivity, loaded-budget state, process-lifetime sync observations, queue state where safely observable, and sanitized operational configuration.
- Add centralized `read`, `write`, and `destructive` tool capability metadata that drives MCP annotations and runtime policy guards. `ACTUAL_MCP_READ_ONLY=true` blocks every MCP mutation tool, including explicit sync; `ACTUAL_MCP_ALLOW_DESTRUCTIVE=false` blocks every destructive tool in addition to the existing per-call confirmation requirement.
- Document that MCP read-only mode gates the MCP tool surface but cannot guarantee a mutation-free SDK initialization: the pinned local-first SDK performs an initial full sync and may run Actual's internal schedule service.
- Preserve all 53 existing tools and add exactly nine supported tools, bringing discovery to 62 without aliases or artificial inventory entries.
- Expand installed-contract, unit, integration, compiled stdio E2E, security, cleanup, fingerprint, installation, update, and release-readiness verification for the new behavior.
- Release the project as 0.7.0 while keeping `@actual-app/api` exactly pinned to `26.8.1`; keep Pluggy, bank sync, external cron, notification/alert engines, investments, dashboards, HTTP MCP, raw query surfaces, direct SQLite, LLM classification, and reconciliation mutation out of scope.

## Capabilities

### New Capabilities

- `actual-schedule-management`: Stable MCP administration of Actual one-time and recurring schedules, including supported recurrence and amount models, reference validation, synchronized read-back, deletion safety, and explicit unsupported behavior.
- `actual-financial-summaries`: Bounded, auditable monthly, spending, and income summaries with signed accounting semantics, category and group breakdowns, top payees, transfer exclusion, refund handling, split safety, and explicit on-budget/off-budget scope.

### Modified Capabilities

- `actual-runtime`: Add process-lifetime observability, sync telemetry, queue status, operational mode configuration, centralized write/destructive enforcement, and the documented boundary of MCP read-only guarantees.
- `mcp-stdio-runtime`: Expand discovery from 53 to 62 tools, add schedule/summary/status schemas and errors, and derive annotations and guards from one complete tool-capability registry.
- `distribution-and-operations`: Release and document v0.7.0, extend real-server and compiled MCP verification, preserve exact-ID cleanup and permanent fingerprints including schedules, and validate safe installation/update from 0.6.0.

## Impact

- Affects MCP contracts and registration, the Actual adapter/client, FIFO instrumentation, configuration, error codes, schedule and summary domain modules, runtime telemetry, and test harness resource ownership.
- Adds nine public MCP tools while preserving the names and required inputs/outputs of all existing tools.
- Extends `.env.example`, integration configuration, README, CHANGELOG, installed SDK contract documentation, release-readiness reporting, and version metadata.
- Keeps the current stdio transport, lazy single-client lifecycle, exact SDK pin, no-raw-query boundary, CI without private Actual access, and opt-in authorization for real writes.
- Requires controlled real-server evidence before transfer schedules can be declared supported; unsupported transfer posting or manual posting remains explicitly reported rather than emulated.
