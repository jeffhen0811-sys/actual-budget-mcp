import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accountsOutputSchema,
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
  const capturedIds = new Set<string>();

  async function queryOwned() {
    const result = await callTool(running, 'actual_get_transactions', {
      accountId,
      startDate: TEST_DATE,
      endDate: TEST_DATE
    }, transactionsOutputSchema);
    const matches = result.transactions.filter(transaction => transaction.imported_id === importedId);
    for (const transaction of matches) capturedIds.add(transaction.id);
    return matches;
  }

  async function assertSafeToDelete(transaction: Awaited<ReturnType<typeof queryOwned>>[number]) {
    const payees = (await callTool(running, 'actual_list_payees', {}, payeesOutputSchema)).payees;
    const payeeName = transaction.payee ? payees.find(payee => payee.id === transaction.payee)?.name : undefined;
    expect(capturedIds.has(transaction.id), 'Refusing E2E cleanup for an uncaptured transaction id').toBe(true);
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
  });

  afterAll(async () => {
    let cleanupError: unknown;
    try {
      if (!running && environment.configured) running = await startMcp(DATA_DIR);
      if (running && accountId && importedId) {
        const remaining = await queryOwned();
        for (const transaction of remaining) {
          await assertSafeToDelete(transaction);
          await callTool(running, 'actual_delete_transaction', {
            transactionId: transaction.id,
            confirmDestructive: true
          }, transactionMutationOutputSchema);
        }
        expect(await queryOwned(), `Cleanup failed for transactionId=${transactionId || '[unknown]'} imported_id=${importedId}`).toHaveLength(0);
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
    expect(await queryOwned()).toHaveLength(0);
  });
});
