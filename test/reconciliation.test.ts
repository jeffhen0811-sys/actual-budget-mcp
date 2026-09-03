import { describe, expect, it } from 'vitest';
import { aggregateReconciliation } from '../src/actual/reconciliation.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, vi } from 'vitest';
import { ActualClient } from '../src/actual/client.js';
import { fakeAdapter } from './helpers.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

const tx = (id: string, amount: number, extra: Record<string, unknown> = {}) => ({
  id, account: 'account', date: '2026-09-01', amount, ...extra
});

describe('account reconciliation client', () => {
  it('cross-checks the cutoff balance and labels bank metadata separately', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'actual-reconciliation-'));
    directories.push(dataDir);
    const api = fakeAdapter();
    vi.mocked(api.getAccounts).mockResolvedValue([{
      id: 'account', name: 'Checking', closed: false, offbudget: false, balance_current: 120
    }]);
    vi.mocked(api.aqlQuery).mockResolvedValue({ data: [tx('one', 100, { cleared: true })] });
    vi.mocked(api.getAccountBalance).mockResolvedValue(100);
    const client = new ActualClient(api, async () => ({
      serverUrl: 'http://actual.example:5006', password: 'secret', syncId: 'budget', dataDir
    }));
    await expect(client.getAccountReconciliation('account', '2026-09-01', 100)).resolves.toMatchObject({
      account: { id: 'account', name: 'Checking' }, cutoff: '2026-09-01', status: 'MATCHES_BOTH',
      bankReported: { balanceCurrent: 120, differenceFromLedger: 20 }
    });
    expect(api.getAccountBalance).toHaveBeenCalledWith('account', expect.any(Date));
    expect(api.sync).not.toHaveBeenCalled();
    vi.mocked(api.getAccountBalance).mockResolvedValue(99);
    await expect(client.getAccountReconciliation('account', '2026-09-01')).rejects.toMatchObject({ code: 'QUERY_SHAPE_INVALID' });
    await expect(client.getAccountReconciliation('missing', '2026-09-01')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await client.shutdown();
  });
});

describe('reconciliation aggregation', () => {
  const rows = [
    tx('ordinary', 100, { cleared: false }),
    tx('cleared', -20, { cleared: true }),
    tx('reconciled', -30, { cleared: false, reconciled: true }),
    tx('starting', 200, { starting_balance_flag: true, cleared: true }),
    tx('parent', -50, { is_parent: true }),
    tx('child-a', -25, { is_child: true, parent_id: 'parent', cleared: true }),
    tx('child-b', -25, { is_child: true, parent_id: 'parent', cleared: false })
  ];

  it('excludes split parents, includes starting balances and children, and treats reconciled as cleared', () => {
    expect(aggregateReconciliation(rows)).toEqual({
      balances: { ledger: 200, cleared: 125, reconciled: -30, uncleared: 75 },
      counts: { ledger: 6, cleared: 4, reconciled: 1, uncleared: 2 },
      statement: null,
      status: 'NO_STATEMENT'
    });
  });

  it.each([
    [200, 'MATCHES_LEDGER', 0, 75],
    [125, 'MATCHES_CLEARED', -75, 0],
    [150, 'DIFFERENCE', -50, 25]
  ])('classifies statement %s as %s', (statement, status, ledgerDifference, clearedDifference) => {
    expect(aggregateReconciliation(rows, statement).statement).toEqual({
      balance: statement, differenceFromLedger: ledgerDifference, differenceFromCleared: clearedDifference, status
    });
  });

  it('uses MATCHES_BOTH precedence when ledger equals cleared', () => {
    expect(aggregateReconciliation([tx('one', 100, { cleared: true })], 100).status).toBe('MATCHES_BOTH');
  });
});
