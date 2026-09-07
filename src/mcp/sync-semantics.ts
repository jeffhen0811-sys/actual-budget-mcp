export interface SyncSemanticsReview {
  readBack: string;
}

/** Reviewed read-back target for every mutation-capable v1 tool. */
export const SYNC_SEMANTICS_REVIEW = {
  actual_sync: { readBack: 'Returns only MCP-observed synchronization telemetry; callers read affected domain entities separately.' },
  actual_set_budget_amount: { readBack: 'Reads the exact budget month and category after synchronization.' },
  actual_set_budget_carryover: { readBack: 'Reads the exact budget month and category after synchronization.' },
  actual_hold_budget_for_next_month: { readBack: 'Reads the selected budget month and compares its observed next-month aggregate.' },
  actual_reset_budget_hold: { readBack: 'Reads the selected budget month and reports the observed next-month aggregate.' },
  actual_copy_budget_month: { readBack: 'Reads the target month and verifies every attempted category amount and carryover value.' },
  actual_bulk_update_transactions: { readBack: 'Reads the exact requested transaction IDs and checks every desired field.' },
  actual_import_transactions: { readBack: 'Returns the official added and updated IDs; callers read those exact IDs to independently verify persisted values.' },
  actual_update_transaction: { readBack: 'Reads the exact transaction and, when applicable, its reciprocal transfer relationship.' },
  actual_delete_transaction: { readBack: 'Reads the deleted transaction and known reciprocal counterpart to verify absence.' },
  actual_create_transfer: { readBack: 'Searches the bounded creation candidate set and verifies both reciprocal transaction IDs.' },
  actual_create_account: { readBack: 'Reads the exact created account, including its observed balance metadata.' },
  actual_update_account: { readBack: 'Reads the exact account and verifies the requested name and off-budget state.' },
  actual_close_account: { readBack: 'Reads the exact account and verifies the closed state.' },
  actual_reopen_account: { readBack: 'Reads the exact account and verifies the open state.' },
  actual_delete_account: { readBack: 'Reads the exact account identifier and verifies that it is absent.' },
  actual_create_category_group: { readBack: 'Reads the exact created category group.' },
  actual_update_category_group: { readBack: 'Reads the exact category group and verifies its name.' },
  actual_delete_category_group: { readBack: 'Reads the exact category group identifier and verifies that it is absent.' },
  actual_create_category: { readBack: 'Reads the exact created category and its persisted group/type projection.' },
  actual_update_category: { readBack: 'Reads the exact category and verifies its name.' },
  actual_move_category: { readBack: 'Reads the exact category and verifies its destination group.' },
  actual_hide_category: { readBack: 'Reads the exact category and verifies hidden state.' },
  actual_unhide_category: { readBack: 'Reads the exact category and verifies visible state.' },
  actual_delete_category: { readBack: 'Reads the exact category identifier and verifies that it is absent.' },
  actual_create_payee: { readBack: 'Reads the exact existing or newly created ordinary payee.' },
  actual_update_payee: { readBack: 'Reads the exact ordinary payee and verifies its name.' },
  actual_delete_payee: { readBack: 'Reads the exact payee identifier and verifies that it is absent.' },
  actual_merge_payees: { readBack: 'Returns the target, source, and known affected identifiers; callers read these entities before recovery.' },
  actual_create_rule: { readBack: 'Reads the exact created rule in official execution order.' },
  actual_update_rule: { readBack: 'Reads the exact rule and compares the allowlisted desired projection.' },
  actual_delete_rule: { readBack: 'Reads the exact rule identifier and verifies that it is absent.' },
  actual_create_schedule: { readBack: 'Reads the exact created schedule from the complete public schedule list.' },
  actual_update_schedule: { readBack: 'Reads the exact schedule and verifies all requested fields.' },
  actual_delete_schedule: { readBack: 'Reads the exact schedule identifier and verifies that it is absent.' }
} as const satisfies Record<string, SyncSemanticsReview>;

export type ReviewedSyncToolName = keyof typeof SYNC_SEMANTICS_REVIEW;
