import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger.js';
import { createMcpServer, TOOL_NAMES, V040_TOOL_NAMES, type ToolRuntime } from '../src/mcp/server.js';
import { PublicError } from '../src/errors.js';

const budgetCategoryFixture = {
  id: 'c1', name: 'Rent', groupId: 'g1', isIncome: false, hidden: false,
  budgeted: 10000, spent: -9000, balance: 1000, carryover: false,
  capabilities: { budgetAmount: true, carryover: true }
};
const budgetMonthFixture = {
  month: '2026-08', incomeAvailable: 20000, lastMonthOverspent: -500, forNextMonth: 0,
  totalBudgeted: 10000, toBudget: 9500, fromLastMonth: 0, totalIncome: 20000,
  totalSpent: -9000, totalBalance: 1000,
  capabilities: { holdForNextMonth: true, incomeBudgeting: false },
  categoryGroups: [{ id: 'g1', name: 'Housing', isIncome: false, hidden: false, budgeted: 10000, spent: -9000, balance: 1000, categories: [budgetCategoryFixture] }]
};

function fakeRuntime(): ToolRuntime {
  return {
    health: vi.fn().mockResolvedValue({ connected: true, server: 'http://actual.local:5006', budgetLoaded: true, version: '26.7.0' }),
    sync: vi.fn().mockResolvedValue({ success: true, synchronizedAt: '2026-08-29T12:00:00.000Z' }),
    listAccounts: vi.fn().mockResolvedValue([{ id: 'a1', name: 'Conta Corrente', offbudget: false, closed: false, balance: 1234 }]),
    getAccount: vi.fn().mockResolvedValue({ id: 'a1', name: 'Conta Corrente', offbudget: false, closed: false, balance: 1234 }),
    listCategories: vi.fn().mockResolvedValue([{ groupId: 'g1', groupName: 'Moradia', categories: [{ id: 'c1', name: 'Aluguel', hidden: false }] }]),
    listPayees: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Padaria São João' }]),
    getTransactions: vi.fn().mockResolvedValue([{ id: 't1', account: 'a1', date: '2026-08-01', amount: -1500, notes: 'Café da manhã' }]),
    getTransaction: vi.fn().mockResolvedValue({ id: 't1', account: 'a1', date: '2026-08-01', amount: -1500 }),
    searchTransactions: vi.fn().mockResolvedValue({
      transactions: [{ id: 't1', account: 'a1', date: '2026-08-01', amount: -1500 }],
      page: { limit: 100, offset: 0, returned: 1 }, splitMode: 'inline'
    }),
    previewImport: vi.fn().mockResolvedValue({
      requestFingerprint: `v1:${'a'.repeat(64)}`, wouldAddCount: 1, wouldUpdateCount: 0, ignoredCount: 0,
      errorCount: 0, previewOnlyIds: ['preview-t1'], existingTransactionIds: [], errors: [], evidence: []
    }),
    bulkUpdateTransactions: vi.fn().mockResolvedValue({
      dryRun: true, executed: false, synchronized: false, verified: false, executable: true,
      counts: { requested: 1, matched: 1, wouldUpdate: 1, unchanged: 0, blocked: 0 },
      items: [{
        transactionId: 't1', status: 'would_update', changedFields: ['notes'],
        before: { id: 't1', account: 'a1', date: '2026-08-01', amount: -1500, notes: null },
        after: { id: 't1', account: 'a1', date: '2026-08-01', amount: -1500, notes: 'reviewed' }
      }],
      updatedIds: [], unchangedIds: [], affectedIds: []
    }),
    importTransactions: vi.fn().mockResolvedValue({ added: ['t1'], updated: [], errors: [] }),
    updateTransaction: vi.fn().mockResolvedValue({ success: true, transactionId: 't1' }),
    deleteTransaction: vi.fn().mockResolvedValue({ success: true, transactionId: 't1' }),
    createAccount: vi.fn().mockResolvedValue({ success: true, changed: true, account: { id: 'a2', name: 'Savings', offbudget: false, closed: false } }),
    updateAccount: vi.fn().mockResolvedValue({ success: true, changed: true, account: { id: 'a1', name: 'Checking', offbudget: false, closed: false } }),
    closeAccount: vi.fn().mockResolvedValue({ success: true, changed: true, account: { id: 'a1', name: 'Conta Corrente', offbudget: false, closed: true } }),
    reopenAccount: vi.fn().mockResolvedValue({ success: true, changed: true, account: { id: 'a1', name: 'Conta Corrente', offbudget: false, closed: false } }),
    deleteAccount: vi.fn().mockResolvedValue({ success: true, deletedAccountId: 'a2', deletedAccountName: 'Savings', relatedTransactionCount: 0 }),
    createCategoryGroup: vi.fn().mockResolvedValue({ success: true, changed: true, categoryGroup: { id: 'g2', name: 'Travel', isIncome: false, hidden: false } }),
    updateCategoryGroup: vi.fn().mockResolvedValue({ success: true, changed: true, categoryGroup: { id: 'g1', name: 'Housing', isIncome: false, hidden: false } }),
    deleteCategoryGroup: vi.fn().mockResolvedValue({ success: true, deletedCategoryGroupId: 'g2', deletedCategoryGroupName: 'Travel', relatedCategoryCount: 0 }),
    createCategory: vi.fn().mockResolvedValue({ success: true, changed: true, category: { id: 'c2', name: 'Flights', groupId: 'g2', isIncome: false, hidden: false } }),
    updateCategory: vi.fn().mockResolvedValue({ success: true, changed: true, category: { id: 'c1', name: 'Rent', groupId: 'g1', isIncome: false, hidden: false } }),
    moveCategory: vi.fn().mockResolvedValue({ success: true, changed: true, category: { id: 'c1', name: 'Rent', groupId: 'g2', isIncome: false, hidden: false } }),
    hideCategory: vi.fn().mockResolvedValue({ success: true, changed: true, category: { id: 'c1', name: 'Rent', groupId: 'g1', isIncome: false, hidden: true } }),
    unhideCategory: vi.fn().mockResolvedValue({ success: true, changed: true, category: { id: 'c1', name: 'Rent', groupId: 'g1', isIncome: false, hidden: false } }),
    deleteCategory: vi.fn().mockResolvedValue({ success: true, deletedCategoryId: 'c2', deletedCategoryName: 'Flights', relatedTransactionCount: 0, relatedBudgetMonthCount: 0, relatedCarryoverMonthCount: 0 }),
    getPayee: vi.fn().mockResolvedValue({ id: 'p1', name: 'Bakery' }),
    createPayee: vi.fn().mockResolvedValue({ success: true, changed: true, payee: { id: 'p2', name: 'Cafe' } }),
    updatePayee: vi.fn().mockResolvedValue({ success: true, changed: true, payee: { id: 'p1', name: 'Bakery' } }),
    deletePayee: vi.fn().mockResolvedValue({ success: true, deletedPayeeId: 'p2', deletedPayeeName: 'Cafe', relatedTransactionCount: 0, relatedRuleCount: 0 }),
    mergePayees: vi.fn().mockResolvedValue({ success: true, targetPayee: { id: 'p1', name: 'Bakery' }, mergedSourcePayeeIds: ['p2'], impacts: [{ payeeId: 'p2', payeeName: 'Cafe', relatedTransactionCount: 0, relatedRuleCount: 0 }] }),
    listRules: vi.fn().mockResolvedValue([{ id: 'r1', stage: 'default', conditionsOp: 'and', conditions: [{ field: 'imported_payee', op: 'contains', value: 'bakery' }], actions: [{ op: 'set', field: 'payee', value: 'p1' }], writable: true }]),
    getRule: vi.fn().mockResolvedValue({ id: 'r1', stage: 'default', conditionsOp: 'and', conditions: [{ field: 'imported_payee', op: 'contains', value: 'bakery' }], actions: [{ op: 'set', field: 'payee', value: 'p1' }], writable: true }),
    createRule: vi.fn().mockResolvedValue({ success: true, changed: true, rule: { id: 'r2', stage: 'default', conditionsOp: 'and', conditions: [{ field: 'imported_payee', op: 'contains', value: 'cafe' }], actions: [{ op: 'set', field: 'payee', value: 'p2' }], writable: true } }),
    updateRule: vi.fn().mockResolvedValue({ success: true, changed: true, rule: { id: 'r1', stage: 'post', conditionsOp: 'and', conditions: [{ field: 'imported_payee', op: 'contains', value: 'bakery' }], actions: [{ op: 'set', field: 'payee', value: 'p1' }], writable: true } }),
    deleteRule: vi.fn().mockResolvedValue({ success: true, deletedRuleId: 'r2' }),
    listBudgetMonths: vi.fn().mockResolvedValue({ months: ['2026-08', '2026-09'], count: 2 }),
    getBudgetMonth: vi.fn().mockResolvedValue(budgetMonthFixture),
    getBudgetSummary: vi.fn().mockResolvedValue({
      month: '2026-08', incomeAvailable: 20000, lastMonthOverspent: -500, forNextMonth: 0,
      totalBudgeted: 10000, toBudget: 9500, fromLastMonth: 0, totalIncome: 20000,
      totalSpent: -9000, totalBalance: 1000, categoryGroups: budgetMonthFixture.categoryGroups,
      categoryCount: 1, omittedCategoryCount: 0
    }),
    setBudgetAmount: vi.fn().mockResolvedValue({
      success: true, changed: true, month: '2026-08', categoryId: 'c1', previousAmount: 10000, currentAmount: 12000,
      category: { ...budgetCategoryFixture, budgeted: 12000 }
    }),
    setBudgetCarryover: vi.fn().mockResolvedValue({
      success: true, changed: true, month: '2026-08', categoryId: 'c1', previousCarryover: false, currentCarryover: true,
      effectiveFromMonth: '2026-08', verifiedThroughMonth: '2026-09', category: { ...budgetCategoryFixture, carryover: true }
    }),
    holdBudgetForNextMonth: vi.fn().mockResolvedValue({
      success: true, changed: true, month: '2026-08', requestedAmount: 1000, officialApplied: true,
      previousForNextMonth: 0, currentForNextMonth: 1000
    }),
    resetBudgetHold: vi.fn().mockResolvedValue({
      success: true, changed: true, month: '2026-08', previousForNextMonth: 1000, currentForNextMonth: 0
    }),
    copyBudgetMonth: vi.fn().mockResolvedValue({
      success: true, changed: true, dryRun: true, executed: false, synchronized: false, verified: true,
      sourceMonth: '2026-08', targetMonth: '2026-09', mode: 'fill-empty', includeCarryover: false, includeHidden: false,
      prospectiveCarryover: false,
      counts: { total: 1, changes: 1, set: 1, overwrite: 0, skip: 0, hiddenSkip: 0, incompatibleSkip: 0, unchanged: 0 },
      differences: [{ categoryId: 'c1', categoryName: 'Rent', groupId: 'g1', hidden: false, action: 'set', sourceBudgeted: 10000, targetBudgeted: 0, amountChange: true, carryoverChange: false }],
      omittedDifferenceCount: 0, attemptedCategoryIds: [], completedCategoryIds: []
    })
  };
}

describe('MCP server contract', () => {
  let client: Client;
  let server: ReturnType<typeof createMcpServer>;
  let runtime: ToolRuntime;

  beforeEach(async () => {
    runtime = fakeRuntime();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createMcpServer(runtime, createLogger([], () => undefined));
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it('registers exactly forty-six tools while preserving all forty-two v0.4.0 tools with accurate annotations', async () => {
    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
    expect(tools).toHaveLength(46);
    expect(V040_TOOL_NAMES).toHaveLength(42);
    expect(V040_TOOL_NAMES.every(name => tools.some(tool => tool.name === name))).toBe(true);
    for (const tool of tools) {
      expect(tool.title).toMatch(/^[\x20-\x7E]+$/);
      expect(tool.description).toMatch(/^[\x20-\x7E]+$/);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.outputSchema?.type).toBe('object');
      expect(tool.inputSchema.description).toEqual(expect.any(String));
      expect(tool.outputSchema?.description).toEqual(expect.any(String));
    }
    expect(tools.find(tool => tool.name === 'actual_list_accounts')?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find(tool => tool.name === 'actual_sync')?.annotations).toMatchObject({ destructiveHint: false, idempotentHint: true });
    expect(tools.find(tool => tool.name === 'actual_delete_transaction')?.annotations?.destructiveHint).toBe(true);
    expect(tools.find(tool => tool.name === 'actual_delete_transaction')?.description).toContain('DESTRUCTIVE OPERATION');
    for (const name of ['actual_delete_account', 'actual_delete_category_group', 'actual_delete_category']) {
      expect(tools.find(tool => tool.name === name)?.annotations).toMatchObject({ destructiveHint: true, idempotentHint: false });
      expect(tools.find(tool => tool.name === name)?.description).toContain('DESTRUCTIVE OPERATION');
    }
    expect(tools.find(tool => tool.name === 'actual_create_payee')?.annotations).toMatchObject({ destructiveHint: false, idempotentHint: true });
    expect(tools.find(tool => tool.name === 'actual_create_rule')?.annotations).toMatchObject({ destructiveHint: false, idempotentHint: false });
    for (const name of ['actual_delete_payee', 'actual_merge_payees', 'actual_delete_rule']) {
      expect(tools.find(tool => tool.name === name)?.annotations).toMatchObject({ destructiveHint: true, idempotentHint: false });
    }
    for (const name of ['actual_list_budget_months', 'actual_get_budget_month', 'actual_get_budget_summary']) {
      expect(tools.find(tool => tool.name === name)?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
    }
    expect(tools.find(tool => tool.name === 'actual_hold_budget_for_next_month')?.annotations).toMatchObject({
      readOnlyHint: false, destructiveHint: false, idempotentHint: false
    });
    expect(tools.find(tool => tool.name === 'actual_copy_budget_month')?.annotations).toMatchObject({
      readOnlyHint: false, destructiveHint: true, idempotentHint: true
    });
    for (const name of ['actual_get_transaction', 'actual_search_transactions', 'actual_preview_import']) {
      expect(tools.find(tool => tool.name === name)?.annotations).toMatchObject({
        readOnlyHint: true, destructiveHint: false, idempotentHint: true
      });
    }
    expect(tools.find(tool => tool.name === 'actual_bulk_update_transactions')?.annotations).toMatchObject({
      readOnlyHint: false, destructiveHint: false, idempotentHint: true
    });
    expect(tools.find(tool => tool.name === 'actual_bulk_update_transactions')?.description).toContain('dry-run mode by default');
    expect(tools.some(tool => ['actual_run_rules', 'actual_preview_rule'].includes(tool.name))).toBe(false);
    expect(tools.some(tool => /reorder|account_group|actualql|raw_query|run_query|generic_crud|search_by_|bulk_update_(?:category|payee|notes|cleared)/i.test(tool.name))).toBe(false);
  });

  it('returns matching JSON text and structured content while preserving user data verbatim', async () => {
    const result = await client.callTool({ name: 'actual_list_accounts', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ accounts: [{ id: 'a1', name: 'Conta Corrente', offbudget: false, closed: false, balance: 1234 }] });
    expect(JSON.parse(result.content[0] && result.content[0].type === 'text' ? result.content[0].text : '')).toEqual(result.structuredContent);
  });

  it('executes every handler successfully with structured and JSON text results', async () => {
    const calls = [
      { name: 'actual_health', arguments: {} },
      { name: 'actual_sync', arguments: {} },
      { name: 'actual_list_accounts', arguments: {} },
      { name: 'actual_get_account', arguments: { accountId: 'a1' } },
      { name: 'actual_list_categories', arguments: {} },
      { name: 'actual_list_payees', arguments: {} },
      { name: 'actual_get_transactions', arguments: { accountId: 'a1', startDate: '2026-08-01', endDate: '2026-08-31' } },
      { name: 'actual_get_transaction', arguments: { transactionId: 't1' } },
      { name: 'actual_search_transactions', arguments: { startDate: '2026-08-01', endDate: '2026-08-31' } },
      { name: 'actual_preview_import', arguments: { accountId: 'a1', transactions: [{ date: '2026-08-29', amount: -1299, imported_id: 'provider:preview' }] } },
      { name: 'actual_bulk_update_transactions', arguments: { items: [{ transactionId: 't1', fields: { notes: 'reviewed' } }] } },
      { name: 'actual_import_transactions', arguments: { accountId: 'a1', transactions: [{ date: '2026-08-29', amount: -1299, imported_id: 'provider:1' }] } },
      { name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: { notes: 'Explicit note' } } },
      { name: 'actual_delete_transaction', arguments: { transactionId: 't1', confirmDestructive: true } },
      { name: 'actual_create_account', arguments: { name: 'Savings', initialBalance: -12030 } },
      { name: 'actual_update_account', arguments: { accountId: 'a1', name: 'Checking' } },
      { name: 'actual_close_account', arguments: { accountId: 'a1' } },
      { name: 'actual_reopen_account', arguments: { accountId: 'a1' } },
      { name: 'actual_delete_account', arguments: { accountId: 'a2', confirmDestructive: true } },
      { name: 'actual_create_category_group', arguments: { name: 'Travel' } },
      { name: 'actual_update_category_group', arguments: { groupId: 'g1', name: 'Housing' } },
      { name: 'actual_delete_category_group', arguments: { groupId: 'g2', confirmDestructive: true } },
      { name: 'actual_create_category', arguments: { name: 'Flights', groupId: 'g2' } },
      { name: 'actual_update_category', arguments: { categoryId: 'c1', name: 'Rent' } },
      { name: 'actual_move_category', arguments: { categoryId: 'c1', targetGroupId: 'g2' } },
      { name: 'actual_hide_category', arguments: { categoryId: 'c1' } },
      { name: 'actual_unhide_category', arguments: { categoryId: 'c1' } },
      { name: 'actual_delete_category', arguments: { categoryId: 'c2', confirmDestructive: true } },
      { name: 'actual_get_payee', arguments: { payeeId: 'p1' } },
      { name: 'actual_create_payee', arguments: { name: 'Cafe' } },
      { name: 'actual_update_payee', arguments: { payeeId: 'p1', name: 'Bakery' } },
      { name: 'actual_delete_payee', arguments: { payeeId: 'p2', confirmDestructive: true } },
      { name: 'actual_merge_payees', arguments: { sourcePayeeIds: ['p2'], targetPayeeId: 'p1', confirmDestructive: true } },
      { name: 'actual_list_rules', arguments: {} },
      { name: 'actual_get_rule', arguments: { ruleId: 'r1' } },
      { name: 'actual_create_rule', arguments: { stage: 'default', conditionsOp: 'and', conditions: [{ field: 'imported_payee', op: 'contains', value: 'cafe' }], actions: [{ op: 'set', field: 'payee', value: 'p2' }] } },
      { name: 'actual_update_rule', arguments: { ruleId: 'r1', stage: 'post' } },
      { name: 'actual_delete_rule', arguments: { ruleId: 'r2', confirmDestructive: true } },
      { name: 'actual_list_budget_months', arguments: {} },
      { name: 'actual_get_budget_month', arguments: { month: '2026-08' } },
      { name: 'actual_get_budget_summary', arguments: { month: '2026-08' } },
      { name: 'actual_set_budget_amount', arguments: { month: '2026-08', categoryId: 'c1', amount: 12000 } },
      { name: 'actual_set_budget_carryover', arguments: { month: '2026-08', categoryId: 'c1', carryover: true } },
      { name: 'actual_hold_budget_for_next_month', arguments: { month: '2026-08', amount: 1000 } },
      { name: 'actual_reset_budget_hold', arguments: { month: '2026-08' } },
      { name: 'actual_copy_budget_month', arguments: { sourceMonth: '2026-08', targetMonth: '2026-09' } }
    ];
    for (const call of calls) {
      const result = await client.callTool(call);
      expect(result.isError, call.name).not.toBe(true);
      expect(result.structuredContent, call.name).toBeDefined();
      expect(JSON.parse(result.content[0] && result.content[0].type === 'text' ? result.content[0].text : ''), call.name)
        .toEqual(result.structuredContent);
    }
  });

  it('preserves the v0.1.0 category-list shape exactly', async () => {
    const result = await client.callTool({ name: 'actual_list_categories', arguments: {} });
    expect(result.structuredContent).toEqual({
      categoryGroups: [{ groupId: 'g1', groupName: 'Moradia', categories: [{ id: 'c1', name: 'Aluguel', hidden: false }] }]
    });
    expect(Object.keys((result.structuredContent as { categoryGroups: Array<Record<string, unknown>> }).categoryGroups[0]!)).toEqual([
      'groupId', 'groupName', 'categories'
    ]);
  });

  it('preserves the v0.2.0 payee-list item shape exactly', async () => {
    const result = await client.callTool({ name: 'actual_list_payees', arguments: {} });
    expect(result.structuredContent).toEqual({ payees: [{ id: 'p1', name: 'Padaria São João' }] });
    expect(Object.keys((result.structuredContent as { payees: Array<Record<string, unknown>> }).payees[0]!)).toEqual(['id', 'name']);
  });

  it('rejects every structural delete without literal confirmation before runtime execution', async () => {
    vi.mocked(runtime.deletePayee).mockRejectedValue(new PublicError('DESTRUCTIVE_CONFIRMATION_REQUIRED', 'Confirmation required.', 'actual_delete_payee', false));
    vi.mocked(runtime.mergePayees).mockRejectedValue(new PublicError('DESTRUCTIVE_CONFIRMATION_REQUIRED', 'Confirmation required.', 'actual_merge_payees', false));
    vi.mocked(runtime.deleteRule).mockRejectedValue(new PublicError('DESTRUCTIVE_CONFIRMATION_REQUIRED', 'Confirmation required.', 'actual_delete_rule', false));
    const calls = [
      ['actual_delete_account', { accountId: 'a2' }],
      ['actual_delete_category_group', { groupId: 'g2' }],
      ['actual_delete_category', { categoryId: 'c2' }],
      ['actual_delete_payee', { payeeId: 'p2' }],
      ['actual_merge_payees', { sourcePayeeIds: ['p2'], targetPayeeId: 'p1' }],
      ['actual_delete_rule', { ruleId: 'r2' }]
    ] as const;
    for (const [name, args] of calls) {
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError, name).toBe(true);
      expect(result.structuredContent, name).toBeDefined();
    }
    expect(runtime.deleteAccount).not.toHaveBeenCalled();
    expect(runtime.deleteCategoryGroup).not.toHaveBeenCalled();
    expect(runtime.deleteCategory).not.toHaveBeenCalled();
    expect(runtime.deletePayee).toHaveBeenCalledWith('p2', false);
    expect(runtime.mergePayees).toHaveBeenCalledWith(['p2'], 'p1', false);
    expect(runtime.deleteRule).toHaveBeenCalledWith('r2', false);

    for (const [name, args] of [
      ['actual_delete_payee', { payeeId: 'p2', confirmDestructive: false }],
      ['actual_merge_payees', { sourcePayeeIds: ['p2'], targetPayeeId: 'p1', confirmDestructive: false }],
      ['actual_delete_rule', { ruleId: 'r2', confirmDestructive: false }]
    ] as const) {
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError, name).toBe(true);
      expect(result.structuredContent, name).toMatchObject({ error: { code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED' } });
    }
  });

  it('rejects malformed rule calls and unavailable run or preview tools, then continues operating', async () => {
    const malformed = await client.callTool({ name: 'actual_create_rule', arguments: {
      stage: 'default', conditionsOp: 'and',
      conditions: [{ field: 'amount', op: 'contains', value: 100 }],
      actions: [{ op: 'delete-transaction', value: '' }]
    } });
    const emptyUpdate = await client.callTool({ name: 'actual_update_rule', arguments: { ruleId: 'r1' } });
    expect([malformed, emptyUpdate].every(result => result.isError === true)).toBe(true);
    await expect(client.callTool({ name: 'actual_run_rules', arguments: {} })).rejects.toThrow('not found');
    await expect(client.callTool({ name: 'actual_preview_rule', arguments: {} })).rejects.toThrow('not found');
    expect(runtime.createRule).not.toHaveBeenCalled();
    expect(runtime.updateRule).not.toHaveBeenCalled();
    const healthy = await client.callTool({ name: 'actual_list_rules', arguments: {} });
    expect(healthy.isError).not.toBe(true);
  });

  it('rejects invalid dates, unknown fields, fractional amounts, oversized batches, and unconfirmed deletion before runtime calls', async () => {
    const invalidDate = await client.callTool({ name: 'actual_get_transactions', arguments: { accountId: 'a', startDate: '2026-02-30', endDate: '2026-03-01' } });
    const unknown = await client.callTool({ name: 'actual_get_account', arguments: { accountId: 'a', extra: true } });
    const fractional = await client.callTool({ name: 'actual_import_transactions', arguments: {
      accountId: 'a', transactions: [{ date: '2026-01-01', amount: 1.2, imported_id: 'id' }]
    } });
    const tooMany = await client.callTool({ name: 'actual_import_transactions', arguments: {
      accountId: 'a', transactions: Array.from({ length: 501 }, (_, index) => ({ date: '2026-01-01', amount: index, imported_id: String(index) }))
    } });
    const deletion = await client.callTool({ name: 'actual_delete_transaction', arguments: { transactionId: 't1', confirmDestructive: false } });
    expect([invalidDate, unknown, fractional, tooMany, deletion].every(result => result.isError === true)).toBe(true);
    expect(runtime.getTransactions).not.toHaveBeenCalled();
    expect(runtime.getAccount).not.toHaveBeenCalled();
    expect(runtime.importTransactions).not.toHaveBeenCalled();
    expect(runtime.deleteTransaction).not.toHaveBeenCalled();
  });

  it('enforces strict budget schemas and returns safe partial-copy verification metadata', async () => {
    const invalidCalls = [
      ['actual_get_budget_month', { month: '2026-9' }],
      ['actual_set_budget_amount', { month: '2026-09', categoryId: 'c1', amount: 1.5 }],
      ['actual_hold_budget_for_next_month', { month: '2026-09', amount: 0 }],
      ['actual_copy_budget_month', { sourceMonth: '2026-08', targetMonth: '2026-09', unknown: true }],
      ['actual_copy_budget_month', { sourceMonth: '2026-08', targetMonth: '2026-08' }]
    ] as const;
    for (const [name, args] of invalidCalls) expect((await client.callTool({ name, arguments: args })).isError, name).toBe(true);
    expect(runtime.getBudgetMonth).not.toHaveBeenCalled();
    expect(runtime.setBudgetAmount).not.toHaveBeenCalled();
    expect(runtime.holdBudgetForNextMonth).not.toHaveBeenCalled();
    expect(runtime.copyBudgetMonth).not.toHaveBeenCalled();

    vi.mocked(runtime.copyBudgetMonth).mockRejectedValue(new PublicError(
      'BUDGET_COPY_PARTIAL_STATE', 'Copy synchronized but was not verified.', 'actual_copy_budget_month', false,
      {
        recoveryAction: 'actual_sync', state: 'synchronized_but_unverified', partialState: true,
        entity: { type: 'budgetMonth', id: '2026-09' },
        details: { attemptedCategoryIds: ['c1', 'c2'], completedCategoryIds: ['c1'], failedCategoryId: 'c2' }
      }
    ));
    const partial = await client.callTool({ name: 'actual_copy_budget_month', arguments: {
      sourceMonth: '2026-08', targetMonth: '2026-09', dryRun: false
    } });
    expect(partial.isError).toBe(true);
    expect(partial.structuredContent).toMatchObject({ error: {
      code: 'BUDGET_COPY_PARTIAL_STATE', state: 'synchronized_but_unverified', partialState: true,
      details: { attemptedCategoryIds: ['c1', 'c2'], completedCategoryIds: ['c1'], failedCategoryId: 'c2' }
    } });
  });

  it('passes only allowlisted update fields and requires at least one field', async () => {
    const empty = await client.callTool({ name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: {} } });
    const unknown = await client.callTool({ name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: { account: 'other' } } });
    const valid = await client.callTool({ name: 'actual_update_transaction', arguments: { transactionId: 't1', fields: { notes: 'Explicit note', amount: -100 } } });
    expect(empty.isError).toBe(true);
    expect(unknown.isError).toBe(true);
    expect(valid.isError).not.toBe(true);
    expect(runtime.updateTransaction).toHaveBeenCalledWith('t1', { notes: 'Explicit note', amount: -100 });
  });

  it('sanitizes unexpected tool failures and never exposes a credential sentinel', async () => {
    const sentinel = 'SENTINEL-PASSWORD-DO-NOT-LEAK';
    vi.mocked(runtime.sync).mockRejectedValue(new Error(`upstream password=${sentinel}`));
    const result = await client.callTool({ name: 'actual_sync', arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain(sentinel);
    expect(result.structuredContent).toMatchObject({ error: { code: 'INTERNAL_ERROR', operation: 'actual_sync' } });
  });
});
