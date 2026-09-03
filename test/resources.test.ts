import { describe, expect, it, vi } from 'vitest';
import { ResourceRegistry } from './real/resources.js';
import { assertPayeeWriteAllowed, PERMANENT_TEST_PAYEES } from './real/ownership.js';

describe('real-test exact-ID resource registry', () => {
  it('cleans exact IDs in reverse dependency order and accumulates safe failures', async () => {
    const registry = new ResourceRegistry();
    registry.register('account', 'a', 'Account');
    registry.register('categoryGroup', 'g', 'Group');
    registry.register('category', 'c', 'Category');
    registry.register('payee', 'p', 'Temporary Payee');
    registry.register('rule', 'r', 'Temporary Rule');
    registry.register('transaction', 't', 'Transaction');
    const order: string[] = [];
    const cleaners = {
      transaction: vi.fn(async resource => { order.push(resource.kind); }),
      rule: vi.fn(async resource => { order.push(resource.kind); }),
      payee: vi.fn(async resource => { order.push(resource.kind); }),
      category: vi.fn(async resource => { order.push(resource.kind); }),
      categoryGroup: vi.fn(async resource => { order.push(resource.kind); }),
      account: vi.fn(async resource => { order.push(resource.kind); })
    };
    await registry.cleanup(cleaners);
    expect(order).toEqual(['transaction', 'rule', 'payee', 'category', 'categoryGroup', 'account']);
    expect(registry.snapshot()).toEqual([]);

    registry.register('account', 'safe-id', 'Safe name');
    await expect(registry.cleanup({ ...cleaners, account: vi.fn().mockRejectedValue(new Error('credential-shaped raw cause')) }))
      .rejects.toThrow('account id=safe-id name=Safe name errorCode=UNKNOWN');
    expect(registry.snapshot()).toHaveLength(1);

    await expect(registry.cleanup({ ...cleaners, account: vi.fn().mockRejectedValue({ code: 'ACCOUNT_NOT_EMPTY', message: 'hidden' }) }))
      .rejects.toThrow('account id=safe-id name=Safe name errorCode=ACCOUNT_NOT_EMPTY');
  });

  it('refuses permanent payee registration and reports exact leftover identities', () => {
    const registry = new ResourceRegistry();
    for (const name of PERMANENT_TEST_PAYEES) {
      expect(() => registry.register('payee', `permanent-${name}`, name)).toThrow('permanent payee fixture');
      for (const action of ['rename', 'delete', 'merge', 'reuse'] as const) {
        expect(() => assertPayeeWriteAllowed(name, action)).toThrow('permanent payee fixture');
      }
    }
    registry.register('rule', 'rule-id', 'Temporary Rule');
    expect(() => registry.assertEmpty()).toThrow('rule id=rule-id name=Temporary Rule');
  });

  it('owns reciprocal IDs as one unit, deletes once, and verifies both sides absent', async () => {
    const registry = new ResourceRegistry();
    const key = `v1:${'a'.repeat(64)}`;
    registry.registerTransferPair(key, ['side-b', 'side-a'], 'Temporary transfer');
    const transaction = vi.fn().mockResolvedValue(undefined);
    const verifyTransactionsAbsent = vi.fn().mockResolvedValue(undefined);
    const noop = vi.fn().mockResolvedValue(undefined);
    await registry.cleanup({
      transaction, verifyTransactionsAbsent, rule: noop, payee: noop,
      category: noop, categoryGroup: noop, account: noop
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(transaction).toHaveBeenCalledWith({ kind: 'transaction', id: 'side-a', name: 'Temporary transfer' });
    expect(verifyTransactionsAbsent).toHaveBeenCalledWith(['side-a', 'side-b']);
    expect(registry.snapshot()).toEqual([]);
  });
});
