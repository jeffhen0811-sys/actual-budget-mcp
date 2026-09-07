# Nullability matrix v1

Public projections distinguish explicit upstream `null` from an absent optional property. Required properties
are never invented, and optional properties are never converted to `null` merely to make response shapes uniform.

| Area | Explicit `null` preserved | May be absent | Required and non-null |
| --- | --- | --- | --- |
| Manual transaction | `payee`, `category`, `notes`, `imported_id`, `imported_payee`, `transfer_id`, `parent_id` | Optional identity/status flags and nullable fields when upstream omits them | `id`, `account`, `date`, `amount` |
| Imported transaction | Nullable bank text and ordinary relationships | Bank text and optional flags not supplied upstream | Imported identity when the row is represented as imported; core transaction fields |
| Starting balance | Nullable ordinary relationships | Optional flag metadata other than the asserted starting-balance flag | Core transaction fields |
| Transfer | `category` and other nullable transaction metadata | Optional normalized `isTransfer` evidence | Core fields; a represented reciprocal side has non-null `transfer_id` |
| Split transaction | Nullable relationships on parent and children | `subtransactions` on a leaf and other optional metadata | Core fields on every recursive row; represented child identity links |
| Account balance | None | `balance` when unavailable; `balanceError` when no lookup error occurred | Account identity, name, budget state, and closed state |
| Schedule | `accountId`, `payeeId`, `amount`, `date` when the installed schedule cannot supply them | `name`, `nextDate`, and optional recurrence components | Identity, nullable relationship keys, completion/posting state, writability, unsupported reasons |
| Rule | Installed condition/action `options` where the SDK returns null | `writeRestriction` and bounded installed metadata | `id`, `stage`, `conditionsOp`, conditions, actions, writability |
| Budget month | None for numeric aggregates | Shape-dependent category/group aggregates and carryover | Month, official month aggregates, capabilities, category groups, group/category identity |

The executable cases live in `test/contract/nullability-matrix.test.ts` and include accepted and rejected sides
of each boundary so an optional property cannot silently become nullable, or vice versa.
