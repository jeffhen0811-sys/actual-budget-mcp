## Context

The v0.2.0 process owns one lazy `@actual-app/api@26.8.1` client behind a FIFO queue, cache lock, sanitized error boundary, mutation-plus-sync flow, and post-mutation verification. The existing public surface has 24 strict MCP tools and `actual_list_payees` exposes only `id` and `name`.

The installed SDK declarations and bundled code are the executable authority. They publicly export payee CRUD and merge plus rule list/create/update/delete. They do not export a single-payee read, a single-rule read, manual rule execution, or unpublished-rule preview. The payee public model is narrower than the current website documentation, and the installed rule model represents the default stage as `null` despite website documentation calling it `default`.

The change crosses the API adapter, serialized client, MCP contracts and registration, domain errors, test ownership, release metadata, and real-server verification, so it requires an explicit design.

## Goals / Non-Goals

**Goals:**

- Keep every preflight, mutation, sync, verification, and result construction step inside one queue position.
- Provide a stable agent-friendly rule contract without hiding meaningful read semantics or accepting arbitrary rule JSON for writes.
- Make transfer payees, referenced payees, merge impact, advanced rules, and SDK refusal outcomes explicit rather than relying on silent SDK behavior.
- Preserve all 24 v0.2.0 contracts while proving the 34-tool v0.3.0 process against a real Actual Server.

**Non-Goals:**

- Exposing all rule actions for authoring, especially transaction deletion, splits, schedule linking, formulas, or templates.
- Building a rule engine, reimplementing preview, calling internal Actual handlers, or using SQLite or ActualQL.
- Adding schedules, Pluggy, cron, HTTP transport, budgeting writes, reports, LLM categorization, transaction bulk operations, or import preview.

## Decisions

### 1. Extend the narrow official SDK adapter

Add explicit adapter entities and methods for `getPayees`, `createPayee`, `updatePayee`, `deletePayee`, `mergePayees`, `getPayeeRules`, `getRules`, `createRule`, `updateRule`, and `deleteRule`. Single-entity reads remain client projections over official lists.

The adapter will model observed optional and nullable fields rather than coerce them. Payees expose `transfer_acct`; rules preserve the installed `RuleEntity` semantics. Contract tests will pin declarations and the bundled behaviors that affect safety, including transfer-payee no-ops, merge mapping, rule delete's boolean result, stage validation, and updateRule's full-object signature.

Alternative considered: call internal `rule-get`, `rules-run`, or rule-editor handlers. Rejected because those are not public package exports and would violate the existing API boundary.

### 2. Separate lossless rule reads from conservative rule writes

The read projection recognizes every condition and action variant in the pinned public `RuleEntity` types so an advanced existing rule cannot break `list/get`. It adds MCP-derived writability information when the rule contains an action or option excluded from v0.3.0 authoring.

The write contract uses discriminated Zod unions. Conditions are split by field and operator so value types are not caller-controlled `unknown`. The supported condition matrix is derived from the pinned public unions and verified with real observed rules. Writable actions are limited to:

- `set` on category, payee, notes, cleared, account, date, and integer amount with field-appropriate values;
- `prepend-notes` and `append-notes` with bounded text.

The write schema excludes `delete-transaction`, `set-split-amount`, `link-schedule`, formula options, template options, caller-selected split indexes, and any unrecognized option. Existing rules containing those shapes remain readable and deletable but cannot be updated by the MCP.

Alternative considered: expose the public TypeScript shape directly as arbitrary JSON. Rejected because `SetRuleActionEntity` contains broad `field`, `value`, and option types that do not form a safe runtime input contract.

### 3. Normalize the default stage at the MCP boundary

The MCP uses `pre | default | post`; the adapter maps `default` to SDK `null` and reverses the mapping on reads. `conditionsOp` remains `and | or`. Rule list order is the official ranked array order; no writable priority is invented.

Alternative considered: expose `null` directly. Rejected because it leaks an installed representation mismatch and is less legible to agents while Actual itself documents the semantic stage as default.

### 4. Use verified desired-state structural mutations

Payee and rule methods will follow the existing structural pattern rather than the simpler transaction mutation helper:

```text
queue slot
  -> complete official preflight
  -> no-op comparison when applicable
  -> one official mutation
  -> one sync
  -> complete official read-back
  -> verified structured result
```

Create payee is idempotent only when exactly one ordinary payee has the same trimmed, case-sensitive name. Zero matches creates; multiple exact matches return a conflict. Case-folding, fuzzy matching, and automatic merge are intentionally excluded. Create rule is non-idempotent because two equivalent-looking rules can be intentional and semantic equality is not unambiguous. Rule and payee desired-state updates return `changed: false` when their normalized state already matches.

### 5. Treat transfer payees as protected structural entities

`actual_get_payee` may expose `transferAccountId`; the existing list remains `{ id, name }`. Rename, delete, merge-source, and merge-target operations reject any payee with a transfer-account relationship. This prevents silent SDK no-ops and avoids misrepresenting a transfer payee's account-derived display name.

### 6. Make delete and merge two-phase through the same tools

The destructive schemas and handler wrapper will accept absent/false confirmation far enough to return a structured domain error, but mutation occurs only when the validated runtime value is literal true. Read-only preflight can therefore supply safe impact details before an agent repeats the call with confirmation.

Payee delete scans complete official account histories, including subtransactions, and calls the public payee-rule read. Any transaction reference, rule association, transfer relationship, malformed record, or incomplete read refuses deletion. Confirmed unused deletion syncs and verifies absence.

Payee merge validates unique distinct IDs, loads complete reference counts, invokes `mergePayees` exactly once, syncs, and verifies all sources absent, target present, transaction references resolved to target, and relevant rules associated with the target. Because the SDK returns no merge report and its batch is not an application-level transaction, any thrown or unverifiable outcome is reported as potential partial state with `actual_sync` plus read recovery; the merge is never replayed automatically.

Rule delete verifies existence, requires confirmation, invokes `deleteRule` once, and treats `false` as a protected refusal. A true result syncs and verifies absence. No transaction mutation is coupled to rule deletion.

### 7. Validate rule references before mutation

The client collects official account, category-group/category, and payee lists inside the same queue position. Conditions and actions declare which object type their values reference; single and multi-ID values are checked against complete validated sets. Missing IDs return a stable invalid-reference error and malformed or failed lists return `PREFLIGHT_INCONCLUSIVE`.

This validation supplements rather than replaces SDK rule validation. Returned SDK validation details are sanitized and mapped to stable MCP errors.

### 8. Prove rule execution through import, not a new run tool

Functional integration and E2E tests create temporary payee/category/rule resources, then call the existing `actual_import_transactions` path with a unique `imported_id`. The official import pipeline runs persisted rules; subsequent transaction reads prove payee normalization or category assignment. This demonstrates the real engine without adding unsupported execution or preview APIs.

### 9. Extend exact-ID ownership and fingerprints

The resource registry gains `payee` and `rule` kinds. Test setup records returned IDs immediately. Cleanup uses dependency order: transactions, rules, payees, categories, category groups, accounts. Prefixes remain only ownership sentinels, never discovery keys.

Fingerprints add the complete ranked rule representation and retain the complete payee list, category structure, permanent accounts, and original transactions. Permanent payee names receive explicit mutation guards in tests. Integration and E2E runs create isolated resources and verify no temporary resource remains.

### 10. Keep versioning and compatibility explicit

The constant tool inventory becomes exactly 34 and the MCP/package version becomes 0.3.0. Existing schemas are reused unchanged for all 24 prior tools. New error entity types and codes are additive within the established envelope. README and changelog document Actual API discrepancies and unsupported run/preview behavior without exposing credentials.

## Risks / Trade-offs

- **[Current Actual rules contain an unobserved public shape]** → Contract tests cover installed declarations and real read data; list/get use a lossless pinned read union and fail safely on genuinely malformed data.
- **[A merge mutates some mappings before throwing]** → Preflight minimizes predictable failure, the operation is invoked once, ambiguous failure is marked partial, and recovery never retries the merge automatically.
- **[Complete payee reference scans are expensive]** → Reuse the existing official unbounded-history adapter inside the serialized queue; correctness takes priority for destructive operations, while ordinary reads remain bounded.
- **[Exact-name idempotency hides an intentional duplicate]** → Only a single case-sensitive trimmed exact match is reused; ambiguous matches fail, and differently cased or explicitly distinct names remain creatable.
- **[Advanced rules cannot be edited through MCP]** → Preserve complete reads and deletion, expose writability, document the limitation, and defer authoring expansion until each action has safe validation and real tests.
- **[Official documentation and installed behavior disagree]** → Pin contract tests to 26.8.1, translate the default stage explicitly, and treat installed exports plus real-server observations as release authority.
- **[Functional rule tests categorize unintended data]** → Use unique IDs and names, a dedicated test account, exact returned-ID registry, permanent fingerprints, and reverse-dependency cleanup.

## Migration Plan

1. Extend contracts and tests while keeping all existing schemas and tool handlers unchanged.
2. Add adapter/client operations and new tool registrations behind the same single runtime.
3. Upgrade metadata and documentation to 0.3.0 only after the exact 34-tool contract passes locally.
4. Run typecheck, unit, contract, and build before any real write.
5. Run real read suites, then explicitly authorized integration and E2E writes with exact-ID cleanup and fingerprint checks, then repeat read suites and `test:all`.
6. If a real-server observation contradicts the design, stop release readiness, update the contract/design and regression tests, and repeat the complete affected verification.

Rollback is a normal source rollback to v0.2.0. `update.sh` must not delete caches or environment files. Any local mutation already synchronized to Actual is not rolled back by changing the MCP version; real test cleanup must complete before a rollback is considered safe.
