import { describe, expect, it } from 'vitest';
import { permanentFixtureFingerprint } from './real/fingerprint.js';
import { CARD_TEST_ACCOUNT_NAME, REQUIRED_TEST_ACCOUNT_NAME } from './real/env.js';
import { protectedBudgetState, selectSafeBudgetTestMonths } from './real/budget.js';

function budget(month: string, budgeted = 0) {
  return {
    month, incomeAvailable: 0, lastMonthOverspent: 0, forNextMonth: 0, totalBudgeted: budgeted,
    toBudget: 0, fromLastMonth: 0, totalIncome: 0, totalSpent: 0, totalBalance: 0,
    capabilities: { holdForNextMonth: true, incomeBudgeting: false },
    categoryGroups: [{
      id: 'group', name: 'Group', isIncome: false, hidden: false, budgeted, spent: 0, balance: budgeted,
      categories: [{
        id: 'category', name: 'Category', groupId: 'group', isIncome: false, hidden: false,
        budgeted, spent: 0, balance: budgeted, carryover: false,
        capabilities: { budgetAmount: true, carryover: true }
      }]
    }]
  };
}

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
    getTransactions: async (accountId: string) => [{ id: `transaction-${accountId}`, account: accountId }],
    listBudgetMonths: async () => ({ months: ['2026-08', '2026-09'], count: 2 }),
    getBudgetMonth: async (month: string) => budget(month)
  };
}

describe('permanent fixture fingerprint', () => {
  it('is stable across source order and changes for complete payee or rule semantics', async () => {
    const baseline = await permanentFixtureFingerprint(reader());
    expect(await permanentFixtureFingerprint(reader())).toBe(baseline);
    expect(await permanentFixtureFingerprint(reader('different'))).not.toBe(baseline);
    expect(await permanentFixtureFingerprint(reader('market', 'Renamed'))).not.toBe(baseline);
  });

  it('changes when permanent monthly planning changes', async () => {
    const baseline = await permanentFixtureFingerprint(reader());
    const changed = reader();
    changed.getBudgetMonth = async month => budget(month, 100);
    expect(await permanentFixtureFingerprint(changed)).not.toBe(baseline);
  });

  it('selects the final clean future pair and refuses protected planning, holds, and transactions', async () => {
    const months = ['2026-09', '2026-10', '2026-11', '2026-12'];
    const values = new Map(months.map(month => [month, budget(month)]));
    values.set('2026-11', budget('2026-11', 100));
    await expect(selectSafeBudgetTestMonths({
      months, nowMonth: '2026-08', getBudgetMonth: async month => values.get(month)!
    })).resolves.toEqual({ sourceMonth: '2026-09', targetMonth: '2026-10' });
    expect(protectedBudgetState(values.get('2026-11')!)).toEqual([{ categoryId: 'category', reason: 'nonzero-budgeted' }]);
    await expect(selectSafeBudgetTestMonths({
      months: ['2026-09', '2026-10'], nowMonth: '2026-08', getBudgetMonth: async month => values.get(month)!,
      hasProtectedTransactions: async () => true
    })).rejects.toThrow('refusing real budget writes');
  });
});
