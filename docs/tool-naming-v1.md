# Version 1 Tool Naming Audit

## Scope and decision

This audit covers the 62 unique tool names frozen from Actual Budget MCP 0.7.0 commit
`c5b752a5f7f3067a40480f72078907c72ad26c66`. Version 1.0.0 preserves every name exactly: it introduces no alias,
rename, merge, or compatibility spelling.

The established convention is lowercase snake case with the `actual_` namespace followed by an action and a
resource: `actual_<verb>_<resource>`. Compound actions and resources remain explicit, for example
`actual_bulk_update_transactions`, `actual_find_possible_transfers`, and `actual_get_account_reconciliation`.

## Stable legacy exceptions

| Name | Status | Reason |
| --- | --- | --- |
| `actual_health` | Stable legacy exception | The established health probe predates the action/resource form. |
| `actual_sync` | Stable legacy exception | The established explicit synchronization command predates the action/resource form. |

These names are intentionally preserved. Adding alternatives such as `actual_get_health` or
`actual_sync_budget` would create aliases and is prohibited for this consolidation release.

## Conforming frozen names

The remaining 60 names conform to the namespaced action/resource form:

```text
actual_bulk_update_transactions
actual_close_account
actual_copy_budget_month
actual_create_account
actual_create_category
actual_create_category_group
actual_create_payee
actual_create_rule
actual_create_schedule
actual_create_transfer
actual_delete_account
actual_delete_category
actual_delete_category_group
actual_delete_payee
actual_delete_rule
actual_delete_schedule
actual_delete_transaction
actual_find_possible_duplicates
actual_find_possible_transfers
actual_get_account
actual_get_account_reconciliation
actual_get_budget_month
actual_get_budget_summary
actual_get_income_summary
actual_get_month_summary
actual_get_payee
actual_get_rule
actual_get_runtime_status
actual_get_schedule
actual_get_spending_summary
actual_get_transaction
actual_get_transactions
actual_get_transfer
actual_hide_category
actual_hold_budget_for_next_month
actual_import_transactions
actual_list_accounts
actual_list_budget_months
actual_list_categories
actual_list_payees
actual_list_rules
actual_list_schedules
actual_list_transfer_payees
actual_merge_payees
actual_move_category
actual_preview_import
actual_reopen_account
actual_reset_budget_hold
actual_search_transactions
actual_search_transfers
actual_set_budget_amount
actual_set_budget_carryover
actual_unhide_category
actual_update_account
actual_update_category
actual_update_category_group
actual_update_payee
actual_update_rule
actual_update_schedule
actual_update_transaction
```

`test/contract/tool-naming.test.ts` verifies this audit against both the immutable discovery snapshot and the
current runtime registry. The broader semantic compatibility check independently rejects any added, removed,
duplicated, or renamed tool.
