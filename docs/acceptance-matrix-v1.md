# Acceptance matrix — v1

| Domain | Unit | Integration | Compiled stdio E2E | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Contract and policy | PASS | N/A | PASS | 232 unit tests; 165 contract tests; compatibility check confirms 62 tools | PASS |
| Transactions and imports | PASS | PASS | PASS | 14 read integration tests; 13 read stdio E2E tests; 18 authorized integration-write tests; 18 authorized stdio-write E2E tests | PASS |
| Transfers and reconciliation | PASS | PASS | PASS | 14 read integration tests; 13 read stdio E2E tests; authorized write suites passed | PASS |
| Budget and summaries | PASS | PASS | PASS | 14 read integration tests; 13 read stdio E2E tests; authorized write suites passed | PASS |
| Payees, rules, schedules, accounts, categories | PASS | PASS | PASS | 14 read integration tests; 13 read stdio E2E tests; authorized write suites passed | PASS |
| Runtime, restart, security, cleanup | PASS | PASS | PASS | read-only/destructive-disabled, restart, cleanup and authorized write suites passed | PASS |

All supported mandatory gates have final PASS evidence. See `test/fixtures/tool-verification-manifest-v1.json` for individual tool evidence.
