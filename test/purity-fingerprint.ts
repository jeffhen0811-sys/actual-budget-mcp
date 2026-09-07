import { createHash } from 'node:crypto';
import type { ActualApiAdapter } from '../src/actual/adapter.js';

type MockedMethod = { mock?: { calls?: unknown[][] } };

const PERSISTENCE_METHODS = [
  'createAccount',
  'updateAccount',
  'closeAccount',
  'reopenAccount',
  'deleteAccount',
  'createCategoryGroup',
  'updateCategoryGroup',
  'deleteCategoryGroup',
  'createCategory',
  'updateCategory',
  'deleteCategory',
  'setBudgetAmount',
  'setBudgetCarryover',
  'holdBudgetForNextMonth',
  'resetBudgetHold',
  'batchBudgetUpdates',
  'createPayee',
  'updatePayee',
  'deletePayee',
  'mergePayees',
  'createRule',
  'updateRule',
  'deleteRule',
  'createSchedule',
  'updateSchedule',
  'deleteSchedule',
  'addTransactions',
  'updateTransaction',
  'deleteTransaction'
] as const satisfies readonly (keyof ActualApiAdapter)[];

function callsFor(api: ActualApiAdapter, method: keyof ActualApiAdapter): unknown[][] {
  return ((api[method] as MockedMethod).mock?.calls ?? []);
}

/**
 * Hashes the bounded controlled state together with every persistence or sync
 * attempt. SDK initialization and dry-run import reconciliation are excluded:
 * both may update the local cache, but neither is a caller-requested mutation.
 */
export function purityBoundaryFingerprint(api: ActualApiAdapter, controlledState: unknown): string {
  const persistenceCalls = Object.fromEntries(PERSISTENCE_METHODS.map(method => [method, callsFor(api, method).length]));
  const persistedImportCalls = callsFor(api, 'importTransactions').filter(call => {
    const options = call[2];
    return typeof options !== 'object' || options === null || !('dryRun' in options) || options.dryRun !== true;
  }).length;
  const payload = {
    controlledState,
    persistenceCalls,
    persistedImportCalls,
    syncCalls: callsFor(api, 'sync').length
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
