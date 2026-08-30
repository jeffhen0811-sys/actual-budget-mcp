import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actualApiAdapter } from '../../src/actual/adapter.js';
import { ActualClient } from '../../src/actual/client.js';
import {
  accountsOutputSchema,
  categoriesOutputSchema,
  healthOutputSchema,
  payeesOutputSchema,
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
