import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { findPossibleDuplicateCandidates, findPossibleTransferCandidates } from '../src/actual/transaction-diagnostics.js';

const tx = (id: string, account: string, date: string, amount: number, extra: Record<string, unknown> = {}) => ({
  id, account, date, amount, ...extra
});

describe('transaction diagnostics', () => {
  it('classifies unique and dense ambiguous possible-transfer graphs deterministically', () => {
    const unique = findPossibleTransferCandidates([
      tx('a', 'one', '2026-09-01', -100), tx('b', 'two', '2026-09-02', 100)
    ], 3);
    expect(unique).toMatchObject([{ classification: 'UNIQUE', leftCandidateCount: 1, rightCandidateCount: 1, dateDifferenceDays: 1 }]);
    const ambiguous = findPossibleTransferCandidates([
      tx('a', 'one', '2026-09-01', -100), tx('b', 'two', '2026-09-01', 100), tx('c', 'three', '2026-09-01', 100)
    ], 0);
    expect(ambiguous).toHaveLength(2);
    expect(ambiguous.every(candidate => candidate.classification === 'AMBIGUOUS')).toBe(true);
  });

  it('excludes same-account, split, starting-balance, existing-transfer, zero, sign, and magnitude mismatches', () => {
    const anchor = tx('a', 'one', '2026-09-01', -100);
    for (const candidate of [
      tx('same', 'one', '2026-09-01', 100),
      tx('split', 'two', '2026-09-01', 100, { is_child: true }),
      tx('start', 'two', '2026-09-01', 100, { starting_balance_flag: true }),
      tx('transfer', 'two', '2026-09-01', 100, { transfer_id: 'x' }),
      tx('wrong-sign', 'two', '2026-09-01', -100),
      tx('wrong-magnitude', 'two', '2026-09-01', 99)
    ]) expect(findPossibleTransferCandidates([anchor, candidate], 3)).toEqual([]);
    expect(findPossibleTransferCandidates([
      tx('zero-a', 'one', '2026-09-01', 0), tx('zero-b', 'two', '2026-09-01', 0)
    ], 3)).toEqual([]);
  });

  it('classifies imported IDs and exact/near-date meaningful payee evidence without null matches', () => {
    const candidates = findPossibleDuplicateCandidates([
      tx('import-a', 'one', '2026-09-01', -100, { imported_id: 'bank-1' }),
      tx('import-b', 'one', '2026-09-20', -100, { imported_id: 'bank-1' }),
      tx('payee-a', 'one', '2026-09-02', -200, { payee: 'p' }),
      tx('payee-b', 'one', '2026-09-02', -200, { payee: 'p' }),
      tx('near-a', 'one', '2026-09-03', -300, { imported_payee: 'Cafe' }),
      tx('near-b', 'one', '2026-09-05', -300, { imported_payee: 'Cafe' }),
      tx('null-a', 'one', '2026-09-01', -400, { payee: null, imported_payee: null }),
      tx('null-b', 'one', '2026-09-01', -400, { payee: null, imported_payee: null })
    ], 3);
    expect(candidates.map(candidate => candidate.classification).sort()).toEqual(['LIKELY', 'STRONG', 'STRONG']);
    expect(candidates.find(candidate => candidate.reasonCodes.includes('SAME_IMPORTED_ID'))?.dateDifferenceDays).toBe(19);
  });

  it('is deterministic at the maximum supported 5000-leaf scan without truncation', () => {
    const rows = Array.from({ length: 5_000 }, (_, index) => tx(
      `id-${String(index).padStart(4, '0')}`, `account-${index % 2}`, '2026-09-01', index + 1
    ));
    const started = performance.now();
    const first = findPossibleTransferCandidates(rows, 3);
    const elapsedMs = performance.now() - started;
    const second = findPossibleTransferCandidates(rows, 3);
    expect(first.map(candidate => candidate.candidateKey)).toEqual(second.map(candidate => candidate.candidateKey));
    expect(first).toEqual([]);
    expect(elapsedMs).toBeLessThan(5_000);
  });
});
