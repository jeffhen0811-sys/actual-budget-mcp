import * as actual from '@actual-app/api';

export interface AdapterAccount {
  id: string; name: string; offbudget?: boolean; closed?: boolean; balance_current?: number | null;
}
export interface AdapterCategory {
  id: string; name: string; group_id: string; is_income?: boolean; hidden?: boolean;
}
export interface AdapterCategoryGroup {
  id: string; name: string; is_income?: boolean; hidden?: boolean; categories?: AdapterCategory[];
}
export interface AdapterPayee { id: string; name: string }
export interface AdapterTransaction {
  id: string; account: string; date: string; amount: number; payee?: string | null; category?: string | null;
  notes?: string | null; cleared?: boolean; reconciled?: boolean; imported_id?: string | null;
  imported_payee?: string | null; transfer_id?: string | null; starting_balance_flag?: boolean;
  subtransactions?: AdapterTransaction[];
}
export interface AdapterBudgetCategory extends Record<string, unknown> {
  id?: unknown; budgeted?: unknown; carryover?: unknown;
}
export interface AdapterBudgetMonth {
  month: string;
  categoryGroups: Array<Record<string, unknown> & { categories?: AdapterBudgetCategory[] }>;
}
export interface ImportTransaction {
  account: string; date: string; amount: number; imported_id: string; payee_name?: string;
  imported_payee?: string; notes?: string; cleared?: boolean; category?: string;
}

export interface ActualApiAdapter {
  init(config: { dataDir: string; serverURL: string; password: string; verbose: false }): Promise<void>;
  downloadBudget(syncId: string, options?: { password?: string }): Promise<void>;
  shutdown(): Promise<void>;
  sync(): Promise<void>;
  getServerVersion(): Promise<{ version?: string; error?: 'no-server' | 'network-failure' }>;
  getAccounts(): Promise<AdapterAccount[]>;
  createAccount(account: Omit<AdapterAccount, 'id' | 'balance_current'>, initialBalance?: number): Promise<string>;
  updateAccount(id: string, fields: Pick<Partial<AdapterAccount>, 'name' | 'offbudget'>): Promise<void>;
  closeAccount(id: string, transferAccountId?: string, transferCategoryId?: string): Promise<void>;
  reopenAccount(id: string): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  getAccountBalance(id: string): Promise<number>;
  getCategoryGroups(): Promise<AdapterCategoryGroup[]>;
  createCategoryGroup(group: Omit<AdapterCategoryGroup, 'id' | 'categories'>): Promise<string>;
  updateCategoryGroup(id: string, fields: Pick<Partial<AdapterCategoryGroup>, 'name'>): Promise<void>;
  deleteCategoryGroup(id: string): Promise<void>;
  getCategories(): Promise<AdapterCategory[]>;
  createCategory(category: Omit<AdapterCategory, 'id'>): Promise<string>;
  updateCategory(id: string, fields: Pick<Partial<AdapterCategory>, 'name' | 'group_id' | 'hidden'>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  getAllTransactions(accountId: string): Promise<AdapterTransaction[]>;
  getBudgetMonths(): Promise<string[]>;
  getBudgetMonth(month: string): Promise<AdapterBudgetMonth>;
  getPayees(): Promise<AdapterPayee[]>;
  getTransactions(accountId: string, startDate: string, endDate: string): Promise<AdapterTransaction[]>;
  importTransactions(accountId: string, transactions: ImportTransaction[], options: { reimportDeleted: false }): Promise<{ added: string[]; updated: string[]; errors: Array<{ message: string }> }>;
  updateTransaction(id: string, fields: Partial<AdapterTransaction>): Promise<unknown>;
  deleteTransaction(id: string): Promise<unknown>;
}

export const actualApiAdapter: ActualApiAdapter = {
  async init(config) { await actual.init(config); },
  downloadBudget: actual.downloadBudget,
  shutdown: actual.shutdown,
  sync: actual.sync,
  getServerVersion: actual.getServerVersion,
  getAccounts: actual.getAccounts,
  createAccount: actual.createAccount,
  updateAccount: actual.updateAccount,
  closeAccount: actual.closeAccount,
  reopenAccount: actual.reopenAccount,
  deleteAccount: actual.deleteAccount,
  getAccountBalance: actual.getAccountBalance,
  getCategoryGroups: actual.getCategoryGroups,
  createCategoryGroup: async group => {
    const id = await actual.createCategoryGroup(group);
    // Actual 26.8.1 drops `is_income` in its public create handler. Apply the
    // requested income type through the exported update method before sync.
    // That update path also requires `name` despite declaring partial fields.
    try {
      if (group.is_income) await actual.updateCategoryGroup(id, { name: group.name, is_income: true });
    } catch (error) {
      // The ID is already known but has not reached the caller's registry. Roll
      // back this proven-empty group by that exact ID so a failed create cannot
      // leave an unowned resource behind.
      try { await actual.deleteCategoryGroup(id); }
      catch { throw new Error(`Category group ${id} could not be configured or rolled back.`, { cause: error }); }
      throw error;
    }
    return id;
  },
  updateCategoryGroup: actual.updateCategoryGroup,
  deleteCategoryGroup: id => actual.deleteCategoryGroup(id),
  getCategories: actual.getCategories,
  createCategory: actual.createCategory,
  updateCategory: async (id, fields) => {
    // Although the 26.8.1 declaration accepts Partial<APICategoryEntity>, its
    // implementation always trims `name`. Supply the persisted name for move
    // and visibility-only updates so the public partial-update path is usable.
    if (fields.name === undefined) {
      const current = (await actual.getCategories()).find(category => category.id === id);
      if (!current) throw new Error(`Category with id ${id} not found.`);
      await actual.updateCategory(id, { ...fields, name: current.name });
      return;
    }
    await actual.updateCategory(id, fields);
  },
  deleteCategory: id => actual.deleteCategory(id),
  getAllTransactions: accountId => {
    const unbounded = actual.getTransactions as unknown as (id: string, startDate?: string, endDate?: string) => Promise<AdapterTransaction[]>;
    return unbounded(accountId);
  },
  getBudgetMonths: actual.getBudgetMonths,
  getBudgetMonth: actual.getBudgetMonth as (month: string) => Promise<AdapterBudgetMonth>,
  getPayees: actual.getPayees,
  getTransactions: actual.getTransactions,
  importTransactions: actual.importTransactions,
  updateTransaction: actual.updateTransaction,
  deleteTransaction: actual.deleteTransaction
};
