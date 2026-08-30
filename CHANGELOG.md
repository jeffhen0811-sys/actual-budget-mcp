# Changelog

All notable changes to this project will be documented in this file.

## 0.2.0 - 2026-08-30

### Added

- Five account administration tools for create, allowlisted update, safe close, reopen, and confirmed empty-only deletion.
- Three category-group and six category administration tools with typed creation, rename, same-type moves, semantic visibility, and confirmed unused-only deletion.
- Complete-history and budget-month destructive preflights, persisted-state verification, stable recovery metadata, and owned-resource real-test infrastructure.

### Changed

- Expanded the exact MCP surface from 10 to 24 tools while keeping the ten 0.1.0 contracts compatible.
- Structural mutation lifecycles now keep preflight, mutation, synchronization, refetch, and verification in one FIFO queue position.
- Package and MCP metadata now report 0.2.0 while `@actual-app/api` remains pinned at 26.8.1.

### Fixed

- Prevented the installed SDK's zero-transaction close path from implicitly deleting an account.
- Prevented account, category-group, and category delete cascades unless complete public reads prove the entity empty or unused.
- Marked mutation/sync and post-sync/read partial failures non-retryable and returned explicit safe recovery state.

## 0.1.0 - Unreleased

### Added

- Initial MCP stdio server for Actual Budget.
- Ten tools for health, synchronization, account, category, payee, and transaction operations.
- Strict validation, serialized SDK access, secret redaction, tests, and deployment guidance.
