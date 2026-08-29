# Manual Actual Acceptance

This procedure is opt-in and must run only against a controlled Actual budget and account. It is never part of public CI.

## Authorization Gate

Before continuing, the operator must:

1. Export `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SYNC_ID`, and a dedicated `ACTUAL_DATA_DIR` through the shell or secret manager.
2. Confirm that the selected account is safe for test mutations.
3. Explicitly authorize write operations for this acceptance run.
4. Choose a unique `imported_id`, such as `manual-acceptance:<timestamp>`, without embedding credentials.

Stop after read-only checks if write authorization is absent. Do not place secrets in commands, files, screenshots, or captured output.

## Read-Only Checks

1. Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
2. Launch `node dist/index.js` through an MCP inspector or compatible client.
3. Confirm that exactly ten tools are discoverable.
4. Call `actual_health` and confirm that `connected` and `budgetLoaded` are true.
5. Call account, category, payee, and bounded transaction read tools. Verify integer minor-unit amounts and verbatim user-authored values.

## Authorized Mutation Checks

1. Call `actual_import_transactions` with one controlled transaction and the unique `imported_id`.
2. Repeat the same import and confirm that no duplicate is created.
3. Find the transaction through `actual_get_transactions`.
4. Call `actual_update_transaction` with an explicit harmless note, then confirm the update through a read.
5. Call `actual_sync` and verify a successful timestamped result.
6. Call `actual_delete_transaction` only with the controlled transaction ID and `confirmDestructive: true`.
7. Call `actual_sync` again and confirm that the controlled transaction is absent.

## Restart Check

1. Stop the MCP cleanly.
2. Restart it with the same dedicated cache.
3. Verify health and reads.
4. Repeat the original import and confirm that the previously deleted `imported_id` is not recreated under the default policy.

Record the date, Actual Server version, MCP commit, read-only outcome, explicitly authorized write outcome, and any sanitized diagnostic. Never record credentials.
