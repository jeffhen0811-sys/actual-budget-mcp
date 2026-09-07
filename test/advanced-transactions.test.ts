import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActualClient } from '../src/actual/client.js';
import {
  importRequestFingerprint,
  normalizeImportRequest,
  parseImportResult
} from '../src/actual/imports.js';
import {
  buildTransactionFilters,
  compileTransactionSearch,
  compileTransactionTotal,
  escapeActualLikeLiteral,
  parseAqlAggregate,
  parseAqlRows,
  projectTransaction
} from '../src/actual/transactions.js';
import type { ActualConfig } from '../src/config.js';
import {
  getTransactionInputSchema,
  importTransactionsInputSchema,
  previewImportInputSchema,
  searchTransactionsInputSchema,
  transactionSchema
} from '../src/mcp/contracts.js';
import { fakeAdapter } from './helpers.js';
import { purityBoundaryFingerprint } from './purity-fingerprint.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function fixture() {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-advanced-transactions-'));
  directories.push(dataDir);
  const config: ActualConfig = { serverUrl: 'http://actual.local:5006', password: 'secret', syncId: 'budget', dataDir };
  const api = fakeAdapter();
  return { api, client: new ActualClient(api, async () => config) };
}

describe('canonical transaction and query foundations', () => {
  it('projects canonical fields recursively while preserving null and stripping internal SDK fields', () => {
    const projected = projectTransaction({
      id: 'parent', account: 'account', date: '2026-09-01', amount: -100,
      payee: null, category: null, parent_id: null, is_parent: true,
      tombstone: false, raw_synced_data: 'private', _unmatched: true,
      subtransactions: [{
        id: 'child', account: 'account', date: '2026-09-01', amount: -100,
        is_child: true, parent_id: 'parent', payee_name: 'Cafe', category_name: null,
        _ruleErrors: ['private']
      }]
    });
    expect(projected).toEqual({
      id: 'parent', account: 'account', date: '2026-09-01', amount: -100,
      payee: null, category: null, isTransfer: false, is_parent: true, parent_id: null,
      subtransactions: [{
        id: 'child', account: 'account', date: '2026-09-01', amount: -100,
        payee_name: 'Cafe', category_name: null, isTransfer: false, is_child: true, parent_id: 'parent'
      }]
    });
    expect(transactionSchema.parse(projected)).toEqual(projected);
  });

  it('escapes every installed Unicode-like wildcard literally in the required order', () => {
    expect(escapeActualLikeLiteral(String.raw`100%?\path`)).toBe(String.raw`100\%\?\\path`);
    expect(escapeActualLikeLiteral('Café')).toBe('Café');
    expect(escapeActualLikeLiteral('')).toBe('');
  });

  it('compiles every filter family, deterministic sorting, and bounded pagination', () => {
    const input = searchTransactionsInputSchema.parse({
      startDate: '2026-01-01', endDate: '2026-12-31', accountIds: ['a'], transactionIds: ['t'],
      payeeIds: ['p'], categoryIds: ['c'], importSource: 'imported', cleared: true,
      minAmount: -5000, maxAmount: 2000, text: '100%?', splitMode: 'inline',
      sort: 'payee_asc', limit: 250, offset: 10_000, includeTotals: true
    });
    const filters = buildTransactionFilters(input);
    expect(filters).toContainEqual({ date: { $gte: '2026-01-01', $lte: '2026-12-31' } });
    expect(filters).toContainEqual({ imported_id: { $ne: null } });
    expect(filters).toContainEqual({ imported_id: { $ne: '' } });
    expect(filters).toContainEqual({ amount: { $gte: -5000, $lte: 2000 } });
    expect(filters).toContainEqual({ $or: [
      { 'payee.name': { $like: String.raw`%100\%\?%` } },
      { imported_payee: { $like: String.raw`%100\%\?%` } },
      { notes: { $like: String.raw`%100\%\?%` } }
    ] });
    expect(compileTransactionSearch(input).serialize()).toMatchObject({
      table: 'transactions', tableOptions: { splits: 'inline' },
      orderExpressions: [{ 'payee.name': 'asc' }, { id: 'asc' }], limit: 250, offset: 10_000
    });
    expect(compileTransactionTotal(input, 'sum').serialize().selectExpressions).toEqual([
      { result: { $sum: '$amount' } }
    ]);
  });

  it('rejects incompatible or invalid search bounds before runtime execution', () => {
    for (const input of [
      { startDate: '2026-02-30', endDate: '2026-03-01' },
      { startDate: '2026-02-02', endDate: '2026-02-01' },
      { startDate: '2025-01-01', endDate: '2026-01-02' },
      { startDate: '2026-01-01', endDate: '2026-01-02', minAmount: 2, maxAmount: 1 },
      { startDate: '2026-01-01', endDate: '2026-01-02', uncategorizedOnly: true, categoryIds: ['c'] },
      { startDate: '2026-01-01', endDate: '2026-01-02', limit: 251 },
      { startDate: '2026-01-01', endDate: '2026-01-02', offset: 10_001 },
      { startDate: '2026-01-01', endDate: '2026-01-02', minAmount: 1.5 }
    ]) expect(() => searchTransactionsInputSchema.parse(input)).toThrow();
  });

  it('strictly parses row and aggregate envelopes and sanitizes unsupported shapes', () => {
    expect(parseAqlRows({ data: [{ id: 't', account: 'a', date: '2026-01-01', amount: 1 }] }, 'test')).toHaveLength(1);
    expect(parseAqlAggregate({ data: 7 }, 'test')).toBe(7);
    expect(parseAqlAggregate({ data: [{ result: -1200 }] }, 'test')).toBe(-1200);
    expect(() => parseAqlRows({ rows: [] }, 'test')).toThrowError(expect.objectContaining({ code: 'QUERY_SHAPE_INVALID' }));
    expect(() => parseAqlAggregate({ data: [{ result: 1.5 }] }, 'test')).toThrowError(expect.objectContaining({ code: 'QUERY_SHAPE_INVALID' }));
  });
});

describe('exact lookup and advanced search orchestration', () => {
  it('anchors exact child identity in all mode and enriches only parents through grouped mode', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [{
      id: 'child', account: 'a', date: '2026-01-01', amount: -1, is_child: true, parent_id: 'parent'
    }] });
    await expect(client.getTransaction('child')).resolves.toMatchObject({ id: 'child', parent_id: 'parent' });
    expect(api.aqlQuery).toHaveBeenCalledOnce();
    expect(vi.mocked(api.aqlQuery).mock.calls[0]![0].serialize().tableOptions).toEqual({ splits: 'all' });

    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [{ id: 'parent', account: 'a', date: '2026-01-01', amount: -1, is_parent: true }] })
      .mockResolvedValueOnce({ data: [{
        id: 'parent', account: 'a', date: '2026-01-01', amount: -1, is_parent: true,
        subtransactions: [{ id: 'child', account: 'a', date: '2026-01-01', amount: -1, is_child: true, parent_id: 'parent' }]
      }] });
    await expect(client.getTransaction('parent')).resolves.toMatchObject({ id: 'parent', subtransactions: [{ id: 'child' }] });
    await client.shutdown();
  });

  it('returns structured not-found and computes inline totals with identical filters', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [] });
    await expect(client.getTransaction('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    vi.mocked(api.aqlQuery)
      .mockResolvedValueOnce({ data: [{ id: 't', account: 'a', date: '2026-01-01', amount: -1200 }] })
      .mockResolvedValueOnce({ data: 1 })
      .mockResolvedValueOnce({ data: -1200 });
    await expect(client.searchTransactions(searchTransactionsInputSchema.parse({
      startDate: '2026-01-01', endDate: '2026-01-02', includeTotals: true
    }))).resolves.toMatchObject({
      transactions: [{ id: 't' }], page: { limit: 100, offset: 0, returned: 1 },
      totals: { supported: true, matched: 1, amount: -1200 }
    });
    await client.shutdown();
  });

  it('reports grouped totals as unsupported without issuing aggregate queries', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.aqlQuery).mockResolvedValueOnce({ data: [] });
    await expect(client.searchTransactions(searchTransactionsInputSchema.parse({
      startDate: '2026-01-01', endDate: '2026-01-02', splitMode: 'grouped', includeTotals: true
    }))).resolves.toMatchObject({ totals: { supported: false } });
    expect(api.aqlQuery).toHaveBeenCalledOnce();
    await client.shutdown();
  });
});

describe('shared import normalization, fingerprint, and preview', () => {
  const items = [{ date: '2026-01-01', amount: -1200, imported_id: 'source:1', payee_name: 'CAFE' }];

  it('normalizes installed defaults and fingerprints semantic request equality without credentials', () => {
    const omitted = normalizeImportRequest('account', items);
    const explicit = normalizeImportRequest('account', items, { defaultCleared: true, reimportDeleted: false });
    expect(omitted).toEqual(explicit);
    expect(importRequestFingerprint(omitted)).toBe(importRequestFingerprint(explicit));
    expect(importRequestFingerprint(omitted)).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(importRequestFingerprint(normalizeImportRequest('account', [...items, { ...items[0]!, imported_id: 'source:2' }]))).not.toBe(importRequestFingerprint(omitted));
  });

  it('binds every supported import option and reconciliation field into the reviewed request', () => {
    const item = {
      date: '2026-01-01', amount: -1200, imported_id: 'source:1', payee: 'payee',
      payee_name: 'Cafe', imported_payee: 'BANK CAFE', notes: 'receipt', cleared: true, category: 'category'
    };
    const baseline = importRequestFingerprint(normalizeImportRequest('account', [item]));
    const variants = [
      normalizeImportRequest('other-account', [item]),
      normalizeImportRequest('account', [item], { defaultCleared: false }),
      normalizeImportRequest('account', [item], { reimportDeleted: true }),
      ...(['date', 'amount', 'imported_id', 'payee', 'payee_name', 'imported_payee', 'notes', 'cleared', 'category'] as const)
        .map(field => normalizeImportRequest('account', [{ ...item, [field]: field === 'amount' ? -1201 : field === 'cleared' ? false : `${item[field]}-changed` }]))
    ];
    for (const request of variants) expect(importRequestFingerprint(request)).not.toBe(baseline);

    expect(() => importTransactionsInputSchema.parse({
      accountId: 'account', transactions: [{ ...item, transfer_id: 'direct-relationship-mutation' }]
    })).toThrow();
  });

  it('strictly parses installed preview evidence and rejects malformed shapes', () => {
    expect(parseImportResult({ added: ['preview'], updated: ['existing'], errors: [], updatedPreview: [{
      transaction: { id: 'preview', account: 'a', date: '2026-01-01', amount: -1 },
      existing: { id: 'existing', account: 'a', date: '2026-01-01', amount: -1 }
    }] }, 'preview')).toMatchObject({ added: ['preview'], updated: ['existing'] });
    expect(() => parseImportResult({ added: [], updated: [], errors: [{ raw: 'secret' }], updatedPreview: [] }, 'preview'))
      .toThrowError(expect.objectContaining({ code: 'IMPORT_PREVIEW_SHAPE_INVALID' }));
  });

  it('keeps preview read-only, labels generated IDs, sanitizes errors, and shares the import fingerprint', async () => {
    const { api, client } = await fixture();
    const controlledState = { accountId: 'account', transactions: structuredClone(items) };
    const beforePreview = purityBoundaryFingerprint(api, controlledState);
    vi.mocked(api.importTransactions).mockResolvedValueOnce({
      added: ['generated-preview-id'], updated: ['existing-id'],
      errors: [{ message: 'bad password=secret' }],
      updatedPreview: [
        { transaction: { id: 'generated-preview-id', account: 'account', date: '2026-01-01', amount: -1200, imported_id: 'source:1' } },
        {
          transaction: { id: 'planned-update', account: 'account', date: '2026-01-01', amount: -1200, imported_id: 'source:update' },
          existing: { id: 'existing-id', account: 'account', date: '2026-01-01', amount: -1200 }
        },
        { transaction: { id: 'ignored', account: 'account', date: '2026-01-01', amount: -1200, imported_id: 'source:2' }, ignored: true }
      ]
    });
    const preview = await client.previewImport('account', items);
    expect(preview).toMatchObject({
      wouldAddCount: 1, wouldUpdateCount: 1, ignoredCount: 1,
      previewOnlyIds: ['generated-preview-id'], existingTransactionIds: ['existing-id']
    });
    expect(preview.errors[0]!.message).not.toContain('secret');
    expect(api.sync).not.toHaveBeenCalled();
    expect(api.importTransactions).toHaveBeenCalledWith('account', expect.any(Array), {
      defaultCleared: true, reimportDeleted: false, dryRun: true
    });
    expect(purityBoundaryFingerprint(api, controlledState)).toBe(beforePreview);

    vi.mocked(api.importTransactions).mockResolvedValueOnce({ added: [], updated: [], errors: [], updatedPreview: [] });
    await expect(client.importTransactions('account', items, {}, preview.requestFingerprint)).resolves.toMatchObject({
      requestFingerprint: preview.requestFingerprint
    });
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });

  it('rejects fingerprint mismatch and unsupported input options before the SDK', async () => {
    const { api, client } = await fixture();
    await expect(client.importTransactions('account', items, {}, `v1:${'0'.repeat(64)}`)).rejects.toMatchObject({
      code: 'PREVIEW_FINGERPRINT_MISMATCH'
    });
    expect(api.importTransactions).not.toHaveBeenCalled();
    expect(() => importTransactionsInputSchema.parse({ accountId: 'a', transactions: items, payeeNameNormalization: 'none' })).toThrow();
    expect(() => previewImportInputSchema.parse({ accountId: 'a', transactions: items, dryRun: false })).toThrow();
    expect(getTransactionInputSchema.parse({ transactionId: 't' })).toEqual({ transactionId: 't' });
    await client.shutdown();
  });

  it('reports exact imported and pending identifiers when post-import synchronization is ambiguous', async () => {
    const { api, client } = await fixture();
    vi.mocked(api.importTransactions).mockResolvedValueOnce({
      added: ['added-transaction'], updated: ['updated-transaction'], errors: [], updatedPreview: []
    });
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('network failure'));
    await expect(client.importTransactions('account', items)).rejects.toMatchObject({
      code: 'MUTATION_SYNC_FAILED',
      metadata: {
        recoveryAction: 'actual_sync_then_exact_read',
        state: 'local_change_may_have_succeeded',
        partialState: true,
        details: {
          addedTransactionIds: ['added-transaction'],
          updatedTransactionIds: ['updated-transaction'],
          affectedTransactionIds: ['added-transaction', 'updated-transaction'],
          pendingImportedIds: ['source:1']
        }
      }
    });
    expect(api.importTransactions).toHaveBeenCalledOnce();
    expect(api.sync).toHaveBeenCalledOnce();
    await client.shutdown();
  });
});
