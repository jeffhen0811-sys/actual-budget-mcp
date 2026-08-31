# Actual Budget MCP

A secure, client-independent Model Context Protocol server that exposes a focused Actual Budget v0.3.0 toolset over stdio.

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

- Thirty-four read, transaction, budget-structure, payee, rule, health, and synchronization tools.
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

## Budget structure administration

Version 0.2.0 adds fourteen semantic tools. Names are trimmed and must contain 1–255 characters. Create/update/visibility/move results return `success`, `changed`, and the verified persisted `account`, `categoryGroup`, or `category`. Idempotent desired-state calls return `changed: false` without mutating or synchronizing. Delete results return immutable pre-delete IDs, names, and zero relationship counts.

| Tool | Strict input | Output and safety behavior |
| --- | --- | --- |
| `actual_create_account` | `name`, optional `offbudget`, optional signed `initialBalance` | Creates and verifies an account. `offbudget` defaults to `false`. |
| `actual_update_account` | `accountId` and at least one of `name`, `offbudget` | Updates only allowlisted fields and returns the verified account. |
| `actual_close_account` | `accountId`, optional `transferAccountId`, `transferCategoryId` | Refuses zero-history accounts because Actual 26.8.1 would delete them; nonzero balances require a valid transfer account. |
| `actual_reopen_account` | `accountId` | Reopens and verifies a closed account; already-open is unchanged. |
| `actual_delete_account` | `accountId`, `confirmDestructive: true` | **DESTRUCTIVE OPERATION.** Deletes only after complete public history proves zero transactions. |
| `actual_create_category_group` | `name`, optional `isIncome` | Creates a visible group; `isIncome` defaults to `false`. |
| `actual_update_category_group` | `groupId`, `name` | Renames only; type and visibility are not writable. |
| `actual_delete_category_group` | `groupId`, `confirmDestructive: true` | **DESTRUCTIVE OPERATION.** Deletes only after a complete read proves zero linked categories. |
| `actual_create_category` | `name`, `groupId` | Derives income/expense type from the group and creates a visible category. |
| `actual_update_category` | `categoryId`, `name` | Renames only. |
| `actual_move_category` | `categoryId`, `targetGroupId` | Moves only between groups with the same persisted income/expense type. |
| `actual_hide_category` | `categoryId` | Hides and verifies the category. |
| `actual_unhide_category` | `categoryId` | Makes the category visible and verifies it. |
| `actual_delete_category` | `categoryId`, `confirmDestructive: true` | **DESTRUCTIVE OPERATION.** Deletes only after every account history and returned budget month proves no transaction, budget, or carryover use. |

Actual amounts are integer minor units without conversion. In a Brazilian real locale, `12030` represents `R$ 120.30`; `-12030` is a signed negative opening balance.

```json
{"name":"Emergency fund","offbudget":false,"initialBalance":12030}
```

```json
{"categoryId":"opaque-category-id","targetGroupId":"opaque-expense-group-id"}
```

```json
{"accountId":"opaque-empty-account-id","confirmDestructive":true}
```

Complete example inputs for the fourteen tools:

```text
actual_create_account          {"name":"Savings","offbudget":false,"initialBalance":12030}
actual_update_account          {"accountId":"account-id","name":"Main savings","offbudget":true}
actual_close_account           {"accountId":"account-id","transferAccountId":"target-account-id","transferCategoryId":"category-id"}
actual_reopen_account          {"accountId":"account-id"}
actual_delete_account          {"accountId":"empty-account-id","confirmDestructive":true}
actual_create_category_group   {"name":"Travel","isIncome":false}
actual_update_category_group   {"groupId":"group-id","name":"Trips"}
actual_delete_category_group   {"groupId":"empty-group-id","confirmDestructive":true}
actual_create_category         {"name":"Flights","groupId":"expense-group-id"}
actual_update_category         {"categoryId":"category-id","name":"Airfare"}
actual_move_category           {"categoryId":"category-id","targetGroupId":"same-type-group-id"}
actual_hide_category           {"categoryId":"category-id"}
actual_unhide_category         {"categoryId":"category-id"}
actual_delete_category         {"categoryId":"unused-category-id","confirmDestructive":true}
```

Representative successful outputs:

```json
{"success":true,"changed":true,"account":{"id":"account-id","name":"Savings","offbudget":false,"closed":false,"balance":12030}}
```

```json
{"success":true,"changed":false,"categoryGroup":{"id":"group-id","name":"Travel","isIncome":false,"hidden":false}}
```

```json
{"success":true,"changed":true,"category":{"id":"category-id","name":"Flights","groupId":"group-id","isIncome":false,"hidden":true}}
```

```json
{"success":true,"deletedCategoryId":"unused-category-id","deletedCategoryName":"Flights","relatedTransactionCount":0,"relatedBudgetMonthCount":0,"relatedCarryoverMonthCount":0}
```

Destructive calls fail closed with `ACCOUNT_NOT_EMPTY`, `CATEGORY_GROUP_NOT_EMPTY`, `CATEGORY_IN_USE`, or `PREFLIGHT_INCONCLUSIVE`; they never rewrite related data to make deletion succeed. Account close may also return `UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT` or `TRANSFER_ACCOUNT_REQUIRED`. Cross-type moves return `INCOMPATIBLE_CATEGORY_GROUP_TYPE`.

The implementation is limited to public methods exported by the installed `@actual-app/api@26.8.1`. It does not expose Account Groups, reorder operations, ActualQL, SQLite access, generic CRUD, or internal endpoints. The public transaction declaration requires dates, while the pinned exported runtime supports an omitted range for complete-history safety scans; that compatibility boundary is isolated in the adapter and contract-tested.

After a local mutation followed by sync failure, `MUTATION_SYNC_FAILED` is non-retryable and includes `recoveryAction: "actual_sync"` with `local_change_may_have_succeeded`. If sync succeeds but verification fails, `POST_MUTATION_READ_FAILED` reports `synchronized_but_unverified`. Run `actual_sync` and read the entity before deciding on any further mutation; do not replay a destructive call automatically.

## Payees

Version 0.3.0 adds single-payee reads and safe ordinary-payee administration. `actual_list_payees` remains exactly compatible with v0.2.0 and still returns only `id` and `name`; transfer context appears only in `actual_get_payee` as optional or nullable `transferAccountId`.

| Tool | Strict input | Output and safety behavior |
| --- | --- | --- |
| `actual_get_payee` | `payeeId` | Returns one payee and official transfer-account context, or `NOT_FOUND`. |
| `actual_create_payee` | `name` | Creates and verifies an ordinary payee. A single exact trimmed ordinary-name match returns `changed: false`; ambiguous matches fail. |
| `actual_update_payee` | `payeeId`, `name` | Renames an ordinary payee by desired state. Transfer payees return `TRANSFER_PAYEE_PROTECTED`. |
| `actual_delete_payee` | `payeeId`, `confirmDestructive: true` | **DESTRUCTIVE OPERATION.** Scans all account histories, subtransactions, and associated rules; only a proven-unused ordinary payee can be deleted. An unconfirmed call returns safe reference counts. |
| `actual_merge_payees` | non-empty unique `sourcePayeeIds`, distinct `targetPayeeId`, `confirmDestructive: true` | **DESTRUCTIVE OPERATION.** Reports per-source impact, invokes the official merge once, synchronizes, and verifies source absence plus transaction/rule remapping. Transfer payees are protected. |

Examples:

```text
actual_get_payee     {"payeeId":"payee-id"}
actual_create_payee  {"name":"Neighborhood market"}
actual_update_payee  {"payeeId":"payee-id","name":"Neighborhood Market"}
actual_delete_payee  {"payeeId":"unused-payee-id","confirmDestructive":true}
actual_merge_payees  {"sourcePayeeIds":["source-a","source-b"],"targetPayeeId":"target","confirmDestructive":true}
```

A merge has no transactional report in the SDK. If its mutation, synchronization, or verification becomes ambiguous, the MCP returns non-retryable `MERGE_PARTIAL_STATE` with `recoveryAction: "actual_sync"`. Inspect every named source and target plus affected transactions/rules; never replay the merge automatically.

## Rules

Rules are returned in Actual's ranked execution order. MCP stages are `pre`, `default`, and `post`; the adapter translates MCP `default` to the installed SDK's `null` representation and translates it back on reads. Reads preserve the pinned condition/action semantics and mark each rule `writable`. Advanced existing actions remain readable and deletable but are not silently rewritten.

| Tool | Strict input | Output and safety behavior |
| --- | --- | --- |
| `actual_list_rules` | `{}` | Returns all ranked rules with normalized stage, complete pinned conditions/actions, and writability. |
| `actual_get_rule` | `ruleId` | Returns the same complete representation for one stable rule ID. |
| `actual_create_rule` | `stage`, `conditionsOp`, non-empty `conditions`, non-empty `actions` | Creates a new rule after field/operator/value and account/category-group/category/payee reference validation. Creation is intentionally non-idempotent. |
| `actual_update_rule` | `ruleId` and at least one of `stage`, `conditionsOp`, `conditions`, `actions` | Loads the complete current rule and calls the SDK's full-object update. A matching desired state returns `changed: false`; advanced read-only rules are refused. |
| `actual_delete_rule` | `ruleId`, `confirmDestructive: true` | **DESTRUCTIVE OPERATION.** Deletes one rule only; a `false` SDK result becomes `PROTECTED_ACTUAL_ENTITY`. Existing transactions are not changed. |

Supported authoring conditions use strict field/operator/value combinations for accounts, categories, category groups, payees, imported payees, notes, integer amounts, dates, saved state, cleared state, reconciliation, and transfers. Supported actions are non-destructive `set` operations for category, payee, notes, cleared, account, date, and integer amount plus `prepend-notes` and `append-notes`. Arbitrary options, formulas, templates, split actions, schedule links, and transaction deletion are rejected for writes.

Example payee-normalization rule:

```json
{
  "stage": "pre",
  "conditionsOp": "and",
  "conditions": [{"field":"imported_payee","op":"contains","value":"market"}],
  "actions": [{"op":"set","field":"payee","value":"existing-payee-id"}]
}
```

Example desired-state update:

```json
{"ruleId":"rule-id","stage":"post"}
```

## Automatic categorization foundation

Persisted rules execute through Actual's official import pipeline. Create a rule that sets an existing payee or category, then call `actual_import_transactions` with a unique `imported_id` and matching `imported_payee`; subsequent reads show Actual's official result. Version 0.3.0 does not expose `actual_run_rules` or `actual_preview_rule`: the pinned public SDK exports neither manual execution nor unpublished-rule preview, and the MCP does not call bundled internal handlers.

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

Contract tests encode legitimate Actual shapes observed through the pinned SDK and the real integration suite, including manual transactions with nullable import metadata, Starting Balance, imported transactions, optional fields, integer amounts, closed/off-budget accounts, category visibility, income type, and group links.

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
docker build -t actual-budget-mcp:0.3.0 .
docker run --rm -i \
  -e ACTUAL_SERVER_URL=http://actual-budget:5006 \
  -e ACTUAL_PASSWORD=replace-at-runtime \
  -e ACTUAL_SYNC_ID=replace-at-runtime \
  -v actual-mcp-cache:/var/lib/actual-budget-mcp \
  actual-budget-mcp:0.3.0
```

## Security

- Stdout is reserved for MCP protocol frames; diagnostics are sanitized and written to stderr.
- Passwords, encryption keys, URL user-info, bearer tokens, and common secret patterns are redacted from logs and public errors.
- Do not commit `.env`, credentials, cache data, or logs.
- Deletion requires `confirmDestructive: true`; tool annotations are advisory and do not replace this server-side requirement.
- The server uses only public `@actual-app/api` methods. It does not expose ActualQL or access SQLite directly.
- A local mutation whose following sync fails returns non-retryable `MUTATION_SYNC_FAILED`. Run `actual_sync` and read the entity before deciding on another mutation.

## Troubleshooting

- `CONNECTION_ERROR`: verify the NAS address or shared-network hostname from inside the Hermes container. Do not use container-local `localhost` for a separate Actual container.
- `BUDGET_LOAD_ERROR`: verify the sync ID and configure `ACTUAL_ENCRYPTION_PASSWORD` only when the selected budget is encrypted.
- `CACHE_IN_USE`: stop the other MCP process or configure a distinct cache. Do not remove a live process lock.
- `RESULT_TOO_LARGE`: request a narrower transaction date range; results are never silently truncated.
- `out-of-sync-migrations`: upgrade Actual Server and this pinned API version together, then rebuild.
- Tool discovery works before Actual is reachable. Use `actual_health` for a sanitized operational diagnostic.

## Scope

Version 0.3.0 does not include Account Groups, reorder operations, ActualQL, Pluggy integration, schedules, budgeting writes, reports, LLM categorization, financial recommendations, manual rule execution, unpublished-rule preview, or an HTTP MCP transport.
