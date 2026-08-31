## 1. Confirm the pinned Actual contract

- [x] 1.1 Recheck the current official Actual API and Rules documentation against installed `@actual-app/api@26.8.1` declarations and bundled exports, recording only discrepancies relevant to payees, merge, rules, stages, returns, nullability, and unsupported run/preview behavior.
- [x] 1.2 Expand SDK-surface contract tests for payee CRUD, `mergePayees`, `getPayeeRules`, rule CRUD, full-object `updateRule`, boolean `deleteRule`, stable rule IDs, and the absence of public manual-run and preview exports.
- [x] 1.3 Add bundled-behavior contract assertions for transfer-payee protection/no-ops, payee mapping during merge, rule stage validation, ranked rule ordering, schedule-protected rule deletion, and payee/rule optional fields without using those internals in production code.
- [x] 1.4 Perform read-only observation against the configured real Actual budget for payee and rule shapes, including transfer payees, stages, conditions, actions, arrays, absent/null values, and advanced rules; capture sanitized findings in the versioned API contract document.

## 2. Extend adapter models, schemas, and errors

- [x] 2.1 Add narrow adapter types and official method bindings for payee create/update/delete/merge, payee-rule reads, and rule list/create/update/delete while preserving the single SDK instance.
- [x] 2.2 Implement pure rule projection helpers for lossless pinned reads, MCP writability classification, and bidirectional `default` stage translation without accepting caller-controlled arbitrary JSON.
- [x] 2.3 Define strict payee input/output schemas for get, create, rename, delete preflight/result, and merge preflight/result while leaving the existing payee-list schema unchanged.
- [x] 2.4 Define discriminated condition schemas for every advertised field/operator/value combination and discriminated non-destructive action schemas for supported set and note operations.
- [x] 2.5 Define complete rule read schemas plus strict create, partial desired-state update, delete, mutation, and deletion result schemas; reject empty arrays, empty updates, arbitrary options, advanced write actions, and unknown properties.
- [x] 2.6 Extend public error entity types and stable codes for payee/rule references, transfer protection, unsupported rule shapes, protected Actual entities, in-use payees, and ambiguous merge outcomes while preserving the existing envelope and redaction.

## 3. Implement serialized payee administration

- [x] 3.1 Add complete official payee lookup and transaction/rule reference-count helpers that validate all account histories and subtransactions inside one queue position.
- [x] 3.2 Implement `getPayee` with exact not-found behavior and optional transfer-account projection.
- [x] 3.3 Implement exact trimmed-name `createPayee` idempotency, ambiguous-name refusal, official create, sync, read-back, and verified mutation results.
- [x] 3.4 Implement ordinary-payee rename with transfer-payee refusal, desired-state no-op handling, official update, sync, and verification.
- [x] 3.5 Implement two-phase unused-payee deletion with safe preflight details, literal confirmation, transfer/reference guards, official delete, sync, and absence verification.
- [x] 3.6 Implement two-phase official payee merge with distinct exact-ID validation, per-source impact counts, transfer guards, one merge call, sync, complete post-merge verification, and non-retryable partial-state recovery metadata.
- [x] 3.7 Add unit regressions for existing/missing/transfer payees, empty and ambiguous names, no-op create/update, reference scans, confirmation refusal, inconclusive preflight, merge validation, merge success, sync failure, and unverifiable merge state.

## 4. Implement serialized rule administration

- [x] 4.1 Implement list/get rule projections that preserve official order and complete known semantics, expose normalized stages and writability, and return structured not-found errors.
- [x] 4.2 Implement complete official account/category-group/category/payee reference sets and field-aware validation for single and multi-ID rule values.
- [x] 4.3 Implement create-rule validation, SDK-shape translation, official mutation, synchronization, returned-ID verification, and persisted normalized output without semantic deduplication.
- [x] 4.4 Implement desired-state update by loading the complete current rule, refusing advanced read-only shapes, merging only allowlisted fields, revalidating references, calling the SDK full-object update, synchronizing, and returning changed/no-op results.
- [x] 4.5 Implement protected single-rule deletion with existence check, literal confirmation, false-result refusal, synchronization, absence verification, and no transaction side effects.
- [x] 4.6 Add unit regressions for stages, condition/action unions, invalid operators and values, missing conditions/actions, missing references, advanced read-only rules, empty/no-op updates, full-object SDK updates, protected deletion, and sync/read-back failures.

## 5. Register the exact MCP v0.3.0 surface

- [x] 5.1 Extend the runtime interface and register the five payee and five rule tools with English titles/descriptions, strict schemas, structured and text results, and accurate annotations.
- [x] 5.2 Generalize the existing missing-confirmation adapter so payee delete, payee merge, and rule delete return structured domain errors and safe preflight details without permitting mutation unless confirmation is literal true.
- [x] 5.3 Update the exact tool inventory to 34 and MCP metadata to 0.3.0 while proving all 24 v0.2.0 names, inputs, outputs, and especially `actual_list_payees` remain compatible.
- [x] 5.4 Add MCP unit tests for discovery, schemas, annotations, success outputs, text/structured parity, guards, negative calls, error redaction, continued operation after failure, and the explicit absence of run/preview tools.

## 6. Expand contract and local regression coverage

- [x] 6.1 Add adapter tests for every new official binding, stage translation, exact payload shape, null/absence preservation, and boolean rule-deletion handling.
- [x] 6.2 Add contract fixtures for ordinary and transfer payees plus representative rules across pre/default/post stages, and/or conditions, supported actions, advanced readable actions, arrays, optional fields, and null values observed from the installed SDK.
- [x] 6.3 Extend FIFO, lazy initialization, single-client, sync-failure, shutdown, cache-lock, and secret-sentinel regressions to cover concurrent payee/rule operations without changing lifecycle behavior.
- [x] 6.4 Verify unit and contract suites contain regression evidence for every production correction discovered during real-server work rather than fixing only test expectations.

## 7. Extend real-test ownership and integrity controls

- [x] 7.1 Add `payee` and `rule` resource kinds with exact returned-ID registration and dependency-ordered cleanup for transactions, rules, payees, categories, groups, and accounts.
- [x] 7.2 Add permanent-payee guards for all named fixtures and prevent them from being registered, renamed, deleted, merged, or reused by any write test.
- [x] 7.3 Extend permanent fingerprints to stable complete rule and payee representations while preserving existing account, category, and transaction coverage.
- [x] 7.4 Add safe leftover detection and sanitized manual-cleanup diagnostics for temporary transactions, rules, payees, categories, groups, and accounts without global prefix deletion.

## 8. Verify payees and rules against Actual Server

- [x] 8.1 Extend real read integration tests for single payees, transfer-payee shape, rule list/get, stage translation, execution order, conditions/actions, and absent IDs.
- [x] 8.2 Add the guarded real payee lifecycle: create by unique name, list/get, rename, no-confirm deletion refusal, confirmed deletion, exact-ID cleanup, and permanent fingerprint comparison.
- [x] 8.3 Add guarded official merge coverage with unique source/target payees and an owned source transaction, verifying refusal without confirmation, affected counts, target remapping, source absence, rule relationships when present, and cleanup.
- [x] 8.4 Add the guarded real rule lifecycle with temporary payee, category group, category, rule create/list/get/update, no-confirm deletion refusal, confirmed deletion, reverse-dependency cleanup, and fingerprint comparison.
- [x] 8.5 Add functional integration proof that an MCP-created persisted rule is applied by Actual's official import pipeline to a uniquely owned transaction and produces the expected payee/category result.
- [x] 8.6 Add negative real integration cases for missing payee/rule/reference IDs, malformed rules, invalid operators, empty updates, transfer-payee mutations, and safe process recovery after errors.

## 9. Verify through the compiled MCP stdio process

- [x] 9.1 Update read E2E discovery to exactly 34 v0.3.0 tools and exercise payee/rule reads through a real MCP client and compiled `dist/index.js`.
- [x] 9.2 Add payee create/get/rename/delete and supported merge E2E flows with strict input/output validation, text/structured parity, synchronization, restart-safe reads, and exact-ID cleanup.
- [x] 9.3 Add rule create/get/list/update/delete and import-time functional execution E2E flows using only MCP tool calls, never direct handlers.
- [x] 9.4 Add negative E2E coverage for missing IDs, empty names/updates, missing confirmations, invalid merge relationships, missing references, malformed rules, invalid operators, unavailable run/preview tools, credential redaction, and continued MCP operation.
- [x] 9.5 Reconfirm permanent fingerprints and absence of every owned temporary resource after both integration and E2E write suites.

## 10. Version, documentation, and operational compatibility

- [x] 10.1 Update package, lockfile root, MCP metadata, Docker examples, README, CHANGELOG, and release documents from 0.2.0 to 0.3.0 while keeping `@actual-app/api` pinned at 26.8.1.
- [x] 10.2 Add English README sections for Payees, Rules, and Automatic categorization foundation with every new tool's contract, examples, destructive warnings, stage translation, authoring subset, merge caveats, and run/preview limitations.
- [x] 10.3 Add CHANGELOG 0.3.0 `Added`, `Changed`, and `Fixed` entries covering administration, guards, tests, SDK compatibility discoveries, and verified regressions.
- [x] 10.4 Verify `install.sh` on a clean installation path and verify `update.sh` preserves environment, Actual caches, test caches, and Hermes configuration during a safe v0.2.0-to-v0.3.0 update without reset or clean operations.
- [x] 10.5 Update traceability, manual acceptance, API contract, and the v0.3.0 readiness-report template with supported/unsupported capability outcomes and exact verification fields.

## 11. Execute the strict release gate

- [x] 11.1 Run `npm run typecheck`, `npm test`, `npm run test:contract`, and `npm run build`; record pass/fail and test counts without exposing secrets.
- [x] 11.2 Run `npm run test:integration:read` and `npm run test:e2e:read` against the configured Actual Server before writes.
- [x] 11.3 With writes explicitly scoped by `ACTUAL_INTEGRATION_ALLOW_WRITES=true`, run `npm run test:integration:write`, verify cleanup, run `npm run test:e2e:write`, and verify cleanup again.
- [x] 11.4 Restore writes to disabled, rerun integration read and E2E read, then run `npm run test:all` and confirm all permanent fingerprints and leftover scans pass.
- [x] 11.5 Run `git diff --check`, inspect `git status` and tracked files, and perform secret-pattern scans without printing secret values.
- [x] 11.6 Produce the Actual Budget MCP 0.3.0 readiness report with before/after versions, exact tool inventory, SDK findings, every verification result, payee/rule capability outcomes, compatibility, cleanup, fixture integrity, secrets, blockers, and the exact READY/NOT READY final line required by the specs.
