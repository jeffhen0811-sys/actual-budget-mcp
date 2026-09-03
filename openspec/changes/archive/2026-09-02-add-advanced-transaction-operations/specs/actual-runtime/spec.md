## MODIFIED Requirements

### Requirement: Official Actual API boundary
The system SHALL perform every budget operation through the public API exported by the pinned `@actual-app/api@26.8.1`. The installed package's exported public types, declarations, and bundle behavior, supplemented by observed real-server tests, SHALL be the executable authority; current official documentation MAY provide context but MUST NOT override the installed contract. Application code MAY internally construct transaction queries only with public `q()` and `aqlQuery()` exports, a fixed `transactions` table, allowlisted fields, allowlisted operators, and MCP-owned typed inputs. Application code MUST NOT open, query, or modify Actual SQLite files directly, expose arbitrary ActualQL queries or expressions, call internal endpoints, accept raw query objects, or upgrade the dependency implicitly.

#### Scenario: Budget operation
- **WHEN** a tool needs to read or mutate Actual data
- **THEN** the operation is performed through a public method exported by the installed `@actual-app/api@26.8.1`

#### Scenario: Typed internal transaction query
- **WHEN** exact lookup, filtering, sorting, pagination, or totals require ActualQL
- **THEN** the MCP constructs the fixed transaction query internally from validated allowlisted inputs and exposes neither the query nor arbitrary query authority to the caller

#### Scenario: Documentation exceeds installed API
- **WHEN** current documentation describes a field or option absent from the installed public types and bundle
- **THEN** the system excludes that behavior from v0.5.0 rather than invoking an internal workaround or imitating a different SDK version

#### Scenario: Mandatory method is unavailable
- **WHEN** a required capability cannot be implemented with the pinned public SDK
- **THEN** implementation stops and documents the limitation before any dependency upgrade or scope substitute is attempted

## ADDED Requirements

### Requirement: Serialized compound transaction lifecycle
Every advanced transaction lookup, search, preview, bulk preflight, bulk execution, and import execution SHALL occupy one uninterrupted serialized queue position for its complete SDK lifecycle. A confirmed bulk execution SHALL perform all local item updates serially, attempt at most one synchronization after local state may have changed, and complete official read-back verification before releasing the queue. Import preview SHALL remain in the read path and MUST NOT synchronize.

#### Scenario: Concurrent search and bulk write
- **WHEN** a search and confirmed bulk operation arrive concurrently
- **THEN** each complete operation executes in deterministic queue order without interleaving bulk preflight, writes, synchronization, or verification

#### Scenario: Bulk synchronization
- **WHEN** a confirmed bulk operation changes one or more transactions locally
- **THEN** one synchronization occurs after the local sequence rather than once per requested item

#### Scenario: Read-only preview
- **WHEN** import preview completes successfully
- **THEN** no synchronization is triggered and the operation releases the queue without persisted mutation

### Requirement: Recoverable compound transaction failure
When a compound transaction mutation fails after local changes may have occurred, the system SHALL preserve exact requested, completed, pending, and affected transaction IDs plus the failed phase and safe recovery action. It MUST distinguish local-update, synchronization, and post-sync verification failures, MUST NOT claim transactional rollback, and MUST NOT automatically retry the complete mutation.

#### Scenario: Local bulk failure
- **WHEN** a later local update fails after prior transaction updates completed
- **THEN** the structured error identifies completed and pending IDs, marks local partial state, and recommends synchronization followed by exact reads

#### Scenario: Bulk synchronization failure
- **WHEN** local updates complete but synchronization fails
- **THEN** the error identifies potential local changes, returns `actual_sync` as recovery action, and does not replay updates

#### Scenario: Bulk verification failure
- **WHEN** synchronization succeeds but exact read-back cannot verify all desired states
- **THEN** the error reports `synchronized_but_unverified` with affected IDs and no automatic retry
