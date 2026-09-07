# Security review — v1

## Scope and result

The v1 public surface is a fixed registry of 62 MCP tools. Inputs are strict, bounded schemas and the server has no raw query, database, filesystem-path, command, environment, or direct transfer-linking operation. The review found no accepted bypass of read-only mode, destructive-disabled mode, or per-call confirmation.

## Threat review

| Threat | Mitigation | Evidence |
| --- | --- | --- |
| Arbitrary query/database access | No public schema accepts raw query, ActualQL, SQL, SQLite, table, or filter structures. | `test/contract/mutation-input-authority.test.ts` |
| Direct transfer linking | Transaction mutation schemas exclude `transfer_id`; transfers are only created through the pair-aware operation. | `test/contract/mutation-input-authority.test.ts`, `test/transfer-client.test.ts` |
| Write or delete bypass | Registry policy rejects all mutations in read-only mode and destructive operations when disabled before handlers run. | `test/policy-matrix.test.ts` |
| Missing confirmation | Destructive operations require literal `confirmDestructive`; bulk, transfer, and budget-copy execution have their own explicit confirmation models. | `test/consent-matrix.test.ts`, `test/mcp.test.ts` |
| Oversized or abusive input | Shared limits bound batches, pagination, diagnostics, schedules, recurrence patterns, and copy plans. | `test/limits.test.ts`, `docs/limits-v1.md` |
| Secret, path, or personal-data reflection | Public errors and structured logs are redacted. SDK console payloads are suppressed, preserving protocol-only stdout. | `test/security.test.ts`, `test/stdio.test.ts` |
| Startup/cache contention | Configuration is validated before use; cache ownership, connectivity, and decryption failures have sanitized public errors. | `test/client.test.ts`, `test/config-schemas.test.ts`, `test/runtime-status.test.ts` |

## Accepted boundaries

- The MCP process still requires trusted local configuration for Actual Server access; it does not manage credentials or authorize users.
- Import preview invokes the official SDK reconciliation dry-run. It is treated as pure at the caller persistence boundary; it is not a generic sandbox for arbitrary SDK operations.
- Real fixture integration and E2E write execution require separate explicit authorization and are not represented as completed release evidence until run.

## Operational logging policy

Stdout is reserved for MCP stdio frames. Application logs use JSON on stderr with operation, status, error code, and safe identifiers only. Unstructured SDK `console` output is suppressed rather than copied to stderr. Raw notes, transactions, queries, paths, credentials, sync IDs, and personal financial values must not be logged.
