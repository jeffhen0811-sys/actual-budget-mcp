# Actual Budget MCP v1 error codes

This file is generated from the exhaustive typed catalog in `src/errors.ts`. Do not edit it by hand.

Every error response contains `code`, a sanitized English `message`, `operation`, and the instance-level
boolean `retryable`. The catalog's retryability class explains operator behavior: `never` is an intentional
boundary, `after-correction` requires changed input or policy, `transient` may succeed later, and
`inspect-state-first` forbids blind replay because a write or synchronization may have progressed.

Safe `details` vary by code and are not a globally stable arbitrary object. Codes listing recovery fields may
also return `state`, `partialState`, bounded identifiers/counts in `details`, and a `recoveryAction`.

| Code | Domain | Retryability | Meaning | Recovery fields |
| --- | --- | --- | --- | --- |
| `ACCOUNT_NOT_EMPTY` | `accounts` | `after-correction` | Account deletion preflight found transactions. | None |
| `TRANSFER_ACCOUNT_REQUIRED` | `accounts` | `after-correction` | Account closure requires a valid transfer destination. | None |
| `UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT` | `accounts` | `after-correction` | Closing the account would trigger installed destructive behavior. | None |
| `BUDGET_COPY_PARTIAL_STATE` | `budget` | `inspect-state-first` | Sequential budget copy stopped after partial progress. | `state`, `partialState`, `details`, `recoveryAction` |
| `BUDGET_MONTH_UNAVAILABLE` | `budget` | `after-correction` | The requested budget month is unavailable. | None |
| `BUDGET_VERIFICATION_FAILED` | `budget` | `inspect-state-first` | Budget read-back did not verify the requested state. | `state`, `partialState`, `details`, `recoveryAction` |
| `INCOMPATIBLE_BUDGET_CATEGORY` | `budget` | `after-correction` | The category shape cannot support the requested budget mutation. | None |
| `INVALID_BUDGET_VALUE` | `budget` | `after-correction` | A budget value, month, mode, or bound is invalid. | None |
| `OVERWRITE_CONFIRMATION_REQUIRED` | `budget` | `after-correction` | A nonzero budget overwrite requires reviewed per-call consent. | None |
| `UNSUPPORTED_BUDGET_MODE` | `budget` | `never` | The installed budget mode does not support the operation. | None |
| `CATEGORY_GROUP_NOT_EMPTY` | `categories` | `after-correction` | Category-group deletion preflight found categories. | None |
| `CATEGORY_IN_USE` | `categories` | `after-correction` | Category deletion preflight found dependent state. | None |
| `INCOMPATIBLE_CATEGORY_GROUP_TYPE` | `categories` | `after-correction` | Category and target group have incompatible income types. | None |
| `ACTUAL_OPERATION_FAILED` | `common` | `transient` | The supported Actual operation failed safely. | None |
| `CONFIGURATION_ERROR` | `common` | `after-correction` | Configuration or validated input is invalid. | None |
| `DESTRUCTIVE_CONFIRMATION_REQUIRED` | `common` | `after-correction` | Literal per-call destructive consent is missing. | None |
| `INTERNAL_ERROR` | `common` | `inspect-state-first` | An unexpected error was sanitized at the MCP boundary. | None |
| `INVALID_REFERENCE` | `common` | `after-correction` | An entity reference is missing or incompatible. | None |
| `MUTATION_FAILED` | `common` | `inspect-state-first` | A mutation failed without proof that state is unchanged. | `details`, `recoveryAction` |
| `NAME_CONFLICT` | `common` | `after-correction` | A requested entity name conflicts with existing state. | None |
| `NOT_FOUND` | `common` | `after-correction` | A requested entity does not exist. | None |
| `PREFLIGHT_INCONCLUSIVE` | `common` | `transient` | Required safety evidence could not be proven. | None |
| `PROTECTED_ACTUAL_ENTITY` | `common` | `after-correction` | Actual protects this entity or operation. | None |
| `RESULT_LIMIT_EXCEEDED` | `common` | `after-correction` | A bounded scan detected more records than supported. | None |
| `RESULT_TOO_LARGE` | `common` | `after-correction` | A bounded operation would exceed its safe result or change limit. | None |
| `WRITE_CONFIRMATION_REQUIRED` | `common` | `after-correction` | Explicit execution consent is missing for a previewable write. | None |
| `IMPORT_PREVIEW_SHAPE_INVALID` | `import` | `transient` | Actual returned an unsupported import-preview shape. | None |
| `PREVIEW_FINGERPRINT_MISMATCH` | `import` | `after-correction` | Execution input does not match the reviewed preview. | None |
| `MERGE_PARTIAL_STATE` | `payees` | `inspect-state-first` | A multi-source payee merge stopped after partial progress. | `state`, `partialState`, `details`, `recoveryAction` |
| `PAYEE_IN_USE` | `payees` | `after-correction` | Payee deletion preflight found dependent state. | None |
| `TRANSFER_PAYEE_PROTECTED` | `payees` | `never` | Actual transfer payees cannot be administered as ordinary payees. | None |
| `UNSUPPORTED_RULE_SHAPE` | `rules` | `after-correction` | The installed rule shape cannot be safely written. | None |
| `BUDGET_LOAD_ERROR` | `runtime` | `after-correction` | The configured budget could not be loaded or decrypted. | None |
| `CACHE_IN_USE` | `runtime` | `transient` | Another process owns the configured local cache. | None |
| `CONNECTION_ERROR` | `runtime` | `transient` | Actual Server is unavailable. | None |
| `DESTRUCTIVE_OPERATIONS_DISABLED` | `runtime` | `after-correction` | Process policy blocks destructive operations. | None |
| `MUTATION_SYNC_FAILED` | `runtime` | `inspect-state-first` | A local mutation may have succeeded before synchronization failed. | `state`, `partialState`, `details`, `recoveryAction` |
| `POST_MUTATION_READ_FAILED` | `runtime` | `inspect-state-first` | Synchronization completed but final read-back failed. | `state`, `partialState`, `details`, `recoveryAction` |
| `READ_ONLY_MODE` | `runtime` | `after-correction` | Process read-only policy blocks mutation. | None |
| `INVALID_RECURRENCE` | `schedules` | `after-correction` | Schedule recurrence is invalid or unsupported. | None |
| `SCHEDULE_NOT_FOUND` | `schedules` | `after-correction` | The requested schedule does not exist. | None |
| `SCHEDULE_REFERENCE_INVALID` | `schedules` | `after-correction` | A schedule references an invalid entity. | None |
| `INVALID_SUMMARY_RANGE` | `summaries` | `after-correction` | Summary dates or scope are invalid. | None |
| `BULK_PARTIAL_STATE` | `transactions` | `inspect-state-first` | Bulk execution stopped after partial progress. | `state`, `partialState`, `details`, `recoveryAction` |
| `BULK_PREFLIGHT_FAILED` | `transactions` | `after-correction` | Bulk desired-state preflight rejected the complete batch. | `details` |
| `BULK_VERIFICATION_FAILED` | `transactions` | `inspect-state-first` | Bulk read-back did not verify requested state. | `state`, `partialState`, `details`, `recoveryAction` |
| `INCOMPATIBLE_FILTERS` | `transactions` | `after-correction` | Typed filters or amounts are mutually incompatible. | None |
| `QUERY_SHAPE_INVALID` | `transactions` | `transient` | Actual returned an unsupported fixed-query result shape. | None |
| `SPLIT_TRANSACTION_PROTECTED` | `transactions` | `after-correction` | The requested direct mutation would violate split integrity. | None |
| `TRANSFER_PROTECTED` | `transactions` | `after-correction` | The requested direct mutation would violate transfer integrity. | None |
| `NOT_A_TRANSFER` | `transfers` | `after-correction` | The requested transaction is not a transfer. | None |
| `TRANSFER_CREATION_PARTIAL_STATE` | `transfers` | `inspect-state-first` | Transfer creation stopped after partial progress. | `state`, `partialState`, `details`, `recoveryAction` |
| `TRANSFER_INTEGRITY_FAILED` | `transfers` | `inspect-state-first` | Transfer relationship verification failed. | `state`, `partialState`, `details`, `recoveryAction` |
