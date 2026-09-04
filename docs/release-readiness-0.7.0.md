# Actual Budget MCP v0.7.0 release readiness

## Contract and behavior

- MCP discovery target: exactly 62 tools (53 compatible existing tools plus five schedules, three financial summaries, and runtime status).
- Installed SDK: `@actual-app/api@26.8.1`, with public schedule list/create/update/delete only.
- Supported schedules: one-time and daily/weekly/monthly/yearly recurrence; exact, approximate, and between signed amounts; open accounts and ordinary payees; verified synchronized create/update/delete.
- `SKIPPED UNSUPPORTED`: transfer schedules and manual schedule posting.
- Summaries: bounded fixed queries, signed category-driven totals, transfer/starting-balance/split-parent exclusion, refund and negative-income-adjustment handling, explicit uncategorized values, and separate off-budget cash flow.
- Runtime/security: central capability policy, read-only and destructive-disabled precedence, safe queue observations, process-lifetime MCP sync telemetry, and secret/path/argument omission.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 27 files and 189 tests passed.
- `npm run test:contract`: 4 files and 26 tests passed against the installed 26.8.1 declarations and bundle.
- `npm run test:coverage`: 27 files and 189 tests passed; statements 81.47%, branches 72.37%, functions 85.44%, and lines 85.10%.
- `npm run build`: passed and produced executable `dist/index.js`.
- `npm run test:integration:write` with process-scoped authorization: 18 tests passed against the configured controlled budget, including schedule lifecycle, controlled signed summaries, exact-ID cleanup, and the final permanent fingerprint.
- `npm run test:e2e:write` with process-scoped authorization: 18 tests passed through the compiled stdio process, including schedule lifecycle, controlled financial data, the destructive-disabled second process, exact-ID cleanup through a fresh authorized cleanup process, and the final permanent fingerprint.
- After write authorization was removed, `npm run test:integration:read` passed 14 tests and `npm run test:e2e:read` passed 12 tests, reconfirming permanent fingerprints, exactly 62 tools, read-only enforcement, schedule/summary/status schemas, and process-restart telemetry reset.
- The read-only E2E proves MCP-boundary authorization only: reads work and caller-invoked mutation/sync tools return `READ_ONLY_MODE`, while pinned SDK initialization can still perform its own full sync and schedule-service work.
- `npm run test:all` passed after writes were disabled again with 189 unit tests, 26 contract tests, 14 integration reads, and 12 compiled E2E reads. Both 18-test write suites were correctly skipped by the restored authorization gate in this aggregate run and had already passed separately under explicit authorization.
- Isolated operations tests passed for fresh v0.7.0 installation, executable output, clean v0.6.0-to-v0.7.0 fast-forward update, ignored environment/cache/integration/E2E/Hermes preservation, and dirty-checkout-safe script contracts.
- `git diff --check` passed; all three shipped scripts/entrypoints were executable; strict OpenSpec validation passed 15 of 15 items.
- The tracked/authored secret-pattern scan found only deliberate synthetic credential-shaped strings in redaction tests; no real address, credential, sync ID, or private filesystem path was authored.

## Blockers

- None. Every mandatory supported gate completed successfully. Transfer schedules and manual schedule posting remain `SKIPPED UNSUPPORTED` by design and do not weaken the supported readiness evidence.

ACTUAL BUDGET MCP v0.7.0 READY
