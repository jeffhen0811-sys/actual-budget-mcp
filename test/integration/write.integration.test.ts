import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actualApiAdapter } from '../../src/actual/adapter.js';
import type { AdapterTransaction } from '../../src/actual/adapter.js';
import { ActualClient } from '../../src/actual/client.js';
import { transactionSchema } from '../../src/mcp/contracts.js';
import {
  integrationConfig,
  loadRealTestEnvironment,
  REQUIRED_TEST_ACCOUNT_NAME,
  skipMessage
} from '../real/env.js';
import { matchesTemporaryTestPayee, TEMPORARY_TEST_PAYEE } from '../real/ownership.js';

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
  const capturedIds = new Set<string>();

  async function currentTransactions() {
    return client.getTransactions(accountId, TEST_DATE, TEST_DATE);
  }

  async function ownedTransactions() {
    const matches = (await currentTransactions()).filter(transaction => transaction.imported_id === importedId);
    for (const transaction of matches) capturedIds.add(transaction.id);
    return matches;
  }

  async function assertSafeToDelete(transaction: AdapterTransaction): Promise<void> {
    const payees = await client.listPayees();
    const payeeName = transaction.payee ? payees.find(payee => payee.id === transaction.payee)?.name : undefined;
    expect(capturedIds.has(transaction.id), 'Refusing cleanup for an uncaptured transaction id').toBe(true);
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
  });

  afterAll(async () => {
    let cleanupError: unknown;
    try {
      if (client && accountId && importedId) {
        const remaining = await ownedTransactions();
        for (const transaction of remaining) {
          await assertSafeToDelete(transaction);
          await client.deleteTransaction(transaction.id);
        }
        expect(await ownedTransactions(), `Cleanup failed for transactionId=${transactionId || '[unknown]'} imported_id=${importedId}`).toHaveLength(0);
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
    expect(await ownedTransactions()).toHaveLength(0);
  });
});
