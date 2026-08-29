# Requirement Traceability

| OpenSpec capability | Automated evidence |
| --- | --- |
| Environment configuration and sanitized server identity | `test/config-schemas.test.ts`, `test/security.test.ts` |
| Official API boundary and narrow adapter | Type-checked `src/actual/adapter.ts`; `test/client.test.ts` SDK doubles |
| Lazy initialization, retry, FIFO serialization, cache ownership, and shutdown | `test/client.test.ts` |
| Account, category, payee, balance, and bounded transaction reads | `test/client.test.ts`, `test/mcp.test.ts` |
| Idempotent import, allowlisted update, protected deletion, and post-mutation sync | `test/client.test.ts`, `test/mcp.test.ts` |
| Structured results, exact tool list, annotations, strict validation, and tool errors | `test/mcp.test.ts` |
| English server-authored content and verbatim user data | `test/mcp.test.ts` |
| Credential redaction and stderr-only logging | `test/security.test.ts`, `test/mcp.test.ts` |
| Protocol-only stdout and lazy discovery in a child process | `test/stdio.test.ts` |
| Reproducible distribution, Hermes deployment, Docker, and CI | `install.sh`, `update.sh`, `Dockerfile`, `.github/workflows/ci.yml`, `README.md` |
| Real controlled Actual acceptance | Operator-only procedure in `docs/manual-acceptance.md`; intentionally excluded from CI |
