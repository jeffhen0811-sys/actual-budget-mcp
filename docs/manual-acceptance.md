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
3. Confirm that exactly 42 tools are discoverable and that neither `actual_run_rules` nor `actual_preview_rule` is present.
4. Call `actual_health` and confirm that `connected` and `budgetLoaded` are true.
5. Call account, category, payee, rule, and bounded transaction read tools. Verify integer minor-unit amounts, ranked `pre`/`default`/`post` stages, transfer-payee context, and verbatim user-authored values.
6. Call `actual_list_budget_months`, read one month, and request a bounded summary. Verify official signed aggregates, hidden flags, and the reported envelope/tracking capabilities without asserting personal financial values.

## Authorized Mutation Checks

1. Call `actual_import_transactions` with one controlled transaction and the unique `imported_id`.
2. Repeat the same import and confirm that no duplicate is created.
3. Find the transaction through `actual_get_transactions`.
4. Call `actual_update_transaction` with an explicit harmless note, then confirm the update through a read.
5. Call `actual_sync` and verify a successful timestamped result.
6. Call `actual_delete_transaction` only with the controlled transaction ID and `confirmDestructive: true`.
7. Call `actual_sync` again and confirm that the controlled transaction is absent.
8. Create a uniquely named temporary payee, read it, rename it, call delete without confirmation to inspect zero reference counts, then delete it with `confirmDestructive: true`.
9. Create unique source and target payees plus one owned source transaction. Call merge without confirmation to inspect impact, then merge with confirmation. Verify source absence, target presence, and transaction remapping.
10. Create a uniquely owned temporary payee and a `pre` rule that matches a unique `imported_payee` and sets that payee. Read and update the rule, import a unique transaction, and verify Actual applied the rule.
11. Call rule deletion without confirmation, then delete the exact temporary rule with confirmation. Verify the already imported transaction is unchanged.
12. Select the final clean future month pair from `actual_list_budget_months`. Stop if either contains protected nonzero planning, carryover, holds, or transactions.
13. Create a unique temporary expense group/category. Exercise amount set/zero, prospective carryover, dry-run copy, copy execution, repeat idempotency, and validation failures. Exercise hold/reset only when the returned month proves envelope support; record the official applied boolean.
14. In `finally`, reset any run-owned hold, clear owned amounts in both months, disable owned carryover from the source month, then delete the exact temporary category and group.
15. Clean remaining exact IDs in this order: transactions, rules, payees, categories, category groups, accounts. Confirm no owned ID remains and the permanent fingerprint, including budget planning across the official range, is unchanged.

## Restart Check

1. Stop the MCP cleanly.
2. Restart it with the same dedicated cache.
3. Verify health and reads.
4. Repeat the original import and confirm that the previously deleted `imported_id` is not recreated under the default policy.

Record the date, Actual Server version, MCP version/commit, exact 42-tool inventory result, payee/rule and budget-mode capability outcomes, selected test months, cleanup result, permanent fingerprint result, read-only outcome, explicitly authorized write outcome, and any sanitized diagnostic. Never record credentials or personal financial values.
