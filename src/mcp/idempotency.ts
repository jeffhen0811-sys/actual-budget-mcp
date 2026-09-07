export type IdempotencyClassification = 'idempotent' | 'non-idempotent';

export interface IdempotencyReview {
  classification: IdempotencyClassification;
  repeatBehavior: string;
}

/** Reviewed successful-repeat semantics for every mutation-capable v1 tool. */
export const IDEMPOTENCY_REVIEW = {
  actual_sync: { classification: 'idempotent', repeatBehavior: 'Repeating synchronization reconciles the same loaded budget and creates no new entity.' },
  actual_set_budget_amount: { classification: 'idempotent', repeatBehavior: 'Sets one category to an exact desired amount; an equal read-back is a no-op.' },
  actual_set_budget_carryover: { classification: 'idempotent', repeatBehavior: 'Sets one category to an exact desired carryover flag across the verified month range.' },
  actual_hold_budget_for_next_month: { classification: 'non-idempotent', repeatBehavior: 'Adds an incremental hold; the same amount is applied again on every successful execution.' },
  actual_reset_budget_hold: { classification: 'idempotent', repeatBehavior: 'Resets the manual hold to the same cleared state; repeating does not add another change.' },
  actual_copy_budget_month: { classification: 'idempotent', repeatBehavior: 'Copies desired planning values; once source and target match, the same request reports no actionable changes.' },
  actual_bulk_update_transactions: { classification: 'idempotent', repeatBehavior: 'Applies exact desired fields; a repeated request classifies already-matching items as unchanged.' },
  actual_import_transactions: { classification: 'idempotent', repeatBehavior: 'Required imported_id values drive official reconciliation, so an identical successful import does not duplicate rows.' },
  actual_update_transaction: { classification: 'non-idempotent', repeatBehavior: 'Conservatively not replayable because the SDK does not guarantee safe replay after an ambiguous single or paired transfer update.' },
  actual_delete_transaction: { classification: 'non-idempotent', repeatBehavior: 'The first call removes one transaction or reciprocal pair; a repeat addresses missing identifiers.' },
  actual_create_transfer: { classification: 'non-idempotent', repeatBehavior: 'Every execution may create a new reciprocal pair with new identifiers.' },
  actual_create_account: { classification: 'non-idempotent', repeatBehavior: 'Every execution may create another account because names are not an idempotency key.' },
  actual_update_account: { classification: 'idempotent', repeatBehavior: 'Sets allowlisted account fields to exact desired values and verifies the resulting account.' },
  actual_close_account: { classification: 'idempotent', repeatBehavior: 'Targets the closed state and returns unchanged when the account is already closed.' },
  actual_reopen_account: { classification: 'idempotent', repeatBehavior: 'Targets the open state and returns unchanged when the account is already open.' },
  actual_delete_account: { classification: 'non-idempotent', repeatBehavior: 'The first confirmed call removes the account; a repeat addresses a missing identifier.' },
  actual_create_category_group: { classification: 'non-idempotent', repeatBehavior: 'Every execution may create another group because its name is not an idempotency key.' },
  actual_update_category_group: { classification: 'idempotent', repeatBehavior: 'Sets the group name to one exact desired value and verifies it.' },
  actual_delete_category_group: { classification: 'non-idempotent', repeatBehavior: 'The first confirmed call removes the empty group; a repeat addresses a missing identifier.' },
  actual_create_category: { classification: 'non-idempotent', repeatBehavior: 'Every execution may create another category because name and group are not an idempotency key.' },
  actual_update_category: { classification: 'idempotent', repeatBehavior: 'Sets the category name to one exact desired value and verifies it.' },
  actual_move_category: { classification: 'idempotent', repeatBehavior: 'Sets the category group to one exact compatible destination and verifies it.' },
  actual_hide_category: { classification: 'idempotent', repeatBehavior: 'Sets hidden to true and returns unchanged when already hidden.' },
  actual_unhide_category: { classification: 'idempotent', repeatBehavior: 'Sets hidden to false and returns unchanged when already visible.' },
  actual_delete_category: { classification: 'non-idempotent', repeatBehavior: 'The first confirmed call removes the unused category; a repeat addresses a missing identifier.' },
  actual_create_payee: { classification: 'idempotent', repeatBehavior: 'Returns the single exact existing ordinary payee instead of creating a duplicate for the same normalized name.' },
  actual_update_payee: { classification: 'idempotent', repeatBehavior: 'Sets one ordinary payee to the exact desired name and verifies it.' },
  actual_delete_payee: { classification: 'non-idempotent', repeatBehavior: 'The first confirmed call removes the unused payee; a repeat addresses a missing identifier.' },
  actual_merge_payees: { classification: 'non-idempotent', repeatBehavior: 'The source identifiers cease to exist after success, so the same merge request cannot be replayed.' },
  actual_create_rule: { classification: 'non-idempotent', repeatBehavior: 'Every execution may create another ordered rule because the request has no idempotency key.' },
  actual_update_rule: { classification: 'idempotent', repeatBehavior: 'Applies and verifies the same allowlisted desired full-rule projection.' },
  actual_delete_rule: { classification: 'non-idempotent', repeatBehavior: 'The first confirmed call removes the rule; a repeat addresses a missing identifier.' },
  actual_create_schedule: { classification: 'non-idempotent', repeatBehavior: 'Every execution may create another schedule because the request has no idempotency key.' },
  actual_update_schedule: { classification: 'idempotent', repeatBehavior: 'Applies and verifies the same allowlisted desired schedule fields.' },
  actual_delete_schedule: { classification: 'non-idempotent', repeatBehavior: 'The first confirmed call removes the schedule; a repeat addresses a missing identifier.' }
} as const satisfies Record<string, IdempotencyReview>;

export type ReviewedMutationToolName = keyof typeof IDEMPOTENCY_REVIEW;
