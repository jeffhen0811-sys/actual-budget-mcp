# Import workflow — v1

1. Call `actual_preview_import` with the target account, supported transaction fields, and optional `defaultCleared` or `reimportDeleted` flags.
2. Review counts, existing IDs, ignored/deleted evidence, and sanitized item errors. Preview is dry-run only.
3. Call `actual_import_transactions` with exactly the reviewed request and its `expectedPreviewFingerprint`.
4. Read the returned added/updated IDs to verify the result. If sync is ambiguous, run `actual_sync` and then read the exact affected IDs before deciding any next action.

The SHA-256 fingerprint binds account, ordered item values, and both supported options. A changed field or option returns `PREVIEW_FINGERPRINT_MISMATCH`; it must be previewed again. Repeating the same imported ID follows Actual reconciliation and is not a license to replay an uncertain partial write.

Rules are applied by Actual's ordinary import pipeline; this MCP does not expose a manual rule-run or rule-preview endpoint. Transfer reconciliation remains controlled by Actual and transfer tools—callers cannot set `transfer_id` directly. The default is `defaultCleared: true` and `reimportDeleted: false`; use explicit flags when the reviewed behavior needs to differ.

Evidence: `test/advanced-transactions.test.ts`, `test/integration/write.integration.test.ts`, and `test/e2e/write.e2e.test.ts`.
