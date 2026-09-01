import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  init: vi.fn(), downloadBudget: vi.fn(), shutdown: vi.fn(), sync: vi.fn(), getServerVersion: vi.fn(),
  getAccounts: vi.fn(), createAccount: vi.fn(), updateAccount: vi.fn(), closeAccount: vi.fn(),
  reopenAccount: vi.fn(), deleteAccount: vi.fn(), getAccountBalance: vi.fn(), getCategoryGroups: vi.fn(),
  createCategoryGroup: vi.fn(), updateCategoryGroup: vi.fn(), deleteCategoryGroup: vi.fn(), getCategories: vi.fn(),
  createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(), getBudgetMonths: vi.fn(),
  getBudgetMonth: vi.fn(), getPayees: vi.fn(), getTransactions: vi.fn(), importTransactions: vi.fn(),
  setBudgetAmount: vi.fn(), setBudgetCarryover: vi.fn(), holdBudgetForNextMonth: vi.fn(),
  resetBudgetHold: vi.fn(), batchBudgetUpdates: vi.fn(),
  createPayee: vi.fn(), updatePayee: vi.fn(), deletePayee: vi.fn(), mergePayees: vi.fn(),
  getPayeeRules: vi.fn(), getRules: vi.fn(), createRule: vi.fn(), updateRule: vi.fn(), deleteRule: vi.fn(),
  updateTransaction: vi.fn(), deleteTransaction: vi.fn()
}));

vi.mock('@actual-app/api', () => sdk);

import { actualApiAdapter, type AdapterRule } from '../src/actual/adapter.js';

describe('Actual 26.8.1 adapter compatibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists income category-group type through the exported update method', async () => {
    sdk.createCategoryGroup.mockResolvedValue('income-group');

    await expect(actualApiAdapter.createCategoryGroup({
      name: 'Income',
      is_income: true,
      hidden: false
    })).resolves.toBe('income-group');

    expect(sdk.createCategoryGroup).toHaveBeenCalledWith({ name: 'Income', is_income: true, hidden: false });
    expect(sdk.updateCategoryGroup).toHaveBeenCalledWith('income-group', { name: 'Income', is_income: true });
  });

  it('does not add a redundant type update for the SDK expense default', async () => {
    sdk.createCategoryGroup.mockResolvedValue('expense-group');

    await actualApiAdapter.createCategoryGroup({ name: 'Expense', is_income: false, hidden: false });

    expect(sdk.updateCategoryGroup).not.toHaveBeenCalled();
  });

  it('rolls back the exact newly-created group when income-type persistence fails', async () => {
    sdk.createCategoryGroup.mockResolvedValue('partial-group');
    sdk.updateCategoryGroup.mockRejectedValue(new Error('SDK rejected partial update'));

    await expect(actualApiAdapter.createCategoryGroup({ name: 'Income', is_income: true, hidden: false }))
      .rejects.toThrow('SDK rejected partial update');

    expect(sdk.deleteCategoryGroup).toHaveBeenCalledWith('partial-group');
  });

  it('supplies the persisted category name for move and visibility-only updates', async () => {
    sdk.getCategories.mockResolvedValue([{ id: 'category', name: 'Food', group_id: 'old', is_income: false, hidden: false }]);

    await actualApiAdapter.updateCategory('category', { group_id: 'new' });
    await actualApiAdapter.updateCategory('category', { hidden: true });

    expect(sdk.updateCategory).toHaveBeenNthCalledWith(1, 'category', { group_id: 'new', name: 'Food' });
    expect(sdk.updateCategory).toHaveBeenNthCalledWith(2, 'category', { hidden: true, name: 'Food' });
  });

  it('fails rather than inventing a category name when the SDK read cannot find it', async () => {
    sdk.getCategories.mockResolvedValue([]);

    await expect(actualApiAdapter.updateCategory('missing', { hidden: true })).rejects.toThrow('Category with id missing not found.');
    expect(sdk.updateCategory).not.toHaveBeenCalled();
  });

  it('forwards every official payee and rule binding with exact payloads', async () => {
    const rule: AdapterRule = { id: 'rule-id', stage: null, conditionsOp: 'and', conditions: [], actions: [] };
    sdk.createPayee.mockResolvedValue('payee-id');
    sdk.getPayeeRules.mockResolvedValue([rule]);
    sdk.getRules.mockResolvedValue([rule]);
    sdk.createRule.mockResolvedValue(rule);
    sdk.updateRule.mockResolvedValue(rule);
    sdk.deleteRule.mockResolvedValue(false);

    await expect(actualApiAdapter.createPayee({ name: 'Cafe' })).resolves.toBe('payee-id');
    await actualApiAdapter.updatePayee('payee-id', { name: 'Cafe renamed' });
    await actualApiAdapter.deletePayee('payee-id');
    await actualApiAdapter.mergePayees('target', ['source']);
    await expect(actualApiAdapter.getPayeeRules('payee-id')).resolves.toEqual([rule]);
    await expect(actualApiAdapter.getRules()).resolves.toEqual([rule]);
    await expect(actualApiAdapter.createRule({ stage: null, conditionsOp: 'and', conditions: [], actions: [] })).resolves.toEqual(rule);
    await expect(actualApiAdapter.updateRule(rule)).resolves.toEqual(rule);
    await expect(actualApiAdapter.deleteRule('rule-id')).resolves.toBe(false);

    expect(sdk.createPayee).toHaveBeenCalledWith({ name: 'Cafe' });
    expect(sdk.updatePayee).toHaveBeenCalledWith('payee-id', { name: 'Cafe renamed' });
    expect(sdk.deletePayee).toHaveBeenCalledWith('payee-id');
    expect(sdk.mergePayees).toHaveBeenCalledWith('target', ['source']);
    expect(sdk.getPayeeRules).toHaveBeenCalledWith('payee-id');
    expect(sdk.createRule).toHaveBeenCalledWith({ stage: null, conditionsOp: 'and', conditions: [], actions: [] });
    expect(sdk.updateRule).toHaveBeenCalledWith(rule);
    expect(sdk.deleteRule).toHaveBeenCalledWith('rule-id');
  });

  it('forwards all seven installed budget bindings without using batch execution', async () => {
    const month = {
      month: '2026-08', incomeAvailable: 0, lastMonthOverspent: 0, forNextMonth: 0, totalBudgeted: 0,
      toBudget: 0, fromLastMonth: 0, totalIncome: 0, totalSpent: 0, totalBalance: 0, categoryGroups: []
    };
    sdk.getBudgetMonths.mockResolvedValue(['2026-08']);
    sdk.getBudgetMonth.mockResolvedValue(month);
    sdk.holdBudgetForNextMonth.mockResolvedValue(true);
    sdk.batchBudgetUpdates.mockImplementation(async action => action());
    const batched = vi.fn().mockResolvedValue(undefined);

    await expect(actualApiAdapter.getBudgetMonths()).resolves.toEqual(['2026-08']);
    await expect(actualApiAdapter.getBudgetMonth('2026-08')).resolves.toEqual(month);
    await actualApiAdapter.setBudgetAmount('2026-08', 'category', -100);
    await actualApiAdapter.setBudgetCarryover('2026-08', 'category', true);
    await expect(actualApiAdapter.holdBudgetForNextMonth('2026-08', 100)).resolves.toBe(true);
    await actualApiAdapter.resetBudgetHold('2026-08');
    await actualApiAdapter.batchBudgetUpdates(batched);

    expect(sdk.setBudgetAmount).toHaveBeenCalledWith('2026-08', 'category', -100);
    expect(sdk.setBudgetCarryover).toHaveBeenCalledWith('2026-08', 'category', true);
    expect(sdk.holdBudgetForNextMonth).toHaveBeenCalledWith('2026-08', 100);
    expect(sdk.resetBudgetHold).toHaveBeenCalledWith('2026-08');
    expect(batched).toHaveBeenCalledOnce();
  });
});
