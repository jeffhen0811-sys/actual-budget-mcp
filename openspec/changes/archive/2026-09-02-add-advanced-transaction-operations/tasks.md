## 1. Pin Installed Transaction and Import Behavior

- [x] 1.1 Extend `docs/actual-api-26.8.1-contract.md` with the installed `q`, `aqlQuery`, transaction fields, filter operators, joins, deterministic ordering, pagination, calculations, and split-mode declarations and bundle findings.
- [x] 1.2 Add installed-contract tests for `q`/`aqlQuery` exports, serialized fixed transaction queries, null equality/inequality, one-of, signed ranges, literal-like filters, multi-field order, limit, offset, count, sum, and `inline`/`grouped`/`all` execution shapes.
- [x] 1.3 Add installed-contract tests for canonical nullable transaction, transfer, starting-balance, split parent/child, parent ID, nested subtransaction, and resolved join fields.
- [x] 1.4 Extend import contract documentation and tests for `dryRun`, `defaultCleared`, `reimportDeleted`, `updatedPreview`, generated preview IDs, Rules-before-reconciliation, skipped preview writes, title-case payee normalization, and the absence of `payeeNameNormalization`.
- [x] 1.5 Add controlled installed-bundle tests or fixtures for imported-ID matching, manual fuzzy matching, reconciled/ignored outcomes, deleted-import behavior, preview errors, and non-persisted payee creation evidence.
- [x] 1.6 Stop and update the OpenSpec artifacts before production changes if any required installed behavior materially contradicts the specified contracts.

## 2. Canonical Transaction and Query Foundations

- [x] 2.1 Add shared v0.5.0 limits for 366 search days, default 100 and maximum 250 search items, maximum 10000 offset, maximum 100 bulk updates, and maximum 500 import items without changing existing compatible constants.
- [x] 2.2 Extend adapter and public transaction types for nullable/optional import and transfer data plus `is_parent`, `is_child`, `parent_id`, resolved names, and recursive `subtransactions`.
- [x] 2.3 Refactor one recursive canonical transaction projector that preserves null versus absence, strips internal SDK fields, and remains compatible with `actual_get_transactions`.
- [x] 2.4 Add strict runtime parsers for unknown ActualQL row, grouped, aggregate, and import-preview result shapes with sanitized failure mapping.
- [x] 2.5 Bind the public installed `q` and `aqlQuery` exports through a narrow adapter interface without exposing raw query input to the MCP layer.
- [x] 2.6 Implement a fixed-table typed transaction query compiler for allowlisted selects, filters, split modes, sorts, pagination, and inline aggregates.
- [x] 2.7 Implement and unit-test literal substring escaping for backslash, `%`, and `?`, including casing, diacritics, empty/bounded input, and null searchable fields.

## 3. Exact Lookup and Advanced Search

- [x] 3.1 Add strict Zod input/output schemas for exact transaction lookup using the shared canonical transaction schema.
- [x] 3.2 Implement exact lookup with an `all` identity anchor, parent-only grouped enrichment, exact child preservation, and structured not-found behavior.
- [x] 3.3 Add strict search schemas for dates, ID lists, uncategorized/category incompatibility, import source, cleared, signed integer bounds, literal text, split mode, sort, limit, offset, and totals.
- [x] 3.4 Implement search filter compilation for cross-account date ranges, exact account/transaction/payee/category IDs, ordinary uncategorized transactions, manual/imported identifiers, cleared state, signed amount ranges, and literal text across the three supported fields.
- [x] 3.5 Implement deterministic date/amount/payee/category sorting with ID tie-breaking and bounded limit/offset page metadata.
- [x] 3.6 Implement inline total matched and signed amount queries using identical leaf semantics, and return explicit unsupported/omitted totals for grouped mode.
- [x] 3.7 Unit-test lookup and search normal, manual, imported, nullable, transfer, starting-balance, split parent/child, grouped match, every filter, invalid combination, sorting, pagination, totals, and maximum-bound behavior.

## 4. Shared Import Normalization and Preview

- [x] 4.1 Create one import request normalizer shared by preview and execution that preserves the existing item schema and explicitly defaults `defaultCleared: true` and `reimportDeleted: false`.
- [x] 4.2 Implement versioned canonical JSON and SHA-256 request fingerprinting over normalized account, supported options, and ordered transactions while excluding every credential and runtime path.
- [x] 4.3 Extend `actual_import_transactions` schemas and client flow additively with optional supported options, optional expected fingerprint verification, preserved `added`/`updated`/`errors`, and only exact optional audit counts.
- [x] 4.4 Add strict preview input/output schemas that reuse import items and options, expose no `dryRun` switch, distinguish existing IDs from omitted or explicitly preview-only addition IDs, and avoid unsupported classifications.
- [x] 4.5 Implement `actual_preview_import` through the serialized read path with official `dryRun: true`, no synchronization, sanitized `updatedPreview` evidence, and the shared request fingerprint.
- [x] 4.6 Unit-test old import requests, explicit options, mismatched fingerprints, invalid unsupported normalization options, preview would-add/update/ignored/errors, Rules evidence, generated IDs, and proof that preview never invokes mutation or sync paths.

## 5. Bulk Desired-State Planning and Execution

- [x] 5.1 Add strict bulk item, field, confirmation, preview, execution, audit-count, per-item status, and partial-failure schemas with a maximum of 100 unique IDs.
- [x] 5.2 Confirm category-null and payee-null clearing behavior in declarations, bundle contract tests, and controlled real-server probes before enabling each explicit clear; otherwise reject the unsupported clear deterministically.
- [x] 5.3 Implement a pure bulk planner that exact-loads all transactions, validates all category/payee references, calculates canonical before/after states and changed fields, identifies unchanged items, and makes any structural failure globally non-executable.
- [x] 5.4 Implement split protection for every parent and child and transfer protection for category, payee, and notes while permitting only verified independent cleared changes.
- [x] 5.5 Implement dry-run as the default with requested, matched, would-update, unchanged, blocked, executable, and bounded per-item preview details and no update/sync calls.
- [x] 5.6 Implement the `dryRun: false` plus `confirmWrite: true` guard and refuse the complete write when any plan item is invalid or protected.
- [x] 5.7 Implement confirmed serial local updates in one queue position, capture SDK-reported affected IDs, synchronize once, exact-read requested IDs, and verify every desired state.
- [x] 5.8 Implement phased partial-failure metadata for local update, sync, and read-back failures with attempted/completed/pending/affected IDs, safe recovery actions, and no automatic retry or rollback claim.
- [x] 5.9 Unit-test heterogeneous items, duplicate/missing IDs, invalid references, null clears, protections, default dry-run, confirmation, single sync, idempotent repeat, local partial failure, sync failure, and post-sync verification failure.

## 6. MCP Surface and Backward Compatibility

- [x] 6.1 Add the four runtime methods and register `actual_get_transaction`, `actual_search_transactions`, `actual_bulk_update_transactions`, and `actual_preview_import` with English titles, descriptions, strict schemas, and safe handlers.
- [x] 6.2 Apply read-only annotations to lookup/search/preview and conservative mutation-capable idempotent annotations to bulk while making its default dry-run explicit.
- [x] 6.3 Update exact tool inventory assertions from 42 to 46 and prove that no public ActualQL, raw query, field-specific search, field-specific bulk, or artificial alias is registered.
- [x] 6.4 Extend stable structured errors for incompatible filters, protected split/transfer items, write confirmation, fingerprint mismatch, query shape, preview evidence, bulk partial state, and verification failure without leaking raw SDK data.
- [x] 6.5 Run regression tests for all 42 v0.4.0 tool names, inputs, wrapper shapes, annotations, structured/text content, and existing import/update/delete behavior.

## 7. Real-Server Integration Coverage

- [x] 7.1 Extend read integration fixtures and tests for exact lookup plus date, cross-account, transaction, payee, category, uncategorized, manual/imported, cleared, signed amount, literal notes/payee, deterministic pagination, and available split searches.
- [x] 7.2 Record non-gating elapsed times for search 100 items and search totals and investigate any unreasonable regression without introducing arbitrary benchmark thresholds.
- [x] 7.3 Extend per-run ownership and complete fingerprints to cover exact temporary accounts, groups, categories, payees, rules, transactions, and all permanent accounts/transactions/payees/categories/rules plus relevant budget state.
- [x] 7.4 Add authorized integration bulk fixtures for at least three transactions, two categories, and two payees; verify heterogeneous dry-run purity, confirmed execution, exact read-back, idempotent repeat, confirmation guard, missing ID, invalid references, protections, cleanup, and fingerprint integrity.
- [x] 7.5 Cover deterministic bulk partial failure through unit fault injection and add a real-server case only if a safe natural failure can be induced without a production test hook.
- [x] 7.6 Add authorized import preview fixtures for new imported ID, existing imported ID, controlled Rule, similar manual match, deleted import under both supported policies, default-cleared behavior, errors, and installed title-case normalization.
- [x] 7.7 Prove preview purity with full before/after fingerprints, then run the equivalent real import where needed to verify observed reconciliation, shared fingerprints, options, exact cleanup, and permanent integrity.
- [x] 7.8 Record non-gating elapsed times for preview 100 items and bulk dry-run 50 items and investigate unreasonable regressions.

## 8. Compiled MCP Stdio E2E Coverage

- [x] 8.1 Extend compiled read E2E to discover exactly 46 tools and exercise exact lookup plus all supported search filters, split modes, ordering, pagination, totals, structured content, text content, and schemas through a real MCP client.
- [x] 8.2 Extend compiled write E2E for bulk dry-run purity, confirmed heterogeneous execution, exact read-back, idempotent repeat, structured confirmation/protection errors, and exact cleanup.
- [x] 8.3 Extend compiled write E2E for preview, no-mutation proof, matching-fingerprint import, persisted lookup/search verification, repeated imported-ID reconciliation, fingerprint mismatch, and cleanup.
- [x] 8.4 Add negative E2E cases for invalid transaction/account/category/payee IDs, dates and range, signed amount bounds and floats, limit/offset, malformed text, split mode, duplicate/empty/oversized bulk items, missing write confirmation, oversized preview, unknown fields, and unsupported normalization.
- [x] 8.5 Verify after every negative case that stdio remains protocol-valid, the server remains operational, and structured/text errors contain no credential or raw query data.

## 9. Documentation, Versioning, and Operations

- [x] 9.1 Update package, lockfile root, MCP metadata, README, changelog, Docker/version examples, and other versioned references from 0.4.0 to 0.5.0 while keeping `@actual-app/api` exactly `26.8.1`.
- [x] 9.2 Add English README sections for advanced search, bulk updates, import preview, safe import workflow, signed integer amounts, pagination, split semantics, default dry-run, transfer/split protection, preview-only IDs, request fingerprint limits, and examples.
- [x] 9.3 Add the 0.5.0 CHANGELOG entry and a complete `docs/release-readiness-0.5.0.md` template covering installed findings, every verification suite, cleanup, fixture integrity, compatibility, secrets, blockers, and the exact READY/NOT READY terminal line.
- [x] 9.4 Validate clean `install.sh` behavior and a clean fast-forward-only 0.4.0-to-0.5.0 `update.sh` path while proving `.env`, Actual cache, integration/E2E caches, and Hermes configuration remain untouched.
- [x] 9.5 Update manual acceptance, traceability, example environment, and operational documentation without adding private server addresses, credentials, permanent financial values, or public raw ActualQL input.

## 10. Verification and Release Readiness

- [x] 10.1 Run `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run test:contract`, and `npm run build`; fix production causes and regression tests rather than weakening assertions.
- [x] 10.2 With writes disabled, run `npm run test:integration:read` and `npm run test:e2e:read` against the configured Actual Server and record sanitized counts, findings, and timings.
- [x] 10.3 With `ACTUAL_INTEGRATION_ALLOW_WRITES=true` scoped only to the authorized process, run `npm run test:integration:write` and `npm run test:e2e:write`, then confirm exact cleanup and permanent fingerprints.
- [x] 10.4 Restore write authorization to false, rerun integration/E2E reads and `npm run test:all`, and confirm no leftover temporary or changed permanent state.
- [x] 10.5 Run clean installation, 0.4.0-to-0.5.0 update verification, `git diff --check`, tracked-file inspection, status review, and secret-pattern scans without printing any secret value.
- [x] 10.6 Complete the readiness report with actual executed results and end with `ACTUAL BUDGET MCP v0.5.0 READY` only when every supported mandatory gate passed; otherwise list blockers and end with `ACTUAL BUDGET MCP v0.5.0 NOT READY`.
