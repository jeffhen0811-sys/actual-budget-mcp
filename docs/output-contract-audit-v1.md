# Output contract audit v1

All 62 advertised success outputs were reviewed against four evidence layers:

| Evidence | What it proves |
| --- | --- |
| Installed `@actual-app/api@26.8.1` declarations | Public methods, entity fields, nullability, rule/schedule variants, budget aggregates, and unsupported exports used by adapters. |
| Installed distribution bundle | Wrapper forwarding, installed defaults, cascade behavior, rule ordering, transfer creation, schedule advancement, and budget-shape behavior not fully expressed by declarations. |
| Controlled sanitized fixtures | Envelope/tracking budgets, manual/imported/starting-balance/transfer/split transactions, accounts, categories, payees, rules, schedules, transfers, and failure boundaries validate through production projectors. |
| Generated discovery audit | Every success root and nested object is strict, except the documented installed-rule `queryFilter` map; no credential, secret, sync ID, caller path, stack, raw exception, or internal-error field is advertised. |

The executable evidence is in `test/contract/sdk-surface.test.ts`,
`test/contract/advanced-transaction-contract.test.ts`, `test/contract/v070-contract.test.ts`,
`test/contract/actual-contract.test.ts`, `test/contract/nullability-matrix.test.ts`, and
`test/contract/output-schema-audit.test.ts`. Controlled real read acceptance in
`test/integration/read.integration.test.ts` validates returned values with the same exported schemas; executing
that environment-dependent suite is a release-acceptance gate and cannot be replaced by fixture success.

## Deliberate rule exceptions

Installed rule condition and action values are heterogeneous. Their two read-only `value` slots remain unknown
so the MCP can preserve installed SDK data without fabricating a narrower type. The optional `queryFilter` map
is also read-only: each dynamic key is constrained to a strict `{ $oneof: string[] }` value. Writable rule
inputs use separate closed unions and cannot pass either structure back to Actual.

No other success output contains an unconstrained schema or dynamic record. Error responses are separately
sanitized into the stable public error envelope and are not raw SDK objects.
