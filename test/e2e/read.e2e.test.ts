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

  it('discovers exactly 42 v0.4.0 tools with strict schemas and compatible annotations through stdio', async () => {
    const { tools } = await running.client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
    expect(tools).toHaveLength(42);
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
    expect((await running.client.listTools()).tools).toHaveLength(42);
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

  it('returns structured errors for invalid input, remains alive, and never leaks credentials', async () => {
    const cases = [
      ['actual_get_account', { accountId: 'missing-account-id' }],
      ['actual_get_payee', { payeeId: 'missing-payee-id' }],
      ['actual_get_rule', { ruleId: 'missing-rule-id' }],
      ['actual_get_transactions', { accountId: 'invalid', startDate: '2026-02-30', endDate: '2026-03-01' }],
      ['actual_get_transactions', { accountId: 'invalid', startDate: '2024-01-01', endDate: '2025-01-01' }],
      ['actual_delete_transaction', { transactionId: 'missing-transaction-id', confirmDestructive: false }]
    ] as const;
    for (const [name, args] of cases) {
      const error = await callToolExpectingError(running, name, args);
      assertNoConfiguredSecrets(error);
    }
    expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
    assertNoConfiguredSecrets(running.stderr());
  });
});
