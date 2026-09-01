# Requirement Traceability

| OpenSpec capability | Automated evidence |
| --- | --- |
| Environment configuration and sanitized server identity | `test/config-schemas.test.ts`, `test/security.test.ts` |
| Official API boundary and narrow adapter | Type-checked `src/actual/adapter.ts`; `test/client.test.ts` SDK doubles |
| Installed budget methods, aggregates, envelope/tracking variants, carryover/hold behavior, and non-transactional batching | `test/contract/sdk-surface.test.ts`, `test/contract/actual-contract.test.ts`, `docs/actual-api-26.8.1-contract.md` |
| Payee CRUD/merge, rule CRUD, stage/return/nullability discrepancies, and unsupported run/preview exports | `test/contract/sdk-surface.test.ts`, `docs/actual-api-26.8.1-contract.md` |
| Lazy initialization, retry, FIFO serialization, cache ownership, and shutdown | `test/client.test.ts` |
| Account, category, payee, balance, and bounded transaction reads | `test/client.test.ts`, `test/mcp.test.ts` |
| Idempotent import, allowlisted update, protected deletion, and post-mutation sync | `test/client.test.ts`, `test/mcp.test.ts` |
| Structured results, exact tool list, annotations, strict validation, and tool errors | `test/mcp.test.ts` |
| Budget projection, summaries, desired-state writes, prospective carryover, hold/reset, copy planning/execution, bounds, idempotency, and partial recovery | `test/budget.test.ts`, `test/config-schemas.test.ts`, `test/mcp.test.ts` |
| Safe payee preflights, transfer guards, merge recovery, rule projection/reference validation, full-object updates, and protected deletion | `test/payee-rule-client.test.ts`, `test/payee-rule-contracts.test.ts`, `test/rules.test.ts` |
| English server-authored content and verbatim user data | `test/mcp.test.ts` |
| Credential redaction and stderr-only logging | `test/security.test.ts`, `test/mcp.test.ts` |
| Protocol-only stdout and lazy discovery in a child process | `test/stdio.test.ts` |
| Reproducible distribution, Hermes deployment, Docker, and CI | `install.sh`, `update.sh`, `Dockerfile`, `.github/workflows/ci.yml`, `README.md` |
| Exact-ID payee/rule ownership, permanent fixture fingerprints, dependency cleanup, and leftover diagnostics | `test/resources.test.ts`, `test/fingerprint.test.ts`, `test/real/` |
| Dynamic safe budget-month selection, protected-state refusal, budget cleanup, and planning fingerprints | `test/real/budget.ts`, `test/fingerprint.test.ts`, guarded integration/E2E write suites |
| Real controlled Actual payee/rule reads and guarded mutation lifecycles | `test/integration/read.integration.test.ts`, `test/integration/write.integration.test.ts`, `test/e2e/read.e2e.test.ts`, `test/e2e/write.e2e.test.ts`; intentionally excluded from public CI |
