import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accountsOutputSchema,
  accountDeletionOutputSchema,
  accountMutationOutputSchema,
  categoryDeletionOutputSchema,
  categoryGroupDeletionOutputSchema,
  categoryGroupMutationOutputSchema,
  categoryMutationOutputSchema,
  categoriesOutputSchema,
  healthOutputSchema,
  importTransactionsOutputSchema,
  payeesOutputSchema,
  syncOutputSchema,
  transactionMutationOutputSchema,
  transactionsOutputSchema
} from '../../src/mcp/contracts.js';
import { assertNoConfiguredSecrets, callTool, callToolExpectingError, type RunningMcp, startMcp } from './harness.js';
import { loadRealTestEnvironment, REQUIRED_TEST_ACCOUNT_NAME, skipMessage } from '../real/env.js';
import { matchesTemporaryTestPayee, TEMPORARY_TEST_PAYEE } from '../real/ownership.js';
import { permanentFixtureFingerprint } from '../real/fingerprint.js';
import { ResourceRegistry } from '../real/resources.js';

const TEST_DATE = '2026-08-30';
const DATA_DIR = '.actual-e2e-data/write';
const environment = await loadRealTestEnvironment();
if (!environment.configured) console.warn(skipMessage(environment, 'MCP stdio E2E write suite'));
else if (!environment.allowWrites) console.warn('MCP stdio E2E write suite skipped: ACTUAL_INTEGRATION_ALLOW_WRITES is not true.');
const writeDescribe = environment.configured && environment.allowWrites ? describe : describe.skip;

writeDescribe.sequential('guarded real MCP stdio write E2E', () => {
  let running: RunningMcp;
  let accountId = '';
  let importedId = '';
  let transactionId = '';
  let baselineFingerprint = '';
  const registry = new ResourceRegistry();

  function fingerprintReader() {
    return {
      listAccounts: async () => (await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema)).accounts,
      listCategories: async () => (await callTool(running, 'actual_list_categories', {}, categoriesOutputSchema)).categoryGroups,
      listPayees: async () => (await callTool(running, 'actual_list_payees', {}, payeesOutputSchema)).payees,
      getTransactions: async (targetAccountId: string, startDate: string, endDate: string) =>
        (await callTool(running, 'actual_get_transactions', { accountId: targetAccountId, startDate, endDate }, transactionsOutputSchema)).transactions
    };
  }

  async function queryOwned() {
    const result = await callTool(running, 'actual_get_transactions', {
      accountId,
      startDate: TEST_DATE,
      endDate: TEST_DATE
    }, transactionsOutputSchema);
    const matches = result.transactions.filter(transaction => transaction.imported_id === importedId);
    for (const transaction of matches) registry.register('transaction', transaction.id, importedId);
    return matches;
  }

  async function assertSafeToDelete(transaction: Awaited<ReturnType<typeof queryOwned>>[number]) {
    const payees = (await callTool(running, 'actual_list_payees', {}, payeesOutputSchema)).payees;
    const payeeName = transaction.payee ? payees.find(payee => payee.id === transaction.payee)?.name : undefined;
    expect(registry.snapshot().some(resource => resource.kind === 'transaction' && resource.id === transaction.id), 'Refusing E2E cleanup for an uncaptured transaction id').toBe(true);
    expect(transaction.imported_id).toBe(importedId);
    expect(transaction.imported_id?.startsWith('mcp-integration-test:')).toBe(true);
    expect(
      matchesTemporaryTestPayee(payeeName, transaction.imported_payee),
      'Refusing E2E cleanup for a transaction with an unexpected payee or imported_payee'
    ).toBe(true);
  }

  async function restart() {
    await running.close();
    running = await startMcp(DATA_DIR);
  }

  beforeAll(async () => {
    expect(environment.accountName, 'Write account must use the dedicated exact name').toBe(REQUIRED_TEST_ACCOUNT_NAME);
    running = await startMcp(DATA_DIR);
    const accounts = (await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema)).accounts;
    const matches = accounts.filter(account => account.name === environment.accountName);
    expect(matches, `Expected exactly one dedicated account named ${environment.accountName}`).toHaveLength(1);
    accountId = matches[0]!.id;
    importedId = `mcp-integration-test:${randomUUID()}`;
    baselineFingerprint = await permanentFixtureFingerprint(fingerprintReader());
  });

  afterAll(async () => {
    let cleanupError: unknown;
    try {
      if (!running && environment.configured) running = await startMcp(DATA_DIR);
      if (running && accountId && importedId) {
        await registry.cleanup({
          transaction: async resource => { await callTool(running, 'actual_delete_transaction', { transactionId: resource.id, confirmDestructive: true }, transactionMutationOutputSchema); },
          category: async resource => { await callTool(running, 'actual_delete_category', { categoryId: resource.id, confirmDestructive: true }, categoryDeletionOutputSchema); },
          categoryGroup: async resource => { await callTool(running, 'actual_delete_category_group', { groupId: resource.id, confirmDestructive: true }, categoryGroupDeletionOutputSchema); },
          account: async resource => { await callTool(running, 'actual_delete_account', { accountId: resource.id, confirmDestructive: true }, accountDeletionOutputSchema); }
        });
        expect(await queryOwned(), `Cleanup failed for transactionId=${transactionId || '[unknown]'} imported_id=${importedId}`).toHaveLength(0);
        expect(await permanentFixtureFingerprint(fingerprintReader())).toBe(baselineFingerprint);
      }
    } catch (error) {
      cleanupError = error;
      console.error(`Manual cleanup required for transactionId=${transactionId || '[unknown]'} imported_id=${importedId}`);
    } finally {
      assertNoConfiguredSecrets(running?.stderr() ?? '');
      await running?.close();
    }
    if (cleanupError) throw cleanupError;
  });

  it('imports and reads a uniquely owned transaction through MCP stdio', async () => {
    const result = await callTool(running, 'actual_import_transactions', {
      accountId,
      transactions: [{
        date: TEST_DATE,
        amount: -123,
        payee_name: TEMPORARY_TEST_PAYEE,
        imported_payee: TEMPORARY_TEST_PAYEE,
        imported_id: importedId,
        notes: 'MCP INTEGRATION TEST TEMPORARY',
        cleared: true
      }]
    }, importTransactionsOutputSchema);
    expect(result.errors).toEqual([]);
    const matches = await queryOwned();
    expect(matches).toHaveLength(1);
    transactionId = matches[0]!.id;
    expect(matches[0]).toMatchObject({ amount: -123, imported_id: importedId, notes: 'MCP INTEGRATION TEST TEMPORARY' });
  });

  it('keeps exactly one transaction after the same imported_id is sent again', async () => {
    await callTool(running, 'actual_import_transactions', {
      accountId,
      transactions: [{
        date: TEST_DATE,
        amount: -123,
        payee_name: TEMPORARY_TEST_PAYEE,
        imported_payee: TEMPORARY_TEST_PAYEE,
        imported_id: importedId,
        notes: 'MCP INTEGRATION TEST TEMPORARY',
        cleared: true
      }]
    }, importTransactionsOutputSchema);
    expect(await queryOwned()).toHaveLength(1);
  });

  it('preserves idempotency after a clean MCP process restart', async () => {
    await restart();
    expect(await queryOwned()).toHaveLength(1);
  });

  it('updates, explicitly syncs, and reads the persisted change through MCP', async () => {
    const transaction = (await queryOwned()).find(item => item.id === transactionId);
    expect(transaction).toBeDefined();
    await assertSafeToDelete(transaction!);
    await callTool(running, 'actual_update_transaction', {
      transactionId,
      fields: { notes: 'MCP INTEGRATION TEST UPDATED' }
    }, transactionMutationOutputSchema);
    expect((await queryOwned())[0]).toMatchObject({ notes: 'MCP INTEGRATION TEST UPDATED' });
    expect(await callTool(running, 'actual_sync', {}, syncOutputSchema)).toMatchObject({ success: true });
  });

  it('returns a structured error for a nonexistent transaction and remains operational', async () => {
    const result = await callToolExpectingError(running, 'actual_update_transaction', {
      transactionId: `mcp-integration-test-missing-${randomUUID()}`,
      fields: { notes: 'must not exist' }
    });
    assertNoConfiguredSecrets(result);
    expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
  });

  it('deletes only the captured transaction after destructive confirmation', async () => {
    const transaction = (await queryOwned()).find(item => item.id === transactionId);
    expect(transaction).toBeDefined();
    await assertSafeToDelete(transaction!);
    await callTool(running, 'actual_delete_transaction', {
      transactionId,
      confirmDestructive: true
    }, transactionMutationOutputSchema);
    registry.release('transaction', transactionId);
    expect(await queryOwned()).toHaveLength(0);
  });

  it('exercises the complete structural lifecycle through real MCP stdio', async () => {
    const runId = randomUUID();
    const groupA = await callTool(running, 'actual_create_category_group', { name: `MCP_E2E_TEST_GROUP_A_${runId}` }, categoryGroupMutationOutputSchema);
    registry.register('categoryGroup', groupA.categoryGroup.id, groupA.categoryGroup.name);
    const groupB = await callTool(running, 'actual_create_category_group', { name: `MCP_E2E_TEST_GROUP_B_${runId}` }, categoryGroupMutationOutputSchema);
    registry.register('categoryGroup', groupB.categoryGroup.id, groupB.categoryGroup.name);
    const income = await callTool(running, 'actual_create_category_group', { name: `MCP_E2E_TEST_INCOME_${runId}`, isIncome: true }, categoryGroupMutationOutputSchema);
    registry.register('categoryGroup', income.categoryGroup.id, income.categoryGroup.name);
    const category = await callTool(running, 'actual_create_category', { name: `MCP_E2E_TEST_CATEGORY_${runId}`, groupId: groupA.categoryGroup.id }, categoryMutationOutputSchema);
    registry.register('category', category.category.id, category.category.name);
    expect((await callTool(running, 'actual_update_category', { categoryId: category.category.id, name: category.category.name }, categoryMutationOutputSchema)).changed).toBe(false);
    expect(await callToolExpectingError(running, 'actual_move_category', { categoryId: category.category.id, targetGroupId: income.categoryGroup.id })).toMatchObject({ isError: true });
    expect((await callTool(running, 'actual_move_category', { categoryId: category.category.id, targetGroupId: groupB.categoryGroup.id }, categoryMutationOutputSchema)).changed).toBe(true);
    expect((await callTool(running, 'actual_hide_category', { categoryId: category.category.id }, categoryMutationOutputSchema)).category.hidden).toBe(true);
    expect((await callTool(running, 'actual_hide_category', { categoryId: category.category.id }, categoryMutationOutputSchema)).changed).toBe(false);
    expect((await callTool(running, 'actual_unhide_category', { categoryId: category.category.id }, categoryMutationOutputSchema)).category.hidden).toBe(false);
    await callToolExpectingError(running, 'actual_delete_category_group', { groupId: groupB.categoryGroup.id, confirmDestructive: true });

    const empty = await callTool(running, 'actual_create_account', { name: `MCP_E2E_TEST_EMPTY_ACCOUNT_${runId}` }, accountMutationOutputSchema);
    registry.register('account', empty.account.id, empty.account.name);
    await callToolExpectingError(running, 'actual_close_account', { accountId: empty.account.id });
    await callTool(running, 'actual_delete_account', { accountId: empty.account.id, confirmDestructive: true }, accountDeletionOutputSchema);
    registry.release('account', empty.account.id);

    const account = await callTool(running, 'actual_create_account', {
      name: `MCP_E2E_TEST_ACCOUNT_${runId}`, initialBalance: -12030
    }, accountMutationOutputSchema);
    registry.register('account', account.account.id, account.account.name);
    const opening = (await callTool(running, 'actual_get_transactions', {
      accountId: account.account.id, startDate: TEST_DATE, endDate: TEST_DATE
    }, transactionsOutputSchema)).transactions;
    expect(opening.length).toBeGreaterThan(0);
    for (const transaction of opening) registry.register('transaction', transaction.id, `opening-balance-${runId}`);
    const offset = await callTool(running, 'actual_import_transactions', {
      accountId: account.account.id,
      transactions: [{
        date: TEST_DATE,
        amount: 12030,
        category: category.category.id,
        imported_id: `mcp-e2e-structure:${runId}`,
        payee_name: TEMPORARY_TEST_PAYEE,
        imported_payee: TEMPORARY_TEST_PAYEE,
        notes: 'MCP E2E TEST STRUCTURAL OFFSET'
      }]
    }, importTransactionsOutputSchema);
    for (const id of offset.added) registry.register('transaction', id, `structural-offset-${runId}`);
    await callToolExpectingError(running, 'actual_delete_account', { accountId: account.account.id, confirmDestructive: true });
    await callToolExpectingError(running, 'actual_delete_category', { categoryId: category.category.id, confirmDestructive: true });
    expect((await callTool(running, 'actual_close_account', { accountId: account.account.id }, accountMutationOutputSchema)).account.closed).toBe(true);
    expect((await callTool(running, 'actual_close_account', { accountId: account.account.id }, accountMutationOutputSchema)).changed).toBe(false);
    expect((await callTool(running, 'actual_reopen_account', { accountId: account.account.id }, accountMutationOutputSchema)).account.closed).toBe(false);

    for (const resource of registry.snapshot().filter(item => item.kind === 'transaction' && item.name.includes(runId))) {
      await callTool(running, 'actual_delete_transaction', { transactionId: resource.id, confirmDestructive: true }, transactionMutationOutputSchema);
      registry.release('transaction', resource.id);
    }
    await callTool(running, 'actual_delete_category', { categoryId: category.category.id, confirmDestructive: true }, categoryDeletionOutputSchema);
    registry.release('category', category.category.id);
    for (const group of [groupA, groupB, income]) {
      await callTool(running, 'actual_delete_category_group', { groupId: group.categoryGroup.id, confirmDestructive: true }, categoryGroupDeletionOutputSchema);
      registry.release('categoryGroup', group.categoryGroup.id);
    }
    await callTool(running, 'actual_delete_account', { accountId: account.account.id, confirmDestructive: true }, accountDeletionOutputSchema);
    registry.release('account', account.account.id);
  });

  it('rejects all structural deletes without confirmation and remains operational', async () => {
    for (const [name, args] of [
      ['actual_delete_account', { accountId: `missing-${randomUUID()}` }],
      ['actual_delete_category_group', { groupId: `missing-${randomUUID()}` }],
      ['actual_delete_category', { categoryId: `missing-${randomUUID()}` }]
    ] as const) {
      const result = await callToolExpectingError(running, name, args);
      expect(result.structuredContent).toBeDefined();
      assertNoConfiguredSecrets(result);
    }
    expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
  });
});
