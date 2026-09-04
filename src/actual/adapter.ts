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
export interface AdapterPayee { id: string; name: string; transfer_acct?: string | null }
export interface AdapterRecurPattern { value: number; type: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'day' }
export interface AdapterRecurConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  patterns?: AdapterRecurPattern[];
  skipWeekend?: boolean;
  start: string;
  endMode?: 'never' | 'after_n_occurrences' | 'on_date';
  endOccurrences?: number;
  endDate?: string;
  weekendSolveMode?: 'before' | 'after';
}
export interface AdapterSchedule {
  id: string;
  name?: string;
  posts_transaction: boolean;
  rule?: string;
  next_date?: string;
  completed?: boolean;
  payee?: string | null;
  account?: string | null;
  amount?: number | { num1: number; num2: number };
  amountOp: 'is' | 'isapprox' | 'isbetween';
  date: string | AdapterRecurConfig;
  [key: string]: unknown;
}
export interface AdapterRuleCondition {
  field: string;
  op: string;
  value: unknown;
  options?: { inflow?: boolean; outflow?: boolean; month?: boolean; year?: boolean } | null;
  conditionsOp?: 'and' | 'or';
  type?: 'id' | 'boolean' | 'date' | 'number' | 'string';
  customName?: string;
  queryFilter?: Record<string, { $oneof: string[] }>;
}
export interface AdapterRuleAction {
  op: string;
  field?: string | null;
  value: unknown;
  options?: { template?: string; formula?: string; splitIndex?: number; method?: string } | null;
  type?: string;
}
export interface AdapterRule {
  id: string;
  stage: 'pre' | null | 'post';
  conditionsOp: 'and' | 'or';
  conditions: AdapterRuleCondition[];
  actions: AdapterRuleAction[];
  tombstone?: boolean;
}
export interface AdapterTransaction {
  [key: string]: unknown;
  id: string; account: string; date: string; amount: number; payee?: string | null; category?: string | null;
  notes?: string | null; cleared?: boolean; reconciled?: boolean; imported_id?: string | null;
  imported_payee?: string | null; transfer_id?: string | null; starting_balance_flag?: boolean;
  isTransfer?: boolean;
  is_parent?: boolean; is_child?: boolean; parent_id?: string | null;
  payee_name?: string | null; category_name?: string | null;
  schedule?: string | null;
  subtransactions?: AdapterTransaction[];
}
export interface AdapterBudgetCategory extends Record<string, unknown> {
  id?: unknown; name?: unknown; group_id?: unknown; is_income?: unknown; hidden?: unknown;
  budgeted?: unknown; spent?: unknown; received?: unknown; balance?: unknown; carryover?: unknown;
}
export interface AdapterBudgetMonth {
  month: string;
  incomeAvailable?: unknown;
  lastMonthOverspent?: unknown;
  forNextMonth?: unknown;
  totalBudgeted?: unknown;
  toBudget?: unknown;
  fromLastMonth?: unknown;
  totalIncome?: unknown;
  totalSpent?: unknown;
  totalBalance?: unknown;
  categoryGroups: Array<Record<string, unknown> & { categories?: AdapterBudgetCategory[] }>;
}
export interface ImportTransaction {
  account: string; date: string; amount: number; imported_id: string; payee_name?: string;
  payee?: string; imported_payee?: string; notes?: string; cleared?: boolean; category?: string;
  subtransactions?: Array<{ amount: number; category?: string; notes?: string }>;
}

export interface AdapterImportOptions {
  defaultCleared: boolean;
  dryRun: boolean;
  reimportDeleted: boolean;
}

export interface AdapterImportPreviewEntry {
  transaction: AdapterTransaction;
  existing?: AdapterTransaction | false;
  ignored?: boolean;
  tombstone?: boolean;
}

export interface AdapterImportResult {
  added: string[];
  updated: string[];
  updatedPreview: AdapterImportPreviewEntry[];
  errors: Array<{ message: string }>;
}

export type AdapterTransactionQuery = ReturnType<typeof actual.q>;

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
  getAccountBalance(id: string, cutoff?: Date): Promise<number>;
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
  setBudgetAmount(month: string, categoryId: string, value: number): Promise<void>;
  setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void>;
  holdBudgetForNextMonth(month: string, amount: number): Promise<boolean>;
  resetBudgetHold(month: string): Promise<void>;
  batchBudgetUpdates(action: () => Promise<void>): Promise<void>;
  getPayees(): Promise<AdapterPayee[]>;
  getTransferPayees(): Promise<AdapterPayee[]>;
  createPayee(payee: { name: string }): Promise<string>;
  updatePayee(id: string, fields: { name: string }): Promise<void>;
  deletePayee(id: string): Promise<void>;
  mergePayees(targetId: string, mergeIds: string[]): Promise<void>;
  getPayeeRules(payeeId: string): Promise<AdapterRule[]>;
  getRules(): Promise<AdapterRule[]>;
  createRule(rule: Omit<AdapterRule, 'id'>): Promise<AdapterRule>;
  updateRule(rule: AdapterRule): Promise<AdapterRule>;
  deleteRule(id: string): Promise<boolean>;
  getSchedules(): Promise<AdapterSchedule[]>;
  createSchedule(schedule: Omit<AdapterSchedule, 'id'>): Promise<string>;
  updateSchedule(id: string, fields: Partial<AdapterSchedule>, resetNextDate?: boolean): Promise<string>;
  deleteSchedule(id: string): Promise<void>;
  getTransactions(accountId: string, startDate: string, endDate: string): Promise<AdapterTransaction[]>;
  aqlQuery(query: AdapterTransactionQuery): Promise<unknown>;
  addTransactions(
    accountId: string,
    transactions: Omit<ImportTransaction, 'account' | 'imported_id'>[],
    options: { runTransfers: true }
  ): Promise<'ok'>;
  importTransactions(accountId: string, transactions: ImportTransaction[], options: AdapterImportOptions): Promise<AdapterImportResult>;
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
  setBudgetAmount: actual.setBudgetAmount,
  setBudgetCarryover: actual.setBudgetCarryover,
  holdBudgetForNextMonth: actual.holdBudgetForNextMonth,
  resetBudgetHold: actual.resetBudgetHold,
  batchBudgetUpdates: actual.batchBudgetUpdates,
  getPayees: actual.getPayees,
  getTransferPayees: async () => (await actual.getPayees()).filter(payee =>
    typeof payee.transfer_acct === 'string' && payee.transfer_acct.trim().length > 0
  ),
  createPayee: actual.createPayee,
  updatePayee: actual.updatePayee,
  deletePayee: actual.deletePayee,
  mergePayees: actual.mergePayees,
  getPayeeRules: actual.getPayeeRules as (payeeId: string) => Promise<AdapterRule[]>,
  getRules: actual.getRules as () => Promise<AdapterRule[]>,
  createRule: actual.createRule as unknown as (rule: Omit<AdapterRule, 'id'>) => Promise<AdapterRule>,
  updateRule: actual.updateRule as unknown as (rule: AdapterRule) => Promise<AdapterRule>,
  deleteRule: actual.deleteRule,
  getSchedules: actual.getSchedules as () => Promise<AdapterSchedule[]>,
  createSchedule: actual.createSchedule as unknown as (schedule: Omit<AdapterSchedule, 'id'>) => Promise<string>,
  updateSchedule: actual.updateSchedule as unknown as (id: string, fields: Partial<AdapterSchedule>, resetNextDate?: boolean) => Promise<string>,
  deleteSchedule: actual.deleteSchedule,
  getTransactions: actual.getTransactions,
  aqlQuery: actual.aqlQuery,
  addTransactions: (accountId, transactions, options) => actual.addTransactions(accountId, transactions, options),
  importTransactions: actual.importTransactions,
  updateTransaction: actual.updateTransaction,
  deleteTransaction: actual.deleteTransaction
};
