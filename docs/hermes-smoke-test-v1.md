# Hermes smoke test — v1

After reload, run only these non-destructive calls: `actual_health`, `actual_get_runtime_status`, `actual_list_accounts`, `actual_list_categories`, `actual_list_payees`, `actual_get_transaction` only when an ID is already known, `actual_list_budget_months`, `actual_get_budget_month`, `actual_list_schedules`, and one bounded month/spending/income summary. Confirm errors are structured and contain no credentials, paths, or raw SDK messages.
