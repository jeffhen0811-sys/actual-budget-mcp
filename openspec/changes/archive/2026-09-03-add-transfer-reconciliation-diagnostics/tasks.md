## 1. Pin the installed SDK contract

- [x] 1.1 Extend `test/contract/sdk-surface.test.ts` and `test/contract/actual-contract.test.ts` to prove the public 26.8.1 signatures and runtime shapes for transfer payees, `addTransactions(..., { runTransfers: true })`, `importTransactions` payee support, reciprocal `transfer_id`, transfer deletion, and cutoff-aware `getAccountBalance`.
- [x] 1.2 Add negative contract assertions that linking existing transactions, transaction merge, reconciliation lock/unlock, account last-reconciled state, and `payeeNameNormalization` are not public supported exports.
- [x] 1.3 Update `docs/actual-api-26.8.1-contract.md` with the proven transfer, import, deletion, account-balance, nullability, return-value, and unsupported-capability findings before production code depends on them.

## 2. Build canonical transfer primitives

- [x] 2.1 Extend `src/actual/transactions.ts` and canonical schemas to preserve raw `transfer_id`, expose derived `isTransfer`, and add fixed exact relationship and bounded leaf-query compilers without accepting caller query fragments.
- [x] 2.2 Create `src/actual/transfers.ts` with meaningful-ID normalization, length-delimited `v1:` SHA-256 pair/candidate keys, reciprocal pair assembly, deterministic integrity reason codes, direction derivation, de-duplication, and sorting.
- [x] 2.3 Add unit tests for ordinary, valid, missing, non-reciprocal, same-account, zero, sign, magnitude, null, malformed, and deterministic-key transfer cases.

## 3. Extend the Actual adapter

- [x] 3.1 Add typed adapter methods for transfer-payee reads, fixed transaction queries, `addTransactions` with explicit `runTransfers`, cutoff-aware account balance, and required account metadata while keeping 26.8.1 behind `ActualApiAdapter`.
- [x] 3.2 Preserve lazy initialization, cache locking, redaction, and FIFO client ownership, and add adapter tests for argument forwarding, normalized outputs, and sanitized failures.

## 4. Implement transfer reads

- [x] 4.1 Implement serialized client operations for valid transfer-payee discovery with exact account resolution and deterministic ordering.
- [x] 4.2 Implement exact transfer lookup that returns one canonical observed pair or stable `NOT_A_TRANSFER` and integrity diagnostics without fabricating missing data.
- [x] 4.3 Implement bounded transfer search with either-side eligibility, magnitude and integrity filters, assembly/de-duplication before pagination, exact totals, and deterministic tie-breakers.
- [x] 4.4 Add client/unit tests for malformed payees, either-side filters, broken pair inclusion, magnitude validation, stable pagination, and result-limit errors.

## 5. Implement safe manual transfer creation

- [x] 5.1 Implement full preflight for distinct open accounts, positive safe-integer amount, date, transfer payee, category existence/type/placement, side-specific cleared values, default dry-run, and explicit write confirmation.
- [x] 5.2 Implement deterministic anchor-side selection and dry-run output showing signed sides, category placement, cleared states, and zero mutation or synchronization.
- [x] 5.3 Implement confirmed creation through public `addTransactions` with `runTransfers: true`, exact before/after ID-set discovery, reciprocal pair verification, required independent side updates, one synchronization, and exact post-sync read-back.
- [x] 5.4 Implement phase-aware partial-state errors with known IDs and recovery guidance and verify that no automatic retry or rollback occurs after creation may have started.
- [x] 5.5 Add unit/client tests for same-status and mixed-status accounts, invalid categories/accounts, ambiguous ID discovery, SDK acknowledgement without IDs, side-update failure, sync failure, verification failure, and successful creation.

## 6. Implement transaction diagnostics

- [x] 6.1 Create `src/actual/transaction-diagnostics.ts` with bounded leaf eligibility, amount/date/imported-ID/payee grouping, possible-transfer graph degree, `UNIQUE`/`AMBIGUOUS` classification, and deterministic reason codes.
- [x] 6.2 Add possible-duplicate classification for `SAME_IMPORTED_ID`, exact-date meaningful payee evidence, near-date meaningful payee evidence, `STRONG`/`LIKELY`, and null-safe rejection of amount-only similarity.
- [x] 6.3 Implement serialized client operations that enforce the 366-day range, zero-to-seven-day window, 5000-item complete-scan cap, positive magnitude bounds, classification-before-filtering, and pagination-after-counting.
- [x] 6.4 Add unit and client tests for exclusion of transfers, splits, and starting balances; dense ambiguous graphs; imported-ID window bypass; null values; boundary dates; scan overflow; deterministic counts; sorting; and pagination.

## 7. Implement reconciliation diagnostics

- [x] 7.1 Create `src/actual/reconciliation.ts` with split-parent exclusion, leaf and starting-balance aggregation, reconciled-as-cleared semantics, direct uncleared calculation, statement differences, and fixed status precedence including `MATCHES_BOTH`.
- [x] 7.2 Implement the serialized account reconciliation operation with once-resolved default cutoff, exact account lookup, public balance cross-check, optional separately labeled `balance_current`, and no mutation or synchronization.
- [x] 7.3 Add unit/client tests for ordinary and split transactions, starting balances, every cleared state, every statement status, missing bank metadata, signed differences, unknown accounts, and both aggregate-integrity failures.

## 8. Make existing transaction operations transfer-aware

- [x] 8.1 Add optional validated `payee` to the shared import/preview item normalizer, SDK mapping, and SHA-256 request fingerprint while preserving all legacy defaults, inputs, and required outputs.
- [x] 8.2 Extend structured transaction search with strict `transferState` filtering while preserving omitted-input behavior, signed amount semantics, split modes, totals, and deterministic pagination.
- [x] 8.3 Add pair preflight and post-read impact metadata to single transaction update, preserving its allowlist and rejecting every direct relationship field.
- [x] 8.4 Keep bulk transfer protection conservative: permit only exact independent `cleared` desired state and verify no category, payee, notes, date, amount, or relationship widening.
- [x] 8.5 Make confirmed deletion resolve a transfer pair first, call the official delete API once, and verify/report every affected exact ID without claiming success for inconclusive state.
- [x] 8.6 Add backward-compatibility and transfer-aware tests for import, preview purity/fingerprints, search, update mirroring, bulk guards, ordinary deletion, pair deletion, and broken relationships.

## 9. Publish the strict 53-tool MCP surface

- [x] 9.1 Add strict Zod input/output contracts in `src/mcp/contracts.ts` for all seven new tools, bounded enums and integers, nullable observed pair sides, reason codes, counts, phases, and reconciliation states.
- [x] 9.2 Register all seven handlers in `src/mcp/server.ts` with English titles/descriptions and accurate annotations: six read-only idempotent tools and mutation-capable non-idempotent transfer creation.
- [x] 9.3 Extend old tool output contracts only with optional transfer metadata, preserve every required v0.5.0 shape, and ensure unknown relationship or reconciliation mutation fields are rejected before adapter calls.
- [x] 9.4 Define one canonical expected tool-name inventory and reuse it in MCP, contract, compiled-stdio, documentation, and readiness assertions so discovery is exactly 53 with no aliases.
- [x] 9.5 Add MCP tests for structured/text parity, schemas, annotations, confirmation guards, stable sanitized errors, English authored content, credential sentinel redaction, and continued stdio health after negative calls.

## 10. Extend real-server verification and cleanup

- [x] 10.1 Extend `test/real/ownership.ts`, `test/real/resources.ts`, and `test/real/fingerprint.ts` to own both transfer IDs as one unit, delete a pair at most once, verify both sides absent, and fingerprint reciprocal identifiers.
- [x] 10.2 Extend read integration coverage for transfer payees, valid and broken pair reads, transfer search, both diagnostic tools, reconciliation aggregates, cutoff balance coherence, bounds, and deterministic pagination without writes.
- [x] 10.3 Extend authorized write integration coverage for transfer-creation dry-run purity, confirmed creation, mixed-budget category placement, independent clear states, transfer-aware import/update/delete effects, exact cleanup, and unchanged permanent fixtures.
- [x] 10.4 Extend compiled stdio read/write E2E to discover exactly 53 tools and exercise new successes, negative inputs, partial-state reporting, purity, cleanup, and process recovery through a real MCP client.
- [x] 10.5 Add bounded diagnostic performance observations at representative and maximum supported scan sizes and fail the readiness evidence on truncation or non-determinism.

## 11. Update release and operator documentation

- [x] 11.1 Bump project, lockfile root, server, README, and CHANGELOG metadata to 0.6.0 while leaving `@actual-app/api` pinned exactly to 26.8.1.
- [x] 11.2 Document the seven tools, pair integrity, manual transfer preview/confirmation, import payee precedence, search semantics, candidate limitations, reconciliation balance definitions, bank metadata distinction, caps, errors, and recovery workflows in `README.md`.
- [x] 11.3 Update `docs/manual-acceptance.md` and `docs/traceability.md`, add the v0.6.0 readiness record, and replace stale 34/42/46 inventory expectations with the canonical 53-tool contract.
- [x] 11.4 Verify clean v0.5.0-to-v0.6.0 `update.sh` behavior, clean installation/start behavior, Hermes stdio guidance, Docker behavior, Git hygiene, English-only project-authored content, and secret scans without altering local caches or configuration.

## 12. Run the release gates

- [x] 12.1 Run `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run test:contract`, and `npm run build`, resolve every failure, and retain results in the v0.6.0 readiness record.
- [x] 12.2 With an authorized controlled server, run `npm run test:integration:read`, `npm run test:integration:write`, `npm run test:e2e:read`, and `npm run test:e2e:write`; verify dry-run purity, exact cleanup, permanent fingerprints, and no credential leakage.
- [x] 12.3 Run `openspec validate --all --json`, confirm every required compatibility/install/update/performance/security check actually ran, and end the final evidence with exactly `ACTUAL BUDGET MCP v0.6.0 READY` only when nothing is skipped or unavailable.
