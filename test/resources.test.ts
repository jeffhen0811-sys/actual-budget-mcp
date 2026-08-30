import { describe, expect, it, vi } from 'vitest';
import { ResourceRegistry } from './real/resources.js';

describe('real-test exact-ID resource registry', () => {
  it('cleans exact IDs in reverse dependency order and accumulates safe failures', async () => {
    const registry = new ResourceRegistry();
    registry.register('account', 'a', 'Account');
    registry.register('categoryGroup', 'g', 'Group');
    registry.register('category', 'c', 'Category');
    registry.register('transaction', 't', 'Transaction');
    const order: string[] = [];
    const cleaners = {
      transaction: vi.fn(async resource => { order.push(resource.kind); }),
      category: vi.fn(async resource => { order.push(resource.kind); }),
      categoryGroup: vi.fn(async resource => { order.push(resource.kind); }),
      account: vi.fn(async resource => { order.push(resource.kind); })
    };
    await registry.cleanup(cleaners);
    expect(order).toEqual(['transaction', 'category', 'categoryGroup', 'account']);
    expect(registry.snapshot()).toEqual([]);

    registry.register('account', 'safe-id', 'Safe name');
    await expect(registry.cleanup({ ...cleaners, account: vi.fn().mockRejectedValue(new Error('credential-shaped raw cause')) }))
      .rejects.toThrow('account id=safe-id name=Safe name errorCode=UNKNOWN');
    expect(registry.snapshot()).toHaveLength(1);

    await expect(registry.cleanup({ ...cleaners, account: vi.fn().mockRejectedValue({ code: 'ACCOUNT_NOT_EMPTY', message: 'hidden' }) }))
      .rejects.toThrow('account id=safe-id name=Safe name errorCode=ACCOUNT_NOT_EMPTY');
  });
});
