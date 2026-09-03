import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PublicBudgetMonth } from '../../src/actual/budget.js';
import {
  accountsOutputSchema,
  accountDeletionOutputSchema,
  accountMutationOutputSchema,
  budgetMonthOutputSchema,
  budgetAmountMutationOutputSchema,
  budgetCarryoverMutationOutputSchema,
  budgetCopyOutputSchema,
  budgetHoldOutputSchema,
  budgetResetHoldOutputSchema,
  bulkUpdateTransactionsOutputSchema,
  categoryDeletionOutputSchema,
  categoryGroupDeletionOutputSchema,
  categoryGroupMutationOutputSchema,
  categoryMutationOutputSchema,
  createTransferOutputSchema,
  categoriesOutputSchema,
  healthOutputSchema,
  getTransferOutputSchema,
  importTransactionsOutputSchema,
  listBudgetMonthsOutputSchema,
  payeesOutputSchema,
  payeeDeletionOutputSchema,
  payeeMergeOutputSchema,
  payeeMutationOutputSchema,
  payeeOutputSchema,
  previewImportOutputSchema,
  ruleDeletionOutputSchema,
  ruleMutationOutputSchema,
  ruleOutputSchema,
  rulesOutputSchema,
  syncOutputSchema,
  transactionOutputSchema,
  searchTransactionsOutputSchema,
  transactionMutationOutputSchema,
  transactionsOutputSchema
} from '../../src/mcp/contracts.js';
import { assertNoConfiguredSecrets, callTool, callToolExpectingError, type RunningMcp, startMcp } from './harness.js';
import { CARD_TEST_ACCOUNT_NAME, loadRealTestEnvironment, REQUIRED_TEST_ACCOUNT_NAME, skipMessage } from '../real/env.js';
import { matchesTemporaryTestPayee, TEMPORARY_TEST_PAYEE } from '../real/ownership.js';
import { assertPayeeWriteAllowed } from '../real/ownership.js';
import { permanentFixtureFingerprint } from '../real/fingerprint.js';
import { ResourceRegistry } from '../real/resources.js';
import { selectSafeBudgetTestMonths } from '../real/budget.js';

const TEST_DATE = '2026-08-30';
const OPENING_RANGE_START = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
const OPENING_RANGE_END = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
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
  let budgetCleanup: { categoryId: string; sourceMonth: string; targetMonth: string; holdApplied: boolean } | undefined;
  const registry = new ResourceRegistry();

  function fingerprintReader() {
    return {
      listAccounts: async () => (await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema)).accounts,
      listCategories: async () => (await callTool(running, 'actual_list_categories', {}, categoriesOutputSchema)).categoryGroups,
      listPayees: async () => (await callTool(running, 'actual_list_payees', {}, payeesOutputSchema)).payees,
      listRules: async () => (await callTool(running, 'actual_list_rules', {}, rulesOutputSchema)).rules,
      getTransactions: async (targetAccountId: string, startDate: string, endDate: string) =>
        (await callTool(running, 'actual_get_transactions', { accountId: targetAccountId, startDate, endDate }, transactionsOutputSchema)).transactions,
      listBudgetMonths: async () => callTool(running, 'actual_list_budget_months', {}, listBudgetMonthsOutputSchema),
      getBudgetMonth: async (month: string) =>
        await callTool(running, 'actual_get_budget_month', { month }, budgetMonthOutputSchema) as PublicBudgetMonth
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
        if (budgetCleanup) {
          await callTool(running, 'actual_set_budget_amount', { month: budgetCleanup.sourceMonth, categoryId: budgetCleanup.categoryId, amount: 0 }, budgetAmountMutationOutputSchema);
          await callTool(running, 'actual_set_budget_amount', { month: budgetCleanup.targetMonth, categoryId: budgetCleanup.categoryId, amount: 0 }, budgetAmountMutationOutputSchema);
          await callTool(running, 'actual_set_budget_carryover', { month: budgetCleanup.sourceMonth, categoryId: budgetCleanup.categoryId, carryover: false }, budgetCarryoverMutationOutputSchema);
          if (budgetCleanup.holdApplied) await callTool(running, 'actual_reset_budget_hold', { month: budgetCleanup.sourceMonth }, budgetResetHoldOutputSchema);
          budgetCleanup = undefined;
        }
        await registry.cleanup({
          transaction: async resource => { await callTool(running, 'actual_delete_transaction', { transactionId: resource.id, confirmDestructive: true }, transactionMutationOutputSchema); },
          verifyTransactionsAbsent: async ids => {
            for (const id of ids) expect((await callToolExpectingError(running, 'actual_get_transaction', { transactionId: id })).structuredContent)
              .toMatchObject({ error: { code: 'NOT_FOUND' } });
          },
          rule: async resource => { await callTool(running, 'actual_delete_rule', { ruleId: resource.id, confirmDestructive: true }, ruleDeletionOutputSchema); },
          payee: async resource => { assertPayeeWriteAllowed(resource.name, 'delete'); await callTool(running, 'actual_delete_payee', { payeeId: resource.id, confirmDestructive: true }, payeeDeletionOutputSchema); },
          category: async resource => { await callTool(running, 'actual_delete_category', { categoryId: resource.id, confirmDestructive: true }, categoryDeletionOutputSchema); },
          categoryGroup: async resource => { await callTool(running, 'actual_delete_category_group', { groupId: resource.id, confirmDestructive: true }, categoryGroupDeletionOutputSchema); },
          account: async resource => { await callTool(running, 'actual_delete_account', { accountId: resource.id, confirmDestructive: true }, accountDeletionOutputSchema); }
        });
        registry.assertEmpty();
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

  it('previews, creates, verifies, owns, and deletes one reciprocal transfer through compiled stdio', async () => {
    const accounts = (await callTool(running, 'actual_list_accounts', {}, accountsOutputSchema)).accounts;
    const other = accounts.find(account => account.name === CARD_TEST_ACCOUNT_NAME);
    expect(other, `Missing account ${CARD_TEST_ACCOUNT_NAME}`).toBeDefined();
    const before = await permanentFixtureFingerprint(fingerprintReader());
    const request = { fromAccountId: accountId, toAccountId: other!.id, amount: 321, date: TEST_DATE };
    expect(await callTool(running, 'actual_create_transfer', request, createTransferOutputSchema)).toMatchObject({ dryRun: true, executed: false });
    expect(await permanentFixtureFingerprint(fingerprintReader())).toBe(before);
    const created = await callTool(running, 'actual_create_transfer', {
      ...request, dryRun: false, confirmWrite: true
    }, createTransferOutputSchema);
    expect(created).toMatchObject({ verified: true, pair: { integrity: 'VALID' } });
    const ids = [created.pair!.transactionA!.id, created.pair!.transactionB!.id] as const;
    registry.registerTransferPair(created.pair!.pairKey, ids, `transfer-${randomUUID()}`);
    expect(await callTool(running, 'actual_get_transfer', { transactionId: ids[0] }, getTransferOutputSchema)).toMatchObject({ pairKey: created.pair!.pairKey });
    expect(await callTool(running, 'actual_delete_transaction', {
      transactionId: ids[0], confirmDestructive: true
    }, transactionMutationOutputSchema)).toMatchObject({ deletedTransferPair: true, verified: true });
    registry.releaseTransferPair(created.pair!.pairKey);
    for (const id of ids) expect((await callToolExpectingError(running, 'actual_get_transaction', { transactionId: id })).structuredContent)
      .toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(await permanentFixtureFingerprint(fingerprintReader())).toBe(before);
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

  it('previews without mutation, binds fingerprinted import, and verifies lookup/search through compiled stdio', async () => {
    const runId = randomUUID();
    const previewImportedId = `mcp-e2e-preview:${runId}`;
    const request = {
      accountId,
      transactions: [{
        date: TEST_DATE, amount: -432, imported_id: previewImportedId,
        imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE,
        notes: 'MCP E2E PREVIEW TEMPORARY'
      }]
    };
    const before = await permanentFixtureFingerprint(fingerprintReader());
    const preview = await callTool(running, 'actual_preview_import', request, previewImportOutputSchema);
    expect(preview).toMatchObject({ wouldAddCount: 1, wouldUpdateCount: 0, errorCount: 0 });
    expect(await permanentFixtureFingerprint(fingerprintReader())).toBe(before);
    const mismatch = await callToolExpectingError(running, 'actual_import_transactions', {
      ...request, transactions: [{ ...request.transactions[0], amount: -433 }], expectedPreviewFingerprint: preview.requestFingerprint
    });
    expect(mismatch.structuredContent).toMatchObject({ error: { code: 'PREVIEW_FINGERPRINT_MISMATCH' } });
    assertNoConfiguredSecrets(mismatch);
    const imported = await callTool(running, 'actual_import_transactions', {
      ...request, expectedPreviewFingerprint: preview.requestFingerprint
    }, importTransactionsOutputSchema);
    for (const id of imported.added) registry.register('transaction', id, previewImportedId);
    const exact = await callTool(running, 'actual_get_transaction', { transactionId: imported.added[0] }, transactionOutputSchema);
    expect(exact.transaction).toMatchObject({ id: imported.added[0], imported_id: previewImportedId });
    const searched = await callTool(running, 'actual_search_transactions', {
      startDate: TEST_DATE, endDate: TEST_DATE, transactionIds: imported.added, includeTotals: true
    }, searchTransactionsOutputSchema);
    expect(searched.transactions.map(item => item.id)).toEqual(imported.added);
    const repeated = await callTool(running, 'actual_import_transactions', {
      ...request, expectedPreviewFingerprint: preview.requestFingerprint
    }, importTransactionsOutputSchema);
    expect(repeated.added).toEqual([]);
    expect((await callTool(running, 'actual_search_transactions', {
      startDate: TEST_DATE, endDate: TEST_DATE, transactionIds: imported.added
    }, searchTransactionsOutputSchema)).transactions.map(item => item.id)).toEqual(imported.added);
    for (const id of imported.added) {
      await callTool(running, 'actual_delete_transaction', { transactionId: id, confirmDestructive: true }, transactionMutationOutputSchema);
      registry.release('transaction', id);
    }
  });

  it('runs bulk dry-run, confirmation, heterogeneous execution, exact read-back, and idempotent repeat through compiled stdio', async () => {
    const runId = randomUUID();
    const group = await callTool(running, 'actual_create_category_group', {
      name: `MCP_E2E_BULK_GROUP_${runId}`
    }, categoryGroupMutationOutputSchema);
    registry.register('categoryGroup', group.categoryGroup.id, group.categoryGroup.name);
    const categoryA = await callTool(running, 'actual_create_category', {
      name: `MCP_E2E_BULK_CATEGORY_A_${runId}`, groupId: group.categoryGroup.id
    }, categoryMutationOutputSchema);
    const categoryB = await callTool(running, 'actual_create_category', {
      name: `MCP_E2E_BULK_CATEGORY_B_${runId}`, groupId: group.categoryGroup.id
    }, categoryMutationOutputSchema);
    registry.register('category', categoryA.category.id, categoryA.category.name);
    registry.register('category', categoryB.category.id, categoryB.category.name);
    const payeeA = await callTool(running, 'actual_create_payee', { name: `Mcp E2e Bulk Payee A ${runId}` }, payeeMutationOutputSchema);
    const payeeB = await callTool(running, 'actual_create_payee', { name: `Mcp E2e Bulk Payee B ${runId}` }, payeeMutationOutputSchema);
    registry.register('payee', payeeA.payee.id, payeeA.payee.name);
    registry.register('payee', payeeB.payee.id, payeeB.payee.name);
    const imported = await callTool(running, 'actual_import_transactions', {
      accountId,
      transactions: [0, 1, 2].map(index => ({
        date: TEST_DATE, amount: -500 - index, imported_id: `mcp-e2e-bulk:${runId}:${index}`,
        imported_payee: index === 1 ? payeeB.payee.name : payeeA.payee.name,
        payee_name: index === 1 ? payeeB.payee.name : payeeA.payee.name,
        notes: `MCP E2E BULK ${index}`
      }))
    }, importTransactionsOutputSchema);
    expect(imported.added).toHaveLength(3);
    for (const id of imported.added) registry.register('transaction', id, `bulk-${runId}`);
    const items = [
      { transactionId: imported.added[0]!, fields: { category: categoryA.category.id, notes: 'MCP E2E BULK REVIEWED A' } },
      { transactionId: imported.added[1]!, fields: { category: categoryB.category.id, payee: payeeB.payee.id, cleared: true } },
      { transactionId: imported.added[2]!, fields: { notes: null, cleared: false } }
    ];
    const beforeDryRun = await permanentFixtureFingerprint(fingerprintReader());
    expect(await callTool(running, 'actual_bulk_update_transactions', { items }, bulkUpdateTransactionsOutputSchema)).toMatchObject({
      dryRun: true, executed: false, executable: true, counts: { requested: 3, blocked: 0 }
    });
    expect(await permanentFixtureFingerprint(fingerprintReader())).toBe(beforeDryRun);
    expect((await callToolExpectingError(running, 'actual_bulk_update_transactions', { items, dryRun: false })).structuredContent)
      .toMatchObject({ error: { code: 'WRITE_CONFIRMATION_REQUIRED' } });
    const transferSearch = await callTool(running, 'actual_search_transactions', {
      startDate: '2026-08-01', endDate: '2026-08-31', limit: 250
    }, searchTransactionsOutputSchema);
    const transfer = transferSearch.transactions.find(transaction => transaction.transfer_id != null);
    if (transfer) {
      const protectedItems = [{ transactionId: transfer.id, fields: { notes: 'must remain unchanged' } }];
      expect(await callTool(running, 'actual_bulk_update_transactions', { items: protectedItems }, bulkUpdateTransactionsOutputSchema))
        .toMatchObject({ executable: false, items: [{ reason: 'TRANSFER_PROTECTED' }] });
      expect((await callToolExpectingError(running, 'actual_bulk_update_transactions', {
        items: protectedItems, dryRun: false, confirmWrite: true
      })).structuredContent).toMatchObject({ error: { code: 'BULK_PREFLIGHT_FAILED' } });
    }
    const executed = await callTool(running, 'actual_bulk_update_transactions', {
      items, dryRun: false, confirmWrite: true
    }, bulkUpdateTransactionsOutputSchema);
    expect(executed).toMatchObject({ executed: true, synchronized: true, verified: true });
    expect(await callTool(running, 'actual_bulk_update_transactions', {
      items, dryRun: false, confirmWrite: true
    }, bulkUpdateTransactionsOutputSchema)).toMatchObject({
      executed: true, synchronized: false, verified: true, counts: { wouldUpdate: 0, unchanged: 3 }
    });
    for (const id of imported.added) {
      await callTool(running, 'actual_delete_transaction', { transactionId: id, confirmDestructive: true }, transactionMutationOutputSchema);
      registry.release('transaction', id);
    }
    for (const payee of [payeeA, payeeB]) {
      await callTool(running, 'actual_delete_payee', { payeeId: payee.payee.id, confirmDestructive: true }, payeeDeletionOutputSchema);
      registry.release('payee', payee.payee.id);
    }
    for (const category of [categoryA, categoryB]) {
      await callTool(running, 'actual_delete_category', { categoryId: category.category.id, confirmDestructive: true }, categoryDeletionOutputSchema);
      registry.release('category', category.category.id);
    }
    await callTool(running, 'actual_delete_category_group', { groupId: group.categoryGroup.id, confirmDestructive: true }, categoryGroupDeletionOutputSchema);
    registry.release('categoryGroup', group.categoryGroup.id);
  });

  it('runs a restart-safe payee lifecycle through MCP-only calls', async () => {
    const runId = randomUUID();
    const originalName = `Mcp E2e Payee ${runId}`;
    const renamedName = `Mcp E2e Payee Renamed ${runId}`;
    const created = await callTool(running, 'actual_create_payee', { name: originalName }, payeeMutationOutputSchema);
    registry.register('payee', created.payee.id, originalName);
    expect((await callTool(running, 'actual_get_payee', { payeeId: created.payee.id }, payeeOutputSchema)).payee.name).toBe(originalName);
    expect((await callTool(running, 'actual_create_payee', { name: originalName }, payeeMutationOutputSchema)).changed).toBe(false);
    assertPayeeWriteAllowed(originalName, 'rename');
    const renamed = await callTool(running, 'actual_update_payee', { payeeId: created.payee.id, name: renamedName }, payeeMutationOutputSchema);
    expect(renamed).toMatchObject({ changed: true, payee: { name: renamedName } });
    registry.release('payee', created.payee.id);
    registry.register('payee', created.payee.id, renamedName);
    await restart();
    expect((await callTool(running, 'actual_get_payee', { payeeId: created.payee.id }, payeeOutputSchema)).payee.name).toBe(renamedName);
    const refusal = await callToolExpectingError(running, 'actual_delete_payee', { payeeId: created.payee.id });
    expect(refusal.structuredContent).toMatchObject({ error: { code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED' } });
    assertNoConfiguredSecrets(refusal);
    assertPayeeWriteAllowed(renamedName, 'delete');
    await callTool(running, 'actual_delete_payee', { payeeId: created.payee.id, confirmDestructive: true }, payeeDeletionOutputSchema);
    registry.release('payee', created.payee.id);
    await callToolExpectingError(running, 'actual_get_payee', { payeeId: created.payee.id });
  });

  it('merges uniquely owned payees with an owned source transaction through MCP-only calls', async () => {
    const runId = randomUUID();
    const sourceName = `Mcp E2e Merge Source ${runId}`;
    const targetName = `Mcp E2e Merge Target ${runId}`;
    const source = await callTool(running, 'actual_create_payee', { name: sourceName }, payeeMutationOutputSchema);
    const target = await callTool(running, 'actual_create_payee', { name: targetName }, payeeMutationOutputSchema);
    registry.register('payee', source.payee.id, sourceName);
    registry.register('payee', target.payee.id, targetName);
    const mergeImportedId = `mcp-e2e-merge:${runId}`;
    const imported = await callTool(running, 'actual_import_transactions', {
      accountId,
      transactions: [{ date: TEST_DATE, amount: -654, imported_id: mergeImportedId, imported_payee: sourceName, payee_name: sourceName }]
    }, importTransactionsOutputSchema);
    for (const id of imported.added) registry.register('transaction', id, mergeImportedId);
    const preflight = await callToolExpectingError(running, 'actual_merge_payees', {
      sourcePayeeIds: [source.payee.id], targetPayeeId: target.payee.id
    });
    expect(preflight.structuredContent).toMatchObject({
      error: { code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED', details: { impacts: [expect.objectContaining({ relatedTransactionCount: 1 })] } }
    });
    assertPayeeWriteAllowed(sourceName, 'merge');
    assertPayeeWriteAllowed(targetName, 'merge');
    const merged = await callTool(running, 'actual_merge_payees', {
      sourcePayeeIds: [source.payee.id], targetPayeeId: target.payee.id, confirmDestructive: true
    }, payeeMergeOutputSchema);
    expect(merged).toMatchObject({ targetPayee: { id: target.payee.id }, mergedSourcePayeeIds: [source.payee.id] });
    registry.release('payee', source.payee.id);
    await restart();
    await callToolExpectingError(running, 'actual_get_payee', { payeeId: source.payee.id });
    const remapped = (await callTool(running, 'actual_get_transactions', {
      accountId, startDate: TEST_DATE, endDate: TEST_DATE
    }, transactionsOutputSchema)).transactions.find(transaction => imported.added.includes(transaction.id));
    expect(remapped).toMatchObject({ payee: target.payee.id });
    for (const id of imported.added) {
      await callTool(running, 'actual_delete_transaction', { transactionId: id, confirmDestructive: true }, transactionMutationOutputSchema);
      registry.release('transaction', id);
    }
    await callTool(running, 'actual_delete_payee', { payeeId: target.payee.id, confirmDestructive: true }, payeeDeletionOutputSchema);
    registry.release('payee', target.payee.id);
  });

  it('creates, updates, functionally executes, and deletes a rule using only MCP tool calls', async () => {
    const runId = randomUUID();
    const payeeName = `Mcp E2e Rule Payee ${runId}`;
    const rawPayee = `MCP_E2E_RULE_MATCH_${runId}`;
    const ruleImportedId = `mcp-e2e-rule:${runId}`;
    const payee = await callTool(running, 'actual_create_payee', { name: payeeName }, payeeMutationOutputSchema);
    registry.register('payee', payee.payee.id, payeeName);
    const created = await callTool(running, 'actual_create_rule', {
      stage: 'pre', conditionsOp: 'and',
      conditions: [{ field: 'imported_payee', op: 'contains', value: rawPayee }],
      actions: [{ op: 'set', field: 'payee', value: payee.payee.id }]
    }, ruleMutationOutputSchema);
    registry.register('rule', created.rule.id, `rule-${runId}`);
    expect((await callTool(running, 'actual_get_rule', { ruleId: created.rule.id }, ruleOutputSchema)).rule).toEqual(created.rule);
    expect((await callTool(running, 'actual_update_rule', { ruleId: created.rule.id, stage: 'default' }, ruleMutationOutputSchema)).rule.stage).toBe('default');
    expect((await callTool(running, 'actual_update_rule', { ruleId: created.rule.id, stage: 'post' }, ruleMutationOutputSchema)).rule.stage).toBe('post');
    expect((await callTool(running, 'actual_update_rule', { ruleId: created.rule.id, stage: 'pre' }, ruleMutationOutputSchema)).rule.stage).toBe('pre');
    expect((await callTool(running, 'actual_update_rule', { ruleId: created.rule.id, stage: 'pre' }, ruleMutationOutputSchema)).changed).toBe(false);
    const refusal = await callToolExpectingError(running, 'actual_delete_rule', { ruleId: created.rule.id });
    expect(refusal.structuredContent).toMatchObject({ error: { code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED' } });

    const imported = await callTool(running, 'actual_import_transactions', {
      accountId,
      transactions: [{ date: TEST_DATE, amount: -777, imported_id: ruleImportedId, imported_payee: rawPayee, payee_name: rawPayee }]
    }, importTransactionsOutputSchema);
    for (const id of imported.added) registry.register('transaction', id, ruleImportedId);
    const functional = (await callTool(running, 'actual_get_transactions', {
      accountId, startDate: TEST_DATE, endDate: TEST_DATE
    }, transactionsOutputSchema)).transactions.find(transaction => imported.added.includes(transaction.id));
    expect(functional).toMatchObject({ payee: payee.payee.id });
    await callTool(running, 'actual_delete_rule', { ruleId: created.rule.id, confirmDestructive: true }, ruleDeletionOutputSchema);
    registry.release('rule', created.rule.id);
    expect((await callTool(running, 'actual_get_transactions', {
      accountId, startDate: TEST_DATE, endDate: TEST_DATE
    }, transactionsOutputSchema)).transactions.find(transaction => transaction.id === functional!.id)).toMatchObject({ payee: payee.payee.id });
    for (const id of imported.added) {
      await callTool(running, 'actual_delete_transaction', { transactionId: id, confirmDestructive: true }, transactionMutationOutputSchema);
      registry.release('transaction', id);
    }
    await callTool(running, 'actual_delete_payee', { payeeId: payee.payee.id, confirmDestructive: true }, payeeDeletionOutputSchema);
    registry.release('payee', payee.payee.id);
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
      accountId: account.account.id, startDate: OPENING_RANGE_START, endDate: OPENING_RANGE_END
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

  it('executes guarded budget writes and copy through compiled MCP stdio with exact cleanup', async () => {
    const listed = await callTool(running, 'actual_list_budget_months', {}, listBudgetMonthsOutputSchema);
    const selected = await selectSafeBudgetTestMonths({
      months: listed.months,
      getBudgetMonth: async month =>
        await callTool(running, 'actual_get_budget_month', { month }, budgetMonthOutputSchema) as PublicBudgetMonth
    });
    const runId = randomUUID();
    const group = await callTool(running, 'actual_create_category_group', { name: `MCP_E2E_BUDGET_GROUP_${runId}` }, categoryGroupMutationOutputSchema);
    registry.register('categoryGroup', group.categoryGroup.id, group.categoryGroup.name);
    const created = await callTool(running, 'actual_create_category', {
      name: `MCP_E2E_BUDGET_CATEGORY_${runId}`, groupId: group.categoryGroup.id
    }, categoryMutationOutputSchema);
    registry.register('category', created.category.id, created.category.name);
    budgetCleanup = { categoryId: created.category.id, ...selected, holdApplied: false };
    try {
      await callTool(running, 'actual_set_budget_amount', {
        month: selected.sourceMonth, categoryId: created.category.id, amount: 1234
      }, budgetAmountMutationOutputSchema);
      const carryover = await callTool(running, 'actual_set_budget_carryover', {
        month: selected.sourceMonth, categoryId: created.category.id, carryover: true
      }, budgetCarryoverMutationOutputSchema);
      expect(carryover.effectiveFromMonth).toBe(selected.sourceMonth);
      const preview = await callTool(running, 'actual_copy_budget_month', {
        sourceMonth: selected.sourceMonth, targetMonth: selected.targetMonth, includeCarryover: true
      }, budgetCopyOutputSchema);
      expect(preview).toMatchObject({ dryRun: true, executed: false, changed: true });
      const copied = await callTool(running, 'actual_copy_budget_month', {
        sourceMonth: selected.sourceMonth, targetMonth: selected.targetMonth, includeCarryover: true, dryRun: false
      }, budgetCopyOutputSchema);
      expect(copied).toMatchObject({ executed: true, synchronized: true, verified: true });
      expect(await callTool(running, 'actual_copy_budget_month', {
        sourceMonth: selected.sourceMonth, targetMonth: selected.targetMonth, includeCarryover: true, dryRun: false
      }, budgetCopyOutputSchema)).toMatchObject({ changed: false, executed: false });
      expect((await callToolExpectingError(running, 'actual_hold_budget_for_next_month', {
        month: selected.sourceMonth, amount: 0
      })).isError).toBe(true);
      const selectedDetail = await callTool(running, 'actual_get_budget_month', { month: selected.sourceMonth }, budgetMonthOutputSchema);
      if (selectedDetail.capabilities.holdForNextMonth) {
        const hold = await callTool(running, 'actual_hold_budget_for_next_month', { month: selected.sourceMonth, amount: 1 }, budgetHoldOutputSchema);
        budgetCleanup.holdApplied = hold.officialApplied;
        await callTool(running, 'actual_reset_budget_hold', { month: selected.sourceMonth }, budgetResetHoldOutputSchema);
        budgetCleanup.holdApplied = false;
      }
    } finally {
      await callTool(running, 'actual_set_budget_amount', { month: selected.sourceMonth, categoryId: created.category.id, amount: 0 }, budgetAmountMutationOutputSchema);
      await callTool(running, 'actual_set_budget_amount', { month: selected.targetMonth, categoryId: created.category.id, amount: 0 }, budgetAmountMutationOutputSchema);
      await callTool(running, 'actual_set_budget_carryover', { month: selected.sourceMonth, categoryId: created.category.id, carryover: false }, budgetCarryoverMutationOutputSchema);
      if (budgetCleanup?.holdApplied) await callTool(running, 'actual_reset_budget_hold', { month: selected.sourceMonth }, budgetResetHoldOutputSchema);
      budgetCleanup = undefined;
      await callTool(running, 'actual_delete_category', { categoryId: created.category.id, confirmDestructive: true }, categoryDeletionOutputSchema);
      registry.release('category', created.category.id);
      await callTool(running, 'actual_delete_category_group', { groupId: group.categoryGroup.id, confirmDestructive: true }, categoryGroupDeletionOutputSchema);
      registry.release('categoryGroup', group.categoryGroup.id);
    }
  });

  it('rejects negative payee and rule calls, unavailable tools, and remains safe and operational', async () => {
    const missing = `missing-${randomUUID()}`;
    const cases = [
      ['actual_get_payee', { payeeId: missing }],
      ['actual_get_rule', { ruleId: missing }],
      ['actual_create_payee', { name: '   ' }],
      ['actual_update_payee', { payeeId: missing, name: '' }],
      ['actual_merge_payees', { sourcePayeeIds: [missing], targetPayeeId: missing, confirmDestructive: true }],
      ['actual_update_rule', { ruleId: missing }],
      ['actual_get_transaction', { transactionId: '' }],
      ['actual_search_transactions', { startDate: '2026-01-02', endDate: '2026-01-01' }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', minAmount: 1.5 }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', accountIds: [''] }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', categoryIds: [''] }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', payeeIds: [''] }],
      ['actual_search_transactions', { startDate: '2026-01-01', endDate: '2026-01-02', text: '\0' }],
      ['actual_bulk_update_transactions', { items: [] }],
      ['actual_bulk_update_transactions', { items: [
        { transactionId: missing, fields: { notes: 'a' } }, { transactionId: missing, fields: { notes: 'b' } }
      ] }],
      ['actual_bulk_update_transactions', { items: [{ transactionId: missing, fields: {} }] }],
      ['actual_preview_import', { accountId, transactions: [{ date: TEST_DATE, amount: -1, imported_id: 'x' }], dryRun: false }],
      ['actual_import_transactions', { accountId, transactions: [{ date: TEST_DATE, amount: -1, imported_id: 'x' }], payeeNameNormalization: 'none' }],
      ['actual_create_rule', {
        stage: 'default', conditionsOp: 'and',
        conditions: [{ field: 'amount', op: 'contains', value: 100 }],
        actions: [{ op: 'delete-transaction', value: '' }]
      }],
      ['actual_create_rule', {
        stage: 'default', conditionsOp: 'and',
        conditions: [{ field: 'payee', op: 'is', value: missing }],
        actions: [{ op: 'set', field: 'notes', value: 'never' }]
      }]
    ] as const;
    for (const [name, args] of cases) {
      const result = await callToolExpectingError(running, name, args);
      assertNoConfiguredSecrets(result);
      expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
    }
    for (const [name, args] of [
      ['actual_bulk_update_transactions', { items: Array.from({ length: 101 }, (_, index) => ({ transactionId: `oversized-${index}`, fields: { cleared: true } })) }],
      ['actual_preview_import', { accountId, transactions: Array.from({ length: 501 }, (_, index) => ({ date: TEST_DATE, amount: -1, imported_id: `oversized-${index}` })) }]
    ] as const) {
      const result = await callToolExpectingError(running, name, args);
      assertNoConfiguredSecrets(result);
      expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
    }
    const listed = (await callTool(running, 'actual_list_payees', {}, payeesOutputSchema)).payees;
    const detailed = [];
    for (const payee of listed) detailed.push((await callTool(running, 'actual_get_payee', { payeeId: payee.id }, payeeOutputSchema)).payee);
    const transfer = detailed.find(payee => typeof payee.transferAccountId === 'string');
    expect(transfer).toBeDefined();
    const protectedResult = await callToolExpectingError(running, 'actual_update_payee', { payeeId: transfer!.id, name: 'Must Not Rename' });
    expect(protectedResult.structuredContent).toMatchObject({ error: { code: 'TRANSFER_PAYEE_PROTECTED' } });
    await expect(running.client.callTool({ name: 'actual_run_rules', arguments: {} })).rejects.toThrow('not found');
    await expect(running.client.callTool({ name: 'actual_preview_rule', arguments: {} })).rejects.toThrow('not found');
    expect(await callTool(running, 'actual_health', {}, healthOutputSchema)).toMatchObject({ connected: true, budgetLoaded: true });
    assertNoConfiguredSecrets(running.stderr());
  });
});
