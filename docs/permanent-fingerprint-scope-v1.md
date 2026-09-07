# Permanent fixture fingerprint scope — v1

The permanent fixture fingerprint is a deterministic SHA-256 digest used only by controlled integration and E2E harnesses to prove that a test process restored the known fixture state.

It includes, in stable order:

- the two named controlled accounts and their exposed metadata;
- transaction identities and complete public transaction projections for the fixed August 2026 window, including reciprocal `transfer_id` relationships;
- category groups and categories; payees; rules including conditions/actions; and schedules;
- every available public budget month and its category-group/category state.

The fingerprint intentionally does not claim coverage of an unbounded private history, arbitrary server metadata, SDK cache internals, credentials, or data outside the controlled accounts and fixed fixture window. A matching hash is evidence of cleanup only within that declared scope.

Evidence: `test/real/fingerprint.ts`, `test/fingerprint.test.ts`, and the `before`/`after` assertions in the configured integration and compiled E2E harnesses.
