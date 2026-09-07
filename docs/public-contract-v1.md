# Public contract — v1

Actual Budget MCP exposes the fixed 62-tool `actual_<verb>_<resource>` registry. Tool names, schemas, annotations, JSON/structured success equivalence, and compatible v0.7.0 requests are frozen by the contract snapshot and compatibility checker.

Inputs use strict objects, trimmed bounded identifiers/text, ISO `YYYY-MM-DD` dates, `YYYY-MM` months, safe-integer money in minor units, bounded arrays, and explicit enums. Output models use documented `null` only where the value is unavailable; internal SDK objects, credentials, paths, raw queries, and stacks are never public.

Mutations are policy-controlled: read-only blocks every mutation; destructive-disabled blocks structural deletes and payee merge; destructive operations require literal `confirmDestructive`. Bulk updates and transfer creation require explicit write confirmation to execute. Budget copy previews by default and requires overwrite confirmation for overwrite execution. Dry-run results are never persistent writes.

The public API never accepts raw ActualQL, SQL, SQLite, file paths, commands, environment structures, or direct `transfer_id` mutation. Queries are fixed internal templates with bounded filters. Errors are documented in `docs/error-codes-v1.md`; partial-state errors include truthful recovery data when available.

The release target is semantic version `1.0.0`, pinned to `@actual-app/api` `26.8.1`. Any incompatible name, input, output, nullability, wrapper, annotation, or required-field change requires a separately reviewed major-version decision.

Evidence: `test/contract/compatibility.test.ts`, `test/contract/success-output-contract.test.ts`, `test/contract/mutation-input-authority.test.ts`, and `docs/tool-inventory-v1.md`.
