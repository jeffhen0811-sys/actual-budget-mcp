## 1. Pin the v0.7.0 Installed Contract

- [x] 1.1 Extend SDK-surface contract tests for `getSchedules`, `createSchedule`, `updateSchedule`, and `deleteSchedule`, their installed return types, and the absence of public single-get, manual-post, skip, discovery, and force-run exports.
- [x] 1.2 Add sanitized contract fixtures for one-time and recurring schedule dates, exact/approximate/between amounts, nullable or absent references, next-date/completion state, and unsupported legacy or advanced shapes.
- [x] 1.3 Pin the installed bundle behavior for system-managed schedule fields, omitted-amount normalization, unique names, linked-rule deletion, recurrence advancement, initial full sync, and the post-sync schedule service.
- [x] 1.4 Prototype and contract-test fixed ActualQL serialization and result envelopes for category income flags, account off-budget flags, transfer and starting-balance exclusion, inline split behavior, grouped category/group/payee aggregates, and linked schedule transaction IDs.
- [x] 1.5 Update `docs/actual-api-26.8.1-contract.md` with Schedules, Financial summaries, and Runtime observability sections that distinguish official documentation, installed declarations/bundle evidence, unsupported exports, and metadata that cannot be observed reliably.

## 2. Establish Operational Policy and Telemetry Foundations

- [x] 2.1 Add strict non-secret parsing for `ACTUAL_MCP_READ_ONLY` and `ACTUAL_MCP_ALLOW_DESTRUCTIVE` with backwards-compatible defaults while preserving lazy validation of Actual credentials.
- [x] 2.2 Add stable public errors and schedule entity metadata for `READ_ONLY_MODE`, `DESTRUCTIVE_OPERATIONS_DISABLED`, `SCHEDULE_NOT_FOUND`, `INVALID_RECURRENCE`, `SCHEDULE_REFERENCE_INVALID`, and `INVALID_SUMMARY_RANGE`.
- [x] 2.3 Introduce one typed 53-tool capability registry and registration helper that derives inventory and annotations without changing any existing tool name, schema, handler behavior, or default-mode result.
- [x] 2.4 Apply the central policy wrapper to every registered tool with read-only, destructive-disabled, and per-call confirmation precedence, including blocking `actual_sync` in read-only mode.
- [x] 2.5 Add registry regression tests proving every registered tool is classified exactly once, all 32 existing mutation-capable tools are guarded, all eight existing destructive tools are guarded, and annotations agree with policy classification.
- [x] 2.6 Instrument the FIFO queue with safe active-operation and queued-count snapshots that never store arguments, IDs, financial values, or secrets.
- [x] 2.7 Route explicit and post-mutation sync calls through one telemetry helper that records process-lifetime attempt/success timestamps, monotonic duration, and sanitized error code without changing existing partial-state behavior.
- [x] 2.8 Add a single package-version source for MCP and SDK metadata and verify it remains consistent with `package.json` and the pinned SDK manifest.

## 3. Implement Runtime Status and Compatible Health/Sync Metadata

- [x] 3.1 Implement the runtime-status snapshot with active connectivity, loaded-budget state, sanitized server URL, versions, uptime, mode flags, effective write permission, cache configured/lock state, queue state, and only MCP-observed sync telemetry.
- [x] 3.2 Ensure runtime status omits raw sync IDs, credentials, environment dumps, complete private paths, tool arguments, raw upstream errors, and unavailable invented metadata.
- [x] 3.3 Add backwards-compatible optional MCP/SDK/read-only fields to health without removing or changing existing required output.
- [x] 3.4 Add backwards-compatible optional duration and completion metadata to explicit sync and update telemetry on success and sanitized failure.
- [x] 3.5 Add unit tests for fresh, connected, disconnected, failed-sync, queued, locked, read-only, destructive-disabled, and restarted process-lifetime status states.
- [x] 3.6 Register `actual_get_runtime_status` with strict schemas and read-only, non-destructive, idempotent annotations.

## 4. Implement the Schedule Domain

- [x] 4.1 Extend the Actual adapter with narrow schedule types and the four public schedule methods while keeping raw installed return values behind the adapter boundary.
- [x] 4.2 Implement defensive schedule projection that removes rule IDs and raw conditions/actions, preserves supported date/amount/reference state, and marks unsupported readable shapes as non-writable.
- [x] 4.3 Implement strict one-time and recurring date validation for daily, weekly, monthly, and yearly frequency, interval, monthly patterns, weekend movement, and coherent end conditions.
- [x] 4.4 Implement the explicit exact/approximate/between amount adapter with signed safe integers, ordered range bounds, valid zero, and rejection of omission or fractional/unsafe values.
- [x] 4.5 Implement schedule list pagination and account/completion filters plus exact detail lookup over the complete public list with `SCHEDULE_NOT_FOUND`.
- [x] 4.6 Implement account and ordinary-payee preflight, reject closed/missing references and transfer payees, and keep category assignment unavailable.
- [x] 4.7 Implement verified schedule creation with one sync, exact-ID read-back, and partial-state errors for sync or verification uncertainty.
- [x] 4.8 Implement non-empty allowlisted schedule update with desired-state comparison, system-managed-field rejection, one sync when changed, and verified read-back.
- [x] 4.9 Implement schedule deletion preflight and confirmation, capture exact linked historical transaction IDs, perform official deletion and one sync, and verify schedule absence plus historical transaction preservation.
- [x] 4.10 Add strict MCP input/output schemas and register all five schedule tools with registry-derived annotations and operational guards.
- [x] 4.11 Add unit tests for list/get/not-found, every supported recurrence and amount variant, invalid shapes, references, no-op and empty update, create/update sync and read-back failures, delete guards, history preservation, and unsupported transfer/manual-posting behavior.

## 5. Implement the Financial Summary Engine

- [x] 5.1 Add shared limits for 366 inclusive days, default top-payee limit 10, and maximum top-payee limit 50 with validated month/date/account/category/group scope.
- [x] 5.2 Implement fixed typed query compilers and strict result parsers for overall counts/totals, category/group aggregates, payee aggregates, off-budget cash flow, and linked schedule transaction evidence.
- [x] 5.3 Implement classification that excludes transfers and starting balances, uses inline effective split rows, classifies categorized values by income flag, and classifies only uncategorized on-budget values by sign.
- [x] 5.4 Implement signed total and reconciliation helpers for income, expense, net, refunds, negative income adjustments, uncategorized contributions, deterministic breakdowns, and deterministic top-payee ranking.
- [x] 5.5 Implement separate off-budget inflow, outflow, net-change, and count results that never alter on-budget income or expense totals.
- [x] 5.6 Implement `actual_get_month_summary` with ledger source metadata and an official `getBudgetMonth` section only for the compatible complete on-budget scope.
- [x] 5.7 Implement `actual_get_spending_summary` with signed net expense, counts, uncategorized contribution, category/group breakdowns, and bounded top payees.
- [x] 5.8 Implement `actual_get_income_summary` with signed net income, counts, uncategorized contribution, income-category breakdown, and bounded top payees.
- [x] 5.9 Add strict MCP schemas and register all three summary tools as read-only, non-destructive, and idempotent.
- [x] 5.10 Add unit tests for zero data, filters, range boundaries, income, expenses, refunds, negative adjustments, transfers, splits, uncategorized values, starting balances, off-budget separation, group/category totals, top-payee limits, deterministic ordering, and malformed query envelopes.

## 6. Extend Real-Server Ownership, Integration, and E2E Coverage

- [x] 6.1 Add schedules to the exact-ID resource registry, dependency-ordered cleanup, leftover reporting, and permanent fixture fingerprint without using prefixes as deletion targets.
- [x] 6.2 Add an authorized integration schedule lifecycle using isolated account/payee fixtures: create, list, get, update date/amount/name/posting state, reject unconfirmed delete, delete, verify absence/history, and clean up every exact ID.
- [x] 6.3 Add controlled integration summary fixtures for categorized income, expense, refund, negative income adjustment, uncategorized flows, starting balance, reciprocal transfer, split children, and off-budget cash flow with mathematically verified results.
- [x] 6.4 Add read-only integration coverage for schedules, the three summaries, runtime status, secret sanitization, bounded performance observations, and before/after fingerprints.
- [x] 6.5 Extend the compiled MCP read E2E suite to discover exactly 62 tools and validate new schemas, annotations, structured content, schedule reads, summaries, status, and continued v0.6.0 compatibility.
- [x] 6.6 Extend the compiled MCP write E2E suite with the isolated schedule lifecycle and controlled financial dataset through the real stdio client, followed by exact cleanup and fingerprint verification.
- [x] 6.7 Add a second-process read-only E2E proving reads work and every caller-invoked mutation including sync returns `READ_ONLY_MODE` before its adapter operation, while documenting the SDK initialization limitation.
- [x] 6.8 Add a destructive-disabled E2E proving confirmed deletion returns `DESTRUCTIVE_OPERATIONS_DISABLED`, preserves the target, and is cleaned up by a separately authorized process.
- [x] 6.9 Add a process-restart E2E proving uptime and MCP-observed sync telemetry reset while no persistent telemetry store or secret is created.

## 7. Complete Versioning, Documentation, and Distribution

- [x] 7.1 Update package, lockfile root, MCP metadata, README, CHANGELOG, Docker examples, and readiness identity from 0.6.0 to 0.7.0 while keeping `@actual-app/api` exactly `26.8.1`.
- [x] 7.2 Update `.env.example` and `.env.integration.local.example` with non-secret operational mode defaults and clear integration write authorization separation.
- [x] 7.3 Document all 62 tools plus Actual schedules versus cron, supported recurrence/amount contracts, unsupported category/manual/transfer behavior, signed summary semantics, transfer/split/refund/off-budget treatment, runtime status, and operational error codes.
- [x] 7.4 Document MCP read-only mode as a tool authorization boundary, the reason explicit sync is blocked, the pinned SDK initialization/schedule-service limitation, and the independent destructive kill switch plus per-call confirmation.
- [x] 7.5 Extend install/update contract tests for fresh v0.7.0 installation and clean 0.6.0-to-0.7.0 fast-forward while preserving environment, cache, integration/E2E data, and Hermes configuration and refusing dirty checkouts.
- [x] 7.6 Create `docs/release-readiness-0.7.0.md` with installed-contract findings, exact test counts and coverage, supported/unsupported schedule behavior, summary semantics, runtime/security checks, cleanup/fingerprint status, blockers, and the required final readiness line.

## 8. Execute the Release Readiness Gates

- [x] 8.1 Run `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run test:contract`, and `npm run build`; fix root causes and record exact counts and coverage.
- [x] 8.2 Run `npm run test:integration:read` and `npm run test:e2e:read` with writes disabled; verify fingerprints and bounded observations.
- [x] 8.3 Temporarily authorize real writes and run `npm run test:integration:write` and `npm run test:e2e:write`; verify exact cleanup and permanent fingerprints after each suite.
- [x] 8.4 Disable real writes again, rerun integration and E2E read suites, then run `npm run test:all`.
- [x] 8.5 Run the read-only, destructive-disabled, and process-restart E2E modes and record the documented SDK read-only limitation without overstating guarantees.
- [x] 8.6 Verify fresh `install.sh`, isolated 0.6.0-to-0.7.0 `update.sh`, executable output, and preservation of ignored runtime files.
- [x] 8.7 Run secret-pattern scans, tracked-file inspection, `git diff --check`, `git status`, and `openspec validate --all --strict`; remove any private addresses, paths, credentials, sync IDs, or financial fixture values from authored material.
- [x] 8.8 Finalize release readiness as `READY` only when every mandatory supported gate actually passed; otherwise list blockers and end with `ACTUAL BUDGET MCP v0.7.0 NOT READY`.
