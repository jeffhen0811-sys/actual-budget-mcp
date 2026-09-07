import { describe, expect, it } from 'vitest';
import { fakeAdapter } from './helpers.js';
import { purityBoundaryFingerprint } from './purity-fingerprint.js';

describe('purity boundary fingerprint', () => {
  it('ignores official import reconciliation only in dry-run mode and detects persistence or sync', async () => {
    const state = { transactions: [{ id: 'existing', amount: -100 }] };
    const api = fakeAdapter();
    const baseline = purityBoundaryFingerprint(api, state);

    await api.importTransactions('account', [], { defaultCleared: true, reimportDeleted: false, dryRun: true });
    expect(purityBoundaryFingerprint(api, state)).toBe(baseline);

    await api.importTransactions('account', [], { defaultCleared: true, reimportDeleted: false, dryRun: false });
    expect(purityBoundaryFingerprint(api, state)).not.toBe(baseline);

    const syncApi = fakeAdapter();
    const syncBaseline = purityBoundaryFingerprint(syncApi, state);
    await syncApi.sync();
    expect(purityBoundaryFingerprint(syncApi, state)).not.toBe(syncBaseline);
  });
});
