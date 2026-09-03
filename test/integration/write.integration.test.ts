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
  CARD_TEST_ACCOUNT_NAME,
  REQUIRED_TEST_ACCOUNT_NAME,
  skipMessage
} from '../real/env.js';
import { matchesTemporaryTestPayee, TEMPORARY_TEST_PAYEE } from '../real/ownership.js';
import { assertPayeeWriteAllowed } from '../real/ownership.js';
import { permanentFixtureFingerprint } from '../real/fingerprint.js';
import { ResourceRegistry } from '../real/resources.js';
import { selectSafeBudgetTestMonths } from '../real/budget.js';

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
  let budgetCleanup: { categoryId: string; sourceMonth: string; targetMonth: string; holdApplied: boolean } | undefined;
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
        if (budgetCleanup) {
          await client.setBudgetAmount(budgetCleanup.sourceMonth, budgetCleanup.categoryId, 0);
          await client.setBudgetAmount(budgetCleanup.targetMonth, budgetCleanup.categoryId, 0);
          await client.setBudgetCarryover(budgetCleanup.sourceMonth, budgetCleanup.categoryId, false);
          if (budgetCleanup.holdApplied) await client.resetBudgetHold(budgetCleanup.sourceMonth);
          budgetCleanup = undefined;
        }
        await registry.cleanup({
          transaction: async resource => { await client.deleteTransaction(resource.id); },
          verifyTransactionsAbsent: async ids => {
            for (const id of ids) await expect(client.getTransaction(id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
          },
          rule: async resource => { await client.deleteRule(resource.id, true); },
          payee: async resource => { assertPayeeWriteAllowed(resource.name, 'delete'); await client.deletePayee(resource.id, true); },
          category: async resource => { await client.deleteCategory(resource.id); },
          categoryGroup: async resource => { await client.deleteCategoryGroup(resource.id); },
          account: async resource => { await client.deleteAccount(resource.id); }
        });
        registry.assertEmpty();
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

  it('previews, creates, verifies, owns, and deletes one reciprocal transfer pair', async () => {
    const accounts = await client.listAccounts();
    const other = accounts.find(account => account.name === CARD_TEST_ACCOUNT_NAME);
    expect(other, `Missing account ${CARD_TEST_ACCOUNT_NAME}`).toBeDefined();
    const before = await permanentFixtureFingerprint(client);
    const request = { fromAccountId: accountId, toAccountId: other!.id, amount: 321, date: TEST_DATE };
    await expect(client.createTransfer(request)).resolves.toMatchObject({ dryRun: true, executed: false, pair: null });
    expect(await permanentFixtureFingerprint(client)).toBe(before);
    const created = await client.createTransfer({ ...request, dryRun: false, confirmWrite: true });
    expect(created).toMatchObject({ verified: true, phase: 'verified', pair: { integrity: 'VALID' } });
    const ids = [created.pair!.transactionA!.id, created.pair!.transactionB!.id] as const;
    registry.registerTransferPair(created.pair!.pairKey, ids, `transfer-${randomUUID()}`);
    await expect(client.getTransfer(ids[0])).resolves.toMatchObject({ pairKey: created.pair!.pairKey, integrity: 'VALID' });
    await expect(client.deleteTransaction(ids[0])).resolves.toMatchObject({ deletedTransferPair: true, verified: true });
    registry.releaseTransferPair(created.pair!.pairKey);
    for (const id of ids) await expect(client.getTransaction(id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await permanentFixtureFingerprint(client)).toBe(before);
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

  it('proves official import preview purity and binds the reviewed request to execution', async () => {
    const runId = randomUUID();
    const previewImportedId = `mcp-integration-preview:${runId}`;
    const before = await permanentFixtureFingerprint(client);
    const started = performance.now();
    const preview = await client.previewImport(accountId, [{
      date: TEST_DATE,
      amount: -234,
      imported_id: previewImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE,
      payee_name: TEMPORARY_TEST_PAYEE,
      notes: 'MCP INTEGRATION PREVIEW TEMPORARY'
    }]);
    const previewMs = Math.round(performance.now() - started);
    expect(preview).toMatchObject({ wouldAddCount: 1, wouldUpdateCount: 0, errorCount: 0 });
    expect(preview.previewOnlyIds).toHaveLength(1);
    expect(await permanentFixtureFingerprint(client)).toBe(before);
    await expect(client.importTransactions(accountId, [{
      date: TEST_DATE,
      amount: -235,
      imported_id: previewImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE,
      payee_name: TEMPORARY_TEST_PAYEE,
      notes: 'MCP INTEGRATION PREVIEW TEMPORARY'
    }], {}, preview.requestFingerprint)).rejects.toMatchObject({ code: 'PREVIEW_FINGERPRINT_MISMATCH' });
    const imported = await client.importTransactions(accountId, [{
      date: TEST_DATE,
      amount: -234,
      imported_id: previewImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE,
      payee_name: TEMPORARY_TEST_PAYEE,
      notes: 'MCP INTEGRATION PREVIEW TEMPORARY'
    }], {}, preview.requestFingerprint);
    expect(imported.requestFingerprint).toBe(preview.requestFingerprint);
    for (const id of imported.added) registry.register('transaction', id, previewImportedId);
    expect(await client.getTransaction(imported.added[0]!)).toMatchObject({ imported_id: previewImportedId });
    for (const id of imported.added) {
      await client.deleteTransaction(id);
      registry.release('transaction', id);
    }
    console.info(`import-preview observation: items=1 previewMs=${previewMs}`);
  });

  it('observes the complete installed import-preview reconciliation matrix', async () => {
    const runId = randomUUID();
    const beforeMatrix = await permanentFixtureFingerprint(client);

    const existingImportedId = `mcp-integration-preview-existing:${runId}`;
    const existing = await client.importTransactions(accountId, [{
      date: TEST_DATE, amount: -8101, imported_id: existingImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE,
      notes: 'MCP PREVIEW EXISTING ORIGINAL', cleared: false
    }]);
    expect(existing.added).toHaveLength(1);
    registry.register('transaction', existing.added[0]!, existingImportedId);
    const existingPreview = await client.previewImport(accountId, [{
      date: TEST_DATE, amount: -8101, imported_id: existingImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE,
      notes: 'MCP PREVIEW EXISTING CHANGED', cleared: true
    }]);
    expect(existingPreview).toMatchObject({ wouldAddCount: 0, wouldUpdateCount: 1, errorCount: 0 });
    expect(existingPreview.existingTransactionIds).toContain(existing.added[0]);

    const manualSeedId = `mcp-integration-preview-manual-seed:${runId}`;
    const manual = await client.importTransactions(accountId, [{
      date: TEST_DATE, amount: -8102, imported_id: manualSeedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE,
      notes: 'MCP PREVIEW MANUAL ORIGINAL'
    }]);
    expect(manual.added).toHaveLength(1);
    registry.register('transaction', manual.added[0]!, manualSeedId);
    await client.updateTransaction(manual.added[0]!, { imported_id: null });
    const manualPreview = await client.previewImport(accountId, [{
      date: TEST_DATE, amount: -8102, imported_id: `mcp-integration-preview-manual:${runId}`,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE,
      notes: 'MCP PREVIEW MANUAL MATCHED'
    }]);
    expect(manualPreview).toMatchObject({ wouldAddCount: 0, wouldUpdateCount: 1, errorCount: 0 });
    expect(manualPreview.existingTransactionIds).toContain(manual.added[0]);

    const deletedImportedId = `mcp-integration-preview-deleted:${runId}`;
    const deleted = await client.importTransactions(accountId, [{
      date: TEST_DATE, amount: -8103, imported_id: deletedImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE
    }]);
    expect(deleted.added).toHaveLength(1);
    registry.register('transaction', deleted.added[0]!, deletedImportedId);
    await client.deleteTransaction(deleted.added[0]!);
    registry.release('transaction', deleted.added[0]!);
    const deletedDefaultPreview = await client.previewImport(accountId, [{
      date: TEST_DATE, amount: -8103, imported_id: deletedImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE
    }], { reimportDeleted: false });
    expect(deletedDefaultPreview).toMatchObject({ wouldAddCount: 0, ignoredCount: 1, errorCount: 0 });
    expect(deletedDefaultPreview.evidence).toContainEqual(expect.objectContaining({
      importedId: deletedImportedId,
      ignored: true
    }));
    const deletedReimportPreview = await client.previewImport(accountId, [{
      date: TEST_DATE, amount: -8103, imported_id: deletedImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE
    }], { reimportDeleted: true });
    expect(deletedReimportPreview).toMatchObject({ wouldAddCount: 1, errorCount: 0 });

    const rulePayeeName = `Mcp Preview Rule Payee ${runId}`;
    const rulePayee = await client.createPayee(rulePayeeName);
    registry.register('payee', rulePayee.payee.id, rulePayeeName);
    const rawRulePayee = `MCP_PREVIEW_RULE_${runId}`;
    const rule = await client.createRule({
      stage: 'pre', conditionsOp: 'and',
      conditions: [{ field: 'imported_payee', op: 'contains', value: rawRulePayee }],
      actions: [{ op: 'set', field: 'payee', value: rulePayee.payee.id }]
    });
    registry.register('rule', rule.rule.id, `preview-rule-${runId}`);
    const ruleImportedId = `mcp-integration-preview-rule:${runId}`;
    const ruleRequest = [{
      date: TEST_DATE, amount: -8104, imported_id: ruleImportedId,
      imported_payee: rawRulePayee, payee_name: rawRulePayee
    }];
    const beforeRulePreview = await permanentFixtureFingerprint(client);
    const rulePreview = await client.previewImport(accountId, ruleRequest);
    expect(rulePreview).toMatchObject({ wouldAddCount: 1, errorCount: 0 });
    expect(await permanentFixtureFingerprint(client)).toBe(beforeRulePreview);
    const ruleImport = await client.importTransactions(accountId, ruleRequest, {}, rulePreview.requestFingerprint);
    expect(ruleImport.added).toHaveLength(1);
    registry.register('transaction', ruleImport.added[0]!, ruleImportedId);
    expect(await client.getTransaction(ruleImport.added[0]!)).toMatchObject({ payee: rulePayee.payee.id });

    const titleRaw = `mcp preview title case ${runId}`;
    const titleImportedId = `mcp-integration-preview-title:${runId}`;
    const titlePreview = await client.previewImport(accountId, [{
      date: TEST_DATE, amount: -8105, imported_id: titleImportedId,
      imported_payee: titleRaw, payee_name: titleRaw
    }]);
    expect(titlePreview).toMatchObject({ wouldAddCount: 1, errorCount: 0 });
    const titleImport = await client.importTransactions(accountId, [{
      date: TEST_DATE, amount: -8105, imported_id: titleImportedId,
      imported_payee: titleRaw, payee_name: titleRaw
    }], {}, titlePreview.requestFingerprint);
    expect(titleImport.added).toHaveLength(1);
    registry.register('transaction', titleImport.added[0]!, titleImportedId);
    const titleTransaction = await client.getTransaction(titleImport.added[0]!);
    const titlePayee = (await client.listPayees()).find(payee => payee.id === titleTransaction.payee);
    expect(titlePayee).toBeDefined();
    registry.register('payee', titlePayee!.id, titlePayee!.name);
    expect(titlePayee!.name).not.toBe(titleRaw);
    expect(titlePayee!.name.toLowerCase()).toBe(titleRaw.toLowerCase());
    expect(titleTransaction).toMatchObject({ cleared: true, imported_payee: titleRaw });

    const unclearedImportedId = `mcp-integration-preview-uncleared:${runId}`;
    const unclearedPreview = await client.previewImport(accountId, [{
      date: TEST_DATE, amount: -8106, imported_id: unclearedImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE
    }], { defaultCleared: false });
    const unclearedImport = await client.importTransactions(accountId, [{
      date: TEST_DATE, amount: -8106, imported_id: unclearedImportedId,
      imported_payee: TEMPORARY_TEST_PAYEE, payee_name: TEMPORARY_TEST_PAYEE
    }], { defaultCleared: false }, unclearedPreview.requestFingerprint);
    expect(unclearedImport.added).toHaveLength(1);
    registry.register('transaction', unclearedImport.added[0]!, unclearedImportedId);
    expect(await client.getTransaction(unclearedImport.added[0]!)).toMatchObject({ cleared: false });

    const beforeErrorPreview = await permanentFixtureFingerprint(client);
    const errorPreview = await client.previewImport(accountId, [{
      date: TEST_DATE, amount: -8107.5, imported_id: `mcp-integration-preview-error:${runId}`
    }]);
    expect(errorPreview).toMatchObject({ wouldAddCount: 0, wouldUpdateCount: 0, errorCount: 1 });
    expect(await permanentFixtureFingerprint(client)).toBe(beforeErrorPreview);

    for (const id of [existing.added[0]!, manual.added[0]!, ruleImport.added[0]!, titleImport.added[0]!, unclearedImport.added[0]!]) {
      await client.deleteTransaction(id);
      registry.release('transaction', id);
    }
    await client.deleteRule(rule.rule.id, true);
    registry.release('rule', rule.rule.id);
    await client.deletePayee(rulePayee.payee.id, true);
    registry.release('payee', rulePayee.payee.id);
    await client.deletePayee(titlePayee!.id, true);
    registry.release('payee', titlePayee!.id);
    expect(await permanentFixtureFingerprint(client)).toBe(beforeMatrix);
  });

  it('records preview-100 and bulk-dry-run-50 observations with purity checks', async () => {
    const runId = randomUUID();
    const previewItems = Array.from({ length: 100 }, (_, index) => ({
      date: TEST_DATE,
      amount: -20_000 - index,
      imported_id: `mcp-integration-preview-volume:${runId}:${index}`,
      imported_payee: TEMPORARY_TEST_PAYEE,
      payee_name: TEMPORARY_TEST_PAYEE,
      notes: `MCP PREVIEW VOLUME ${index}`
    }));
    const beforePreview = await permanentFixtureFingerprint(client);
    const previewStarted = performance.now();
    const preview = await client.previewImport(accountId, previewItems);
    const preview100Ms = Math.round(performance.now() - previewStarted);
    expect(preview).toMatchObject({ wouldAddCount: 100, wouldUpdateCount: 0, errorCount: 0 });
    expect(preview.previewOnlyIds).toHaveLength(100);
    expect(await permanentFixtureFingerprint(client)).toBe(beforePreview);

    const bulkImportedIds = Array.from({ length: 50 }, (_, index) => `mcp-integration-bulk-volume:${runId}:${index}`);
    const imported = await client.importTransactions(accountId, bulkImportedIds.map((importedId, index) => ({
      date: TEST_DATE,
      amount: -30_000 - index,
      imported_id: importedId,
      imported_payee: TEMPORARY_TEST_PAYEE,
      payee_name: TEMPORARY_TEST_PAYEE,
      notes: `MCP BULK VOLUME ORIGINAL ${index}`
    })));
    expect(imported.added).toHaveLength(50);
    for (const id of imported.added) registry.register('transaction', id, `bulk-volume-${runId}`);
    const bulkItems = imported.added.map((id, index) => ({
      transactionId: id,
      fields: { notes: `MCP BULK VOLUME REVIEWED ${index}` }
    }));
    const beforeBulk = await permanentFixtureFingerprint(client);
    const bulkStarted = performance.now();
    const bulk = await client.bulkUpdateTransactions(bulkItems);
    const bulk50Ms = Math.round(performance.now() - bulkStarted);
    expect(bulk).toMatchObject({
      dryRun: true, executed: false, executable: true,
      counts: { requested: 50, matched: 50, wouldUpdate: 50, unchanged: 0, blocked: 0 }
    });
    expect(await permanentFixtureFingerprint(client)).toBe(beforeBulk);
    for (const id of imported.added) {
      await client.deleteTransaction(id);
      registry.release('transaction', id);
    }
    expect(await permanentFixtureFingerprint(client)).toBe(beforePreview);
    console.info(`advanced-volume observations: previewItems=100 previewMs=${preview100Ms} bulkItems=50 bulkDryRunMs=${bulk50Ms}`);
  });

  it('preflights and executes three heterogeneous bulk updates with exact cleanup and idempotent repeat', async () => {
    const runId = randomUUID();
    const group = await client.createCategoryGroup(`MCP_INTEGRATION_BULK_GROUP_${runId}`);
    registry.register('categoryGroup', group.categoryGroup.id, group.categoryGroup.name);
    const categoryA = await client.createCategory(`MCP_INTEGRATION_BULK_CATEGORY_A_${runId}`, group.categoryGroup.id);
    const categoryB = await client.createCategory(`MCP_INTEGRATION_BULK_CATEGORY_B_${runId}`, group.categoryGroup.id);
    registry.register('category', categoryA.category.id, categoryA.category.name);
    registry.register('category', categoryB.category.id, categoryB.category.name);
    const payeeA = await client.createPayee(`Mcp Integration Bulk Payee A ${runId}`);
    const payeeB = await client.createPayee(`Mcp Integration Bulk Payee B ${runId}`);
    registry.register('payee', payeeA.payee.id, payeeA.payee.name);
    registry.register('payee', payeeB.payee.id, payeeB.payee.name);

    const importedIds = [0, 1, 2].map(index => `mcp-integration-bulk:${runId}:${index}`);
    const imported = await client.importTransactions(accountId, importedIds.map((ownedId, index) => ({
      date: TEST_DATE,
      amount: -300 - index,
      imported_id: ownedId,
      imported_payee: index === 1 ? payeeB.payee.name : payeeA.payee.name,
      payee_name: index === 1 ? payeeB.payee.name : payeeA.payee.name,
      notes: `MCP INTEGRATION BULK ${index}`
    })));
    expect(imported.added).toHaveLength(3);
    for (const id of imported.added) registry.register('transaction', id, `bulk-${runId}`);
    const items = [
      { transactionId: imported.added[0]!, fields: { category: categoryA.category.id, notes: 'MCP BULK REVIEWED A' } },
      { transactionId: imported.added[1]!, fields: { category: categoryB.category.id, payee: payeeB.payee.id, cleared: true } },
      { transactionId: imported.added[2]!, fields: { notes: null, cleared: false } }
    ];
    const beforeDryRun = await permanentFixtureFingerprint(client);
    const started = performance.now();
    const preview = await client.bulkUpdateTransactions(items);
    const bulkDryRunMs = Math.round(performance.now() - started);
    expect(preview).toMatchObject({ dryRun: true, executed: false, executable: true, counts: { requested: 3, blocked: 0 } });
    expect(await permanentFixtureFingerprint(client)).toBe(beforeDryRun);
    await expect(client.bulkUpdateTransactions(items, { dryRun: false })).rejects.toMatchObject({ code: 'WRITE_CONFIRMATION_REQUIRED' });
    await expect(client.bulkUpdateTransactions([
      { transactionId: 'mcp-integration-missing-transaction', fields: { notes: 'blocked' } }
    ])).rejects.toMatchObject({ code: 'BULK_PREFLIGHT_FAILED' });
    await expect(client.bulkUpdateTransactions([
      { transactionId: imported.added[0]!, fields: { category: 'mcp-integration-missing-category' } }
    ])).rejects.toMatchObject({ code: 'BULK_PREFLIGHT_FAILED' });
    const executed = await client.bulkUpdateTransactions(items, { dryRun: false, confirmWrite: true });
    expect(executed).toMatchObject({ executed: true, synchronized: true, verified: true, updatedIds: expect.arrayContaining(imported.added) });
    const repeated = await client.bulkUpdateTransactions(items, { dryRun: false, confirmWrite: true });
    expect(repeated).toMatchObject({ executed: true, synchronized: false, verified: true, counts: { wouldUpdate: 0, unchanged: 3 } });
    for (const id of imported.added) {
      await client.deleteTransaction(id);
      registry.release('transaction', id);
    }
    await client.deletePayee(payeeA.payee.id, true);
    await client.deletePayee(payeeB.payee.id, true);
    registry.release('payee', payeeA.payee.id);
    registry.release('payee', payeeB.payee.id);
    await client.deleteCategory(categoryA.category.id);
    await client.deleteCategory(categoryB.category.id);
    registry.release('category', categoryA.category.id);
    registry.release('category', categoryB.category.id);
    await client.deleteCategoryGroup(group.categoryGroup.id);
    registry.release('categoryGroup', group.categoryGroup.id);
    console.info(`bulk-dry-run observation: items=3 bulkDryRunMs=${bulkDryRunMs}`);
  });

  it('runs the guarded real payee create, read, rename, preflight, and delete lifecycle', async () => {
    const runId = randomUUID();
    const originalName = `Mcp Integration Payee ${runId}`;
    const renamedName = `Mcp Integration Payee Renamed ${runId}`;
    assertPayeeWriteAllowed(originalName, 'reuse');
    const created = await client.createPayee(originalName);
    registry.register('payee', created.payee.id, originalName);
    expect(created).toMatchObject({ changed: true, payee: { name: originalName } });
    await expect(client.createPayee(originalName)).resolves.toMatchObject({ changed: false, payee: { id: created.payee.id } });
    await expect(client.getPayee(created.payee.id)).resolves.toMatchObject({ id: created.payee.id, name: originalName });
    assertPayeeWriteAllowed(originalName, 'rename');
    const renamed = await client.updatePayee(created.payee.id, renamedName);
    expect(renamed).toMatchObject({ changed: true, payee: { name: renamedName } });
    registry.release('payee', created.payee.id);
    registry.register('payee', created.payee.id, renamedName);
    await expect(client.deletePayee(created.payee.id, false)).rejects.toMatchObject({
      code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED', metadata: { details: { relatedTransactionCount: 0, relatedRuleCount: 0 } }
    });
    assertPayeeWriteAllowed(renamedName, 'delete');
    await expect(client.deletePayee(created.payee.id, true)).resolves.toMatchObject({ deletedPayeeId: created.payee.id });
    registry.release('payee', created.payee.id);
    await expect(client.getPayee(created.payee.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('merges uniquely owned ordinary payees and remaps an owned source transaction', async () => {
    const runId = randomUUID();
    const sourceName = `Mcp Integration Merge Source ${runId}`;
    const targetName = `Mcp Integration Merge Target ${runId}`;
    const source = await client.createPayee(sourceName);
    const target = await client.createPayee(targetName);
    registry.register('payee', source.payee.id, sourceName);
    registry.register('payee', target.payee.id, targetName);
    const mergeImportedId = `mcp-integration-merge:${runId}`;
    const imported = await client.importTransactions(accountId, [{
      date: TEST_DATE,
      amount: -321,
      imported_id: mergeImportedId,
      imported_payee: sourceName,
      payee_name: sourceName,
      notes: 'MCP INTEGRATION MERGE TEMPORARY'
    }]);
    expect(imported.errors).toEqual([]);
    for (const id of imported.added) registry.register('transaction', id, mergeImportedId);
    const sourceTransaction = (await currentTransactions()).find(transaction => imported.added.includes(transaction.id));
    expect(sourceTransaction).toMatchObject({ payee: source.payee.id });
    await expect(client.mergePayees([source.payee.id], target.payee.id, false)).rejects.toMatchObject({
      code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED',
      metadata: { details: { impacts: [expect.objectContaining({ relatedTransactionCount: 1 })] } }
    });
    assertPayeeWriteAllowed(sourceName, 'merge');
    assertPayeeWriteAllowed(targetName, 'merge');
    await expect(client.mergePayees([source.payee.id], target.payee.id, true)).resolves.toMatchObject({
      targetPayee: { id: target.payee.id }, mergedSourcePayeeIds: [source.payee.id]
    });
    registry.release('payee', source.payee.id);
    await expect(client.getPayee(source.payee.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await currentTransactions()).find(transaction => transaction.id === sourceTransaction!.id)).toMatchObject({ payee: target.payee.id });
    for (const id of imported.added) {
      await client.deleteTransaction(id);
      registry.release('transaction', id);
    }
    await client.deletePayee(target.payee.id, true);
    registry.release('payee', target.payee.id);
  });

  it('persists, updates, functionally executes, and deletes a uniquely owned rule', async () => {
    const runId = randomUUID();
    const payeeName = `Mcp Integration Rule Payee ${runId}`;
    const rawPayee = `MCP_RULE_MATCH_${runId}`;
    const ruleImportedId = `mcp-integration-rule:${runId}`;
    const payee = await client.createPayee(payeeName);
    registry.register('payee', payee.payee.id, payeeName);
    const created = await client.createRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ field: 'imported_payee', op: 'contains', value: rawPayee }],
      actions: [{ op: 'set', field: 'payee', value: payee.payee.id }]
    });
    registry.register('rule', created.rule.id, `rule-${runId}`);
    expect(created.rule).toMatchObject({ stage: 'pre', writable: true });
    expect((await client.listRules()).some(rule => rule.id === created.rule.id)).toBe(true);
    await expect(client.getRule(created.rule.id)).resolves.toEqual(created.rule);
    await expect(client.updateRule(created.rule.id, { stage: 'default' })).resolves.toMatchObject({ changed: true, rule: { stage: 'default' } });
    await expect(client.updateRule(created.rule.id, { stage: 'post' })).resolves.toMatchObject({ changed: true, rule: { stage: 'post' } });
    await expect(client.updateRule(created.rule.id, { stage: 'pre' })).resolves.toMatchObject({ changed: true, rule: { stage: 'pre' } });
    await expect(client.updateRule(created.rule.id, { stage: 'pre' })).resolves.toMatchObject({ changed: false });
    await expect(client.deleteRule(created.rule.id, false)).rejects.toMatchObject({ code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED' });

    const imported = await client.importTransactions(accountId, [{
      date: TEST_DATE,
      amount: -456,
      imported_id: ruleImportedId,
      imported_payee: rawPayee,
      payee_name: rawPayee,
      notes: 'MCP INTEGRATION RULE TEMPORARY'
    }]);
    expect(imported.errors).toEqual([]);
    for (const id of imported.added) registry.register('transaction', id, ruleImportedId);
    const functional = (await currentTransactions()).find(transaction => imported.added.includes(transaction.id));
    expect(functional).toMatchObject({ payee: payee.payee.id });

    await client.deleteRule(created.rule.id, true);
    registry.release('rule', created.rule.id);
    expect((await currentTransactions()).find(transaction => transaction.id === functional!.id)).toMatchObject({ payee: payee.payee.id });
    for (const id of imported.added) {
      await client.deleteTransaction(id);
      registry.release('transaction', id);
    }
    await client.deletePayee(payee.payee.id, true);
    registry.release('payee', payee.payee.id);
  });

  it('rejects invalid payee/rule operations and remains operational after every error', async () => {
    const missing = `missing-${randomUUID()}`;
    await expect(client.getPayee(missing)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(client.getRule(missing)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(client.createRule({
      stage: 'default', conditionsOp: 'and',
      conditions: [{ field: 'payee', op: 'is', value: missing }],
      actions: [{ op: 'set', field: 'notes', value: 'never' }]
    })).rejects.toMatchObject({ code: 'INVALID_REFERENCE' });
    await expect(client.createRule({ stage: 'default', conditionsOp: 'and', conditions: [], actions: [] }))
      .rejects.toMatchObject({ code: 'UNSUPPORTED_RULE_SHAPE' });
    const listed = await client.listPayees();
    const detailed = await Promise.all(listed.map(payee => client.getPayee(payee.id)));
    const transfer = detailed.find(payee => typeof payee.transferAccountId === 'string');
    expect(transfer).toBeDefined();
    await expect(client.updatePayee(transfer!.id, 'Must Not Rename')).rejects.toMatchObject({ code: 'TRANSFER_PAYEE_PROTECTED' });
    await expect(client.health()).resolves.toMatchObject({ connected: true, budgetLoaded: true });
  });

  it('uses dynamically selected clean months for verified budget amount, carryover, hold/reset, and copy writes', async () => {
    const selected = await selectSafeBudgetTestMonths({
      months: (await client.listBudgetMonths()).months,
      getBudgetMonth: month => client.getBudgetMonth(month)
    });
    const runId = randomUUID();
    const group = await client.createCategoryGroup(`MCP_INTEGRATION_BUDGET_GROUP_${runId}`);
    registry.register('categoryGroup', group.categoryGroup.id, group.categoryGroup.name);
    const created = await client.createCategory(`MCP_INTEGRATION_BUDGET_CATEGORY_${runId}`, group.categoryGroup.id);
    registry.register('category', created.category.id, created.category.name);
    budgetCleanup = { categoryId: created.category.id, ...selected, holdApplied: false };
    try {
      await expect(client.setBudgetAmount(selected.sourceMonth, created.category.id, 1234)).resolves.toMatchObject({ changed: true, currentAmount: 1234 });
      await expect(client.setBudgetAmount(selected.sourceMonth, created.category.id, 0)).resolves.toMatchObject({ changed: true, currentAmount: 0 });
      await expect(client.setBudgetAmount(selected.sourceMonth, created.category.id, -5)).resolves.toMatchObject({ changed: true, currentAmount: -5 });
      await expect(client.setBudgetAmount(selected.sourceMonth, created.category.id, 1234)).resolves.toMatchObject({ changed: true, currentAmount: 1234 });
      await expect(client.setBudgetCarryover(selected.sourceMonth, created.category.id, true)).resolves.toMatchObject({
        changed: true, effectiveFromMonth: selected.sourceMonth
      });
      const preview = await client.copyBudgetMonth(selected.sourceMonth, selected.targetMonth, { includeCarryover: true });
      expect(preview).toMatchObject({ dryRun: true, executed: false, changed: true });
      const copied = await client.copyBudgetMonth(selected.sourceMonth, selected.targetMonth, { dryRun: false, includeCarryover: true });
      expect(copied).toMatchObject({ executed: true, synchronized: true, verified: true });
      await expect(client.copyBudgetMonth(selected.sourceMonth, selected.targetMonth, { dryRun: false, includeCarryover: true }))
        .resolves.toMatchObject({ changed: false, executed: false });
      await expect(client.copyBudgetMonth(selected.sourceMonth, selected.sourceMonth)).rejects.toMatchObject({ code: 'INVALID_BUDGET_VALUE' });
      await expect(client.holdBudgetForNextMonth(selected.sourceMonth, 0)).rejects.toMatchObject({ code: 'INVALID_BUDGET_VALUE' });
      const selectedMonth = await client.getBudgetMonth(selected.sourceMonth);
      if (selectedMonth.capabilities.holdForNextMonth) {
        const hold = await client.holdBudgetForNextMonth(selected.sourceMonth, 1);
        budgetCleanup.holdApplied = hold.officialApplied;
        expect(hold.requestedAmount).toBe(1);
        await expect(client.resetBudgetHold(selected.sourceMonth)).resolves.toMatchObject({ success: true });
        budgetCleanup.holdApplied = false;
      }
    } finally {
      await client.setBudgetAmount(selected.sourceMonth, created.category.id, 0);
      await client.setBudgetAmount(selected.targetMonth, created.category.id, 0);
      await client.setBudgetCarryover(selected.sourceMonth, created.category.id, false);
      if (budgetCleanup?.holdApplied) await client.resetBudgetHold(selected.sourceMonth);
      budgetCleanup = undefined;
      await client.deleteCategory(created.category.id);
      registry.release('category', created.category.id);
      await client.deleteCategoryGroup(group.categoryGroup.id);
      registry.release('categoryGroup', group.categoryGroup.id);
    }
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
    const openingTransactions = await client.getTransactions(account.account.id, '1900-01-01', '2999-12-31');
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
