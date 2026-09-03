import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActualClient } from '../src/actual/client.js';
import type { AdapterTransaction } from '../src/actual/adapter.js';
import { fakeAdapter } from './helpers.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function harness() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-transfer-client-'));
  directories.push(dataDir);
  const api = fakeAdapter();
  const client = new ActualClient(api, async () => ({
    serverUrl: 'http://actual.example:5006', password: 'transfer-secret', syncId: 'budget', dataDir
  }));
  return { api, client };
}

const pair = (clearedFrom = false): AdapterTransaction[] => [
  { id: 'from-id', account: 'from', date: '2026-09-01', amount: -500, payee: 'to-payee', transfer_id: 'to-id', category: null, cleared: clearedFrom },
  { id: 'to-id', account: 'to', date: '2026-09-01', amount: 500, payee: 'from-payee', transfer_id: 'from-id', category: null, cleared: false }
];

describe('serialized transfer client operations', () => {
  it('lists valid transfer payees in normalized account order and rejects broken destinations', async () => {
    const { api, client } = await harness();
    vi.mocked(api.getAccounts).mockResolvedValue([
      { id: 'z', name: 'zeta', closed: false, offbudget: true },
      { id: 'a', name: 'Alpha', closed: false, offbudget: false }
    ]);
    vi.mocked(api.getTransferPayees).mockResolvedValue([
      { id: 'p-z', name: 'Z', transfer_acct: 'z' }, { id: 'p-a', name: 'A', transfer_acct: 'a' }
    ]);
    await expect(client.listTransferPayees()).resolves.toEqual([
      { id: 'p-a', name: 'A', accountId: 'a', accountName: 'Alpha', accountClosed: false, accountOffBudget: false },
      { id: 'p-z', name: 'Z', accountId: 'z', accountName: 'zeta', accountClosed: false, accountOffBudget: true }
    ]);
    vi.mocked(api.getTransferPayees).mockResolvedValue([{ id: 'broken', name: 'Broken', transfer_acct: 'missing' }]);
    await expect(client.listTransferPayees()).rejects.toMatchObject({ code: 'QUERY_SHAPE_INVALID' });
    await client.shutdown();
  });

  it('returns exact valid and broken pair evidence and rejects ordinary transactions', async () => {
    const { api, client } = await harness();
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [pair()[0]] })
      .mockResolvedValueOnce({ data: pair() });
    await expect(client.getTransfer('from-id')).resolves.toMatchObject({ integrity: 'VALID', fromTransaction: { id: 'from-id' } });
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [{
      id: 'ordinary', account: 'from', date: '2026-09-01', amount: -1, transfer_id: null
    }] });
    await expect(client.getTransfer('ordinary')).rejects.toMatchObject({ code: 'NOT_A_TRANSFER' });
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [{ id: 'broken', account: 'from', date: '2026-09-01', amount: -1, transfer_id: 'missing' }] })
      .mockResolvedValueOnce({ data: [{ id: 'broken', account: 'from', date: '2026-09-01', amount: -1, transfer_id: 'missing' }] });
    await expect(client.getTransfer('broken')).resolves.toMatchObject({ integrity: 'INVALID', reasonCodes: ['MISSING_COUNTERPART'] });
    await client.shutdown();
  });

  it('assembles and paginates transfer search before returning exact totals', async () => {
    const { api, client } = await harness();
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: pair() }).mockResolvedValueOnce({ data: pair() });
    await expect(client.searchTransfers({
      startDate: '2026-09-01', endDate: '2026-09-01', accountIds: ['from'],
      minMagnitude: 500, maxMagnitude: 500, integrity: 'VALID', sort: 'magnitude_desc', limit: 100, offset: 0
    })).resolves.toMatchObject({ counts: { matched: 1, valid: 1, invalid: 0 }, page: { returned: 1 } });
    await client.shutdown();
  });

  it('classifies diagnostics before filtering/pagination and refuses scan overflow', async () => {
    const { api, client } = await harness();
    const rows = [
      { id: 'a', account: 'one', date: '2026-09-01', amount: -100 },
      { id: 'b', account: 'two', date: '2026-09-01', amount: 100 },
      { id: 'c', account: 'three', date: '2026-09-01', amount: 100 }
    ];
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: rows });
    await expect(client.findPossibleTransfers({
      startDate: '2026-09-01', endDate: '2026-09-01', dateWindowDays: 0,
      classification: 'AMBIGUOUS', limit: 1, offset: 1
    })).resolves.toMatchObject({ counts: { matched: 2, unique: 0, ambiguous: 2 }, page: { returned: 1 } });
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: Array.from({ length: 5_001 }, (_, index) => ({
      id: `overflow-${index}`, account: 'one', date: '2026-09-01', amount: index + 1
    })) });
    await expect(client.findPossibleDuplicates({
      startDate: '2026-09-01', endDate: '2026-09-01', dateWindowDays: 3, limit: 100, offset: 0
    })).rejects.toMatchObject({ code: 'RESULT_LIMIT_EXCEEDED' });
    await client.shutdown();
  });

  it('keeps transfer creation dry-run pure and chooses the on-budget anchor', async () => {
    const { api, client } = await harness();
    vi.mocked(api.getAccounts).mockResolvedValue([
      { id: 'from', name: 'Tracking', closed: false, offbudget: true },
      { id: 'to', name: 'Checking', closed: false, offbudget: false }
    ]);
    vi.mocked(api.getTransferPayees).mockResolvedValue([
      { id: 'from-payee', name: 'Tracking', transfer_acct: 'from' },
      { id: 'to-payee', name: 'Checking', transfer_acct: 'to' }
    ]);
    vi.mocked(api.getCategories).mockResolvedValue([{ id: 'expense', name: 'Transfer expense', group_id: 'g', is_income: false }]);
    await expect(client.createTransfer({
      fromAccountId: 'from', toAccountId: 'to', amount: 500, date: '2026-09-01', categoryId: 'expense'
    })).resolves.toMatchObject({ dryRun: true, anchorAccountId: 'to', fromSide: { amount: -500, categoryId: null }, toSide: { amount: 500, categoryId: 'expense' } });
    expect(api.addTransactions).not.toHaveBeenCalled();
    expect(api.sync).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('creates, discovers, updates independent cleared state, synchronizes once, and verifies both sides', async () => {
    const { api, client } = await harness();
    vi.mocked(api.getAccounts).mockResolvedValue([
      { id: 'from', name: 'From', closed: false, offbudget: false },
      { id: 'to', name: 'To', closed: false, offbudget: false }
    ]);
    vi.mocked(api.getTransferPayees).mockResolvedValue([
      { id: 'from-payee', name: 'From', transfer_acct: 'from' },
      { id: 'to-payee', name: 'To', transfer_acct: 'to' }
    ]);
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: pair(false) })
      .mockResolvedValueOnce({ data: pair(true) });
    await expect(client.createTransfer({
      fromAccountId: 'from', toAccountId: 'to', amount: 500, date: '2026-09-01',
      fromCleared: true, toCleared: false, dryRun: false, confirmWrite: true
    })).resolves.toMatchObject({ executed: true, synchronized: true, verified: true, phase: 'verified', pair: { integrity: 'VALID' } });
    expect(api.addTransactions).toHaveBeenCalledWith('from', [expect.objectContaining({ amount: -500, payee: 'to-payee' })], { runTransfers: true });
    expect(api.updateTransaction).toHaveBeenCalledWith('from-id', { cleared: true });
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('reports phase and known IDs without retry or rollback when discovery is ambiguous', async () => {
    const { api, client } = await harness();
    vi.mocked(api.getAccounts).mockResolvedValue([
      { id: 'from', name: 'From', closed: false, offbudget: false },
      { id: 'to', name: 'To', closed: false, offbudget: false }
    ]);
    vi.mocked(api.getTransferPayees).mockResolvedValue([
      { id: 'from-payee', name: 'From', transfer_acct: 'from' },
      { id: 'to-payee', name: 'To', transfer_acct: 'to' }
    ]);
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [pair()[0]] });
    await expect(client.createTransfer({
      fromAccountId: 'from', toAccountId: 'to', amount: 500, date: '2026-09-01', dryRun: false, confirmWrite: true
    })).rejects.toMatchObject({
      code: 'TRANSFER_CREATION_PARTIAL_STATE', metadata: { partialState: true, details: { phase: 'created_unverified', knownIds: ['from-id'] } }
    });
    expect(api.addTransactions).toHaveBeenCalledOnce();
    expect(api.deleteTransaction).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('rejects invalid account/category combinations and unknown import payees before mutation', async () => {
    const { api, client } = await harness();
    vi.mocked(api.getAccounts).mockResolvedValue([
      { id: 'from', name: 'From', closed: false, offbudget: false },
      { id: 'to', name: 'To', closed: false, offbudget: false },
      { id: 'tracking', name: 'Tracking', closed: false, offbudget: true }
    ]);
    vi.mocked(api.getTransferPayees).mockResolvedValue([
      { id: 'from-payee', name: 'From', transfer_acct: 'from' },
      { id: 'to-payee', name: 'To', transfer_acct: 'to' },
      { id: 'tracking-payee', name: 'Tracking', transfer_acct: 'tracking' }
    ]);
    await expect(client.createTransfer({ fromAccountId: 'from', toAccountId: 'to', amount: 1, date: '2026-09-01', categoryId: 'missing' }))
      .rejects.toMatchObject({ code: 'INCOMPATIBLE_FILTERS' });
    await expect(client.createTransfer({ fromAccountId: 'from', toAccountId: 'tracking', amount: 1, date: '2026-09-01' }))
      .rejects.toMatchObject({ code: 'INVALID_REFERENCE' });
    vi.mocked(api.getPayees).mockResolvedValue([]);
    await expect(client.previewImport('from', [{ date: '2026-09-01', amount: -1, imported_id: 'i', payee: 'unknown' }]))
      .rejects.toMatchObject({ code: 'INVALID_REFERENCE' });
    expect(api.importTransactions).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('reports pair-aware update mirroring and verifies pair deletion with one official call', async () => {
    const { api, client } = await harness();
    const before = pair(false);
    const after = before.map(row => ({ ...row, notes: 'Mirrored' }));
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [before[0]] })
      .mockResolvedValueOnce({ data: before })
      .mockResolvedValueOnce({ data: after });
    vi.mocked(api.updateTransaction).mockResolvedValue([{ id: 'from-id' }, { id: 'to-id' }]);
    await expect(client.updateTransaction('from-id', { notes: 'Mirrored' })).resolves.toMatchObject({
      linkedTransferAffected: true, counterpartTransactionId: 'to-id', mirroredFields: ['notes']
    });
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [after[0]] })
      .mockResolvedValueOnce({ data: after })
      .mockResolvedValueOnce({ data: [] });
    vi.mocked(api.deleteTransaction).mockResolvedValue(after);
    await expect(client.deleteTransaction('from-id')).resolves.toMatchObject({
      affectedTransactionIds: ['from-id', 'to-id'], deletedTransferPair: true, verified: true
    });
    expect(api.deleteTransaction).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('refreshes transfer deletion once when the first exact read still observes a counterpart', async () => {
    const { api, client } = await harness();
    const rows = pair();
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [rows[0]] })
      .mockResolvedValueOnce({ data: rows })
      .mockResolvedValueOnce({ data: [rows[1]] })
      .mockResolvedValueOnce({ data: [] });
    vi.mocked(api.deleteTransaction).mockResolvedValue(rows);

    await expect(client.deleteTransaction('from-id')).resolves.toMatchObject({
      affectedTransactionIds: ['from-id', 'to-id'], deletedTransferPair: true, verified: true
    });
    expect(api.deleteTransaction).toHaveBeenCalledOnce();
    expect(api.sync).toHaveBeenCalledTimes(2);
    await client.shutdown();
  });

  it('fails transfer deletion verification when the counterpart remains after one refresh', async () => {
    const { api, client } = await harness();
    const rows = pair();
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [rows[0]] })
      .mockResolvedValueOnce({ data: rows })
      .mockResolvedValueOnce({ data: [rows[1]] })
      .mockResolvedValueOnce({ data: [rows[1]] });
    vi.mocked(api.deleteTransaction).mockResolvedValue(rows);

    await expect(client.deleteTransaction('from-id')).rejects.toMatchObject({
      code: 'POST_MUTATION_READ_FAILED',
      metadata: { details: { affectedTransactionIds: ['from-id', 'to-id'], remainingIds: ['to-id'] } }
    });
    expect(api.deleteTransaction).toHaveBeenCalledOnce();
    expect(api.sync).toHaveBeenCalledTimes(2);
    await client.shutdown();
  });

  it.each([
    ['side update', 'pair_discovered'],
    ['sync', 'side_updates_applied'],
    ['verification', 'synchronized']
  ])('reports the %s failure phase without automatic retry', async (failure, expectedPhase) => {
    const { api, client } = await harness();
    vi.mocked(api.getAccounts).mockResolvedValue([
      { id: 'from', name: 'From', closed: false, offbudget: false }, { id: 'to', name: 'To', closed: false, offbudget: false }
    ]);
    vi.mocked(api.getTransferPayees).mockResolvedValue([
      { id: 'from-payee', name: 'From', transfer_acct: 'from' }, { id: 'to-payee', name: 'To', transfer_acct: 'to' }
    ]);
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: pair(false) });
    if (failure === 'side update') vi.mocked(api.updateTransaction).mockRejectedValueOnce(new Error('side update failed'));
    if (failure === 'sync') vi.mocked(api.sync).mockRejectedValueOnce(new Error('sync failed'));
    if (failure === 'verification') vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [] });
    if (failure === 'sync' || failure === 'verification') {
      vi.mocked(api.aqlQuery).mockReset().mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: pair(true) });
      if (failure === 'verification') vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [] });
    }
    await expect(client.createTransfer({
      fromAccountId: 'from', toAccountId: 'to', amount: 500, date: '2026-09-01',
      fromCleared: true, dryRun: false, confirmWrite: true
    })).rejects.toMatchObject({ code: 'TRANSFER_CREATION_PARTIAL_STATE', metadata: { details: { phase: expectedPhase } } });
    expect(api.addTransactions).toHaveBeenCalledOnce();
    await client.shutdown();
  });
});
