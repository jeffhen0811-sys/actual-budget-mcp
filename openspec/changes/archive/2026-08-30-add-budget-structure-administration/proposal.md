## Why

Actual Budget MCP v0.1.0 can inspect budget structure and manage transactions, but it cannot create or safely administer the accounts, category groups, and categories required to bootstrap a nearly empty budget. Version 0.2.0 adds that bounded administrative surface while preserving the v0.1.0 contracts and real-server safety guarantees.

## What Changes

- Add five account administration tools for create, allowlisted update, safe close, reopen, and confirmed empty-only deletion.
- Add three category-group administration tools for typed group creation, rename, and confirmed empty-only deletion.
- Add six category administration tools for create, rename, same-type move, hide, unhide, and confirmed unused-only deletion.
- Register exactly 24 public MCP tools: the existing ten tools plus the fourteen new semantic tools; do not add reorder, generic CRUD, aliases, or internal Actual endpoints.
- Use strict Zod inputs and outputs, stable sanitized domain errors, conservative MCP annotations, idempotent desired-state operations, and post-sync entity verification.
- Pin `@actual-app/api` at `26.8.1` as the executable API authority and exclude Account Groups, `account_group_id`, ActualQL, direct SQLite access, and unsupported reorder operations.
- Upgrade package and MCP metadata from `0.1.0` to `0.2.0`, update the changelog and English documentation, and preserve clean install/update behavior and all v0.1.0 public tool contracts.
- Extend unit, contract, real-server integration, and real MCP stdio E2E coverage with per-run owned resources, exact-ID cleanup, permanent-fixture fingerprints, and a strict release-readiness gate.

## Capabilities

### New Capabilities

- `actual-account-administration`: Create, update, safely close or reopen, and explicitly delete proven-empty Actual accounts through the pinned public SDK.
- `actual-category-administration`: Create and administer category groups and categories, including type-safe moves, visibility changes, and fail-closed empty-only deletion.

### Modified Capabilities

- `actual-runtime`: Extend serialized mutation, synchronization, post-sync verification, partial-failure reporting, and SDK-boundary requirements to structural administration.
- `mcp-stdio-runtime`: Expand the exact tool surface from ten to twenty-four tools and define the new tools' schemas, annotations, compatible results, and stable domain errors.
- `distribution-and-operations`: Advance the project to v0.2.0 and require the documented real-server integration, stdio E2E, cleanup, compatibility, and readiness verification flow.

## Impact

- Affects MCP contracts and registration, the serialized Actual client, the narrow API adapter, error mapping, tests, package metadata, README, CHANGELOG, and operational scripts where verification needs extension.
- Keeps the existing singleton/lazy client, cache lock, stdio transport, public CI boundary, local environment/cache, Hermes configuration, and all ten v0.1.0 tool contracts.
- Uses only public methods exported by the installed `@actual-app/api@26.8.1`; a mandatory missing method or dependency upgrade is a stop-and-report condition rather than implicit scope expansion.
- Real write verification remains locally gated by `ACTUAL_INTEGRATION_ALLOW_WRITES=true`; public GitHub-hosted CI continues to run only locked install, typecheck, unit/contract tests, and build.
