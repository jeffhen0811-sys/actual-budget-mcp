## Context

See `proposal.md` for motivation. The current 0.7.0 tree has a clean 62-tool surface, exact SDK 26.8.1, strict contracts, real integration and compiled stdio E2E harnesses, and a central capability registry. The registry currently owns names, capability classes, and idempotency, while descriptions and schemas live in server registrations, limits and error codes live in separate modules, coverage evidence lives in tests, and the README manually repeats the inventory. This is enough to operate the server but not enough to generate and prove a frozen contract from one coherent model.

The clean baseline commit is `c5b752a`. The repository currently has no `v0.7.0` tag, so compatibility evidence cannot depend on resolving that tag. The controlled real Actual environment is available for read acceptance, while writes remain correctly disabled until an explicitly scoped acceptance process enables them.

## Goals / Non-Goals

**Goals:**

- Make the existing 62-tool contract mechanically inspectable and reproducible.
- Detect accidental naming, schema, annotation, policy, documentation, and coverage drift.
- Close cross-cutting safety and acceptance gaps without changing functional scope.
- Produce final-commit evidence sufficient for a truthful 1.0.0 readiness decision.
- Keep runtime metadata separate from test-only evidence while allowing deterministic documentation generation.

**Non-Goals:**

- Redesign domain behavior that already satisfies the audited contract.
- Add a new functional module, transport, query language, database access path, scheduler, or notification system.
- Publish to npm, create or push a Git tag, deploy to Alfred/Hermes, or manipulate real user data outside the controlled acceptance fixture.
- Introduce automated rollback, transactions across SDK calls, performance SLAs, or claims about SDK-internal synchronization that cannot be observed.

## Decisions

### 1. Record a repository-owned 0.7.0 contract snapshot before public edits

Generate a deterministic machine-readable snapshot from the clean `c5b752a` server before changing tool metadata or schemas. Store the source commit and normalized tool discovery data with the snapshot. Compatibility tests will compare the final definitions with this snapshot rather than relying on a missing Git tag.

An annotated `v0.7.0` tag would be a useful repository operation, but tag creation is outside this change and must not be silently performed. A hand-written list alone was rejected because it cannot freeze descriptions, annotations, or JSON schemas.

### 2. Separate runtime contract definitions from verification evidence

Extend or replace the narrow capability registry with declarative runtime definitions containing name, domain, capability, idempotency, description, schemas, confirmation model, synchronization policy, bounds, and partial-failure classification. Server registration and operational guards will consume those definitions.

Keep test file references and acceptance-layer coverage in a separate versioned verification manifest. A documentation generator joins runtime definitions and verification evidence. This avoids importing test concerns into production code while retaining one validated inventory pipeline.

Putting all coverage strings directly in the runtime registry was rejected because test paths and release evidence are not runtime behavior. Keeping the current manual README table as the source was rejected because it already duplicates registration metadata.

### 3. Preserve the 0.7.0 surface with a semantic compatibility check

Tool names and count are exact. Inputs are compatible when every baseline-valid payload remains valid; adding a required field or tightening a constraint is incompatible unless the exact path and bound are recorded as a reviewed safety exception. The sole 1.0.0 exception is the finite ceiling applied to the 17 array paths that were unbounded in v0.7.0, as documented in `breaking-change-review-unbounded-input-arrays.md`. Outputs are compatible only when baseline required wrappers, fields, types, nullability, and meanings remain intact. For this consolidation release, avoid additive output fields unless an essential audited defect requires them and receives explicit review.

Raw JSON text comparison was rejected because harmless schema ordering and serializer details can differ. The comparison should normalize JSON Schema and enforce explicit compatibility rules, with selected behavioral fixtures for refinements that JSON Schema alone cannot express. Reviewed exceptions are machine-readable, path-specific, and fail closed if the baseline path, approved value, or final schema differs.

### 4. Retain the three exclusive runtime capability classes

The registry will keep `read`, `write`, and `destructive` as exclusive classes. `mutationCapable` is derived from `write || destructive`; it is not a fourth class. This yields 27 reads, 35 mutation-capable tools, and nine destructive tools for the baseline.

`actual_sync` remains mutation-capable because read-only mode must prevent caller-initiated synchronization. Dry-run-default tools remain mutation-capable in discovery because annotations describe capability, not one invocation.

### 5. Use operation-specific per-call consent

All deletes and payee merge use `confirmDestructive: true` and return the same structured refusal when confirmation is missing. Budget copy remains conservatively destructive, but its consent vocabulary stays compatible: `dryRun: false` authorizes execution and `confirmOverwrite: true` authorizes overwriting populated planning. A new `confirmDestructive` field will not be added to budget copy because that would duplicate existing consent semantics and encourage incompatible changes.

### 6. Generate reference catalogs; hand-author narrative guidance

Tool inventory, error catalog, limits, idempotency/sync tables, and the structural part of acceptance evidence should be generated or deterministically verified. Public contract explanations, security findings, import workflow, troubleshooting, Hermes upgrade/smoke guidance, and known limitations remain narrative documents with tests that verify required sections and safe examples.

Generated Markdown is committed so GitHub and offline operators can read it. Release verification reruns the generator in check mode and fails on a diff.

### 7. Distinguish safe verification from release acceptance

`release:check` is deterministic, non-destructive, and CI-safe. It does not contact Actual. `test:all` remains a developer aggregate that can report real suites as skipped. The final acceptance sequence is separately documented and requires explicit real-server evidence; it treats skipped or unavailable mandatory tests as blockers.

The readiness report is evidence, not an automated guess based only on one exit code. Every result must identify the final source commit and executed command or test suite.

### 8. Use four acceptance states

Matrices use `PASS`, `FAIL`, `N/A`, and `UNSUPPORTED`. `N/A` represents a layer that logically cannot apply, such as write lifecycle for a diagnostic-only tool. `UNSUPPORTED` represents an intentional product boundary. Neither state can conceal an applicable test that was skipped.

### 9. Keep exact-ID cleanup and scope fingerprints truthfully

Write suites register exact IDs immediately and clean in dependency order inside `finally`. Transfer pairs remain one cleanup unit. The permanent fingerprint will document exactly which controlled accounts, dates, entities, relationships, schedules, and budget months it covers; it will not imply a hash of unbounded private history. Expansion is permitted when it remains bounded and avoids personal values in output.

### 10. Upgrade version metadata without upgrading dependencies

Version values change to 1.0.0 in package, lockfile root, MCP metadata, tests, docs, Docker examples, and applicable specs. The installed Actual SDK remains exact 26.8.1. The final validation runs after the version update on the same commit described by readiness.

### 11. Bound the five previously unbounded request families as a reviewed 1.0.0 safety correction

Keep the requested 1.0.0 release line and apply only the reviewed limits recorded in `breaking-change-review-unbounded-input-arrays.md`: 31 schedule recurrence patterns, 100 payee merge sources, 100 rule conditions, 100 rule actions, and 250 values in one list-valued rule condition. These ceilings prevent unconstrained validation and mutation work while remaining well above normal operational payloads.

The compatibility checker consumes an exact-path exception manifest rather than weakening input comparison globally. A lower limit, a new exception path, or any other input tightening remains incompatible. Clients exceeding a ceiling must split the request into bounded calls; rule fragments created by splitting remain subject to ordinary rule ordering and semantic review.

## Risks / Trade-offs

- **[Registry refactor accidentally changes schemas]** → Capture the baseline first, normalize discovery output, and run compatibility checks after each registry migration step.
- **[Generated inventory becomes another stale artifact]** → Provide generate and check modes; make `release:check` fail when committed output differs.
- **[JSON Schema comparison misses Zod refinements]** → Pair normalized schema comparison with curated valid baseline payloads and boundary regression tests.
- **[Exhaustive policy tests require dangerous arguments]** → Invoke through an in-memory MCP server with generated schema-valid fixtures and runtime spies so the global guard runs before any Actual adapter; use only representative controlled real calls for boundary confirmation.
- **[Real acceptance mutates permanent state]** → Keep writes process-scoped, register exact IDs, fingerprint every purity/cleanup boundary, and treat cleanup uncertainty as a hard blocker.
- **[Documentation count creates maintenance burden]** → Generate tabular references from metadata and keep narrative documents focused on distinct operator questions.
- **[Docker or Actual environment is unavailable]** → Record the gate as unavailable and produce `NOT READY`; do not weaken the requirement at reporting time.
- **[Historical OpenSpec version language remains confusing]** → Modify only requirements that conflict with the active 1.0.0 state and add explicit v0.7-to-v1 preservation requirements; retain older scenarios as compatibility history where non-conflicting.
- **[Reviewed safety exception hides unrelated schema drift]** → Store exact baseline JSON pointers and approved `maxItems` values in a versioned manifest; make compatibility verification reject missing, stale, broader, or stricter exceptions.

## Migration Plan

1. Capture the clean 0.7.0 discovery snapshot and source commit before contract-affecting edits.
2. Introduce declarative contract metadata and verification evidence while continuously comparing against the snapshot.
3. Apply cross-cutting schema, policy, error, bounds, logging, test, documentation, and operational corrections that do not break the baseline.
4. Update all release identity references to 1.0.0 while retaining exact SDK 26.8.1.
5. Run safe local and hosted-CI-equivalent gates.
6. Run controlled read and explicitly authorized write acceptance, restore authorization to false, and rerun final reads and aggregate tests.
7. Generate the readiness report for the final commit. Prepare manual tag and rollback instructions, but do not create or push the tag.

Rollback during development is ordinary Git reversion of the change commits while preserving ignored runtime data. After a future tag, operators can return to the documented prior tag or commit and rerun locked installation; no script performs an automatic reset or cache deletion.
