import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  init: vi.fn(), downloadBudget: vi.fn(), shutdown: vi.fn(), sync: vi.fn(), getServerVersion: vi.fn(),
  getAccounts: vi.fn(), createAccount: vi.fn(), updateAccount: vi.fn(), closeAccount: vi.fn(),
  reopenAccount: vi.fn(), deleteAccount: vi.fn(), getAccountBalance: vi.fn(), getCategoryGroups: vi.fn(),
  createCategoryGroup: vi.fn(), updateCategoryGroup: vi.fn(), deleteCategoryGroup: vi.fn(), getCategories: vi.fn(),
  createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(), getBudgetMonths: vi.fn(),
  getBudgetMonth: vi.fn(), getPayees: vi.fn(), getTransactions: vi.fn(), importTransactions: vi.fn(),
  updateTransaction: vi.fn(), deleteTransaction: vi.fn()
}));

vi.mock('@actual-app/api', () => sdk);

import { actualApiAdapter } from '../src/actual/adapter.js';

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
});
