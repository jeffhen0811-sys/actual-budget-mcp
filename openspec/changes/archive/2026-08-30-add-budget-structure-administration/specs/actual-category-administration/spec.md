## Purpose

Define type-safe category-group and category administration that preserves linked financial data and refuses destructive operations whenever unused state cannot be proven.

## ADDED Requirements

### Requirement: Create and rename category groups
The system SHALL expose `actual_create_category_group` with `name` and optional `isIncome`, and `actual_update_category_group` with `groupId` and `name`. Names SHALL be trimmed, contain 1 through 255 characters after trimming, and preserve internal characters and case. Creation SHALL default `isIncome` to `false` and `hidden` to `false`. Update SHALL permit only `name`; group type and hidden state SHALL remain immutable through this tool.

#### Scenario: Create a default expense group
- **WHEN** a caller supplies a valid name and omits `isIncome`
- **THEN** the system creates a visible expense group, synchronizes, verifies it, and returns `success: true`, `changed: true`, and the persisted group

#### Scenario: Create an income group
- **WHEN** a caller supplies a valid name and `isIncome: true`
- **THEN** the system creates and verifies a visible income group

#### Scenario: Rename a group
- **WHEN** a caller supplies an existing group ID and a new valid name
- **THEN** only the name is updated and the synchronized persisted group is returned with `changed: true`

#### Scenario: Group already has requested name
- **WHEN** the persisted group name already equals the normalized requested name
- **THEN** no mutation or synchronization occurs and the tool returns `changed: false`

### Requirement: Delete only a proven-empty category group
The system SHALL expose `actual_delete_category_group` as a `DESTRUCTIVE OPERATION` requiring `confirmDestructive: true`. It SHALL verify the group and all linked categories and MUST invoke the official delete method only when the group is proven to contain no categories. It MUST NOT cascade category deletion or move categories automatically.

#### Scenario: Confirmation is missing for group deletion
- **WHEN** confirmation is absent or not exactly true
- **THEN** validation rejects the request and the group remains present

#### Scenario: Group contains categories
- **WHEN** preflight finds one or more linked categories
- **THEN** the tool returns `CATEGORY_GROUP_NOT_EMPTY` with safe category counts, IDs, and names and does not invoke deletion

#### Scenario: Delete an empty group
- **WHEN** confirmation is true and the group is proven empty
- **THEN** the system deletes it through the official API, synchronizes, verifies absence, and returns its immutable pre-delete ID and name with `relatedCategoryCount: 0`

#### Scenario: Group preflight is inconclusive
- **WHEN** linked categories cannot be read completely
- **THEN** the tool returns `PREFLIGHT_INCONCLUSIVE` and leaves the group unchanged

### Requirement: Create and rename categories
The system SHALL expose `actual_create_category` with `name` and `groupId`, and `actual_update_category` with `categoryId` and `name`. It SHALL derive `is_income` from the persisted target group, set new categories to `hidden: false`, and MUST NOT accept caller-controlled `isIncome`, `hidden`, `group_id`, `sort_order`, or arbitrary update fields.

#### Scenario: Create category in an existing group
- **WHEN** a valid name and existing group ID are supplied
- **THEN** the system creates a visible category whose income type matches the group, synchronizes, verifies it, and returns the persisted category with `changed: true`

#### Scenario: Create category with unknown group
- **WHEN** `groupId` does not identify a current group
- **THEN** the tool returns `NOT_FOUND` without attempting category creation

#### Scenario: Rename a category
- **WHEN** an existing category receives a new valid name
- **THEN** only the name is updated and the synchronized persisted category is returned

#### Scenario: Category name conflicts under Actual rules
- **WHEN** the official API rejects a category name under its native conflict rules
- **THEN** the tool returns `NAME_CONFLICT` and does not auto-rename the category

### Requirement: Move categories only between compatible groups
The system SHALL expose `actual_move_category` with `categoryId` and `targetGroupId`. Both entities SHALL be verified before mutation. A category MUST move only between groups with the same persisted income/expense type, and the system MUST NOT alter `is_income` to force compatibility.

#### Scenario: Move between same-type groups
- **WHEN** the category and target group exist, have compatible types, and differ from the current group
- **THEN** the system uses the official category update operation, synchronizes, verifies the new group ID, and returns `changed: true`

#### Scenario: Cross-type move
- **WHEN** an expense category targets an income group or an income category targets an expense group
- **THEN** the tool returns `INCOMPATIBLE_CATEGORY_GROUP_TYPE` without modifying the category

#### Scenario: Category already belongs to target group
- **WHEN** the category's current group equals `targetGroupId`
- **THEN** the tool performs no mutation or synchronization and returns `changed: false`

### Requirement: Hide and unhide categories
The system SHALL expose semantic `actual_hide_category` and `actual_unhide_category` tools rather than exposing the `hidden` field through generic update. Each SHALL use the official category update operation and verify the requested state after synchronization.

#### Scenario: Hide a visible category
- **WHEN** `actual_hide_category` targets a visible category
- **THEN** the synchronized result contains `hidden: true` and `changed: true`

#### Scenario: Repeat a visibility state
- **WHEN** hide targets an already hidden category or unhide targets an already visible category
- **THEN** no mutation or synchronization occurs and the current category is returned with `changed: false`

### Requirement: Delete only a proven-unused category
The system SHALL expose `actual_delete_category` as a `DESTRUCTIVE OPERATION` requiring `confirmDestructive: true`. Before deletion it SHALL inspect complete category use across all accounts' transaction histories and every month returned by the official budget-month APIs, including budget and carryover data. It MUST invoke the official delete method only when the category is proven unused and MUST NOT rewrite, transfer, or clear related financial data.

#### Scenario: Category is used by transactions
- **WHEN** complete history scanning finds one or more transactions assigned to the category
- **THEN** the tool returns `CATEGORY_IN_USE` with safe relationship counts and does not invoke deletion

#### Scenario: Category is used by budget data
- **WHEN** any available budget month contains a budget or carryover relationship for the category
- **THEN** the tool returns `CATEGORY_IN_USE` and leaves the category unchanged

#### Scenario: Category-use scan is incomplete
- **WHEN** any account history, budget month, or relevant returned structure cannot be read or interpreted completely
- **THEN** the tool returns `PREFLIGHT_INCONCLUSIVE` and does not invoke deletion

#### Scenario: Delete an unused category
- **WHEN** confirmation is true and complete official reads prove zero transaction and budget relationships
- **THEN** the system deletes the category, synchronizes, verifies absence, and returns its immutable pre-delete ID, name, and zero relationship counts

### Requirement: Normalized category administration results
Successful non-delete group operations SHALL return `success`, `changed`, and `categoryGroup` with `id`, `name`, `isIncome`, and `hidden`. Successful non-delete category operations SHALL return `success`, `changed`, and `category` with `id`, `name`, `groupId`, `isIncome`, and `hidden`. Delete results SHALL use immutable pre-delete summaries. All results SHALL be available as matching structured content and textual JSON without invented values.

#### Scenario: Persisted entity differs from requested representation
- **WHEN** Actual normalizes a valid persisted field
- **THEN** the result contains the post-sync persisted value rather than reconstructing the request locally

### Requirement: No category reordering or implicit conversion
The system MUST NOT expose category-group reorder, category reorder, generic category CRUD, automatic income-type conversion, or internal endpoint workarounds in v0.2.0.

#### Scenario: Unsupported structural request
- **WHEN** implementation would require an unexported method, internal endpoint, ActualQL, or direct SQLite access
- **THEN** the capability remains unavailable and the limitation is documented rather than bypassed
