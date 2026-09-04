## 1. Freeze the v0.7.0 Baseline

- [x] 1.1 Generate a deterministic 62-tool discovery snapshot from clean commit `c5b752a`, record the source commit, and commit the normalized 0.7.0 names, descriptions, annotations, input schemas, and output schemas before changing public definitions.
- [ ] 1.2 Implement a semantic compatibility checker that enforces exact names/count, preserves every baseline-valid input, and rejects removed or changed required output fields, types, wrappers, nullability, and annotations.
- [ ] 1.3 Add curated 0.7.0 valid-request and boundary fixtures for Zod refinements that normalized JSON Schema comparison cannot prove.
- [ ] 1.4 Audit all names against the established `actual_<verb>_<resource>` convention, document stable legacy exceptions such as health and sync, and verify that no alias or rename is introduced.
- [ ] 1.5 If any essential defect appears to require an incompatible change, stop implementation and document its evidence, affected tool, alternatives, and release impact for explicit review.

## 2. Consolidate Tool Contract Metadata

- [ ] 2.1 Extend the declarative runtime tool definitions to cover name, domain, capability, idempotency, title, description, input/output schemas, confirmation model, bounds, synchronization policy, and partial-failure classification for all 62 tools.
- [ ] 2.2 Make MCP registration, annotations, read-only enforcement, and destructive-disabled enforcement consume the authoritative definitions without duplicated annotation declarations.
- [ ] 2.3 Add a test-only verification manifest mapping every tool to existing or new unit, contract, integration, and compiled stdio E2E evidence, and validate that referenced files/tests exist.
- [ ] 2.4 Implement deterministic inventory generate/check commands that join runtime definitions with the verification manifest and produce `docs/tool-inventory-v1.md`.
- [ ] 2.5 Replace brittle positional and historical-slice assertions with full-registry checks for exactly 62 unique definitions, 27 reads, 35 mutation-capable tools, nine destructive tools, and reviewed idempotency values.

## 3. Audit Schemas, Models, and Nullability

- [ ] 3.1 Audit every input schema for strict objects, trimmed and bounded identifiers/text where appropriate, valid dates/months, safe integer money, enums, array/pagination limits, confirmations, and dry-run defaults.
- [ ] 3.2 Prove that no mutation input accepts `any`, `unknown`, arbitrary records, raw query structures, raw ActualQL, SQL, SQLite instructions, caller paths, commands, or direct `transfer_id` mutation.
- [ ] 3.3 Define or reuse canonical Account, Transaction, CategoryGroup, Category, Payee, Rule, BudgetMonth, Schedule, TransferPair, and RuntimeStatus projections and document any intentionally distinct bounded views.
- [ ] 3.4 Add a nullability regression matrix covering manual/imported/starting-balance/transfer/split transactions, account balance metadata, schedule amount/references/recurrence, rule stage/metadata, and optional budget aggregates.
- [ ] 3.5 Audit every output against installed SDK 26.8.1 declarations, bundle behavior, controlled real responses, sanitization requirements, and absence of raw internal objects or credentials.
- [ ] 3.6 Add generated success-contract tests proving every tool's structured content and JSON text content validate against and are deeply equivalent under the same output schema.

## 4. Complete Policy, Confirmation, and Error Coverage

- [ ] 4.1 Make every delete and payee merge return `DESTRUCTIVE_CONFIRMATION_REQUIRED` consistently when `confirmDestructive` is absent or false, including `actual_delete_transaction`, without calling its runtime handler.
- [ ] 4.2 Add schema-valid safe fixture arguments for every mutation-capable and destructive tool so policy tests can be generated from the registry.
- [ ] 4.3 Invoke all 35 mutation-capable tools through an in-memory MCP server under read-only mode and assert `READ_ONLY_MODE` before every runtime handler.
- [ ] 4.4 Invoke all nine destructive tools through an in-memory MCP server under destructive-disabled mode and assert `DESTRUCTIVE_OPERATIONS_DISABLED` before confirmation or domain mutation.
- [ ] 4.5 Add a global per-call consent suite for all deletes, payee merge, transfer/bulk execution confirmation, and fill-empty versus overwrite budget-copy semantics.
- [ ] 4.6 Convert the typed public error union into an exhaustively documented domain catalog and generate or verify `docs/error-codes-v1.md`, including retryability and partial-state/recovery fields.
- [ ] 4.7 Add tests that prevent arbitrary SDK errors, stacks, credentials, sync IDs, private paths, environment values, and unstable raw error strings from entering MCP responses.

## 5. Centralize Bounds and Operation Semantics

- [ ] 5.1 Move remaining public and sentinel limits into one shared limits source, including summary ID counts, 5,000/5,001 query overflow, schedule defaults, diagnostics, candidate windows, pagination, and budget copy.
- [ ] 5.2 Replace unexplained handler/schema/description magic limits with named shared values and generate or verify `docs/limits-v1.md` from them.
- [ ] 5.3 Audit every dry-run or intrinsically pure path and add fingerprint regressions for bulk update, transfer creation, budget copy, import preview, diagnostics, and applicable budget/import workflows.
- [ ] 5.4 Review idempotency for every mutation-capable tool, correct only demonstrably inaccurate metadata without breaking requests, and generate or verify `docs/idempotency-v1.md` with test evidence.
- [ ] 5.5 Review every write as write-and-sync, write-without-sync, or sync-only and generate or verify `docs/sync-semantics-v1.md` with read-back and recovery expectations.
- [ ] 5.6 Audit bulk update, import, payee merge, budget copy, transfer creation, transaction transfer lifecycle, and post-mutation sync for exact affected/pending IDs, no silent retry, no fake rollback, and truthful partial failure.
- [ ] 5.7 Record sanitized bounded performance observations for search 100/totals, preview 100, bulk dry-run 50, transfer and duplicate scans, reconciliation, month and annual summaries, schedule list, and runtime status; investigate material regressions without creating arbitrary release SLAs.

## 6. Revalidate Every Functional Domain

- [ ] 6.1 Revalidate transaction get/list/search/import/preview/update/delete/bulk behavior across manual, imported, starting-balance, transfer, split parent/child, cleared, uncategorized, nullable, and repeated imported-ID cases.
- [ ] 6.2 Revalidate the preview-review-import-verify workflow, supported import options, rule application, reconciliation, second-side transfer behavior, deleted reimport, default-cleared handling, and preview fingerprint binding.
- [ ] 6.3 Revalidate transfer payees, creation, pair lookup/search, reciprocal IDs, opposite amounts, update/delete lifecycle, on/off-budget categories, second-side import, and unique versus ambiguous diagnostics without direct relationship mutation.
- [ ] 6.4 Revalidate reconciliation as diagnostic-only with ledger, cleared/reconciled/uncleared, statement difference, split-safe totals, starting balance, signed balances, and no UI lock mutation.
- [ ] 6.5 Revalidate budget month list/detail/summary, amount, carryover, hold/reset, copy preview/execution, overwrite guard, idempotency, and honest tracking-mode fixture limitations.
- [ ] 6.6 Revalidate payee and rule read/write/delete/merge safety, transfer-payee distinction, stage and reference handling, import-driven automatic categorization, and continued absence of manual rule run/preview.
- [ ] 6.7 Revalidate account/category creation, update, close/reopen, delete cascades, moves, visibility, type compatibility, and complete empty/unused preflights without weakening safeguards.
- [ ] 6.8 Revalidate schedule list/get/create/update/delete, recurrence and amount variants, nullable references, synchronized read-back, deletion safety, and continued exclusion of transfer schedules and manual posting.
- [ ] 6.9 Revalidate month/spending/income summaries with controlled income, negative adjustments, expense refunds, uncategorized entries, split leaves, transfers, starting balances, and separate off-budget cash flow.
- [ ] 6.10 Revalidate health, sync, and runtime status versioning, connectivity, modes, queue/cache state, uptime, sync telemetry, restart reset, and secret/path omission.

## 7. Strengthen Security and Protocol Tests

- [ ] 7.1 Add threat-oriented schema/runtime tests for arbitrary queries, raw database access, direct transfer linking, read-only and destructive bypass, missing confirmations, path traversal, command injection, oversized payloads, recurrence abuse, and environment reflection.
- [ ] 7.2 Audit application and SDK logging so stdout is protocol-only and stderr uses sanitized operation, duration, count, status, and error-code metadata without raw notes, transactions, queries, paths, credentials, or personal financial values.
- [ ] 7.3 Add compiled stdio resilience coverage for invalid account/transaction/range/amount, missing confirmation, read-only, destructive-disabled, invalid recurrence/transfer/budget, and health after every failure.
- [ ] 7.4 Add compiled process restart coverage for health/status, explicit sync, telemetry observation, stop/start, telemetry reset, and preserved cache/budget operation.
- [ ] 7.5 Add startup/discovery coverage for missing environment, invalid URL, wrong password, invalid sync ID, cache lock, decryption failure, and unavailable Actual while checking sanitization and lazy discovery.
- [ ] 7.6 Create `docs/security-review-v1.md` with findings, mitigations, accepted boundaries, and evidence for every threat question in the release brief.

## 8. Strengthen Cleanup and Real Acceptance Harnesses

- [ ] 8.1 Audit ResourceRegistry ownership for every mutable domain, immediate exact-ID capture, transfer-pair cleanup units, dependency-order cleanup, and exclusion of preview/candidate identifiers.
- [ ] 8.2 Add deterministic tests proving `finally` cleanup after a forced mid-test assertion failure and sanitized exact leftover reporting when one cleanup action fails.
- [ ] 8.3 Review and document permanent fingerprint scope; ensure it covers controlled accounts, transaction identities and reciprocal transfer relationships, payees, categories/groups, rules, schedules, and relevant budget state without claiming unbounded private-history coverage.
- [ ] 8.4 Add representative real read-only and destructive-disabled E2E coverage for every functional domain and verify permanent fingerprints before and after each mode process.
- [ ] 8.5 Ensure non-destructive writes still work in a destructive-disabled process and that cleanup is performed only by a fresh separately authorized process.

## 9. Produce Version 1 Documentation

- [ ] 9.1 Create `docs/public-contract-v1.md` covering names, inputs, outputs, errors, integer money, dates, nullability, confirmation, dry-run, guards, fixed-query boundaries, SDK pinning, and semantic versioning.
- [ ] 9.2 Create `docs/import-workflow-v1.md` covering preview, review, identical request fingerprint, import, verification, idempotency, rules, transfer reconciliation, and supported options.
- [ ] 9.3 Create `docs/acceptance-matrix-v1.md` using only PASS/FAIL/N/A/UNSUPPORTED and evidence columns for every required domain and test layer.
- [ ] 9.4 Create `docs/support-matrix-v1.md` covering manual/imported/split transactions, transfers, off-budget, rules, envelope/tracking budget, schedules, reconciliation diagnostics, and every intentional unsupported boundary.
- [ ] 9.5 Create `docs/hermes-upgrade-v1.md` with clone/update, version verification, reload, tool discovery, health/status, smoke read, and manual Git rollback guidance without credentials or data reorganization.
- [ ] 9.6 Create `docs/hermes-smoke-test-v1.md` with only non-destructive health, status, account, category, payee, transaction-if-known, budget-month, schedule, and summary reads.
- [ ] 9.7 Restructure README for 1.0.0 Quick Start, requirements, installation, configuration, Hermes, security modes, domain navigation, testing, update, troubleshooting, security, limitations, and versioning while linking instead of repeating the full inventory.
- [ ] 9.8 Add the 1.0.0 CHANGELOG entry grouped by foundation, domains, security, testing, and operations, and list all known limitations explicitly.
- [ ] 9.9 Add documentation verification tests for required sections, safe placeholders, current version, SDK pin, operational modes, unsupported behavior, and absence of private values.

## 10. Harden Installation, Update, CI, and Distribution

- [ ] 10.1 Audit `install.sh`, Node/npm/engines agreement, locked install, build/executable checks, cache creation, safe Hermes output, and preservation of existing ignored runtime files.
- [ ] 10.2 Replace the isolated v0.6.0-to-v0.7.0 update fixture with or extend it by an immutable v0.7.0-to-v1.0.0 fast-forward test covering dirty refusal and environment/cache/Hermes preservation.
- [ ] 10.3 Add a nonrecursive default-safe `release:check` script and document how it differs from `test:all` and full authorized release acceptance.
- [ ] 10.4 Make `test:all` execute configured read suites while reporting skipped/unavailable write or real suites truthfully, without allowing a skipped gate to become readiness evidence.
- [ ] 10.5 Update GitHub Actions to run the nonduplicative safe gate set with locked installation and no Actual credentials, private networking, or write authorization.
- [ ] 10.6 Audit `.gitignore` and tracked files for environment files, caches, runtime databases, integration/E2E data, coverage, dist policy, logs, Hermes local configuration, and accidental ignored source/docs.
- [ ] 10.7 Add `npm pack --dry-run` validation and, if needed, an explicit package allowlist that excludes private/runtime/test-state artifacts without publishing the package.
- [ ] 10.8 Build the Docker image and test its non-root stdio entry, cache volume, lack of exposed HTTP transport, and absence of embedded credentials while keeping Docker optional for normal installation.
- [ ] 10.9 Add reproducible secret and private-path scans that distinguish clearly synthetic redaction fixtures from forbidden authored or tracked values.

## 11. Update Release Identity and OpenSpec

- [ ] 11.1 Update package.json, package-lock root metadata, MCP version source, runtime expectations, README, CHANGELOG, Docker examples, readiness references, and applicable tests/specs from 0.7.0 to 1.0.0.
- [ ] 11.2 Assert that `@actual-app/api` remains exactly 26.8.1 in package metadata, lockfile, installed contract, runtime status, documentation, and final evidence.
- [ ] 11.3 Regenerate all contract, inventory, error, limit, idempotency, sync, and matrix artifacts and verify check mode produces no diff.
- [ ] 11.4 Run strict OpenSpec validation for the change and all main specs, resolving errors without weakening the normative 1.0.0 gates.
- [ ] 11.5 Verify no tool was added, removed, merged, renamed, duplicated, or given an unreviewed incompatible contract change.

## 12. Execute Safe Final Gates

- [ ] 12.1 Run `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run test:contract`, `npm run build`, and `npm run release:check`; record exact counts and coverage and require at least 80% statements and 70% branches.
- [ ] 12.2 Run configured `npm run test:integration:read` and `npm run test:e2e:read`, record sanitized bounded observations, and verify the permanent fingerprint remains unchanged.
- [ ] 12.3 Run read-only E2E, destructive-disabled E2E, protocol resilience, restart, cleanup recovery, fresh install, isolated update, Docker, package dry-run, secret scan, tracked-file audit, `git diff --check`, and `openspec validate --all --json` on the final candidate.
- [ ] 12.4 Record any failed, skipped, unavailable, or unexecuted supported gate as a blocker rather than treating safe local checks as complete release acceptance.

## 13. Execute Authorized Writes and Decide Readiness

- [ ] 13.1 Obtain explicit authorization for process-scoped real writes and confirm the dedicated controlled Actual fixture, exact-ID cleanup safeguards, and baseline fingerprint before enabling `ACTUAL_INTEGRATION_ALLOW_WRITES=true`.
- [ ] 13.2 Run authorized `npm run test:integration:write`, verify exact cleanup and fingerprint restoration, then run authorized `npm run test:e2e:write` and repeat exact cleanup and fingerprint verification.
- [ ] 13.3 Remove write authorization and rerun integration read, E2E read, and `npm run test:all`, confirming write suites are disabled and final reads remain clean.
- [ ] 13.4 Populate the final acceptance and support matrices with actual evidence from the final source commit; never mark skipped or unavailable mandatory work as PASS.
- [ ] 13.5 Generate `docs/release-readiness-1.0.0.md` with release identity, contract freeze, command/test counts, domain/security/cleanup/distribution evidence, known limitations, and blockers.
- [ ] 13.6 End readiness with exactly `ACTUAL BUDGET MCP v1.0.0 READY FOR PRODUCTION USE` only if every supported mandatory gate passed; otherwise end with exactly `ACTUAL BUDGET MCP v1.0.0 NOT READY`.
- [ ] 13.7 Document that tag `v1.0.0` is ready for a separate explicit operation when and only when readiness passes, but do not create or push the tag and do not deploy or reorganize Alfred/Actual data in this change.
