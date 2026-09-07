## Why

Actual Budget MCP 0.7.0 has reached the intended functional scope, but its 62-tool public surface is not yet governed as a stable major-version contract. Version 1.0.0 should consolidate the existing behavior, close verification and operational gaps, and produce reproducible evidence that the server is safe to install, update, and operate against a real Actual instance without expanding into a new functional module.

## What Changes

- Freeze the existing 62 unique tool names and the valid 0.7.0 input/output contract as the 1.0.0 compatibility baseline; preserve imperfect but established names rather than rename them. The only reviewed input tightening is a finite safety ceiling on the 17 previously unbounded array paths documented in `breaking-change-review-unbounded-input-arrays.md`.
- Consolidate declarative tool metadata so discovery, capability policy, generated inventory, contract snapshots, and verification evidence cannot silently diverge.
- Audit all inputs, outputs, nullability, canonical entity projections, MCP annotations, error codes, bounds, confirmations, dry-run behavior, idempotency, partial failure, synchronization, logging, and secret handling.
- Expand generated policy and regression coverage across every mutation-capable and destructive tool, including protocol resilience, restart, cleanup recovery, and permanent-fixture integrity.
- Add the v1 public contract, tool/error/limit/idempotency/sync documentation, security and support matrices, acceptance evidence, Hermes upgrade and smoke guides, and the final readiness report.
- Add safe release verification, package and Docker validation, installation/update acceptance, and CI/distribution hygiene while keeping real writes explicitly opt-in and excluded from hosted CI.
- Update package, lockfile, MCP metadata, documentation, Docker examples, tests, and applicable OpenSpec requirements from 0.7.0 to 1.0.0 while keeping `@actual-app/api@26.8.1` exact.
- Keep Pluggy, external cron, MCP HTTP, raw SQL/ActualQL, direct SQLite, arbitrary queries, LLM classification, notification engines, reconciliation locking, internal Actual endpoints, transfer schedules, and manual schedule posting outside this release.
- Do not add, remove, merge, or rename a tool unless an essential contract defect is first documented and explicitly reviewed as a breaking change.

## Capabilities

### New Capabilities

- `public-contract-governance`: Defines the immutable 0.7.0 baseline, generated 62-tool inventory, compatibility rules, canonical public models, stable error and limit catalogs, and evidence traceability required to freeze the 1.x contract.

### Modified Capabilities

- `mcp-stdio-runtime`: Strengthens the exact 62-tool discovery contract, complete annotations and policy enforcement, per-call confirmation, schema/output consistency, protocol resilience, and 1.0.0 metadata requirements.
- `actual-runtime`: Strengthens global security, resource bounds, error sanitization, logging, synchronization telemetry, startup behavior, and process policy requirements for the stable release.
- `distribution-and-operations`: Defines the 1.0.0 installation, update, package, Docker, CI, documentation, acceptance, and readiness gates, including the distinction between safe local checks and authorized real-server acceptance.

## Impact

- Affected code includes the MCP tool registry and server registration layer, shared schemas and limits, public error handling, runtime guards, logger/redaction behavior, version metadata, and test harnesses.
- Affected verification includes unit, installed-SDK contract, real integration, compiled stdio E2E, operational script, Docker, package, security, cleanup, and compatibility tests.
- Affected artifacts include package metadata, README, CHANGELOG, installation/update scripts, CI, Docker examples, OpenSpec deltas, generated/reference documentation, and the v1 readiness report.
- The public dependency remains `@actual-app/api@26.8.1`; no new transport, database access path, large functional domain, npm publication, Git tag creation, or deployment to Alfred/Hermes is included.
