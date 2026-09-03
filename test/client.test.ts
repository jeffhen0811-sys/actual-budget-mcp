import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActualClient } from '../src/actual/client.js';
import type { ActualConfig } from '../src/config.js';
import { PublicError } from '../src/errors.js';
import { fakeAdapter } from './helpers.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function fixture() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-client-'));
  directories.push(dataDir);
  const config: ActualConfig = { serverUrl: 'http://actual.local:5006', password: 'password-sentinel', syncId: 'budget', dataDir };
  const api = fakeAdapter();
  const client = new ActualClient(api, async () => config);
  return { api, client, config };
}

describe('ActualClient lifecycle and adapter orchestration', () => {
  it('shares one lazy initialization across concurrent first calls and serializes work', async () => {
    const { api, client } = await fixture();
    let release!: () => void;
    vi.mocked(api.downloadBudget).mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    const accounts = client.listAccounts();
    const payees = client.listPayees();
    const rules = client.listRules();
    await vi.waitFor(() => expect(api.downloadBudget).toHaveBeenCalledOnce());
    release();
    await Promise.all([accounts, payees, rules]);
    expect(api.init).toHaveBeenCalledOnce();
    expect(api.getAccounts).toHaveBeenCalledOnce();
    expect(api.getPayees).toHaveBeenCalledOnce();
    expect(api.getRules).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('clears a failed initialization so a later call can retry', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.downloadBudget).mockRejectedValueOnce(new Error('network failure')).mockResolvedValueOnce(undefined);
    await expect(client.listAccounts()).rejects.toMatchObject({ code: 'CONNECTION_ERROR' });
    await expect(client.listAccounts()).resolves.toEqual([]);
    expect(api.init).toHaveBeenCalledTimes(2);
    await client.shutdown();
  });

  it('prevents two processes from sharing the same cache directory', async () => {
    const { api, client, config } = await fixture();
    const otherApi = fakeAdapter();
    const other = new ActualClient(otherApi, async () => config);
    await client.listAccounts();
    await expect(other.listAccounts()).rejects.toMatchObject({ code: 'CACHE_IN_USE' });
    expect(otherApi.init).not.toHaveBeenCalled();
    await Promise.all([client.shutdown(), other.shutdown()]);
    expect(api.shutdown).toHaveBeenCalledOnce();
  });

  it('reports server connectivity independently from the loaded local budget', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getServerVersion).mockResolvedValue({ error: 'network-failure' });
    await expect(client.health()).resolves.toEqual({
      connected: false,
      server: 'http://actual.local:5006',
      budgetLoaded: true,
      diagnosticCode: 'network-failure'
    });
    await client.shutdown();
  });

  it('normalizes reads, retains accounts with balance errors, and rejects oversized results', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.getAccounts).mockResolvedValue([{ id: 'a', name: 'Conta Corrente', offbudget: false, closed: false }]);
    vi.mocked(api.getAccountBalance).mockRejectedValue(new Error('balance unavailable password=password-sentinel'));
    const accounts = await client.listAccounts();
    expect(accounts[0]).toMatchObject({ id: 'a', name: 'Conta Corrente' });
    expect(accounts[0]?.balanceError).not.toContain('password-sentinel');
    vi.mocked(api.getTransactions).mockResolvedValue(Array.from({ length: 5_001 }, (_, index) => ({
      id: String(index), account: 'a', date: '2026-01-01', amount: 1
    })));
    await expect(client.getTransactions('a', '2026-01-01', '2026-01-31')).rejects.toMatchObject({ code: 'RESULT_TOO_LARGE' });
    await client.shutdown();
  });

  it('imports idempotently and synchronizes every successful mutation', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.importTransactions).mockResolvedValue({ added: ['t1'], updated: [], updatedPreview: [], errors: [] });
    await expect(client.importTransactions('account', [{ date: '2026-01-01', amount: -1200, imported_id: 'pluggy:abc123' }]))
      .resolves.toMatchObject({ added: ['t1'], updated: [], errors: [], addedCount: 1, updatedCount: 0, errorCount: 0 });
    expect(api.importTransactions).toHaveBeenCalledWith('account', [{ account: 'account', date: '2026-01-01', amount: -1200, imported_id: 'pluggy:abc123' }], {
      defaultCleared: true, dryRun: false, reimportDeleted: false
    });
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('reports partial success when synchronization fails after a mutation', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('network failure'));
    await expect(client.updateTransaction('transaction', { notes: 'explicit note' })).rejects.toMatchObject({
      code: 'MUTATION_SYNC_FAILED', retryable: false,
      metadata: { recoveryAction: 'actual_sync', state: 'local_change_may_have_succeeded', partialState: true }
    });
    expect(api.updateTransaction).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('returns not found and does not sync when the SDK updates or deletes no transaction', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.updateTransaction).mockResolvedValue([]);
    vi.mocked(api.deleteTransaction).mockResolvedValue([]);
    await expect(client.updateTransaction('missing', { notes: 'none' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(client.deleteTransaction('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(api.sync).not.toHaveBeenCalled();
    await client.shutdown();
  });

  it('returns not found without a raw query and shuts the SDK down at most once', async () => {
    const { api, client } = await fixture();
    await expect(client.getAccount('missing')).rejects.toBeInstanceOf(PublicError);
    await Promise.all([client.shutdown(), client.shutdown()]);
    expect(api.shutdown).toHaveBeenCalledOnce();
  });
});
