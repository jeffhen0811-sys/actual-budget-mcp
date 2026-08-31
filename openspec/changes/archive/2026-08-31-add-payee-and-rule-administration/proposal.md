## Why

The validated v0.2.0 MCP can read payees but cannot administer them or manage the Actual rules that normalize imported descriptions and categorize future transactions. Version 0.3.0 should add those official SDK-backed capabilities while preserving the existing 24-tool surface, serialized runtime, synchronization guarantees, destructive safeguards, and real-server verification discipline.

## What Changes

- Add get, create, rename, protected delete, and protected merge operations for payees through the public `@actual-app/api@26.8.1` surface.
- Add list, get, create, update, and protected delete operations for Actual rules with strict discriminated MCP schemas and validated object references.
- Preserve `actual_list_payees` exactly for existing consumers while exposing transfer-payee context through the new single-payee read.
- Model the MCP rule stage as `pre`, `default`, or `post`, translating `default` to the installed SDK's `null` representation.
- Provide complete rule reads while restricting rule authoring to a documented, non-destructive subset; advanced existing rules remain readable but may be refused for MCP updates.
- Require preflight evidence and literal confirmation for payee deletion, payee merge, and rule deletion, with structured recovery metadata for potentially partial mutations.
- Prove rule behavior through the official transaction import pipeline; manual rule execution and unpublished-rule preview remain unsupported because the pinned SDK does not export public operations for them.
- Bump package, MCP, documentation, and release metadata from 0.2.0 to 0.3.0 and expand unit, contract, real integration, and real MCP stdio E2E coverage.
- Preserve the current SDK version, stdio transport, single lazy client, FIFO serialization, cache lock, safe sync, secret redaction, installation/update behavior, and public CI boundary.

## Capabilities

### New Capabilities

- `actual-payee-administration`: Read one payee and safely create, rename, delete, or merge payees while protecting transfer payees and referenced data.
- `actual-rule-administration`: Read and safely administer Actual rules through a stable MCP adapter, validated references, conservative authoring, and official import-time functional execution.

### Modified Capabilities

- `mcp-stdio-runtime`: Expand the exact compatible MCP surface from 24 v0.2.0 tools to 34 v0.3.0 tools and extend structured errors and annotations for payee/rule operations.
- `distribution-and-operations`: Advance versioning, documentation, exact-ID cleanup, fixture fingerprints, automated verification, and the strict real-server readiness gate to v0.3.0.

## Impact

- Affects the Actual API adapter, serialized client, MCP contracts and registration, public error metadata, tests, exact-ID resource ownership, fingerprints, README, CHANGELOG, package metadata, and release-readiness evidence.
- Continues to use only exports from pinned `@actual-app/api@26.8.1`; no dependency upgrade, SQLite access, ActualQL workaround, internal endpoint, HTTP MCP transport, scheduler, Pluggy integration, LLM categorization, budget write, or bulk transaction feature is introduced.
- Adds ten tools: five new payee operations including merge and five rule operations. `actual_run_rules` and `actual_preview_rule` are explicitly excluded as unsupported in the pinned public SDK.
