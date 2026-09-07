# Actual Budget MCP

Stable v1 MCP stdio server for Actual Budget. It exposes a fixed 62-tool contract through the public `@actual-app/api` `26.8.1` SDK.

## Quick Start

```bash
git clone https://github.com/jeffhen0811-sys/actual-budget-mcp.git
cd actual-budget-mcp
npm ci
npm run build
```

Set `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, and `ACTUAL_SYNC_ID`; then start with `npm start`. The process communicates only through stdio.

## Requirements

- Node.js 22+ and npm.
- Access to one Actual Server budget.
- A writable SDK cache directory, separate from Actual Server data.

## Installation and configuration

`./install.sh` performs a locked install, build, executable check, and cache-directory creation. Use Hermes or another MCP host to supply these secrets; do not commit them.

| Variable | Purpose |
| --- | --- |
| `ACTUAL_SERVER_URL` | Actual Server base URL, without URL credentials. |
| `ACTUAL_PASSWORD` | Actual Server password. |
| `ACTUAL_SYNC_ID` | Selected budget sync ID. |
| `ACTUAL_ENCRYPTION_PASSWORD` | Optional encryption password. |
| `ACTUAL_DATA_DIR` | SDK cache; defaults to `/tmp/actual-budget-mcp`. |
| `ACTUAL_MCP_READ_ONLY` | Blocks all mutations when `true`. |
| `ACTUAL_MCP_ALLOW_DESTRUCTIVE` | Blocks structural deletes/merges when `false`. |

## Hermes

Point Hermes at `node /path/to/actual-budget-mcp/dist/index.js` and configure the variables above using its secret facility. For updates and a non-destructive smoke check, see [Hermes upgrade](docs/hermes-upgrade-v1.md) and [Hermes smoke test](docs/hermes-smoke-test-v1.md).

## Security modes

Read-only mode blocks every write, including sync. Destructive-disabled mode permits non-destructive writes but blocks deletes and payee merges. Destructive calls also require literal per-call confirmation. Details: [security review](docs/security-review-v1.md).

## Domain navigation

- Public API and compatibility: [public contract](docs/public-contract-v1.md), [tool inventory](docs/tool-inventory-v1.md)
- Imports: [import workflow](docs/import-workflow-v1.md)
- Limits, errors, idempotency, synchronization: [limits](docs/limits-v1.md), [errors](docs/error-codes-v1.md), [idempotency](docs/idempotency-v1.md), [sync semantics](docs/sync-semantics-v1.md)
- Supported and intentionally absent behavior: [support matrix](docs/support-matrix-v1.md)

Money is signed integer minor units (for example, `-1299`). Dates are ISO `YYYY-MM-DD`; budget months are `YYYY-MM`. Inputs are strict and bounded; raw ActualQL/SQL, direct SQLite, filesystem paths, commands, direct transfer linking, manual rule execution, transfer schedules, manual schedule posting, and reconciliation locking are intentionally unsupported.

## Testing and release checks

Run `npm test`, `npm run test:contract`, and `npm run build` for local development. `npm run release:check` is nonrecursive and safe: it does not contact Actual. `npm run test:all` adds configured read integration/E2E suites. Full release acceptance additionally requires the separately authorized write suites and optional Docker validation; skipped gates are never readiness evidence. See [acceptance matrix](docs/acceptance-matrix-v1.md).

## Updating and troubleshooting

`./update.sh` refuses dirty checkouts and only fast-forwards. For connectivity or cache errors, verify configuration and ensure one process owns each cache directory. Do not delete cache or reset a checkout automatically; use the manual rollback guidance in the Hermes upgrade guide.

## Versioning and limitations

This release targets `1.0.0` and preserves the frozen 62-tool v0.7.0-compatible contract except for reviewed finite input-array ceilings. Any incompatible public change requires a major-version review. Known limitations are explicit in the [support matrix](docs/support-matrix-v1.md).
