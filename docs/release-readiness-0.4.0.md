# Actual Budget MCP 0.4.0 release readiness

Date: 2026-09-01

## Implemented surface

- Package, lockfile, MCP metadata, README, changelog, and Docker examples report `0.4.0`.
- `@actual-app/api` remains pinned exactly at `26.8.1`.
- MCP discovery contains the compatible 34 v0.3.0 tools plus the eight specified budget tools, for exactly 42 tools.
- Monthly budget reads, summaries, desired-state amount/carryover writes, envelope hold/reset, guarded copy, strict schemas, structured errors, cleanup, fingerprints, documentation, and real-suite coverage are implemented.

## Passed evidence

- `npm run typecheck`: passed.
- `npm test`: 14 files and 95 tests passed.
- `npm run test:coverage`: passed; 80.27% statements, 72.04% branches, 84.96% functions, and 84.40% lines overall. `src/actual/budget.ts` reached 91.20% statements and 98.50% lines.
- `npm run test:contract`: 2 files and 12 tests passed against the installed 26.8.1 declarations and bundle.
- `npm run build`: passed and produced executable `dist/index.js`.
- `npm run test:integration:read`: 1 file and 9 real-server read tests passed.
- `npm run test:e2e:read`: build passed, then 1 file and 7 compiled stdio real-server read tests passed.
- `ACTUAL_INTEGRATION_ALLOW_WRITES=true npm run test:integration:write`: 1 file and 11 authorized mutation tests passed; exact cleanup completed and the permanent fingerprint was unchanged.
- `ACTUAL_INTEGRATION_ALLOW_WRITES=true npm run test:e2e:write`: build passed, then 1 file and 13 authorized compiled stdio mutation/negative tests passed; exact cleanup completed and the permanent fingerprint was unchanged.
- With write authorization reset to `false`, the repeated read-only integration and E2E suites passed again with 9 and 7 tests respectively.
- `ACTUAL_INTEGRATION_ALLOW_WRITES=false npm run test:all`: passed typecheck, 95 unit tests, 12 installed-contract tests, 9 real integration reads, 7 compiled stdio E2E reads, and the final build. The guarded write suites were correctly skipped in this authorization-reset run (11 integration and 13 E2E tests) after having passed explicitly above.
- Isolated fresh `install.sh`: passed in a temporary clone using locked dependencies and a separate cache.
- Isolated `update.sh`: passed a clean fast-forward-only update in a second temporary clone, including `npm ci`, typecheck, 95 unit tests, and build.
- `npm ls @actual-app/api --depth=0`: resolved exactly `@actual-app/api@26.8.1` under package `0.4.0`.
- `git diff --check`: passed.
- Authored-file secret scan found only documented password placeholders in the two example environment files and README; no credential or private-key pattern was found.

## Remaining limitation

- Tracking mode is covered by sanitized installed-contract fixtures and unit tests, but no current configured tracking-budget real fixture was available to establish real-server tracking evidence.
  The release claims real-server evidence only for the configured envelope fixture; tracking behavior remains scoped to the installed-contract evidence until a dedicated tracking fixture is exercised.

ACTUAL BUDGET MCP v0.4.0 READY
