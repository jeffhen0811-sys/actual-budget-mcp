import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { planBulkTransactionUpdates } from '../src/actual/bulk.js';
import { ActualClient } from '../src/actual/client.js';
import type { AdapterTransaction } from '../src/actual/adapter.js';
import type { ActualConfig } from '../src/config.js';
import { bulkUpdateTransactionsInputSchema } from '../src/mcp/contracts.js';
import { fakeAdapter } from './helpers.js';
import { purityBoundaryFingerprint } from './purity-fingerprint.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

const transactions: AdapterTransaction[] = [
  { id: 'ordinary', account: 'a', date: '2026-09-01', amount: -100, category: 'c1', payee: 'p1', notes: null, cleared: false },
  { id: 'unchanged', account: 'a', date: '2026-09-02', amount: -200, category: 'c1', payee: 'p1', cleared: true },
  { id: 'transfer', account: 'a', date: '2026-09-03', amount: -300, transfer_id: 'paired', cleared: false },
  { id: 'parent', account: 'a', date: '2026-09-04', amount: -400, is_parent: true },
  { id: 'child', account: 'a', date: '2026-09-04', amount: -400, is_child: true, parent_id: 'parent' }
];

async function fixture() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-bulk-transactions-'));
  directories.push(dataDir);
  const config: ActualConfig = { serverUrl: 'http://actual.local:5006', password: 'secret', syncId: 'budget', dataDir };
  const api = fakeAdapter();
  vi.mocked(api.getCategories).mockResolvedValue([{ id: 'c1', name: 'One', group_id: 'g' }, { id: 'c2', name: 'Two', group_id: 'g' }]);
  vi.mocked(api.getPayees).mockResolvedValue([{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }, { id: 'transfer-payee', name: 'Transfer', transfer_acct: 'other' }]);
  return { api, client: new ActualClient(api, async () => config) };
}

describe('pure bulk transaction planner', () => {
  it('plans heterogeneous changes and unchanged desired states', () => {
    const plan = planBulkTransactionUpdates([
      { transactionId: 'ordinary', fields: { category: 'c2', notes: 'reviewed' } },
      { transactionId: 'unchanged', fields: { cleared: true } }
    ], transactions, new Set(['c1', 'c2']), new Set(['p1', 'p2']));
    expect(plan).toMatchObject({ executable: true, requested: 2, matched: 2, wouldUpdate: 1, unchanged: 1, blocked: 0 });
    expect(plan.items[0]).toMatchObject({ status: 'would_update', changedFields: ['category', 'notes'], before: { category: 'c1' }, after: { category: 'c2' } });
    expect(plan.items[1]).toMatchObject({ status: 'unchanged', changedFields: [] });
  });

  it('makes duplicate, missing, invalid-reference, and unproven null-clear failures global', () => {
    const cases = [
      [{ transactionId: 'ordinary', fields: { notes: 'a' } }, { transactionId: 'ordinary', fields: { notes: 'b' } }],
      [{ transactionId: 'missing', fields: { notes: 'a' } }],
      [{ transactionId: 'ordinary', fields: { category: 'missing-category' } }],
      [{ transactionId: 'ordinary', fields: { payee: 'missing-payee' } }],
      [{ transactionId: 'ordinary', fields: { category: null } }],
      [{ transactionId: 'ordinary', fields: { payee: null } }]
    ];
    for (const items of cases) expect(() => planBulkTransactionUpdates(
      items, transactions, new Set(['c1', 'c2']), new Set(['p1', 'p2'])
    )).toThrowError(expect.objectContaining({ code: 'BULK_PREFLIGHT_FAILED' }));
  });

  it('protects every split and transfer relational field while permitting transfer cleared state', () => {
    const plan = planBulkTransactionUpdates([
      { transactionId: 'parent', fields: { cleared: true } },
      { transactionId: 'child', fields: { notes: 'blocked' } },
      { transactionId: 'transfer', fields: { notes: 'blocked' } }
    ], transactions, new Set(['c1']), new Set(['p1']));
    expect(plan.executable).toBe(false);
    expect(plan.items.map(item => item.reason)).toEqual([
      'SPLIT_TRANSACTION_PROTECTED', 'SPLIT_TRANSACTION_PROTECTED', 'TRANSFER_PROTECTED'
    ]);
    expect(planBulkTransactionUpdates([
      { transactionId: 'transfer', fields: { cleared: true } }
    ], transactions, new Set(['c1']), new Set(['p1']))).toMatchObject({ executable: true, wouldUpdate: 1 });
  });

  it('strictly enforces non-empty unique batches and the 100-item maximum', () => {
    expect(() => bulkUpdateTransactionsInputSchema.parse({ items: [] })).toThrow();
    expect(() => bulkUpdateTransactionsInputSchema.parse({ items: [
      { transactionId: 'same', fields: { notes: 'a' } }, { transactionId: 'same', fields: { notes: 'b' } }
    ] })).toThrow();
    expect(() => bulkUpdateTransactionsInputSchema.parse({ items: Array.from({ length: 101 }, (_, index) => ({
      transactionId: `t${index}`, fields: { cleared: true }
    })) })).toThrow();
  });
});

describe('bulk transaction orchestration', () => {
  it('defaults to a pure dry-run with bounded audit details', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [transactions[0]] });
    const before = purityBoundaryFingerprint(api, transactions);
    const result = await client.bulkUpdateTransactions([{ transactionId: 'ordinary', fields: { notes: 'reviewed' } }]);
    expect(result).toMatchObject({
      dryRun: true, executed: false, synchronized: false, verified: false, executable: true,
      counts: { requested: 1, matched: 1, wouldUpdate: 1, unchanged: 0, blocked: 0 }
    });
    expect(api.updateTransaction).not.toHaveBeenCalled();
    expect(api.sync).not.toHaveBeenCalled();
    expect(purityBoundaryFingerprint(api, transactions)).toBe(before);
    await client.shutdown();
  });

  it('requires literal write confirmation before any Actual read or mutation', async () => {
    const { api, client } = await fixture();
    await expect(client.bulkUpdateTransactions([
      { transactionId: 'ordinary', fields: { notes: 'reviewed' } }
    ], { dryRun: false })).rejects.toMatchObject({ code: 'WRITE_CONFIRMATION_REQUIRED' });
    expect(api.aqlQuery).not.toHaveBeenCalled();
    expect(api.updateTransaction).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('executes serial local updates, synchronizes once, reads back exactly, and verifies desired state', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [transactions[0], transactions[1]] })
      .mockResolvedValueOnce({ data: [
        { ...transactions[0], category: 'c2', notes: 'reviewed' },
        transactions[1]
      ] });
    vi.mocked(api.updateTransaction).mockResolvedValueOnce([{ id: 'ordinary', category: 'c2' }]);
    const result = await client.bulkUpdateTransactions([
      { transactionId: 'ordinary', fields: { category: 'c2', notes: 'reviewed' } },
      { transactionId: 'unchanged', fields: { cleared: true } }
    ], { dryRun: false, confirmWrite: true });
    expect(result).toMatchObject({
      dryRun: false, executed: true, synchronized: true, verified: true,
      updatedIds: ['ordinary'], unchangedIds: ['unchanged'], affectedIds: ['ordinary']
    });
    expect(api.updateTransaction).toHaveBeenCalledOnce();
    expect(api.sync).toHaveBeenCalledOnce();
    expect(api.aqlQuery).toHaveBeenCalledTimes(2);
    await client.shutdown();
  });

  it('is idempotent when every desired state already matches and performs no sync', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [transactions[1]] });
    await expect(client.bulkUpdateTransactions([
      { transactionId: 'unchanged', fields: { cleared: true } }
    ], { dryRun: false, confirmWrite: true })).resolves.toMatchObject({
      executed: true, synchronized: false, verified: true, updatedIds: [], unchangedIds: ['unchanged']
    });
    expect(api.updateTransaction).not.toHaveBeenCalled();
    expect(api.sync).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('reports exact partial progress when a later local update fails without retrying', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [transactions[0], transactions[1]] });
    vi.mocked(api.updateTransaction)
      .mockResolvedValueOnce([{ id: 'ordinary' }])
      .mockRejectedValueOnce(new Error('local failure'));
    await expect(client.bulkUpdateTransactions([
      { transactionId: 'ordinary', fields: { notes: 'first' } },
      { transactionId: 'unchanged', fields: { notes: 'second' } }
    ], { dryRun: false, confirmWrite: true })).rejects.toMatchObject({
      code: 'BULK_PARTIAL_STATE', metadata: {
        state: 'synchronized_but_unverified', partialState: true,
        details: { failedPhase: 'local_update', attemptedIds: ['ordinary', 'unchanged'], completedIds: ['ordinary'], pendingIds: ['unchanged'] }
      }
    });
    expect(api.updateTransaction).toHaveBeenCalledTimes(2);
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('distinguishes sync and post-sync verification failures', async () => {
    const syncFixture = await fixture();
    vi.mocked(syncFixture.api.aqlQuery).mockResolvedValueOnce({ data: [transactions[0]] });
    vi.mocked(syncFixture.api.updateTransaction).mockResolvedValueOnce([{ id: 'ordinary' }]);
    vi.mocked(syncFixture.api.sync).mockRejectedValueOnce(new Error('sync failure'));
    await expect(syncFixture.client.bulkUpdateTransactions([
      { transactionId: 'ordinary', fields: { notes: 'changed' } }
    ], { dryRun: false, confirmWrite: true })).rejects.toMatchObject({
      code: 'BULK_PARTIAL_STATE', metadata: { state: 'local_change_may_have_succeeded', details: { failedPhase: 'sync' } }
    });
    await syncFixture.client.shutdown();

    const verifyFixture = await fixture();
    vi.mocked(verifyFixture.api.aqlQuery)
      .mockResolvedValueOnce({ data: [transactions[0]] })
      .mockResolvedValueOnce({ data: [transactions[0]] });
    vi.mocked(verifyFixture.api.updateTransaction).mockResolvedValueOnce([{ id: 'ordinary' }]);
    await expect(verifyFixture.client.bulkUpdateTransactions([
      { transactionId: 'ordinary', fields: { notes: 'changed' } }
    ], { dryRun: false, confirmWrite: true })).rejects.toMatchObject({
      code: 'BULK_VERIFICATION_FAILED', metadata: { state: 'synchronized_but_unverified', details: { failedVerificationIds: ['ordinary'] } }
    });
    await verifyFixture.client.shutdown();
  });
});
