## Purpose

Define a stable, safe MCP contract for inspecting and administering Actual rules so future imported transactions can be normalized and categorized by Actual's own rule engine without exposing arbitrary or unsupported rule internals for mutation.

## ADDED Requirements

### Requirement: List rules in execution order
The system SHALL expose `actual_list_rules` and return every rule supplied by the official rule-list API in Actual's ranked execution order. Each rule SHALL include its stable `id`, normalized `stage`, `conditionsOp`, complete conditions, and complete actions. The MCP MUST NOT fabricate a rule name, enabled flag, or writable numeric priority that the installed public API does not provide.

#### Scenario: Rules are present
- **WHEN** `actual_list_rules` is called on a loaded budget
- **THEN** every official rule is returned in execution order without losing the semantics of its conditions or actions

#### Scenario: Advanced existing rule
- **WHEN** an existing rule contains a public action shape outside the v0.3.0 authoring subset
- **THEN** the rule remains readable and is marked as not writable by the MCP rather than causing the complete list to fail

#### Scenario: No rules
- **WHEN** Actual returns no current rules
- **THEN** the tool returns an empty rules array

### Requirement: Get one rule
The system SHALL expose `actual_get_rule` with an opaque `ruleId` and SHALL locate the rule through the official rule-list API. It SHALL return the same stable representation used by `actual_list_rules`.

#### Scenario: Existing rule
- **WHEN** the requested ID appears in the official rule list
- **THEN** the matching complete normalized rule is returned

#### Scenario: Unknown rule
- **WHEN** the requested ID is absent
- **THEN** the tool returns a structured `NOT_FOUND` error

### Requirement: Normalize rule stages transparently
The MCP rule contract SHALL represent stages as `pre`, `default`, or `post`. It SHALL translate MCP `default` to the installed SDK's explicit `null` value on writes and translate SDK `null` back to `default` on reads. It MUST reject undocumented stage values and MUST NOT expose `null` as a caller-required implementation detail.

#### Scenario: Create a default-stage rule
- **WHEN** a caller supplies `stage: "default"`
- **THEN** the official API receives the installed default-stage representation and the returned MCP rule reads back as `stage: "default"`

#### Scenario: Read pre and post rules
- **WHEN** Actual returns rules in pre or post stages
- **THEN** those stage names are preserved verbatim

### Requirement: Create a conservatively authored rule
The system SHALL expose `actual_create_rule` with `stage`, `conditionsOp`, at least one condition, and at least one action. Input SHALL use strict discriminated schemas for the documented v0.3.0 authoring subset and MUST NOT accept arbitrary JSON, IDs, operators, values, options, formula text, template text, split actions, schedule links, or transaction-deletion actions outside that subset. Creation SHALL synchronize and verify the returned stable rule ID and complete persisted shape.

#### Scenario: Create payee categorization rule
- **WHEN** a valid condition identifies an existing payee and a valid action sets an existing category
- **THEN** one rule is created, synchronized, read back by its returned ID, and returned with `changed: true`

#### Scenario: Create imported-payee normalization rule
- **WHEN** a valid imported-payee string condition sets an existing ordinary payee
- **THEN** the persisted rule preserves the requested condition, action, stage, and condition combinator

#### Scenario: Missing conditions or actions
- **WHEN** either conditions or actions is empty or absent
- **THEN** strict validation rejects the complete request before any Actual mutation

#### Scenario: Unsupported or malformed authoring shape
- **WHEN** a field/operator/value combination is invalid or the action is destructive, schedule-linked, split-based, formula-based, template-based, or otherwise outside the advertised subset
- **THEN** validation rejects the request without forwarding caller-controlled arbitrary rule data

### Requirement: Author only validated non-destructive rule behavior
The v0.3.0 authoring subset SHALL support the installed public condition fields and their valid installed operators using field-appropriate string, identifier, integer amount, date, boolean, list, or bounded-range values. Writable actions SHALL be limited to non-destructive setting of officially supported transaction fields and documented note prepend/append operations. Payee, category, category-group, and account IDs referenced by an authored rule SHALL be verified through complete official reads before creation or update.

#### Scenario: Existing object references
- **WHEN** every referenced payee, category, category group, and account exists and the field/operator/value combination is supported
- **THEN** reference preflight permits the rule mutation

#### Scenario: Missing object reference
- **WHEN** any referenced object ID is absent
- **THEN** the tool returns a structured reference error before calling the rule mutation

#### Scenario: Reference preflight is incomplete
- **WHEN** a required official object list cannot be retrieved or validated completely
- **THEN** the tool returns `PREFLIGHT_INCONCLUSIVE` and does not mutate a rule

#### Scenario: Destructive action request
- **WHEN** a caller attempts to author a rule that deletes a transaction
- **THEN** the request is refused even if the installed SDK can represent that action

### Requirement: Update a writable rule by desired state
The system SHALL expose `actual_update_rule` with a `ruleId` and one or more allowlisted changes among `stage`, `conditionsOp`, `conditions`, and `actions`. It SHALL fetch the complete current rule, refuse updates to an existing rule outside the MCP authoring subset, merge the allowlisted desired changes into the complete official shape required by the SDK, validate all references, synchronize, and verify the final rule.

#### Scenario: Update a supported rule
- **WHEN** a current MCP-writable rule receives one or more valid changed fields
- **THEN** the official full-rule update runs once and the verified synchronized rule is returned with `changed: true`

#### Scenario: Desired rule already matches
- **WHEN** all supplied fields already match the normalized persisted rule
- **THEN** the tool returns `changed: false` without mutation or synchronization

#### Scenario: Empty or arbitrary update
- **WHEN** no permitted update field is supplied or an unknown property is present
- **THEN** strict validation rejects the request

#### Scenario: Advanced rule update
- **WHEN** the current rule contains an action or option outside the MCP authoring subset
- **THEN** the tool refuses the update without rewriting or dropping the advanced semantics

### Requirement: Delete only the identified rule with confirmation
The system SHALL expose `actual_delete_rule` as a destructive operation requiring `confirmDestructive: true`. It SHALL verify existence before mutation, invoke only the official single-rule delete, interpret a false deletion outcome as a protected refusal, synchronize a successful deletion, and verify absence. Deletion MUST NOT modify historical transactions or execute the rule's actions.

#### Scenario: Confirmation is missing
- **WHEN** confirmation is absent or false
- **THEN** the tool returns `DESTRUCTIVE_CONFIRMATION_REQUIRED` and the rule remains unchanged

#### Scenario: Confirmed standalone rule deletion
- **WHEN** the rule exists, is deletable by Actual, and confirmation is true
- **THEN** only that rule is deleted, synchronized, verified absent, and reported by its immutable deleted ID

#### Scenario: Actual protects the rule
- **WHEN** the official delete operation returns false, including for a rule owned by another Actual feature
- **THEN** the tool reports a structured refusal and does not claim that the rule was deleted

#### Scenario: Rule deletion is not retroactive
- **WHEN** a rule is deleted successfully
- **THEN** no existing transaction is changed merely because the rule was removed

### Requirement: Keep rule creation non-idempotent
`actual_create_rule` SHALL be declared non-idempotent and MUST NOT infer semantic equality or silently reuse an existing rule. Desired-state updates SHALL be idempotent after normalized comparison.

#### Scenario: Repeated create request
- **WHEN** the same valid create request is intentionally submitted twice
- **THEN** each successful call creates and returns its own Actual rule ID

#### Scenario: Repeated update request
- **WHEN** the same desired update is submitted after it has persisted
- **THEN** the second call returns `changed: false`

### Requirement: Prove functional execution through official import
The release SHALL prove that a rule created through the MCP is interpreted by Actual by importing a uniquely owned temporary transaction through the existing official import tool and observing the resulting payee or category. No public `actual_run_rules` or `actual_preview_rule` tool SHALL be registered while the pinned SDK lacks those public exports.

#### Scenario: Functional categorization
- **WHEN** a temporary rule matches a uniquely owned temporary imported transaction
- **THEN** Actual's official import pipeline applies the rule and the subsequent transaction read shows the expected official result

#### Scenario: Unsupported manual run or preview
- **WHEN** the v0.3.0 tool surface is inspected
- **THEN** neither `actual_run_rules` nor `actual_preview_rule` is present and documentation marks both capabilities unsupported by the pinned public SDK
