import { describe, expect, it } from 'vitest';
import { assembleTransferPair, assembleTransferPairs, candidateKey, meaningfulId, pairKey } from '../src/actual/transfers.js';

const tx = (id: string, account: string, amount: number, transfer_id?: string | null) => ({
  id, account, amount, date: '2026-09-01', ...(transfer_id === undefined ? {} : { transfer_id })
});

describe('canonical transfer primitives', () => {
  it('normalizes only meaningful identifiers and hashes sorted length-delimited pairs', () => {
    expect(meaningfulId(undefined)).toBeNull();
    expect(meaningfulId(null)).toBeNull();
    expect(meaningfulId('  ')).toBeNull();
    expect(meaningfulId(' opaque ')).toBe('opaque');
    expect(pairKey('a', 'bc')).toBe(pairKey('bc', 'a'));
    expect(pairKey('a', 'bc')).not.toBe(pairKey('ab', 'c'));
    expect(candidateKey('a', 'bc')).toMatch(/^v1:[a-f0-9]{64}$/);
  });

  it('assembles a valid reciprocal pair once with deterministic direction', () => {
    const pair = assembleTransferPair(tx('b', 'checking', -500, 'a'), tx('a', 'savings', 500, 'b'));
    expect(pair).toMatchObject({
      integrity: 'VALID', reasonCodes: [], magnitude: 500,
      transactionA: { id: 'a', isTransfer: true }, transactionB: { id: 'b', isTransfer: true },
      fromTransaction: { id: 'b' }, toTransaction: { id: 'a' }
    });
    expect(assembleTransferPairs([tx('b', 'checking', -500, 'a'), tx('a', 'savings', 500, 'b')])).toHaveLength(1);
  });

  it.each([
    ['missing counterpart', tx('a', 'one', -100, 'b'), null, ['MISSING_COUNTERPART']],
    ['non reciprocal', tx('a', 'one', -100, 'b'), tx('b', 'two', 100, 'c'), ['NON_RECIPROCAL_RELATIONSHIP']],
    ['same account', tx('a', 'one', -100, 'b'), tx('b', 'one', 100, 'a'), ['SAME_ACCOUNT']],
    ['zero', tx('a', 'one', 0, 'b'), tx('b', 'two', 0, 'a'), ['ZERO_AMOUNT', 'SAME_SIGN']],
    ['same sign', tx('a', 'one', 100, 'b'), tx('b', 'two', 100, 'a'), ['SAME_SIGN']],
    ['magnitude', tx('a', 'one', -100, 'b'), tx('b', 'two', 99, 'a'), ['MAGNITUDE_MISMATCH']]
  ])('diagnoses %s', (_name, first, second, expected) => {
    const pair = assembleTransferPair(first!, second);
    expect(pair.integrity).toBe('INVALID');
    expect(pair.reasonCodes).toEqual(expected);
    expect(pair.fromTransaction).toBeNull();
    expect(pair.toTransaction).toBeNull();
  });

  it('diagnoses absent and malformed relationship values without fabricating a side', () => {
    for (const transfer_id of [undefined, null, '']) {
      const pair = assembleTransferPair(tx('a', 'one', -100, transfer_id), null);
      expect(pair.reasonCodes).toEqual(['MALFORMED_RELATIONSHIP_ID']);
      expect(pair.transactionB).toBeNull();
    }
  });
});
