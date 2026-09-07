# Breaking-change review: unbounded v0.7.0 input arrays

## Status

Option 2 is selected for the 1.0.0 work resumed on 2026-09-07: the compatibility policy permits only the
path-specific safety ceilings below. The release remains 1.0.0; all other compatibility rules remain exact.

## Approved limits

| Named limit | Value | Affected input |
| --- | ---: | --- |
| `MAX_SCHEDULE_PATTERNS` | 31 | `actual_create_schedule` and `actual_update_schedule` recurring patterns |
| `MAX_PAYEE_MERGE_SOURCES` | 100 | `actual_merge_payees.sourcePayeeIds` |
| `MAX_RULE_CONDITIONS` | 100 | `actual_create_rule` and `actual_update_rule` conditions |
| `MAX_RULE_ACTIONS` | 100 | `actual_create_rule` and `actual_update_rule` actions |
| `MAX_RULE_LIST_VALUES` | 250 | list-valued account/category/category-group/payee/imported-payee condition values |

These are the only accepted input tightenings relative to the recorded v0.7.0 discovery contract. They SHALL
be represented by exact tool/path/value entries in a versioned compatibility-exception manifest. Verification
must fail if an exception points at a baseline path that was already bounded, if the final value differs, or if
any other constraint is tightened.

## Evidence

The immutable discovery snapshot from commit `c5b752a5f7f3067a40480f72078907c72ad26c66` contains 17 array
schema paths with `minItems` but no `maxItems`. They are accepted by the v0.7.0 Zod schemas and therefore form
part of the frozen valid-request set:

| Tool | Unbounded input path(s) |
| --- | --- |
| `actual_create_schedule` | `date.recurring.patterns` |
| `actual_update_schedule` | `date.recurring.patterns` |
| `actual_merge_payees` | `sourcePayeeIds` |
| `actual_create_rule` | `conditions`, `actions`, and list-valued account/category/category-group/payee/imported-payee condition values |
| `actual_update_rule` | `conditions`, `actions`, and list-valued account/category/category-group/payee/imported-payee condition values |

The source definitions are visible in `src/mcp/contracts.ts`: schedule patterns at line 112, merge sources at
lines 997–999, list-valued rule conditions at lines 1020–1034, create-rule arrays at lines 1146–1151, and
update-rule arrays at lines 1153–1159. The recorded discovery schemas are in
`test/fixtures/contracts/v0.7.0-tool-discovery.json`.

Task 3.1 and the central-bounds requirement require every caller-controlled array to be bounded. Any finite
`maxItems` on these paths would reject at least one request accepted by v0.7.0. The semantic compatibility
checker added in task 1.2 intentionally reports such a change as a stricter input contract.

## Contract conflict

- The immutable-baseline requirement says every request valid in v0.7.0 remains valid in 1.0.0 and classifies
  a tightened accepted input as breaking.
- The global input audit and central resource-bounds requirements require finite array limits and rejection of
  oversized requests before unbounded work or mutation.
- Both requirements cannot be satisfied for the five affected tools without an explicit change to the release
  contract or release version.

## Options for explicit review

1. Approve a reviewed breaking safety correction and change the release line to 2.0.0. Add named limits,
   preserve the other 57 input contracts, update the baseline policy, and record migration guidance.
2. Amend the 1.0.0 compatibility policy to allow narrowly documented safety tightening for previously
   unbounded arrays. This keeps the requested version but weakens the current normative promise that every
   baseline-valid request remains valid.
3. Keep the exact 1.0.0 compatibility promise and defer limits on these five tools. This leaves tasks 3.1, 5.1,
   and the stable runtime security boundary unsatisfied, so the release must remain `NOT READY`.

A transport-wide payload cap or runtime preflight does not remove the conflict: it still rejects a request that
the frozen discovery schema and v0.7.0 validator accept. The selected path therefore records the incompatibility
directly instead of claiming exact preservation.

## Migration guidance

Clients that exceed a ceiling must split work into bounded requests. Payee merges can be performed in batches
against the same surviving target. A schedule must be simplified to at most 31 recurrence patterns. Rules with
more than 100 conditions or actions, or more than 250 values in one list condition, must be decomposed into
smaller reviewed rules while preserving their intended stage and order. No other v0.7.0 request migration is
expected for this correction.
