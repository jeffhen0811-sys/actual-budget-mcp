import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actualApiAdapter } from '../../src/actual/adapter.js';
import { ActualClient } from '../../src/actual/client.js';
import {
  accountsOutputSchema,
  administeredPayeeSchema,
  budgetMonthOutputSchema,
  budgetSummaryOutputSchema,
  categoriesOutputSchema,
  healthOutputSchema,
  listBudgetMonthsOutputSchema,
  payeesOutputSchema,
  ruleSchema,
  rulesOutputSchema,
  transactionsOutputSchema
} from '../../src/mcp/contracts.js';
import {
  CARD_TEST_ACCOUNT_NAME,
  integrationConfig,
  loadRealTestEnvironment,
  REQUIRED_TEST_ACCOUNT_NAME,
  skipMessage
} from '../real/env.js';

const environment = await loadRealTestEnvironment();
if (!environment.configured) console.warn(skipMessage(environment, 'Real Actual integration read suite'));
const realDescribe = environment.configured ? describe : describe.skip;

realDescribe.sequential('real Actual read integration', () => {
  let client: ActualClient;

  beforeAll(async () => {
    client = new ActualClient(actualApiAdapter, () => integrationConfig());
  });

  afterAll(async () => {
    await client?.shutdown();
  });

  it('passes health preflight through the production contract', async () => {
    const health = await client.health();
    expect(() => healthOutputSchema.parse(health)).not.toThrow();
    expect(health).toMatchObject({ connected: true, budgetLoaded: true });
  });

  it('finds both dedicated accounts by name and validates normalized account output', async () => {
    const accounts = await client.listAccounts();
    expect(() => accountsOutputSchema.parse({ accounts })).not.toThrow();
    expect(accounts.map(account => account.name)).toEqual(expect.arrayContaining([
      REQUIRED_TEST_ACCOUNT_NAME,
      CARD_TEST_ACCOUNT_NAME
    ]));
  });

  it('validates real category groups and nested categories', async () => {
    const categoryGroups = await client.listCategories();
    const parsed = categoriesOutputSchema.parse({ categoryGroups });
    expect(parsed.categoryGroups.length).toBeGreaterThan(0);
    expect(parsed.categoryGroups.some(group => group.categories.length > 0)).toBe(true);
  });

  it('discovers official budget months and validates month detail, summaries, filters, signs, and mode projection', async () => {
    const listed = await client.listBudgetMonths();
    expect(() => listBudgetMonthsOutputSchema.parse(listed)).not.toThrow();
    expect(listed.count).toBe(listed.months.length);
    expect(listed.count).toBeGreaterThan(0);
    const month = listed.months.at(-1)!;
    const detail = await client.getBudgetMonth(month);
    expect(() => budgetMonthOutputSchema.parse(detail)).not.toThrow();
    expect(detail.month).toBe(month);
    for (const value of [detail.totalBudgeted, detail.totalIncome, detail.totalSpent, detail.totalBalance]) {
      expect(Number.isSafeInteger(value)).toBe(true);
    }
    const summary = await client.getBudgetSummary(month, { limit: 500 });
    expect(() => budgetSummaryOutputSchema.parse(summary)).not.toThrow();
    const first = detail.categoryGroups.flatMap(group => group.categories.map(category => ({ group, category })))[0];
    if (first) {
      const filtered = await client.getBudgetSummary(month, { groupId: first.group.id, categoryId: first.category.id, limit: 1 });
      expect(filtered.categoryGroups[0]?.categories).toEqual([first.category]);
    }
  });

  it('finds every permanent fake payee through the production payee contract', async () => {
    const payees = await client.listPayees();
    expect(() => payeesOutputSchema.parse({ payees })).not.toThrow();
    expect(payees.map(payee => payee.name)).toEqual(expect.arrayContaining([
      'Empresa Teste',
      'Supermercado Teste',
      'Companhia de Energia Teste',
      'Posto Teste',
      'Netflix Teste',
      'Restaurante Teste',
      'Loja Online Teste'
    ]));
  });

  it('reads individual ordinary and transfer payees and returns exact absent-ID errors', async () => {
    const listed = await client.listPayees();
    const payees = await Promise.all(listed.map(payee => client.getPayee(payee.id)));
    for (const payee of payees) expect(() => administeredPayeeSchema.parse(payee)).not.toThrow();
    expect(payees.some(payee => typeof payee.transferAccountId === 'string')).toBe(true);
    expect(payees.some(payee => payee.transferAccountId === null)).toBe(true);
    await expect(client.getPayee('mcp-read-missing-payee')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('validates the complete ranked real rule list and exact absent-ID behavior', async () => {
    const rules = await client.listRules();
    expect(() => rulesOutputSchema.parse({ rules })).not.toThrow();
    for (const rule of rules) {
      expect(() => ruleSchema.parse(rule)).not.toThrow();
      await expect(client.getRule(rule.id)).resolves.toEqual(rule);
    }
    const stageOrder = rules.map(rule => ({ pre: 0, default: 1, post: 2 })[rule.stage]);
    expect(stageOrder).toEqual([...stageOrder].sort((left, right) => left - right));
    await expect(client.getRule('mcp-read-missing-rule')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('accepts all real checking-account transactions, including manual nulls and Starting Balance', async () => {
    const accounts = await client.listAccounts();
    const account = accounts.find(item => item.name === REQUIRED_TEST_ACCOUNT_NAME);
    expect(account, `Missing account ${REQUIRED_TEST_ACCOUNT_NAME}`).toBeDefined();
    const payees = await client.listPayees();
    const payeeNames = new Map(payees.map(payee => [payee.id, payee.name]));
    const transactions = await client.getTransactions(account!.id, '2026-08-01', '2026-08-31');
    expect(() => transactionsOutputSchema.parse({ transactions })).not.toThrow();

    const findKnown = (payeeName: string, amount: number) => transactions.find(transaction =>
      transaction.payee !== null && transaction.payee !== undefined &&
      payeeNames.get(transaction.payee) === payeeName && transaction.amount === amount
    );
    expect(findKnown('Empresa Teste', 500000)).toMatchObject({ notes: 'Salário fake MCP' });
    expect(findKnown('Supermercado Teste', -18745)).toMatchObject({ notes: 'Compra fake' });
    expect(findKnown('Companhia de Energia Teste', -16480)).toMatchObject({ notes: 'Conta de energia fake' });
    expect(findKnown('Posto Teste', -22000)).toMatchObject({ notes: 'Combustível fake' });

    const manual = transactions.find(transaction => transaction.imported_id === null && transaction.starting_balance_flag !== true);
    expect(manual, 'Expected at least one manual transaction with imported_id=null').toBeDefined();
    const startingBalance = transactions.find(transaction => transaction.starting_balance_flag === true);
    expect(startingBalance).toMatchObject({ notes: null, imported_id: null, transfer_id: null });
  });

  it('accepts all real card transactions and known permanent fixtures', async () => {
    const accounts = await client.listAccounts();
    const account = accounts.find(item => item.name === CARD_TEST_ACCOUNT_NAME);
    expect(account, `Missing account ${CARD_TEST_ACCOUNT_NAME}`).toBeDefined();
    const payees = await client.listPayees();
    const payeeNames = new Map(payees.map(payee => [payee.id, payee.name]));
    const transactions = await client.getTransactions(account!.id, '2026-08-01', '2026-08-31');
    expect(() => transactionsOutputSchema.parse({ transactions })).not.toThrow();
    const names = transactions.map(transaction => transaction.payee ? payeeNames.get(transaction.payee) : undefined);
    expect(names).toEqual(expect.arrayContaining(['Netflix Teste', 'Restaurante Teste', 'Loja Online Teste']));
  });
});
