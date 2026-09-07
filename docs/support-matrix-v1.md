# Support matrix — v1

| Capability | Status | Boundary |
| --- | --- | --- |
| Manual/imported/split transactions | PASS | Split parents are protected from unsafe bulk changes. |
| Transfers and off-budget accounts | PASS | Reciprocal pairs are created and verified only through transfer operations. |
| Rules | PASS | Read/write supported subset; no manual run or preview endpoint. |
| Envelope and tracking budgets | PASS | Shape-proven capabilities only; unsupported mode mutations fail explicitly. |
| Schedules | PASS | No transfer schedules and no manual posting control. |
| Reconciliation | PASS | Diagnostic-only; it does not mutate UI reconciliation locks. |
| Raw database/query/filesystem access | UNSUPPORTED | Deliberately absent from the public contract. |

Final controlled-fixture evidence on 2026-09-07 includes 18 authorized integration-write tests, 18 authorized compiled-stdio write E2E tests, fingerprint restoration, and final no-write read gates.
