import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actualApiAdapter } from '../../src/actual/adapter.js';
import type { AdapterTransaction } from '../../src/actual/adapter.js';
import { ActualClient } from '../../src/actual/client.js';
import { transactionSchema } from '../../src/mcp/contracts.js';
import { PublicError } from '../../src/errors.js';
import {
  integrationConfig,
  loadRealTestEnvironment,
  REQUIRED_TEST_ACCOUNT_NAME,
  skipMessage
} from '../real/env.js';
import { matchesTemporaryTestPayee, TEMPORARY_TEST_PAYEE } from '../real/ownership.js';
import { permanentFixtureFingerprint } from '../real/fingerprint.js';
import { ResourceRegistry } from '../real/resources.js';

const TEST_DATE = '2026-08-30';
const environment = await loadRealTestEnvironment();
if (!environment.configured) console.warn(skipMessage(environment, 'Real Actual integration write suite'));
else if (!environment.allowWrites) console.warn('Real Actual integration write suite skipped: ACTUAL_INTEGRATION_ALLOW_WRITES is not true.');
const writeDescribe = environment.configured && environment.allowWrites ? describe : describe.skip;

writeDescribe.sequential('guarded real Actual write integration', () => {
  let client: ActualClient;
  let accountId = '';
  let importedId = '';
  let transactionId = '';
  let baselineFingerprint = '';
  const registry = new ResourceRegistry();

  async function currentTransactions() {
    return client.getTransactions(accountId, TEST_DATE, TEST_DATE);
  }

  async function ownedTransactions() {
    const matches = (await currentTransactions()).filter(transaction => transaction.imported_id === importedId);
    for (const transaction of matches) registry.register('transaction', transaction.id, importedId);
    return matches;
  }

  async function assertSafeToDelete(transaction: AdapterTransaction): Promise<void> {
    const payees = await client.listPayees();
    const payeeName = transaction.payee ? payees.find(payee => payee.id === transaction.payee)?.name : undefined;
    expect(registry.snapshot().some(resource => resource.kind === 'transaction' && resource.id === transaction.id), 'Refusing cleanup for an uncaptured transaction id').toBe(true);
    expect(transaction.imported_id).toBe(importedId);
    expect(transaction.imported_id?.startsWith('mcp-integration-test:')).toBe(true);
    expect(
      matchesTemporaryTestPayee(payeeName, transaction.imported_payee),
      'Refusing cleanup for a transaction with an unexpected payee or imported_payee'
    ).toBe(true);
  }

  beforeAll(async () => {
    expect(environment.accountName, 'Write account must use the dedicated exact name').toBe(REQUIRED_TEST_ACCOUNT_NAME);
    client = new ActualClient(actualApiAdapter, () => integrationConfig());
    const accounts = await client.listAccounts();
    const matches = accounts.filter(account => account.name === environment.accountName);
    expect(matches, `Expected exactly one dedicated account named ${environment.accountName}`).toHaveLength(1);
    accountId = matches[0]!.id;
    importedId = `mcp-integration-test:${randomUUID()}`;
    baselineFingerprint = await permanentFixtureFingerprint(client);
  });

  afterAll(async () => {
    let cleanupError: unknown;
    try {
      if (client && accountId && importedId) {
        await registry.cleanup({
          transaction: async resource => { await client.deleteTransaction(resource.id); },
          category: async resource => { await client.deleteCategory(resource.id); },
          categoryGroup: async resource => { await client.deleteCategoryGroup(resource.id); },
          account: async resource => { await client.deleteAccount(resource.id); }
        });
        expect(await ownedTransactions(), `Cleanup failed for transactionId=${transactionId || '[unknown]'} imported_id=${importedId}`).toHaveLength(0);
        expect(await permanentFixtureFingerprint(client)).toBe(baselineFingerprint);
      }
    } catch (error) {
      cleanupError = error;
      console.error(`Manual cleanup required for transactionId=${transactionId || '[unknown]'} imported_id=${importedId}`);
    } finally {
      await client?.shutdown();
    }
    if (cleanupError) throw cleanupError;
  });

  it('imports a uniquely owned transaction and validates manual and imported records with one schema', async () => {
    const result = await client.importTransactions(accountId, [{
      date: TEST_DATE,
      amount: -123,
      payee_name: TEMPORARY_TEST_PAYEE,
      imported_payee: TEMPORARY_TEST_PAYEE,
      imported_id: importedId,
      notes: 'MCP INTEGRATION TEST TEMPORARY',
      cleared: true
    }]);
    expect(result.errors).toEqual([]);
    const matches = await ownedTransactions();
    expect(matches).toHaveLength(1);
    transactionId = matches[0]!.id;
    expect(transactionSchema.parse(matches[0])).toMatchObject({
      amount: -123,
      imported_id: importedId,
      imported_payee: TEMPORARY_TEST_PAYEE,
      notes: 'MCP INTEGRATION TEST TEMPORARY'
    });

    const manual = (await client.getTransactions(accountId, '2026-08-01', '2026-08-31'))
      .find(transaction => transaction.imported_id === null);
    expect(manual, 'Expected a permanent manual transaction').toBeDefined();
    expect(() => transactionSchema.parse(manual)).not.toThrow();
  });

  it('keeps exactly one transaction after importing the same imported_id again', async () => {
    await client.importTransactions(accountId, [{
      date: TEST_DATE,
      amount: -123,
      payee_name: TEMPORARY_TEST_PAYEE,
      imported_payee: TEMPORARY_TEST_PAYEE,
      imported_id: importedId,
      notes: 'MCP INTEGRATION TEST TEMPORARY',
      cleared: true
    }]);
    expect(await ownedTransactions()).toHaveLength(1);
  });

  it('updates only the transaction created by this run and persists notes', async () => {
    const transaction = (await ownedTransactions()).find(item => item.id === transactionId);
    expect(transaction).toBeDefined();
    await assertSafeToDelete(transaction!);
    await client.updateTransaction(transactionId, { notes: 'MCP INTEGRATION TEST UPDATED' });
    expect((await ownedTransactions())[0]).toMatchObject({ notes: 'MCP INTEGRATION TEST UPDATED' });
  });

  it('performs an explicit sync and keeps the budget operational', async () => {
    await expect(client.sync()).resolves.toMatchObject({ success: true });
    await expect(client.health()).resolves.toMatchObject({ connected: true, budgetLoaded: true });
  });

  it('deletes only the captured, UUID-owned transaction', async () => {
    const transaction = (await ownedTransactions()).find(item => item.id === transactionId);
    expect(transaction).toBeDefined();
    await assertSafeToDelete(transaction!);
    await client.deleteTransaction(transactionId);
    registry.release('transaction', transactionId);
    expect(await ownedTransactions()).toHaveLength(0);
  });

  it('administers isolated account and category structure with exact-ID cleanup and complete safety preflights', async () => {
    const runId = randomUUID();
    const groupA = await client.createCategoryGroup(`MCP_INTEGRATION_TEST_GROUP_A_${runId}`);
    registry.register('categoryGroup', groupA.categoryGroup.id, groupA.categoryGroup.name);
    const groupB = await client.createCategoryGroup(`MCP_INTEGRATION_TEST_GROUP_B_${runId}`);
    registry.register('categoryGroup', groupB.categoryGroup.id, groupB.categoryGroup.name);
    const incomeGroup = await client.createCategoryGroup(`MCP_INTEGRATION_TEST_INCOME_${runId}`, true);
    registry.register('categoryGroup', incomeGroup.categoryGroup.id, incomeGroup.categoryGroup.name);
    const category = await client.createCategory(`MCP_INTEGRATION_TEST_CATEGORY_${runId}`, groupA.categoryGroup.id);
    registry.register('category', category.category.id, category.category.name);

    await expect(client.updateCategory(category.category.id, category.category.name)).resolves.toMatchObject({ changed: false });
    await expect(client.moveCategory(category.category.id, incomeGroup.categoryGroup.id)).rejects.toMatchObject({ code: 'INCOMPATIBLE_CATEGORY_GROUP_TYPE' });
    await expect(client.moveCategory(category.category.id, groupB.categoryGroup.id)).resolves.toMatchObject({ changed: true });
    await expect(client.hideCategory(category.category.id)).resolves.toMatchObject({ changed: true });
    await expect(client.hideCategory(category.category.id)).resolves.toMatchObject({ changed: false });
    await expect(client.unhideCategory(category.category.id)).resolves.toMatchObject({ changed: true });
    await expect(client.deleteCategoryGroup(groupB.categoryGroup.id)).rejects.toMatchObject({ code: 'CATEGORY_GROUP_NOT_EMPTY' });

    const emptyAccount = await client.createAccount(`MCP_INTEGRATION_TEST_EMPTY_ACCOUNT_${runId}`);
    registry.register('account', emptyAccount.account.id, emptyAccount.account.name);
    await expect(client.closeAccount(emptyAccount.account.id)).rejects.toMatchObject({ code: 'UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT' });
    await client.deleteAccount(emptyAccount.account.id);
    registry.release('account', emptyAccount.account.id);

    const account = await client.createAccount(`MCP_INTEGRATION_TEST_ACCOUNT_${runId}`, false, -12030);
    registry.register('account', account.account.id, account.account.name);
    const openingTransactions = await client.getTransactions(account.account.id, TEST_DATE, TEST_DATE);
    expect(openingTransactions.length).toBeGreaterThan(0);
    for (const transaction of openingTransactions) registry.register('transaction', transaction.id, `opening-balance-${runId}`);
    const offset = await client.importTransactions(account.account.id, [{
      date: TEST_DATE,
      amount: 12030,
      category: category.category.id,
      imported_id: `mcp-integration-structure:${runId}`,
      payee_name: TEMPORARY_TEST_PAYEE,
      imported_payee: TEMPORARY_TEST_PAYEE,
      notes: 'MCP INTEGRATION TEST STRUCTURAL OFFSET'
    }]);
    expect(offset.errors).toEqual([]);
    for (const id of offset.added) registry.register('transaction', id, `structural-offset-${runId}`);

    await expect(client.deleteAccount(account.account.id)).rejects.toMatchObject({ code: 'ACCOUNT_NOT_EMPTY' });
    await expect(client.deleteCategory(category.category.id)).rejects.toMatchObject({ code: 'CATEGORY_IN_USE' });
    await expect(client.closeAccount(account.account.id)).resolves.toMatchObject({ changed: true, account: { closed: true } });
    await expect(client.closeAccount(account.account.id)).resolves.toMatchObject({ changed: false });
    await expect(client.reopenAccount(account.account.id)).resolves.toMatchObject({ changed: true, account: { closed: false } });
    await expect(client.getAccount(`missing-${runId}`)).rejects.toBeInstanceOf(PublicError);

    for (const resource of registry.snapshot().filter(item => item.kind === 'transaction' && item.name.includes(runId))) {
      await client.deleteTransaction(resource.id);
      registry.release('transaction', resource.id);
    }
    const started = performance.now();
    await client.deleteCategory(category.category.id);
    console.info(`Complete category-use preflight elapsedMs=${Math.round(performance.now() - started)}`);
    registry.release('category', category.category.id);
    for (const group of [groupA, groupB, incomeGroup]) {
      await client.deleteCategoryGroup(group.categoryGroup.id);
      registry.release('categoryGroup', group.categoryGroup.id);
    }
    await client.deleteAccount(account.account.id);
    registry.release('account', account.account.id);
  });
});
