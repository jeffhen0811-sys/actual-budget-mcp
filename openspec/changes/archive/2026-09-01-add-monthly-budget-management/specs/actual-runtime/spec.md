## ADDED Requirements

### Requirement: Verified budget mutation lifecycle
Every single or compound budget mutation SHALL occupy one uninterrupted serialized queue position containing preflight reads, local mutation attempts, explicit synchronization when state may have changed, official post-sync reads, verification, and result construction. The system MUST NOT create a second Actual client or retry a budget mutation automatically.

#### Scenario: Single budget mutation
- **WHEN** a category budget, carryover, hold, or reset operation changes local state
- **THEN** no other Actual operation interleaves before synchronization and official read-back verification complete

#### Scenario: Compound budget copy
- **WHEN** a copy operation plans multiple category mutations
- **THEN** its complete preflight, mutation tracking, synchronization, and verification execute within one queue position

### Requirement: Recoverable compound mutation failure
When a compound budget mutation fails after any local change may have occurred, the system SHALL preserve safe per-item progress and original-target metadata sufficient to inspect and recover state. It MUST distinguish synchronization failure from successful synchronization followed by inconclusive verification and MUST NOT claim transactional rollback.

#### Scenario: Local failure after completed items
- **WHEN** a later copy item fails after earlier items completed locally
- **THEN** the error identifies attempted and completed category IDs, marks partial state, and instructs the caller to synchronize and read the target month before deciding on recovery

#### Scenario: Post-sync verification failure
- **WHEN** all planned local mutations and synchronization complete but read-back cannot verify the target
- **THEN** the error reports `synchronized_but_unverified` and does not replay any mutation
