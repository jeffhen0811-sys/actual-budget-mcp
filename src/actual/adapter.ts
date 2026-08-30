import * as actual from '@actual-app/api';

export interface AdapterAccount { id: string; name: string; offbudget?: boolean; closed?: boolean }
export interface AdapterCategoryGroup { id: string; name: string; categories?: Array<{ id: string; name: string; hidden?: boolean }> }
export interface AdapterPayee { id: string; name: string }
export interface AdapterTransaction {
  id: string; account: string; date: string; amount: number; payee?: string | null; category?: string | null;
  notes?: string | null; cleared?: boolean; reconciled?: boolean; imported_id?: string | null;
  imported_payee?: string | null; transfer_id?: string | null; starting_balance_flag?: boolean;
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
  getAccountBalance(id: string): Promise<number>;
  getCategoryGroups(): Promise<AdapterCategoryGroup[]>;
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
  getAccountBalance: actual.getAccountBalance,
  getCategoryGroups: actual.getCategoryGroups,
  getPayees: actual.getPayees,
  getTransactions: actual.getTransactions,
  importTransactions: actual.importTransactions,
  updateTransaction: actual.updateTransaction,
  deleteTransaction: actual.deleteTransaction
};
