import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actualApiAdapter } from '../../src/actual/adapter.js';
import { ActualClient } from '../../src/actual/client.js';
import {
  accountsOutputSchema,
  administeredPayeeSchema,
  budgetMonthOutputSchema,
  budgetSummaryOutputSchema,
  categoriesOutputSchema,
  accountReconciliationOutputSchema,
  findPossibleDuplicatesOutputSchema,
  findPossibleTransfersOutputSchema,
  healthOutputSchema,
  incomeSummaryOutputSchema,
  listSchedulesOutputSchema,
  listBudgetMonthsOutputSchema,
  payeesOutputSchema,
  ruleSchema,
  rulesOutputSchema,
  runtimeStatusOutputSchema,
  searchTransactionsInputSchema,
  searchTransactionsOutputSchema,
  searchTransfersOutputSchema,
  spendingSummaryOutputSchema,
  monthSummaryOutputSchema,
  transferPayeesOutputSchema,
  transactionOutputSchema,
  transactionsOutputSchema
} from '../../src/mcp/contracts.js';
import {
  CARD_TEST_ACCOUNT_NAME,
  integrationConfig,
  loadRealTestEnvironment,
  REQUIRED_TEST_ACCOUNT_NAME,
  skipMessage
} from '../real/env.js';
import { permanentFixtureFingerprint } from '../real/fingerprint.js';

const environment = await loadRealTestEnvironment();
if (!environment.configured) console.warn(skipMessage(environment, 'Real Actual integration read suite'));
const realDescribe = environment.configured ? describe : describe.skip;

realDescribe.sequential('real Actual read integration', () => {
  let client: ActualClient;
  let baselineFingerprint = '';

  beforeAll(async () => {
    client = new ActualClient(actualApiAdapter, () => integrationConfig());
    baselineFingerprint = await permanentFixtureFingerprint(client);
  });

  afterAll(async () => {
    if (client) expect(await permanentFixtureFingerprint(client)).toBe(baselineFingerprint);
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

  it('performs exact lookup and typed cross-account search through the installed query path', async () => {
    const accounts = await client.listAccounts();
    const selectedAccounts = accounts.filter(account => [REQUIRED_TEST_ACCOUNT_NAME, CARD_TEST_ACCOUNT_NAME].includes(account.name));
    const checking = selectedAccounts.find(account => account.name === REQUIRED_TEST_ACCOUNT_NAME)!;
    const known = await client.getTransactions(checking.id, '2026-08-01', '2026-08-31');
    const transaction = known.find(item => item.notes === 'Compra fake') ?? known[0]!;
    const exact = await client.getTransaction(transaction.id);
    expect(() => transactionOutputSchema.parse({ transaction: exact })).not.toThrow();
    expect(exact.id).toBe(transaction.id);
    await expect(client.getTransaction('mcp-read-missing-transaction')).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const base = searchTransactionsInputSchema.parse({
      startDate: '2026-08-01', endDate: '2026-08-31', accountIds: selectedAccounts.map(account => account.id),
      limit: 100, includeTotals: true
    });
    const searched = await client.searchTransactions(base);
    expect(() => searchTransactionsOutputSchema.parse(searched)).not.toThrow();
    expect(searched.transactions.some(item => item.id === transaction.id)).toBe(true);
    expect('totals' in searched ? searched.totals : undefined).toMatchObject({ supported: true });

    for (const filter of [
      { transactionIds: [transaction.id] },
      ...(transaction.payee ? [{ payeeIds: [transaction.payee] }] : []),
      ...(transaction.category ? [{ categoryIds: [transaction.category] }] : []),
      { importSource: 'manual' as const },
      { importSource: 'imported' as const },
      ...(transaction.cleared === undefined ? [] : [{ cleared: transaction.cleared }]),
      { minAmount: transaction.amount, maxAmount: transaction.amount },
      { text: transaction.notes ?? transaction.imported_payee ?? 'Compra fake' }
    ]) {
      const result = await client.searchTransactions(searchTransactionsInputSchema.parse({
        startDate: '2026-08-01', endDate: '2026-08-31', ...filter
      }));
      expect(() => searchTransactionsOutputSchema.parse(result)).not.toThrow();
    }

    const uncategorized = await client.searchTransactions(searchTransactionsInputSchema.parse({
      startDate: '2026-08-01', endDate: '2026-08-31', uncategorizedOnly: true
    }));
    expect(uncategorized.transactions.every(item => item.category == null && item.transfer_id == null && item.is_parent !== true)).toBe(true);
  });

  it('keeps deterministic pagination and validates every supported split and sort mode', async () => {
    for (const sort of [
      'date_desc', 'date_asc', 'amount_desc', 'amount_asc',
      'payee_asc', 'payee_desc', 'category_asc', 'category_desc'
    ] as const) {
      const input = searchTransactionsInputSchema.parse({ startDate: '2026-08-01', endDate: '2026-08-31', sort, limit: 2, offset: 0 });
      const first = await client.searchTransactions(input);
      const second = await client.searchTransactions(input);
      expect(first.transactions.map(item => item.id)).toEqual(second.transactions.map(item => item.id));
    }
    const grouped = await client.searchTransactions(searchTransactionsInputSchema.parse({
      startDate: '2026-08-01', endDate: '2026-08-31', splitMode: 'grouped', includeTotals: true
    }));
    expect('totals' in grouped ? grouped.totals : undefined).toMatchObject({ supported: false });
    expect(() => searchTransactionsOutputSchema.parse(grouped)).not.toThrow();
  });

  it('records non-gating advanced-search observations without financial values', async () => {
    const startedPage = performance.now();
    const page = await client.searchTransactions(searchTransactionsInputSchema.parse({
      startDate: '2026-08-01', endDate: '2026-08-31', limit: 100
    }));
    const pageMs = Math.round(performance.now() - startedPage);
    const startedTotals = performance.now();
    await client.searchTransactions(searchTransactionsInputSchema.parse({
      startDate: '2026-08-01', endDate: '2026-08-31', limit: 100, includeTotals: true
    }));
    const totalsMs = Math.round(performance.now() - startedTotals);
    console.info(`performance-observation workload=transaction-search-100 requested=100 returned=${page.page.returned} pageMs=${pageMs} totalsMs=${totalsMs}`);
  });

  it('reads transfer payees, transfer search, diagnostics, and reconciliation without mutation', async () => {
    const startedAt = performance.now();
    const transferPayees = await client.listTransferPayees();
    expect(() => transferPayeesOutputSchema.parse({ transferPayees })).not.toThrow();
    expect(transferPayees.length).toBeGreaterThan(0);
    const searchInput = {
      startDate: '2026-08-01', endDate: '2026-08-31', limit: 100, offset: 0
    };
    const transfers = await client.searchTransfers(searchInput);
    expect(() => searchTransfersOutputSchema.parse(transfers)).not.toThrow();
    if (transfers.transfers[0]?.transactionA) {
      const exact = await client.getTransfer(transfers.transfers[0].transactionA.id);
      expect(exact.pairKey).toBe(transfers.transfers[0].pairKey);
    }
    const possibleTransfers = await client.findPossibleTransfers({ ...searchInput, dateWindowDays: 3 });
    const possibleDuplicates = await client.findPossibleDuplicates({ ...searchInput, dateWindowDays: 3 });
    expect(() => findPossibleTransfersOutputSchema.parse(possibleTransfers)).not.toThrow();
    expect(() => findPossibleDuplicatesOutputSchema.parse(possibleDuplicates)).not.toThrow();
    const repeated = await client.findPossibleDuplicates({ ...searchInput, dateWindowDays: 3 });
    expect(repeated.candidates.map(item => item.candidateKey)).toEqual(possibleDuplicates.candidates.map(item => item.candidateKey));

    const account = (await client.listAccounts()).find(item => item.name === REQUIRED_TEST_ACCOUNT_NAME)!;
    const reconciliation = await client.getAccountReconciliation(account.id, '2026-08-31');
    expect(() => accountReconciliationOutputSchema.parse(reconciliation)).not.toThrow();
    expect(reconciliation.balances.uncleared).toBe(reconciliation.balances.ledger - reconciliation.balances.cleared);
    console.info(`performance-observation workload=transfer-duplicate-reconciliation transferCandidates=${possibleTransfers.counts.matched} duplicateCandidates=${possibleDuplicates.counts.matched} durationMs=${Math.round(performance.now() - startedAt)}`);
  });

  it('validates schedule, summary, and runtime read contracts without mutation', async () => {
    const startedAt = performance.now();
    const schedules = await client.listSchedules({ limit: 250, offset: 0 });
    expect(() => listSchedulesOutputSchema.parse(schedules)).not.toThrow();
    for (const schedule of schedules.schedules) {
      expect(schedule).not.toHaveProperty('ruleId');
      expect(schedule).not.toHaveProperty('conditions');
      expect(schedule).not.toHaveProperty('actions');
    }
    const month = await client.getMonthSummary('2026-08');
    expect(() => monthSummaryOutputSchema.parse(month)).not.toThrow();
    expect(month.ledger.netAmount).toBe(month.ledger.incomeAmount + month.ledger.expenseAmount);
    const range = { startDate: '2026-08-01', endDate: '2026-08-31' };
    const spending = await client.getSpendingSummary(range);
    const income = await client.getIncomeSummary(range);
    expect(() => spendingSummaryOutputSchema.parse(spending)).not.toThrow();
    expect(() => incomeSummaryOutputSchema.parse(income)).not.toThrow();
    const status = await client.runtimeStatus();
    expect(() => runtimeStatusOutputSchema.parse(status)).not.toThrow();
    expect(status).toMatchObject({ mcpVersion: '1.0.0', sdkVersion: '26.8.1', connected: true, budgetLoaded: true });
    expect(JSON.stringify(status)).not.toContain(process.env.ACTUAL_SYNC_ID ?? '__missing__');
    const annualStartedAt = performance.now();
    await expect(client.getSpendingSummary({ startDate: '2026-01-01', endDate: '2026-12-31' })).resolves.toBeDefined();
    const annualDurationMs = Math.round(performance.now() - annualStartedAt);
    console.info(`performance-observation workload=schedule-month-annual-runtime schedulesReturned=${schedules.page.returned} monthAndRuntimeMs=${Math.round(performance.now() - startedAt)} annualSummaryMs=${annualDurationMs}`);
  });
});
