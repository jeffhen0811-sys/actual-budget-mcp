## Purpose

Define conservative, bounded, deterministic, read-only transaction diagnostics for possible unlinked transfers and duplicate candidates without probabilistic or mutating behavior.

## ADDED Requirements

### Requirement: Shared diagnostic bounds and purity
`actual_find_possible_transfers` and `actual_find_possible_duplicates` SHALL require an inclusive valid `startDate` and `endDate` no more than 366 days apart, SHALL accept a date-window value from zero through seven days with a default of three, and SHALL support deterministic sort, limit, and offset with defaults of 100, a maximum limit of 250, and maximum offset of 10000. Each tool SHALL scan at most 5000 eligible leaf transactions and MUST fail with `RESULT_LIMIT_EXCEEDED` if complete classification would require a larger scan. They MUST NOT mutate, synchronize, link, merge, categorize, or delete data.

#### Scenario: Scan cap exceeded
- **WHEN** more than 5000 eligible leaf transactions are required to classify the requested range
- **THEN** the tool fails without returning a partial candidate set or performing a mutation

#### Scenario: Invalid diagnostic bounds
- **WHEN** dates are malformed or reversed, the range exceeds 366 inclusive days, the date window is outside zero through seven, or pagination is invalid
- **THEN** strict validation rejects the call before an Actual operation executes

### Requirement: Possible unlinked transfer detection
The system SHALL expose `actual_find_possible_transfers` with optional exact account IDs and positive integer minimum and maximum magnitudes. It SHALL compare only non-transfer leaf transactions in different accounts whose signed amounts are non-zero exact opposites and whose dates are within the requested window. Split parents and split children, starting-balance transactions, and transactions already carrying a meaningful `transfer_id` SHALL be excluded. Candidate pairs SHALL be classified only after the complete bounded candidate graph is assembled.

#### Scenario: Unique reciprocal candidate
- **WHEN** each member of an otherwise eligible pair has exactly one eligible opposite-side candidate
- **THEN** the pair is returned once with classification `UNIQUE`, exact transaction evidence, date difference, and deterministic reason codes

#### Scenario: Ambiguous reciprocal candidate
- **WHEN** either member has more than one eligible opposite-side candidate
- **THEN** every eligible pair is classified `AMBIGUOUS` with left and right candidate counts and none is presented as an automatic match

#### Scenario: Same-account opposite amounts
- **WHEN** two otherwise similar transactions belong to the same account
- **THEN** they are not returned as a possible transfer pair

### Requirement: Possible duplicate detection
The system SHALL expose `actual_find_possible_duplicates` with optional exact account IDs, positive integer minimum and maximum magnitudes, and classification filters. It SHALL compare only non-transfer leaf transactions within the same account and equal signed integer amount. Split parents and split children, starting-balance transactions, and transactions carrying a meaningful `transfer_id` SHALL be excluded. Equal non-empty imported identifiers SHALL produce `STRONG` evidence even outside the requested date window; otherwise an exact date plus equal non-null payee or imported-payee evidence SHALL be `STRONG`, and a date within the requested window plus equal non-null payee or imported-payee evidence SHALL be `LIKELY`. Two absent values MUST NOT count as matching evidence.

#### Scenario: Reused imported identifier
- **WHEN** two eligible same-account transactions have the same meaningful imported identifier and equal signed amount
- **THEN** the pair is returned once as `STRONG` with a `SAME_IMPORTED_ID` reason

#### Scenario: Exact-date payee evidence
- **WHEN** two eligible transactions have equal amount, exact date, and the same meaningful payee or imported-payee value
- **THEN** the pair is returned once as `STRONG` with the applicable deterministic reason codes

#### Scenario: Nearby-date payee evidence
- **WHEN** equal-amount transactions have meaningful matching payee evidence and fall within the requested non-zero date window
- **THEN** the pair is returned once as `LIKELY` and is not described as proven duplication

#### Scenario: Amount-only similarity
- **WHEN** two transactions share only an amount or share only null payee-like fields
- **THEN** they are not returned as duplicate candidates

### Requirement: Deterministic diagnostic results
Candidate keys SHALL be versioned hashes of the sorted opaque member IDs and each unordered pair SHALL appear once. Classification and total counts SHALL be computed before filtering by classification and before pagination. Results SHALL include the complete matched, unique or strong, and ambiguous or likely counts for the bounded request, plus returned count, limit, and offset. Sorting SHALL use explicit documented enums and opaque IDs as final tie-breakers.

#### Scenario: Stable candidate pagination
- **WHEN** the same diagnostic request is repeated without intervening mutation
- **THEN** identical pagination returns the same candidate keys in the same order and unchanged pre-pagination counts

#### Scenario: Classification filter
- **WHEN** a caller selects an allowed classification
- **THEN** classification is determined from the complete bounded graph before the selected class is filtered and paginated
