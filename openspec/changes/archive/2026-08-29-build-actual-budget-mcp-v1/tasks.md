## 1. Project foundation and configuration

- [x] 1.1 Create the ESM `package.json` at version `0.1.0`, with Node.js `>=22`, an MCP executable, build, typecheck, and test scripts, and pinned dependency versions.
- [x] 1.2 Configure TypeScript, the build, and Vitest, and create the initial source and test structure without emitting build files into the source directory.
- [x] 1.3 Add `.env.example`, `.gitignore`, and `CHANGELOG.md` with the environment variables, sensitive local files, and initial release scope.
- [x] 1.4 Keep all project-authored documentation, code comments, script messages, test descriptions, examples, and configuration guidance in English.

## 2. Validation and safety primitives

- [x] 2.1 Implement strict loading of `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SYNC_ID`, optional `ACTUAL_ENCRYPTION_PASSWORD`, and `ACTUAL_DATA_DIR` with its documented default.
- [x] 2.2 Create reusable schemas for ISO dates, opaque IDs, integer amounts, the maximum 366-day range, and the maximum 500-transaction batch.
- [x] 2.3 Implement stable sanitized errors, secret redaction, and a logger that writes exclusively to `stderr` while protecting `stdout` for the MCP protocol.
- [x] 2.4 Cover configuration, schemas, redaction, and error mapping with unit tests, including secrets embedded in upstream error messages.

## 3. Actual Budget integration

- [x] 3.1 Create a narrow typed adapter over `@actual-app/api` that uses only the official public methods required by the V1 scope.
- [x] 3.2 Implement the lazy lifecycle with one shared initialization promise, budget download into the persistent cache, and retry after a failed initialization attempt.
- [x] 3.3 Serialize every SDK call through a FIFO queue and prevent two process instances from using the same local cache simultaneously.
- [x] 3.4 Implement and normalize account, grouped-category, payee, and transaction reads according to the fields and limits defined in the specs.
- [x] 3.5 Implement idempotent import by `imported_id`, allowlisted updates, and protected deletion while preserving amounts as integer minor units.
- [x] 3.6 Run automatic synchronization after every successful mutation and return a clear partial-success error when the local mutation succeeds but synchronization fails.
- [x] 3.7 Implement explicit synchronization, operational health reporting, and graceful SDK shutdown on process signals.
- [x] 3.8 Test the adapter and lifecycle with SDK doubles, covering concurrency, retry, idempotency, post-mutation sync, partial failure, and shutdown.

## 4. MCP server and tools

- [x] 4.1 Create response helpers that emit JSON in text content and `structuredContent`, together with stable sanitized tool errors.
- [x] 4.2 Implement `actual_health` and `actual_sync` with strict schemas and appropriate MCP metadata.
- [x] 4.3 Implement `actual_list_accounts` and `actual_get_account`, including balances and an explicit error for a missing account.
- [x] 4.4 Implement `actual_list_categories` and `actual_list_payees`, preserving category grouping.
- [x] 4.5 Implement `actual_get_transactions` with an inclusive range, date validation, and a maximum range of 366 days.
- [x] 4.6 Implement `actual_import_transactions` with a maximum batch of 500, required `imported_id`, and idempotent behavior.
- [x] 4.7 Implement `actual_update_transaction` with an allowlist and `actual_delete_transaction` requiring `confirmDestructive: true`.
- [x] 4.8 Register exactly the ten public tools with English titles, descriptions, input/output schema descriptions, and annotations appropriate to read and mutation behavior.
- [x] 4.9 Create the stdio entrypoint, ensuring that only MCP messages are written to `stdout` and that process signals shut down the runtime correctly.

## 5. Protocol, language, and security tests

- [x] 5.1 Test every MCP handler with a fake adapter, covering valid inputs, schema rejection, limits, and the structured response format.
- [x] 5.2 Run integration tests with an in-memory MCP client to verify the exact tool list, annotations, structured results, and tool errors.
- [x] 5.3 Add contract tests proving that all MCP-authored metadata, response labels, status messages, validation messages, and errors are in English while Actual user data remains verbatim.
- [x] 5.4 Create a child-process stdio smoke test that detects any log or non-protocol output written to `stdout`.
- [x] 5.5 Add sentinel tests that fail if a password, encryption key, credential-bearing URL, or sensitive value appears in logs or errors.

## 6. Distribution and Hermes operation

- [x] 6.1 Create an executable `install.sh` that validates Node.js 22+, installs the project under `/opt/data/mcps/actual-budget-mcp`, installs dependencies reproducibly, and builds the executable.
- [x] 6.2 Create an executable `update.sh` with fast-forward-only Git updates, reproducible installation, rebuild, and recovery guidance on failure.
- [x] 6.3 Create an optional multi-stage Dockerfile with a non-root user, stdio transport, and a configurable persistent cache directory.
- [x] 6.4 Document installation, updates, environment variables, security, limits, all ten tools, examples, English MCP output, and integer minor-unit amounts in the README.
- [x] 6.5 Document the Hermes configuration under `/opt/data`, `parallel: false`, the persistent cache, and access to Actual through the NAS address instead of `localhost`.
- [x] 6.6 Create an opt-in manual acceptance procedure against a real instance, with no embedded credentials and deletion only after explicit confirmation.

## 7. CI and final verification

- [x] 7.1 Configure GitHub Actions for Node.js 22 and 24, running clean installation, typecheck, tests, and build.
- [x] 7.2 Run clean installation, typecheck, tests, and build locally, checking the generated executable, script permissions, and the absence of secrets or local artifacts from version control.
- [x] 7.3 Review traceability between every OpenSpec requirement and its automated tests, correcting any uncovered scenario.
- [ ] 7.4 Run and record real acceptance only when the operator supplies credentials through the environment and explicitly authorizes write operations.
