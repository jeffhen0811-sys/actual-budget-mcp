# Hermes upgrade — v1

Clone or update the repository using your normal reviewed Git workflow, install locked dependencies, build, and verify the reported MCP/runtime version. Reload Hermes, confirm tool discovery, then run `actual_health`, `actual_get_runtime_status`, and a non-destructive smoke read.

If rollback is required, use the repository's normal manual Git rollback procedure to a known commit, reinstall locked dependencies, rebuild, reload Hermes, and repeat health/status/smoke reads. Do not place credentials in command history or reorganize Actual/Alfred data as part of an upgrade.
