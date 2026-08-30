# Actual Budget MCP

A secure, client-independent Model Context Protocol server that exposes a focused Actual Budget V1 toolset over stdio.

## Quick Start

```bash
git clone https://github.com/jeffhen0811-sys/actual-budget-mcp.git
cd actual-budget-mcp
cp .env.example .env
npm ci
npm run build
```

Export the required environment variables and run `npm start`. An MCP host normally starts the process and communicates through stdin/stdout.

## Features

- Ten read, mutation, health, and synchronization tools.
- Lazy Actual initialization, a persistent SDK-managed cache, FIFO access, and one process per cache directory.
- Strict Zod input contracts, bounded reads and imports, explicit destructive confirmation, and automatic synchronization after mutations.
- Structured results plus JSON text compatibility.
- Sanitized English server-authored messages and stderr-only logging. User-authored Actual values remain verbatim.

## Requirements

- Node.js 22 or newer and npm.
- An accessible Actual Server, its password, and the sync ID of one budget.
- A writable cache directory separate from the Actual Server container data volume.

## Installation

For Hermes, clone the repository inside its persistent volume and run the installer:

```bash
mkdir -p /opt/data/mcps
cd /opt/data/mcps
git clone https://github.com/jeffhen0811-sys/actual-budget-mcp.git
cd actual-budget-mcp
ACTUAL_DATA_DIR=/opt/data/actual-budget-mcp/cache ./install.sh
```

The installer validates Node.js, performs a locked dependency installation, builds the project, verifies `dist/index.js`, and creates the cache directory. It never requests or prints the Actual password.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `ACTUAL_SERVER_URL` | Yes | Actual Server base URL. Do not include URL user credentials. |
| `ACTUAL_PASSWORD` | Yes | Actual Server password. |
| `ACTUAL_SYNC_ID` | Yes | Sync ID of the selected budget. |
| `ACTUAL_ENCRYPTION_PASSWORD` | Only for encrypted budgets | End-to-end encryption password; it is distinct from the server password. |
| `ACTUAL_DATA_DIR` | No | SDK cache directory; defaults to `/tmp/actual-budget-mcp`. |

Do not use the Actual Server container's `/data` volume as `ACTUAL_DATA_DIR`. Run only one MCP process for a cache directory.

## Hermes Setup

Install under `/opt/data/mcps/actual-budget-mcp` and keep the cache at `/opt/data/actual-budget-mcp/cache`. Hermes and Actual run in separate containers, so `localhost` inside Hermes does not reach Actual. Use the NAS-published address, such as `http://192.168.3.99:15006`, or a shared Docker-network hostname.

```yaml
name: actual-budget
command: node
args:
  - /opt/data/mcps/actual-budget-mcp/dist/index.js
env:
  ACTUAL_SERVER_URL: http://192.168.3.99:15006
  ACTUAL_PASSWORD: ${ACTUAL_PASSWORD}
  ACTUAL_SYNC_ID: ${ACTUAL_SYNC_ID}
  ACTUAL_DATA_DIR: /opt/data/actual-budget-mcp/cache
supports_parallel_tool_calls: false
```

Replace placeholders through Hermes' secret configuration. Never commit real values.

## Available Tools

All amounts use Actual's integer minor-unit representation: for example, `12030` represents USD 120.30. Identifiers are opaque non-empty strings and are not required to be UUIDs.

| Tool | Input | Behavior |
| --- | --- | --- |
| `actual_health` | `{}` | Reports sanitized server connectivity and local budget state. |
| `actual_sync` | `{}` | Explicitly synchronizes the loaded budget. |
| `actual_list_accounts` | `{}` | Lists accounts and ledger balances when available. |
| `actual_get_account` | `accountId` | Gets one account without raw database access. |
| `actual_list_categories` | `{}` | Lists nested category groups and categories. |
| `actual_list_payees` | `{}` | Lists payees. |
| `actual_get_transactions` | `accountId`, `startDate`, `endDate` | Reads an inclusive range of at most 366 days. Results over 5,000 transactions are rejected rather than truncated. |
| `actual_import_transactions` | `accountId`, `transactions` | Imports 1–500 items through reconciliation; every item requires `date`, integer `amount`, and `imported_id`. |
| `actual_update_transaction` | `transactionId`, `fields` | Updates one or more of `category`, `payee`, `notes`, `cleared`, `date`, and `amount`. |
| `actual_delete_transaction` | `transactionId`, `confirmDestructive: true` | Permanently deletes a transaction after explicit confirmation. |

Example read input:

```json
{"accountId":"account-opaque-id","startDate":"2026-08-01","endDate":"2026-08-31"}
```

Example idempotent import input:

```json
{
  "accountId": "account-opaque-id",
  "transactions": [
    {"date":"2026-08-29","amount":-1299,"imported_id":"provider:stable-transaction-id","notes":"User-authored text"}
  ]
}
```

Imports use `reimportDeleted: false`. A repeated `imported_id` is reconciled without creating a duplicate, and a deleted imported transaction is not recreated by default. Every successful import, update, or deletion is synchronized before success is returned.

## Development

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

Build files are emitted only to `dist/`. The package exposes the compiled entrypoint as `actual-budget-mcp` for future package installation.

## Testing

The test architecture has four layers. Production schemas, mappers, services, adapters, tool handlers, and the compiled stdio entrypoint are reused by the real suites; the integration harness does not implement an alternate Actual client.

Actual transaction output preserves explicit `null` values returned by the SDK and omits only fields that are `undefined`. This applies to nullable optional fields such as `notes`, `payee`, `category`, `imported_id`, `imported_payee`, and `transfer_id`; no placeholder strings are invented.

### Unit tests

Unit tests are fast, isolated, and use SDK doubles where appropriate. They cover environment validation, lifecycle, mapping, guards, error handling, log sanitization, and security rules.

```bash
npm test
npm run test:coverage
```

### Contract tests

Contract tests encode legitimate Actual shapes observed through the pinned SDK and the real integration suite, including manual transactions with nullable import metadata, Starting Balance, imported transactions, optional fields, integer amounts, closed/off-budget accounts, and category visibility.

```bash
npm run test:contract
```

### Real Actual integration tests

Integration tests initialize `@actual-app/api`, authenticate, download the configured budget, call the production `ActualClient`, validate production output schemas, synchronize mutations, and shut the SDK down. They use `.actual-test-data/` and run serially.

```bash
npm run test:integration
npm run test:integration:read
ACTUAL_INTEGRATION_ALLOW_WRITES=true npm run test:integration:write
```

`test:integration` always includes read coverage. Its write suite is reported as skipped unless `ACTUAL_INTEGRATION_ALLOW_WRITES` is exactly `true`.

### MCP E2E tests

E2E tests build and launch `node dist/index.js`, then use the official MCP client over stdio. They validate tool discovery, schemas, JSON text and `structuredContent`, protocol-safe stdout, errors, real Actual calls, idempotency, shutdown, and process restart. They use `.actual-e2e-data/` and run serially.

```bash
npm run test:e2e
npm run test:e2e:read
ACTUAL_INTEGRATION_ALLOW_WRITES=true npm run test:e2e:write
```

### Write test safety

Real writes are disabled by default. Write tests refuse to continue unless the configured account name is exactly `TESTE MCP - Conta Corrente` and that account exists exactly once. Every run creates a UUID-scoped `imported_id` beginning with `mcp-integration-test:`. Update and delete operate only on the captured transaction, and cleanup revalidates the captured ID, exact import ID, prefix, and `MCP INTEGRATION TEST` payee before deletion. Cleanup runs even after a failed assertion and reports only the transaction ID and import ID if manual cleanup is required.

Use a dedicated test account only. Never enable write tests against a personal or production account.

### Local environment

Copy the placeholder file and edit only the ignored local copy:

```bash
cp .env.integration.local.example .env.integration.local
```

The required variables are `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, and `ACTUAL_SYNC_ID`. Keep `ACTUAL_DATA_DIR=.actual-test-data`, `ACTUAL_INTEGRATION_ALLOW_WRITES=false`, and `ACTUAL_INTEGRATION_TEST_ACCOUNT_NAME=TESTE MCP - Conta Corrente` unless intentionally running the guarded write suite. Commands load `.env.integration.local` automatically. If it is absent or incomplete, real suites skip with a clear message so public CI does not need private credentials.

Do not run integration and E2E processes concurrently against the same cache directory. Each suite uses its own cache and shuts down the SDK or child process before releasing it.

### Running all tests

```bash
npm run test:all
```

`test:all` runs type checking, unit tests, contract tests, configured real integration/E2E suites, and a final build. Public GitHub Actions intentionally runs only `npm ci`, type checking, unit tests, contract tests, and build. A future self-hosted runner can execute the existing real suites without changing them.

## Updating

From a clean checkout:

```bash
cd /opt/data/mcps/actual-budget-mcp
./update.sh
```

The updater uses `git pull --ff-only`, `npm ci`, type checking, tests, and a fresh build. It stops on dirty or diverged checkouts and never resets or discards local changes.

## Docker

Docker is optional. Keep stdin open and mount a cache that is separate from Actual Server data:

```bash
docker build -t actual-budget-mcp:0.1.0 .
docker run --rm -i \
  -e ACTUAL_SERVER_URL=http://actual-budget:5006 \
  -e ACTUAL_PASSWORD=replace-at-runtime \
  -e ACTUAL_SYNC_ID=replace-at-runtime \
  -v actual-mcp-cache:/var/lib/actual-budget-mcp \
  actual-budget-mcp:0.1.0
```

## Security

- Stdout is reserved for MCP protocol frames; diagnostics are sanitized and written to stderr.
- Passwords, encryption keys, URL user-info, bearer tokens, and common secret patterns are redacted from logs and public errors.
- Do not commit `.env`, credentials, cache data, or logs.
- Deletion requires `confirmDestructive: true`; tool annotations are advisory and do not replace this server-side requirement.
- The server uses only public `@actual-app/api` methods. It does not expose ActualQL or access SQLite directly.
- A local mutation whose following sync fails returns `MUTATION_SYNC_FAILED`. Run `actual_sync` before deciding whether a mutation should be retried.

## Troubleshooting

- `CONNECTION_ERROR`: verify the NAS address or shared-network hostname from inside the Hermes container. Do not use container-local `localhost` for a separate Actual container.
- `BUDGET_LOAD_ERROR`: verify the sync ID and configure `ACTUAL_ENCRYPTION_PASSWORD` only when the selected budget is encrypted.
- `CACHE_IN_USE`: stop the other MCP process or configure a distinct cache. Do not remove a live process lock.
- `RESULT_TOO_LARGE`: request a narrower transaction date range; results are never silently truncated.
- `out-of-sync-migrations`: upgrade Actual Server and this pinned API version together, then rebuild.
- Tool discovery works before Actual is reachable. Use `actual_health` for a sanitized operational diagnostic.

## Scope

V1 does not include ActualQL, Pluggy integration, schedules, rules, budgeting workflows, reports, LLM categorization, financial recommendations, or an HTTP MCP transport.
