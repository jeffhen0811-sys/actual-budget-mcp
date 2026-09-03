# Actual Budget MCP v0.6.0 release readiness

Date: 2026-09-03

Required inventory: exactly 53 tools (all 46 v0.5.0 tools plus seven transfer, diagnostic, and reconciliation tools). The pinned dependency remains `@actual-app/api@26.8.1`.

## Verification record

| Gate | Result | Evidence |
| --- | --- | --- |
| Typecheck | Pass | `npm run typecheck` completed without errors. |
| Unit tests | Pass | `npm test`: 22 files and 158 tests passed. |
| Coverage | Pass | `npm run test:coverage`: 82.91% statements, 75.53% branches, 87.26% functions, and 86.45% lines. |
| Installed contract | Pass | `npm run test:contract`: 3 files and 21 tests passed against the pinned SDK. |
| Build and stdio discovery | Pass | `npm run build` passed; compiled stdio and inventory tests assert exactly 53 tools. |
| Controlled integration read/write | Pass | Read: 13 of 13 passed. Write: 16 of 16 passed with authorization scoped to the test process. |
| Compiled stdio E2E read/write | Pass | Read: 9 of 9 passed. Write: 16 of 16 passed through the compiled MCP stdio process. |
| Diagnostic performance | Pass locally | Representative and 5,000-leaf deterministic bounded-scan tests passed without truncation. |
| Preview/dry-run purity | Pass | Controlled integration and compiled stdio suites preserved before/after permanent-state fingerprints. |
| Transfer pair cleanup and permanent fingerprints | Pass | Both write suites removed exact run-owned resources and verified permanent fingerprints after cleanup. |
| Clean install and v0.5.0 update | Pass | Installation, startup, Docker, and isolated fast-forward update contracts passed; environment, cache, and Hermes sentinels were preserved. |
| Git and secret hygiene | Pass | `git diff --check`, executable checks, runtime-file tracking audit, security tests, and placeholder-aware secret scan passed. |
| OpenSpec validation | Pass | `openspec validate --all --json`: 12 of 12 items valid, including this change. |

This record must retain `NOT READY` whenever any mandatory gate is failed, skipped, unavailable, or not executed. Replace pending entries only with captured results from the actual command or controlled environment.

ACTUAL BUDGET MCP v0.6.0 READY
