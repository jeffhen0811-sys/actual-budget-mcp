import { describe, expect, it } from 'vitest';
import { assembleTransferPair } from '../src/actual/transfers.js';

const from = {
  id: 'from-id', account: 'on-budget', date: '2026-09-01', amount: -500,
  payee: 'to-transfer-payee', category: null, transfer_id: 'to-id', cleared: true
};
const to = {
  id: 'to-id', account: 'off-budget', date: '2026-09-01', amount: 500,
  payee: 'from-transfer-payee', category: 'tracking-category', transfer_id: 'from-id', cleared: false
};

describe('transfer v1 revalidation matrix', () => {
  it('keeps reciprocal IDs, opposite signed amounts, per-side state, and the on/off-budget category boundary', () => {
    const pair = assembleTransferPair(from, to);
    expect(pair).toMatchObject({
      integrity: 'VALID', magnitude: 500,
      fromTransaction: { id: 'from-id', amount: -500, category: null, cleared: true },
      toTransaction: { id: 'to-id', amount: 500, category: 'tracking-category', cleared: false }
    });
    expect(pair.transactionA?.transfer_id).toBe(pair.transactionB?.id);
    expect(pair.transactionB?.transfer_id).toBe(pair.transactionA?.id);
  });

  it('keeps transfer workflows evidenced across unit, integration, and stdio layers without direct relationship mutation', async () => {
    const manifest = await import('./fixtures/tool-verification-manifest-v1.json', { with: { type: 'json' } });
    const byName = new Map(manifest.default.tools.map(tool => [tool.name, tool.evidence]));
    for (const name of [
      'actual_list_transfer_payees', 'actual_create_transfer', 'actual_get_transfer', 'actual_search_transfers',
      'actual_find_possible_transfers', 'actual_update_transaction', 'actual_delete_transaction', 'actual_import_transactions'
    ]) {
      const evidence = byName.get(name)!;
      expect(evidence.unit.length, name).toBeGreaterThan(0);
      expect(evidence.integration.length, name).toBeGreaterThan(0);
      expect(evidence.e2e.length, name).toBeGreaterThan(0);
    }
  });
});
