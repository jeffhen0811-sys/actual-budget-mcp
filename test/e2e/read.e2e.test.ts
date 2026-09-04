import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TOOL_NAMES } from '../../src/mcp/server.js';
import {
  accountsOutputSchema,
  accountReconciliationOutputSchema,
  budgetMonthOutputSchema,
  budgetSummaryOutputSchema,
  categoriesOutputSchema,
  healthOutputSchema,
  incomeSummaryOutputSchema,
  listSchedulesOutputSchema,
  findPossibleDuplicatesOutputSchema,
  findPossibleTransfersOutputSchema,
  getTransferOutputSchema,
  listBudgetMonthsOutputSchema,
  payeeOutputSchema,
  payeesOutputSchema,
  ruleOutputSchema,
  rulesOutputSchema,
  runtimeStatusOutputSchema,
  searchTransactionsOutputSchema,
  searchTransfersOutputSchema,
  spendingSummaryOutputSchema,
  monthSummaryOutputSchema,
  transactionOutputSchema,
  transactionsOutputSchema,
  transferPayeesOutputSchema,
  syncOutputSchema
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

  it('discovers exactly 62 v0.7.0 tools with strict schemas and compatible v0.6.0 annotations through stdio', async () => {
    const { tools } = await running.client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
    expect(tools).toHaveLength(62);
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
    for (const name of [
      'actual_list_transfer_payees', 'actual_get_transfer', 'actual_search_transfers',
      'actual_find_possible_transfers', 'actual_find_possible_duplicates', 'actual_get_account_reconciliation'
    ]) expect(tools.find(tool => tool.name === name)?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
    expect(tools.find(tool => tool.name === 'actual_create_transfer')?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: false });
    for (const name of ['actual_list_schedules', 'actual_get_schedule', 'actual_get_month_summary', 'actual_get_spending_summary', 'actual_get_income_summary', 'actual_get_runtime_status']) {
      expect(tools.find(tool => tool.name === name)?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
    }
    expect(tools.find(tool => tool.name === 'actual_create_schedule')?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: false });
    expect(tools.find(tool => tool.name === 'actual_update_schedule')?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    expect(tools.find(tool => tool.name === 'actual_delete_schedule')?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: false });
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
    expect((await running.client.listTools()).tools).toHaveLength(62);
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

  it('reads schedules, ledger summaries, and sanitized runtime status through compiled stdio', async () => {
    const schedules = await callTool(running, 'actual_list_schedules', { limit: 250, offset: 0 }, listSchedulesOutputSchema);
    expect(schedules.page.returned).toBe(schedules.schedules.length);
    for (const schedule of schedules.schedules) {
      expect(schedule).not.toHaveProperty('ruleId');
      expect(schedule).not.toHaveProperty('conditions');
      expect(schedule).not.toHaveProperty('actions');
    }
    const month = await callTool(running, 'actual_get_month_summary', { month: '2026-08' }, monthSummaryOutputSchema);
    expect(month.ledger.netAmount).toBe(month.ledger.incomeAmount + month.ledger.expenseAmount);
    const range = { startDate: '2026-08-01', endDate: '2026-08-31' };
    const spending = await callTool(running, 'actual_get_spending_summary', range, spendingSummaryOutputSchema);
    const income = await callTool(running, 'actual_get_income_summary', range, incomeSummaryOutputSchema);
    expect(spending.source).toBe('fixed-actualql-ledger');
    expect(income.source).toBe('fixed-actualql-ledger');
    const status = await callTool(running, 'actual_get_runtime_status', {}, runtimeStatusOutputSchema);
    expect(status).toMatchObject({ mcpVersion: '0.7.0', sdkVersion: '26.8.1', connected: true, budgetLoaded: true });
    expect(JSON.stringify(status)).not.toContain(process.env.ACTUAL_SYNC_ID ?? '__missing__');
  });

  it('enforces read-only authorization before mutation handlers while reads remain available', async () => {
    const readOnly = await startMcp('.actual-e2e-data/read-only', {
      ACTUAL_MCP_READ_ONLY: 'true', ACTUAL_MCP_ALLOW_DESTRUCTIVE: 'false'
    });
    try {
      expect((await callTool(readOnly, 'actual_list_accounts', {}, accountsOutputSchema)).accounts.length).toBeGreaterThan(0);
      for (const [name, args] of [
        ['actual_sync', {}],
        ['actual_create_schedule', {
          accountId: 'policy-short-circuit', amount: { type: 'exact', amount: 0 },
          date: { type: 'oneTime', date: '2026-12-31' }, postsTransaction: false
        }],
        ['actual_delete_schedule', { scheduleId: 'policy-short-circuit', confirmDestructive: true }]
      ] as const) {
        const result = await callToolExpectingError(readOnly, name, args);
        expect(result.structuredContent).toMatchObject({ error: { code: 'READ_ONLY_MODE' } });
      }
      const status = await callTool(readOnly, 'actual_get_runtime_status', {}, runtimeStatusOutputSchema);
      expect(status.modes).toEqual({ readOnly: true, allowDestructive: false, effectiveWriteAllowed: false });
    } finally {
      assertNoConfiguredSecrets(readOnly.stderr());
      await readOnly.close();
    }
  });

  it('resets process-lifetime uptime and observed sync telemetry after restart', async () => {
    await callTool(running, 'actual_sync', {}, syncOutputSchema);
    const observed = await callTool(running, 'actual_get_runtime_status', {}, runtimeStatusOutputSchema);
    expect(observed.syncTelemetry.lastSyncAttemptAt).toEqual(expect.any(String));
    expect(observed.syncTelemetry.lastSuccessfulSyncAt).toEqual(expect.any(String));
    await running.close();
    running = await startMcp('.actual-e2e-data/read-restarted');
    const restarted = await callTool(running, 'actual_get_runtime_status', {}, runtimeStatusOutputSchema);
    expect(restarted.syncTelemetry).toEqual({});
    expect(restarted.uptimeMs).toBeLessThanOrEqual(observed.uptimeMs);
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

  it('exercises transfer, diagnostic, and reconciliation reads through compiled stdio', async () => {
    const transferPayees = await callTool(running, 'actual_list_transfer_payees', {}, transferPayeesOutputSchema);
    expect(transferPayees.transferPayees.length).toBeGreaterThan(0);
    const bounds = { startDate: '2026-08-01', endDate: '2026-08-31', limit: 100, offset: 0 };
    const transfers = await callTool(running, 'actual_search_transfers', bounds, searchTransfersOutputSchema);
    if (transfers.transfers[0]?.transactionA) {
      const exact = await callTool(running, 'actual_get_transfer', { transactionId: transfers.transfers[0].transactionA.id }, getTransferOutputSchema);
      expect(exact.pairKey).toBe(transfers.transfers[0].pairKey);
    }
    const candidates = await callTool(running, 'actual_find_possible_transfers', bounds, findPossibleTransfersOutputSchema);
    const duplicates = await callTool(running, 'actual_find_possible_duplicates', bounds, findPossibleDuplicatesOutputSchema);
    expect(candidates.page.returned).toBe(candidates.candidates.length);
    expect(duplicates.page.returned).toBe(duplicates.candidates.length);
    const accounts = (await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema)).accounts;
    const account = accounts.find(item => item.name === REQUIRED_TEST_ACCOUNT_NAME)!;
    const reconciliation = await callTool(running, 'actual_get_account_reconciliation', {
      accountId: account.id, cutoff: '2026-08-31'
    }, accountReconciliationOutputSchema);
    expect(reconciliation.balances.uncleared).toBe(reconciliation.balances.ledger - reconciliation.balances.cleared);
  });
});
