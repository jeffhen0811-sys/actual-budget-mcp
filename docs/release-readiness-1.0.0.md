# Release readiness — 1.0.0

## Identity and contract

- Package and MCP runtime version: `1.0.0`.
- Actual SDK pin: `@actual-app/api` exactly `26.8.1` in metadata, lockfile, runtime status, and public documentation.
- Contract freeze: exactly 62 tools with stable names; the v0.7.0 snapshot is the compatibility baseline and reviewed finite input-array ceilings are the only documented exception.

## Evidence

- Safe local checks passed on 2026-09-07: 232 unit tests, 165 contract tests, typecheck, build, generated-document checks, package dry-run, repository hygiene, and diff validation through `npm run release:check`.
- Coverage passed the release threshold: 82.18% statements and 73.24% branches (minimum 80% and 70%).
- Controlled read evidence passed: 14 integration-read tests and 13 compiled-stdio E2E-read tests, with the permanent-fingerprint checks included in those suites.
- Authorized write evidence passed: 18 integration-write tests and 18 compiled-stdio E2E-write tests. The first E2E cleanup reported exact temporary IDs; those IDs were recovered in a fresh authorized process and the final E2E run completed cleanly.
- Distribution: locked install/update tests preserve ignored environment, cache, and Hermes sentinels. Docker 29.2.1 built the v1.0.0 image; its stdio entrypoint shut down cleanly on stdin EOF as user `node` (UID 1000), with its owned cache volume and no exposed HTTP port.
- Security and cleanup: read-only, destructive-disabled, confirmation, stdio resilience, restart, cleanup recovery, and redaction tests are included in the safe suite.

## Known limitations

- Real integration and compiled stdio tests require a controlled Actual fixture; the fixture used for this release is not an operator's normal budget.
- Real writes always require explicit process-scoped authorization, exact-ID cleanup safeguards, and a verified baseline fingerprint.
- Unsupported public behaviors remain explicit in the [support matrix](support-matrix-v1.md).

## Decision

`ACTUAL BUDGET MCP v1.0.0 READY FOR PRODUCTION USE`

Tag `v1.0.0` is ready for a separate explicit operation. Do not create or push it automatically; tagging and deployment remain separate operations.
