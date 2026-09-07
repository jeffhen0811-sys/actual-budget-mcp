import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActualClient } from '../src/actual/client.js';
import { fakeAdapter } from './helpers.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

describe('runtime status and observed sync telemetry', () => {
  it('reports sanitized fresh/connected state, operational modes, and cache lock', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-status-'));
    directories.push(dataDir);
    const api = fakeAdapter();
    const client = new ActualClient(api, async () => ({ serverUrl: 'http://user:secret@actual.example:5006/private', password: 'secret', syncId: 'private-id', dataDir }), undefined, { readOnly: true, allowDestructive: false });
    const status = await client.runtimeStatus();
    expect(status).toMatchObject({ mcpVersion: '1.0.0', sdkVersion: '26.8.1', connected: true, budgetLoaded: true, server: 'http://actual.example:5006/private', modes: { readOnly: true, allowDestructive: false, effectiveWriteAllowed: false }, cache: { configured: true, locked: true }, queue: { queuedCount: 0 }, syncTelemetry: {} });
    expect(JSON.stringify(status)).not.toMatch(/secret|private-id|actual-status-/);
    await client.shutdown();
  });

  it('records success and sanitized failure in process lifetime only', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-telemetry-'));
    directories.push(dataDir);
    const api = fakeAdapter();
    const client = new ActualClient(api, async () => ({ serverUrl: 'http://actual.example:5006', password: 'secret', syncId: 'budget', dataDir }));
    await client.sync();
    await expect(client.runtimeStatus()).resolves.toMatchObject({ syncTelemetry: { lastSyncAttemptAt: expect.any(String), lastSuccessfulSyncAt: expect.any(String), lastSyncDurationMs: expect.any(Number) } });
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('network failure secret'));
    await expect(client.sync()).rejects.toMatchObject({ code: 'CONNECTION_ERROR' });
    const failed = await client.runtimeStatus();
    expect(failed.syncTelemetry).toMatchObject({ lastSyncErrorCode: 'CONNECTION_ERROR', lastSuccessfulSyncAt: expect.any(String) });
    expect(JSON.stringify(failed)).not.toContain('secret');
    await client.shutdown();
  });

  it('reports disconnected state without exposing the upstream message', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-disconnected-'));
    directories.push(dataDir);
    const api = fakeAdapter();
    vi.mocked(api.getServerVersion).mockResolvedValue({ error: 'no-server' });
    const client = new ActualClient(api, async () => ({ serverUrl: 'http://actual.example:5006', password: 'secret', syncId: 'budget', dataDir }));
    await expect(client.runtimeStatus()).resolves.toMatchObject({ connected: false, budgetLoaded: true, diagnosticCode: 'no-server' });
    await client.shutdown();
  });

  it('captures safe active-operation and queued-count state at status request time', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-queued-'));
    directories.push(dataDir);
    const api = fakeAdapter();
    let release!: (value: []) => void;
    vi.mocked(api.getAccounts).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const client = new ActualClient(api, async () => ({ serverUrl: 'http://actual.example:5006', password: 'secret', syncId: 'budget', dataDir }));
    const active = client.listAccounts();
    await vi.waitFor(() => expect(api.getAccounts).toHaveBeenCalledOnce());
    const queued = client.listPayees();
    const status = client.runtimeStatus();
    release([]);
    await expect(status).resolves.toMatchObject({ queue: { activeOperation: 'actual_list_accounts', queuedCount: 1 } });
    await Promise.all([active, queued]);
    await client.shutdown();
  });

  it('reports a cache lock conflict safely and resets telemetry in a restarted client', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-restart-'));
    directories.push(dataDir);
    const first = new ActualClient(fakeAdapter(), async () => ({ serverUrl: 'http://actual.example:5006', password: 'secret', syncId: 'budget', dataDir }));
    await first.sync();
    const locked = new ActualClient(fakeAdapter(), async () => ({ serverUrl: 'http://actual.example:5006', password: 'secret', syncId: 'budget', dataDir }));
    await expect(locked.runtimeStatus()).resolves.toMatchObject({ connected: false, budgetLoaded: false, diagnosticCode: 'CACHE_IN_USE', cache: { configured: true, locked: false } });
    await locked.shutdown();
    await first.shutdown();

    const restarted = new ActualClient(fakeAdapter(), async () => ({ serverUrl: 'http://actual.example:5006', password: 'secret', syncId: 'budget', dataDir }), undefined, { readOnly: false, allowDestructive: false });
    await expect(restarted.runtimeStatus()).resolves.toMatchObject({ modes: { readOnly: false, allowDestructive: false, effectiveWriteAllowed: true }, syncTelemetry: {} });
    await restarted.shutdown();
  });
});
