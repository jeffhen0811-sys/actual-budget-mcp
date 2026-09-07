import { describe, expect, it } from 'vitest';
import { projectTransaction } from '../src/actual/transactions.js';
import { transactionSchema } from '../src/mcp/contracts.js';

const base = { account: 'account', date: '2026-09-01', amount: -100 };

describe('transaction v1 revalidation matrix', () => {
  it('preserves manual, imported, starting-balance, transfer, split, cleared, uncategorized, and nullable variants', () => {
    const cases = [
      { id: 'manual', ...base, payee: null, category: null, notes: null, imported_id: null, transfer_id: null },
      { id: 'imported', ...base, payee: 'payee', category: 'category', imported_id: 'bank:1', imported_payee: 'Bank Cafe', cleared: true },
      { id: 'starting', ...base, amount: 5_000, payee: null, category: null, starting_balance_flag: true, imported_id: null },
      { id: 'transfer', ...base, transfer_id: 'reciprocal', payee: 'transfer-payee', category: null, cleared: false },
      {
        id: 'split-parent', ...base, is_parent: true, payee: null, category: null,
        subtransactions: [{ id: 'split-child', ...base, is_child: true, parent_id: 'split-parent', category: 'category', payee: null }]
      }
    ];

    const projected = cases.map(transaction => projectTransaction(transaction));
    for (const transaction of projected) expect(() => transactionSchema.parse(transaction)).not.toThrow();

    expect(projected[0]).toMatchObject({ payee: null, category: null, notes: null, imported_id: null, isTransfer: false });
    expect(projected[1]).toMatchObject({ imported_id: 'bank:1', cleared: true, isTransfer: false });
    expect(projected[2]).toMatchObject({ starting_balance_flag: true, imported_id: null });
    expect(projected[3]).toMatchObject({ transfer_id: 'reciprocal', isTransfer: true, category: null });
    expect(projected[4]).toMatchObject({ is_parent: true, subtransactions: [{ id: 'split-child', is_child: true, parent_id: 'split-parent' }] });
  });

  it('keeps the frozen transaction workflow evidence across unit, integration, and stdio layers', async () => {
    const manifest = await import('./fixtures/tool-verification-manifest-v1.json', { with: { type: 'json' } });
    const byName = new Map(manifest.default.tools.map(tool => [tool.name, tool.evidence]));
    for (const name of [
      'actual_get_transactions', 'actual_get_transaction', 'actual_search_transactions', 'actual_preview_import',
      'actual_import_transactions', 'actual_update_transaction', 'actual_delete_transaction', 'actual_bulk_update_transactions'
    ]) {
      const evidence = byName.get(name)!;
      expect(evidence.unit.length, name).toBeGreaterThan(0);
      expect(evidence.integration.length, name).toBeGreaterThan(0);
      expect(evidence.e2e.length, name).toBeGreaterThan(0);
    }
  });
});
