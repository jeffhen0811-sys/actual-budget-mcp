import { describe, expect, it } from 'vitest';
import {
  accountReconciliationInputSchema,
  createTransferInputSchema,
  findPossibleDuplicatesInputSchema,
  findPossibleTransfersInputSchema,
  importTransactionItemSchema,
  searchTransfersInputSchema,
  searchTransactionsInputSchema,
  updateTransactionInputSchema
} from '../src/mcp/contracts.js';
import { importRequestFingerprint, normalizeImportRequest } from '../src/actual/imports.js';

describe('strict transfer and diagnostic contracts', () => {
  it('accepts bounded defaults and rejects ranges, magnitudes, windows, pagination, and unknown fields', () => {
    expect(searchTransfersInputSchema.parse({ startDate: '2026-01-01', endDate: '2026-12-31' })).toMatchObject({
      integrity: 'any', limit: 100, offset: 0, sort: 'date_desc'
    });
    expect(() => searchTransfersInputSchema.parse({ startDate: '2026-01-01', endDate: '2027-01-02' })).toThrow('366');
    expect(() => searchTransfersInputSchema.parse({ startDate: '2026-01-01', endDate: '2026-01-01', minMagnitude: 2, maxMagnitude: 1 })).toThrow('maxMagnitude');
    expect(() => findPossibleTransfersInputSchema.parse({ startDate: '2026-01-01', endDate: '2026-01-01', dateWindowDays: 8 })).toThrow();
    expect(() => findPossibleDuplicatesInputSchema.parse({ startDate: '2026-01-01', endDate: '2026-01-01', offset: 10_001 })).toThrow();
    expect(() => accountReconciliationInputSchema.parse({ accountId: 'a', lock: true })).toThrow();
  });

  it('accepts manual transfer fields but rejects relationship, imported, and same-account inputs', () => {
    expect(createTransferInputSchema.parse({
      fromAccountId: 'a', toAccountId: 'b', amount: 1, date: '2026-09-01'
    })).toMatchObject({ dryRun: true, fromCleared: false, toCleared: false });
    expect(() => createTransferInputSchema.parse({
      fromAccountId: 'a', toAccountId: 'a', amount: 1, date: '2026-09-01'
    })).toThrow('different');
    expect(() => createTransferInputSchema.parse({
      fromAccountId: 'a', toAccountId: 'b', amount: 1, date: '2026-09-01', transfer_id: 'x'
    })).toThrow();
    expect(() => updateTransactionInputSchema.parse({ transactionId: 't', fields: { transferId: 'x' } })).toThrow();
  });

  it('adds optional import payee to schemas and fingerprints without changing omitted behavior', () => {
    expect(importTransactionItemSchema.parse({ date: '2026-09-01', amount: -1, imported_id: 'i', payee: 'p' })).toMatchObject({ payee: 'p' });
    const omitted = importRequestFingerprint(normalizeImportRequest('a', [{ date: '2026-09-01', amount: -1, imported_id: 'i' }]));
    const supplied = importRequestFingerprint(normalizeImportRequest('a', [{ date: '2026-09-01', amount: -1, imported_id: 'i', payee: 'p' }]));
    expect(supplied).not.toBe(omitted);
    expect(searchTransactionsInputSchema.parse({ startDate: '2026-09-01', endDate: '2026-09-01' }).transferState).toBe('any');
  });
});
