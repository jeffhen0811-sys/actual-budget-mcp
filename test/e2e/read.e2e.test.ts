import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TOOL_NAMES } from '../../src/mcp/server.js';
import {
  accountsOutputSchema,
  budgetMonthOutputSchema,
  budgetSummaryOutputSchema,
  categoriesOutputSchema,
  healthOutputSchema,
  listBudgetMonthsOutputSchema,
  payeeOutputSchema,
  payeesOutputSchema,
  ruleOutputSchema,
  rulesOutputSchema,
  searchTransactionsOutputSchema,
  transactionOutputSchema,
  transactionsOutputSchema
} from '../../src/mcp/contracts.js';
import { assertNoConfiguredSecrets, callTool, callToolExpectingError, type RunningMcp, startMcp } from './harness.js';
import { CARD_TEST_ACCOUNT_NAME, loadRealTestEnvironment, REQUIRED_TEST_ACCOUNT_NAME, skipMessage } from '../real/env.js';

const environment = await loadRealTestEnvironment();
if (!environment.configured) console.warn(skipMessage(environment, 'MCP stdio E2E read suite'));
const realDescribe = environment.configured ? describe : describe.skip;

realDescribe.sequential('real MCP stdio read E2E', () => {
  let running: RunningMcp;

  beforeAll(async () => {
    running = await startMcp('.actual-e2e-data/read');
  });

  afterAll(async () => {
    await running?.close();
  });

  it('discovers exactly 46 v0.5.0 tools with strict schemas and compatible annotations through stdio', async () => {
    const { tools } = await running.client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
    expect(tools).toHaveLength(46);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.outputSchema?.type).toBe('object');
      expect(tool.description).toEqual(expect.any(String));
    }
    for (const name of ['actual_delete_account', 'actual_delete_category_group', 'actual_delete_category', 'actual_delete_payee', 'actual_merge_payees', 'actual_delete_rule']) {
      const tool = tools.find(candidate => candidate.name === name);
      expect(tool?.description).toContain('DESTRUCTIVE OPERATION');
      expect(tool?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: false });
      expect(tool?.inputSchema.required).toContain('confirmDestructive');
    }
    expect(tools.some(tool => ['actual_run_rules', 'actual_preview_rule'].includes(tool.name))).toBe(false);
    expect(tools.find(tool => tool.name === 'actual_copy_budget_month')?.annotations).toMatchObject({ destructiveHint: true, idempotentHint: true });
    for (const name of ['actual_get_transaction', 'actual_search_transactions', 'actual_preview_import']) {
      expect(tools.find(tool => tool.name === name)?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
    }
    expect(tools.find(tool => tool.name === 'actual_bulk_update_transactions')?.annotations).toMatchObject({
      readOnlyHint: false, destructiveHint: false, idempotentHint: true
    });
  });

  it('returns structured entity-preserving errors for all missing structural confirmations and stays operational', async () => {
    const calls = [
      ['actual_delete_account', { accountId: 'missing-confirmation-account' }, 'account'],
      ['actual_delete_category_group', { groupId: 'missing-confirmation-group' }, 'categoryGroup'],
      ['actual_delete_category', { categoryId: 'missing-confirmation-category' }, 'category']
    ] as const;
    for (const [name, args, entityType] of calls) {
      const result = await callToolExpectingError(running, name, args);
      expect(result.structuredContent).toMatchObject({
        error: { code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED', retryable: false, entity: { type: entityType } }
      });
      assertNoConfiguredSecrets(result);
    }
    expect((await running.client.listTools()).tools).toHaveLength(46);
  });

  it('calls health, accounts, categories, and payees with matching structured and JSON content', async () => {
    expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
    const accounts = await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema);
    expect(accounts.accounts.map(account => account.name)).toEqual(expect.arrayContaining([
      REQUIRED_TEST_ACCOUNT_NAME,
      CARD_TEST_ACCOUNT_NAME
    ]));
    expect((await callTool(running, 'actual_list_categories', {}, categoriesOutputSchema)).categoryGroups.length).toBeGreaterThan(0);
    const payees = await callTool(running, 'actual_list_payees', {}, payeesOutputSchema);
    expect(payees.payees.map(payee => payee.name)).toEqual(expect.arrayContaining(['Empresa Teste', 'Netflix Teste']));
  });

  it('reads official budget discovery, month detail, and bounded summaries through compiled stdio', async () => {
    const listed = await callTool(running, 'actual_list_budget_months', {}, listBudgetMonthsOutputSchema);
    expect(listed.count).toBe(listed.months.length);
    const month = listed.months.at(-1)!;
    const detail = await callTool(running, 'actual_get_budget_month', { month }, budgetMonthOutputSchema);
    expect(detail.month).toBe(month);
    const summary = await callTool(running, 'actual_get_budget_summary', { month, limit: 500 }, budgetSummaryOutputSchema);
    expect(summary.month).toBe(month);
    expect(summary.totalSpent).toBe(detail.totalSpent);
  });

  it('reads individual payees and the complete ranked rule surface through compiled stdio', async () => {
    const payees = (await callTool(running, 'actual_list_payees', {}, payeesOutputSchema)).payees;
    const detailed = [];
    for (const payee of payees) detailed.push((await callTool(running, 'actual_get_payee', { payeeId: payee.id }, payeeOutputSchema)).payee);
    expect(detailed.some(payee => typeof payee.transferAccountId === 'string')).toBe(true);
    const rules = (await callTool(running, 'actual_list_rules', {}, rulesOutputSchema)).rules;
    for (const rule of rules) {
      expect((await callTool(running, 'actual_get_rule', { ruleId: rule.id }, ruleOutputSchema)).rule).toEqual(rule);
    }
    const stageOrder = rules.map(rule => ({ pre: 0, default: 1, post: 2 })[rule.stage]);
    expect(stageOrder).toEqual([...stageOrder].sort((left, right) => left - right));
  });

  it('returns both accounts real transactions without nullable-output failures', async () => {
    const { accounts } = await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema);
    const payees = (await callTool(running, 'actual_list_payees', {}, payeesOutputSchema)).payees;
    const names = new Map(payees.map(payee => [payee.id, payee.name]));
    for (const accountName of [REQUIRED_TEST_ACCOUNT_NAME, CARD_TEST_ACCOUNT_NAME]) {
      const account = accounts.find(item => item.name === accountName);
      expect(account).toBeDefined();
      const { transactions } = await callTool(running, 'actual_get_transactions', {
        accountId: account!.id,
        startDate: '2026-08-01',
        endDate: '2026-08-31'
      }, transactionsOutputSchema);
      expect(transactions.length).toBeGreaterThan(0);
      if (accountName === REQUIRED_TEST_ACCOUNT_NAME) {
        expect(transactions.some(transaction => transaction.imported_id === null)).toBe(true);
        expect(transactions.some(transaction => transaction.notes === null)).toBe(true);
        expect(transactions.map(transaction => transaction.payee ? names.get(transaction.payee) : undefined))
          .toEqual(expect.arrayContaining(['Empresa Teste', 'Supermercado Teste', 'Companhia de Energia Teste', 'Posto Teste']));
      } else {
        expect(transactions.map(transaction => transaction.payee ? names.get(transaction.payee) : undefined))
          .toEqual(expect.arrayContaining(['Netflix Teste', 'Restaurante Teste', 'Loja Online Teste']));
      }
    }
  });

  it('executes exact lookup and advanced search filters, ordering, pagination, totals, and split modes through compiled stdio', async () => {
    const { accounts } = await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema);
    const account = accounts.find(item => item.name === REQUIRED_TEST_ACCOUNT_NAME)!;
    const known = (await callTool(running, 'actual_get_transactions', {
      accountId: account.id, startDate: '2026-08-01', endDate: '2026-08-31'
    }, transactionsOutputSchema)).transactions;
    const transaction = known.find(item => item.notes === 'Compra fake') ?? known[0]!;
    const exact = await callTool(running, 'actual_get_transaction', { transactionId: transaction.id }, transactionOutputSchema);
    expect(exact.transaction.id).toBe(transaction.id);
    for (const args of [
      { transactionIds: [transaction.id] },
      { accountIds: [account.id] },
      ...(transaction.payee ? [{ payeeIds: [transaction.payee] }] : []),
      ...(transaction.category ? [{ categoryIds: [transaction.category] }] : []),
      { importSource: 'manual' },
      { importSource: 'imported' },
      ...(transaction.cleared === undefined ? [] : [{ cleared: transaction.cleared }]),
      { minAmount: transaction.amount, maxAmount: transaction.amount },
      { text: transaction.notes ?? 'Compra fake' },
      { uncategorizedOnly: true },
      { splitMode: 'grouped', includeTotals: true }
    ]) {
      const result = await callTool(running, 'actual_search_transactions', {
        startDate: '2026-08-01', endDate: '2026-08-31', limit: 100, offset: 0, ...args
      }, searchTransactionsOutputSchema);
      expect(result.page.returned).toBe(result.transactions.length);
    }
    for (const sort of ['date_desc', 'date_asc', 'amount_desc', 'amount_asc', 'payee_asc', 'payee_desc', 'category_asc', 'category_desc']) {
      const args = { startDate: '2026-08-01', endDate: '2026-08-31', sort, limit: 2, offset: 0, includeTotals: true };
      const first = await callTool(running, 'actual_search_transactions', args, searchTransactionsOutputSchema);
      const second = await callTool(running, 'actual_search_transactions', args, searchTransactionsOutputSchema);
      expect(first.transactions.map(item => item.id)).toEqual(second.transactions.map(item => item.id));
    }
  });

  it('returns structured errors for invalid input, remains alive, and never leaks credentials', async () => {
    const cases = [
      ['actual_get_account', { accountId: 'missing-account-id' }],
      ['actual_get_payee', { payeeId: 'missing-payee-id' }],
      ['actual_get_rule', { ruleId: 'missing-rule-id' }],
      ['actual_get_transactions', { accountId: 'invalid', startDate: '2026-02-30', endDate: '2026-03-01' }],
      ['actual_get_transactions', { accountId: 'invalid', startDate: '2024-01-01', endDate: '2025-01-01' }],
      ['actual_get_transaction', { transactionId: 'missing-transaction-id' }],
      ['actual_search_transactions', { startDate: '2026-02-30', endDate: '2026-03-01' }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', minAmount: 2, maxAmount: 1 }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', limit: 251 }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', offset: 10001 }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', splitMode: 'all' }],
      ['actual_preview_import', { accountId: 'a', transactions: [{ date: '2026-01-01', amount: 1, imported_id: 'x' }], dryRun: false }],
      ['actual_bulk_update_transactions', { items: [] }],
      ['actual_delete_transaction', { transactionId: 'missing-transaction-id', confirmDestructive: false }]
    ] as const;
    for (const [name, args] of cases) {
      const error = await callToolExpectingError(running, name, args);
      assertNoConfiguredSecrets(error);
      expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
    }
    expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
    assertNoConfiguredSecrets(running.stderr());
  });
});
