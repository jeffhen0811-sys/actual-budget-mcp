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
    getAccountBalance: vi.fn().mockResolvedValue(0),
    getCategoryGroups: vi.fn().mockResolvedValue([]),
    getPayees: vi.fn().mockResolvedValue([]),
    getTransactions: vi.fn().mockResolvedValue([]),
    importTransactions: vi.fn().mockResolvedValue({ added: [], updated: [], errors: [] }),
    updateTransaction: vi.fn().mockResolvedValue(undefined),
    deleteTransaction: vi.fn().mockResolvedValue(undefined)
  };
}
