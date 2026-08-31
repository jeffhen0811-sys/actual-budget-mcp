import { vi } from 'vitest';
import type { ActualApiAdapter } from '../src/actual/adapter.js';

export function fakeAdapter(): ActualApiAdapter {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    downloadBudget: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    sync: vi.fn().mockResolvedValue(undefined),
    getServerVersion: vi.fn().mockResolvedValue({ version: '26.7.0' }),
    getAccounts: vi.fn().mockResolvedValue([]),
    createAccount: vi.fn().mockResolvedValue('account-id'),
    updateAccount: vi.fn().mockResolvedValue(undefined),
    closeAccount: vi.fn().mockResolvedValue(undefined),
    reopenAccount: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    getAccountBalance: vi.fn().mockResolvedValue(0),
    getCategoryGroups: vi.fn().mockResolvedValue([]),
    createCategoryGroup: vi.fn().mockResolvedValue('group-id'),
    updateCategoryGroup: vi.fn().mockResolvedValue(undefined),
    deleteCategoryGroup: vi.fn().mockResolvedValue(undefined),
    getCategories: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn().mockResolvedValue('category-id'),
    updateCategory: vi.fn().mockResolvedValue(undefined),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    getAllTransactions: vi.fn().mockResolvedValue([]),
    getBudgetMonths: vi.fn().mockResolvedValue([]),
    getBudgetMonth: vi.fn().mockResolvedValue({ month: '2026-08', categoryGroups: [] }),
    getPayees: vi.fn().mockResolvedValue([]),
    createPayee: vi.fn().mockResolvedValue('payee-id'),
    updatePayee: vi.fn().mockResolvedValue(undefined),
    deletePayee: vi.fn().mockResolvedValue(undefined),
    mergePayees: vi.fn().mockResolvedValue(undefined),
    getPayeeRules: vi.fn().mockResolvedValue([]),
    getRules: vi.fn().mockResolvedValue([]),
    createRule: vi.fn().mockImplementation(async rule => ({ id: 'rule-id', ...rule })),
    updateRule: vi.fn().mockImplementation(async rule => rule),
    deleteRule: vi.fn().mockResolvedValue(true),
    getTransactions: vi.fn().mockResolvedValue([]),
    importTransactions: vi.fn().mockResolvedValue({ added: [], updated: [], errors: [] }),
    updateTransaction: vi.fn().mockResolvedValue(undefined),
    deleteTransaction: vi.fn().mockResolvedValue(undefined)
  };
}
