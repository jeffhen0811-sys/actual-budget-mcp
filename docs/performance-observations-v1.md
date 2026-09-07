# Actual Budget MCP v1 performance observations

Performance evidence is observational, bounded, and sanitized. It records workload names, requested or returned
counts, and elapsed milliseconds in the real integration test output; it never logs account names, transaction
notes, IDs, amounts, query text, credentials, or private paths. These observations are not service-level objectives
and no fixed latency threshold is a release gate.

| Workload | Bound | Evidence | Recorded fields |
| --- | --- | --- | --- |
| Transaction search page and totals | 100 results | `test/integration/read.integration.test.ts` | requested count, returned count, page duration, totals duration |
| Import preview | 100 items | `test/integration/write.integration.test.ts` | item count, duration |
| Bulk update dry-run | 50 items | `test/integration/write.integration.test.ts` | item count, duration |
| Transfer and duplicate diagnostics | bounded ledger scan and page | `test/integration/read.integration.test.ts` | candidate counts, duration |
| Reconciliation | one account and cutoff | `test/integration/read.integration.test.ts` | duration only |
| Month and annual summaries | one month; at most 366 days | `test/integration/read.integration.test.ts` | duration only |
| Schedule list | 250 results | `test/integration/read.integration.test.ts` | returned count, duration |
| Runtime status | one process snapshot | `test/integration/read.integration.test.ts` | duration only |

During final acceptance, compare a material change in these bounded observations with the immediately preceding
candidate under comparable fixture and environment conditions. Investigate a regression by checking query bounds,
returned-count changes, cache/connectivity state, and recent implementation changes; record the finding in release
evidence. Do not mask a regression by weakening bounds, suppressing the observation, or adding an arbitrary SLA.
