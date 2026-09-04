import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActualClient } from '../src/actual/client.js';
import type { AdapterSchedule } from '../src/actual/adapter.js';
import { fakeAdapter } from './helpers.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function fixture() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-schedules-'));
  directories.push(dataDir);
  const api = fakeAdapter();
  const client = new ActualClient(api, async () => ({ serverUrl: 'http://actual.example:5006', password: 'test-only', syncId: 'budget', dataDir }));
  return { api, client };
}

const raw = (fields: Partial<AdapterSchedule> = {}): AdapterSchedule => ({
  id: 'schedule', name: 'Rent', account: 'account', payee: 'payee', amount: -100, amountOp: 'is',
  date: '2026-10-01', posts_transaction: true, completed: false, ...fields
});

describe('ActualClient schedule lifecycle', () => {
  it('lists with filters/pagination and performs exact list-based lookup', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getSchedules).mockResolvedValue([raw(), raw({ id: 'done', completed: true })]);
    await expect(client.listSchedules({ accountId: 'account', completed: false, limit: 1, offset: 0 })).resolves.toMatchObject({
      schedules: [{ id: 'schedule' }], page: { returned: 1, total: 1 }
    });
    await expect(client.getSchedule('done')).resolves.toMatchObject({ schedule: { id: 'done', completed: true } });
    await expect(client.getSchedule('missing')).rejects.toMatchObject({ code: 'SCHEDULE_NOT_FOUND' });
    await client.shutdown();
  });

  it('validates account and ordinary payee before creation', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'closed', name: 'Closed', closed: true }]);
    await expect(client.createSchedule({ accountId: 'closed', amount: { type: 'exact', amount: 0 }, date: { type: 'oneTime', date: '2026-10-01' }, postsTransaction: true }))
      .rejects.toMatchObject({ code: 'SCHEDULE_REFERENCE_INVALID' });
    expect(api.createSchedule).not.toHaveBeenCalled();
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Open', closed: false }]);
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'transfer', name: 'Transfer', transfer_acct: 'other' }]);
    await expect(client.createSchedule({ accountId: 'account', payeeId: 'transfer', amount: { type: 'exact', amount: -1 }, date: { type: 'oneTime', date: '2026-10-01' }, postsTransaction: true }))
      .rejects.toMatchObject({ code: 'SCHEDULE_REFERENCE_INVALID' });
    await client.shutdown();
  });

  it('creates, synchronizes once, and verifies exact-ID read-back', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Open', closed: false }]);
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'payee', name: 'Ordinary' }]);
    vi.mocked(api.createSchedule).mockResolvedValue('schedule');
    vi.mocked(api.getSchedules).mockResolvedValueOnce([]).mockResolvedValueOnce([raw()]);
    await expect(client.createSchedule({ name: 'Rent', accountId: 'account', payeeId: 'payee', amount: { type: 'exact', amount: -100 }, date: { type: 'oneTime', date: '2026-10-01' }, postsTransaction: true }))
      .resolves.toMatchObject({ success: true, changed: true, schedule: { id: 'schedule' } });
    expect(api.createSchedule).toHaveBeenCalledOnce();
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('reports create sync and read-back uncertainty without retrying creation', async () => {
    const syncFailure = await fixture();
    vi.mocked(syncFailure.api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Open', closed: false }]);
    vi.mocked(syncFailure.api.getSchedules).mockResolvedValue([]);
    vi.mocked(syncFailure.api.createSchedule).mockResolvedValue('schedule');
    vi.mocked(syncFailure.api.sync).mockRejectedValueOnce(new Error('network failure'));
    const draft = { accountId: 'account', amount: { type: 'exact' as const, amount: -100 }, date: { type: 'oneTime' as const, date: '2026-10-01' }, postsTransaction: true };
    await expect(syncFailure.client.createSchedule(draft)).rejects.toMatchObject({ code: 'MUTATION_SYNC_FAILED', metadata: { partialState: true } });
    expect(syncFailure.api.createSchedule).toHaveBeenCalledOnce();
    await syncFailure.client.shutdown();

    const readFailure = await fixture();
    vi.mocked(readFailure.api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Open', closed: false }]);
    vi.mocked(readFailure.api.getSchedules).mockResolvedValue([]);
    vi.mocked(readFailure.api.createSchedule).mockResolvedValue('schedule');
    await expect(readFailure.client.createSchedule(draft)).rejects.toMatchObject({ code: 'POST_MUTATION_READ_FAILED', metadata: { partialState: true } });
    expect(readFailure.api.createSchedule).toHaveBeenCalledOnce();
    await readFailure.client.shutdown();
  });

  it('returns no-op updates and reports sync/read-back uncertainty without retry', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'account', name: 'Open', closed: false }]);
    vi.mocked(api.getPayees).mockResolvedValue([{ id: 'payee', name: 'Ordinary' }]);
    vi.mocked(api.getSchedules).mockResolvedValue([raw()]);
    await expect(client.updateSchedule('schedule', { amount: { type: 'exact', amount: -100 } })).resolves.toMatchObject({ changed: false });
    expect(api.updateSchedule).not.toHaveBeenCalled();
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('network failure'));
    await expect(client.updateSchedule('schedule', { amount: { type: 'exact', amount: -200 } })).rejects.toMatchObject({ code: 'MUTATION_SYNC_FAILED', metadata: { partialState: true } });
    expect(api.updateSchedule).toHaveBeenCalledOnce();
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('requires confirmation and preserves captured linked history on delete', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getSchedules).mockResolvedValueOnce([raw()]);
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [{ id: 'posted' }] });
    await expect(client.deleteSchedule('schedule', false)).rejects.toMatchObject({ code: 'DESTRUCTIVE_CONFIRMATION_REQUIRED' });
    expect(api.deleteSchedule).not.toHaveBeenCalled();
    vi.mocked(api.getSchedules).mockResolvedValueOnce([raw()]).mockResolvedValueOnce([]);
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [{ id: 'posted' }] }).mockResolvedValueOnce({ data: [{ id: 'posted' }] });
    await expect(client.deleteSchedule('schedule', true)).resolves.toMatchObject({ success: true, deletedScheduleId: 'schedule', historicalTransactionsPreserved: true });
    expect(api.deleteSchedule).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('fails closed when delete verification cannot prove historical preservation', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getSchedules).mockResolvedValueOnce([raw()]).mockResolvedValueOnce([]);
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [{ id: 'posted' }] }).mockResolvedValueOnce({ data: [] });
    await expect(client.deleteSchedule('schedule', true)).rejects.toMatchObject({ code: 'POST_MUTATION_READ_FAILED', metadata: { partialState: true } });
    expect(api.deleteSchedule).toHaveBeenCalledOnce();
    await client.shutdown();
  });
});
