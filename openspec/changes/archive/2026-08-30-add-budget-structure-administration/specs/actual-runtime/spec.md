## MODIFIED Requirements

### Requirement: Official Actual API boundary
The system SHALL perform every budget operation through the public API exported by the pinned `@actual-app/api@26.8.1`. The installed package's exported public types and signatures, supplemented by observed real-server tests, SHALL be the executable authority; current official documentation MAY provide context but MUST NOT override the installed contract. Application code MUST NOT open, query, or modify Actual SQLite files directly, expose arbitrary ActualQL queries, call internal endpoints, or upgrade the dependency implicitly.

#### Scenario: Budget operation
- **WHEN** a tool needs to read or mutate Actual data
- **THEN** the operation is performed through a public method exported by the installed `@actual-app/api@26.8.1`

#### Scenario: Documentation exceeds installed API
- **WHEN** current documentation describes a field or operation absent from the installed public types
- **THEN** the system excludes that behavior from v0.2.0 rather than invoking an internal workaround

#### Scenario: Mandatory method is unavailable
- **WHEN** a required capability cannot be implemented with the pinned public SDK
- **THEN** implementation stops and documents the limitation before any dependency upgrade or scope substitute is attempted

### Requirement: Serialized Actual operations
The system SHALL execute Actual API operations through a single serialized queue so reads, writes, synchronization, initialization, and shutdown do not race over shared SDK state. For each structural mutation, preflight reads, the optional mutation, synchronization, post-sync reads, state verification, and result construction SHALL occupy one uninterrupted queue position.

#### Scenario: Overlapping tool calls
- **WHEN** two tool handlers request Actual operations at the same time
- **THEN** their complete SDK operation lifecycles execute one at a time in deterministic queue order

#### Scenario: Structural preflight and mutation
- **WHEN** a structural mutation passes preflight
- **THEN** no other queued Actual operation can change the observed state before its mutation and verification complete

#### Scenario: Idempotent desired state
- **WHEN** preflight proves the target already has the requested state
- **THEN** the operation returns `changed: false` from the same queue position without mutation or synchronization

### Requirement: Synchronization behavior
The system SHALL expose explicit synchronization and SHALL synchronize after every successful transaction or structural mutation before reporting the mutation as complete. A structural success SHALL be followed by an official read that verifies the expected persisted state or confirmed absence. A successful explicit synchronization result SHALL include `success: true` and an ISO-8601 timestamp. The system MUST NOT automatically retry a mutation.

#### Scenario: Explicit synchronization
- **WHEN** `actual_sync` is called and synchronization succeeds
- **THEN** the tool returns `success: true` and the completion timestamp

#### Scenario: Synchronization after mutation
- **WHEN** an import, update, deletion, create, close, reopen, move, hide, or unhide operation changes the budget
- **THEN** synchronization and the required post-sync verification complete before the tool reports success

#### Scenario: Synchronization failure after mutation
- **WHEN** a mutation succeeds locally but the following synchronization fails
- **THEN** the tool returns `MUTATION_SYNC_FAILED`, `retryable: false`, `recoveryAction: "actual_sync"`, and safe optional entity context indicating that local state may have changed

#### Scenario: Verification failure after successful synchronization
- **WHEN** synchronization succeeds but the final official read cannot verify the persisted state
- **THEN** the tool returns `POST_MUTATION_READ_FAILED`, `retryable: false`, and state `synchronized_but_unverified` without retrying the mutation
