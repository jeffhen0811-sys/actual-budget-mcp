/** Schema-valid synthetic arguments used only with in-memory policy short-circuit tests. */
export const SAFE_MUTATION_ARGUMENTS: Readonly<Record<string, Record<string, unknown>>> = {
  actual_sync: {},
  actual_set_budget_amount: { month: '2026-09', categoryId: 'category-id', amount: 0 },
  actual_set_budget_carryover: { month: '2026-09', categoryId: 'category-id', carryover: false },
  actual_hold_budget_for_next_month: { month: '2026-09', amount: 1 },
  actual_reset_budget_hold: { month: '2026-09' },
  actual_copy_budget_month: { sourceMonth: '2026-08', targetMonth: '2026-09' },
  actual_bulk_update_transactions: {
    items: [{ transactionId: 'transaction-id', fields: { notes: 'policy fixture' } }]
  },
  actual_import_transactions: {
    accountId: 'account-id',
    transactions: [{ date: '2026-09-01', amount: -1, imported_id: 'policy-fixture:1' }]
  },
  actual_update_transaction: { transactionId: 'transaction-id', fields: { cleared: true } },
  actual_delete_transaction: { transactionId: 'transaction-id', confirmDestructive: true },
  actual_create_transfer: {
    fromAccountId: 'account-from', toAccountId: 'account-to', amount: 1, date: '2026-09-01'
  },
  actual_create_account: { name: 'Policy fixture account' },
  actual_update_account: { accountId: 'account-id', name: 'Policy fixture account' },
  actual_close_account: { accountId: 'account-id' },
  actual_reopen_account: { accountId: 'account-id' },
  actual_delete_account: { accountId: 'account-id', confirmDestructive: true },
  actual_create_category_group: { name: 'Policy fixture group' },
  actual_update_category_group: { groupId: 'group-id', name: 'Policy fixture group' },
  actual_delete_category_group: { groupId: 'group-id', confirmDestructive: true },
  actual_create_category: { name: 'Policy fixture category', groupId: 'group-id' },
  actual_update_category: { categoryId: 'category-id', name: 'Policy fixture category' },
  actual_move_category: { categoryId: 'category-id', targetGroupId: 'target-group-id' },
  actual_hide_category: { categoryId: 'category-id' },
  actual_unhide_category: { categoryId: 'category-id' },
  actual_delete_category: { categoryId: 'category-id', confirmDestructive: true },
  actual_create_payee: { name: 'Policy fixture payee' },
  actual_update_payee: { payeeId: 'payee-id', name: 'Policy fixture payee' },
  actual_delete_payee: { payeeId: 'payee-id', confirmDestructive: true },
  actual_merge_payees: {
    sourcePayeeIds: ['source-payee-id'], targetPayeeId: 'target-payee-id', confirmDestructive: true
  },
  actual_create_rule: {
    stage: 'default', conditionsOp: 'and',
    conditions: [{ field: 'imported_payee', op: 'contains', value: 'policy fixture' }],
    actions: [{ op: 'set', field: 'cleared', value: true }]
  },
  actual_update_rule: { ruleId: 'rule-id', stage: 'post' },
  actual_delete_rule: { ruleId: 'rule-id', confirmDestructive: true },
  actual_create_schedule: {
    accountId: 'account-id', amount: { type: 'exact', amount: -1 },
    date: { type: 'oneTime', date: '2026-09-01' }, postsTransaction: true
  },
  actual_update_schedule: { scheduleId: 'schedule-id', postsTransaction: false },
  actual_delete_schedule: { scheduleId: 'schedule-id', confirmDestructive: true }
};
