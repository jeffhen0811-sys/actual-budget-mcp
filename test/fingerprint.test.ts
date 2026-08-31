import { describe, expect, it } from 'vitest';
import { permanentFixtureFingerprint } from './real/fingerprint.js';
import { CARD_TEST_ACCOUNT_NAME, REQUIRED_TEST_ACCOUNT_NAME } from './real/env.js';

function reader(ruleValue = 'market', payeeName = 'Market') {
  return {
    listAccounts: async () => [
      { id: 'checking', name: REQUIRED_TEST_ACCOUNT_NAME, offbudget: false, closed: false },
      { id: 'card', name: CARD_TEST_ACCOUNT_NAME, offbudget: false, closed: false }
    ],
    listCategories: async () => [{ groupId: 'group', groupName: 'Food', categories: [{ id: 'category', name: 'Groceries', hidden: false }] }],
    listPayees: async () => [{ id: 'payee', name: payeeName }],
    listRules: async () => [{
      id: 'rule', stage: 'default', conditionsOp: 'and',
      conditions: [{ field: 'imported_payee', op: 'contains', value: ruleValue }],
      actions: [{ op: 'set', field: 'payee', value: 'payee' }],
      writable: true
    }],
    getTransactions: async (accountId: string) => [{ id: `transaction-${accountId}`, account: accountId }]
  };
}

describe('permanent fixture fingerprint', () => {
  it('is stable across source order and changes for complete payee or rule semantics', async () => {
    const baseline = await permanentFixtureFingerprint(reader());
    expect(await permanentFixtureFingerprint(reader())).toBe(baseline);
    expect(await permanentFixtureFingerprint(reader('different'))).not.toBe(baseline);
    expect(await permanentFixtureFingerprint(reader('market', 'Renamed'))).not.toBe(baseline);
  });
});
