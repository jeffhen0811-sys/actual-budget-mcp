## MODIFIED Requirements

### Requirement: Read transactions by bounded date range
The system SHALL preserve `actual_get_transactions` with `accountId`, `startDate`, and `endDate`. Dates MUST use the `YYYY-MM-DD` format, the start MUST NOT follow the end, and the inclusive interval MUST NOT exceed 366 days. The established output wrapper and fields MUST remain compatible, and each transaction SHALL additively preserve every installed canonical field among `id`, `account`, `date`, `amount`, `payee`, resolved `payee_name` when queried, `imported_payee`, `category`, resolved `category_name` when queried, `notes`, `imported_id`, `transfer_id`, `cleared`, `reconciled`, `starting_balance_flag`, `is_parent`, `is_child`, `parent_id`, and nested `subtransactions` when available. Explicit null values MUST remain null and absent optional fields MUST remain absent.

#### Scenario: Valid date range
- **WHEN** the tool receives a valid account ID and an inclusive range of at most 366 days
- **THEN** it returns the transactions supplied by the official API for that account and range in the established `transactions` wrapper

#### Scenario: Canonical nullable fields
- **WHEN** Actual returns null or absent payee, category, notes, import, or transfer fields
- **THEN** the MCP preserves null or absence without converting it to an empty string, sentinel, or invented ID

#### Scenario: Canonical split fields
- **WHEN** Actual returns a split parent or child through the existing read
- **THEN** installed identity flags, parent relationship, and nested subtransactions are projected recursively when available rather than silently discarded

#### Scenario: Invalid date format
- **WHEN** either date does not represent a valid calendar date in `YYYY-MM-DD` format
- **THEN** input validation rejects the call before any Actual operation executes

#### Scenario: Reversed date range
- **WHEN** `startDate` is later than `endDate`
- **THEN** input validation rejects the call with a clear range error

#### Scenario: Excessive date range
- **WHEN** the inclusive interval exceeds 366 days
- **THEN** input validation rejects the call and asks the client to request a narrower period
