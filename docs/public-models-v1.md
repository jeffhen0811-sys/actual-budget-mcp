# Public models v1

Actual Budget MCP exposes ten canonical, strict public projections. Public results reuse these schemas when
they represent the same entity semantics. Explicitly named views below are the only intentional alternatives;
they exist to preserve the frozen v0.7.0 contract or to provide bounded purpose-specific evidence.

## Canonical projections

| Model | Stable semantics | Reuse |
| --- | --- | --- |
| `Account` | Opaque ID, verbatim name, on/off-budget and open/closed state, with optional balance or sanitized balance error. | Account list, exact read, create, update, close, and reopen results. |
| `Transaction` | Recursive split-aware ledger row with signed safe-integer amount and explicit transfer, import, parent/child, clearing, and reconciliation identity. | Transaction reads/search and mutation before/after views; transfer models embed it. |
| `CategoryGroup` | Frozen nested list view with group ID/name and canonical categories. | Category listing. |
| `Category` | Frozen nested category ID/name/hidden view. | Category listing inside `CategoryGroup`. |
| `Payee` | Frozen compact ID/name view. | Complete payee listing. |
| `Rule` | Normalized ordered rule with stage, condition operator, bounded read conditions/actions, writability, and optional restriction. | Rule list, exact read, create, and update results. |
| `BudgetMonth` | Official month and signed aggregates, capabilities, and nested runtime-validated budget groups/categories. | Exact month read and the budget portion of month summary. |
| `Schedule` | Stable schedule identity, nullable references and amount/date, completion/posting state, and writability evidence. | Schedule list, exact read, create, and update results. |
| `TransferPair` | Deterministic pair key, nullable transaction sides, integrity/reason evidence, directional sides, and nullable positive magnitude. | Exact transfer, transfer search, and executed transfer result. |
| `RuntimeStatus` | Sanitized process status covering versions, connectivity, modes, cache, queue, and MCP-initiated sync telemetry. | Runtime status. |

## Nullability rule

An explicit upstream `null` remains `null`; an optional value not supplied upstream remains absent. Required
values are never fabricated to make a result validate. A nullable relationship is not interchangeable with an
unknown or omitted relationship. This applies recursively to split transactions and both sides of a transfer.

## Intentionally distinct views

| View | Canonical base | Why it differs |
| --- | --- | --- |
| `CategoryGroupAdministration` | `CategoryGroup` | Flat mutation result with persisted income/hidden classification and no nested categories. |
| `CategoryAdministration` | `Category` | Mutation result includes persisted group and income classification that are implicit in the nested list. |
| `PayeeAdministration` | `Payee` | Exact and mutation calls preserve optional transfer-account context; the complete list stays compact. |
| `BudgetSummary` | `BudgetMonth` | Keeps official aggregates but applies a requested category-detail limit and reports omitted detail. |
| `RuntimeHealth` | `RuntimeStatus` | Lightweight connectivity probe without queue, cache, mode, or synchronization telemetry detail. |
| `TransferCandidate` | `TransferPair` | Possible-match evidence for two ordinary transactions; it does not claim an observed reciprocal relationship. |

Deletion summaries, import plans, diagnostics, reconciliation snapshots, and aggregate financial reports are
operation results rather than alternative entity projections. Their schemas remain strict and bounded but are
not aliases for one of the ten canonical models.
