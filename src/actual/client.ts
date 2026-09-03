import { open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { ActualConfig } from '../config.js';
import { loadConfig, sanitizeServerUrl } from '../config.js';
import { mapError, PublicError } from '../errors.js';
import type { Logger } from '../logger.js';
import { createLogger } from '../logger.js';
import { errorMessage, redact } from '../redaction.js';
import { DEFAULT_BUDGET_CATEGORY_RESULTS, MAX_BUDGET_CATEGORY_RESULTS, MAX_TRANSACTION_RESULTS } from '../schemas.js';
import type {
  ActualApiAdapter,
  AdapterAccount,
  AdapterBudgetMonth,
  AdapterCategory,
  AdapterCategoryGroup,
  AdapterPayee,
  AdapterRule,
  AdapterTransaction,
  ImportTransaction
} from './adapter.js';
import {
  importRequestFingerprint,
  normalizeImportRequest,
  parseImportResult,
  type ImportRequestOptions
} from './imports.js';
import {
  desiredStateMatches,
  planBulkTransactionUpdates,
  type BulkUpdateItem
} from './bulk.js';
import { FifoQueue } from './queue.js';
import {
  compileExactTransaction,
  compileTransactionsByIds,
  compileTransactionSearch,
  compileTransactionTotal,
  parseAqlAggregate,
  parseAqlRows,
  projectTransaction,
  type TransactionSearchRequest
} from './transactions.js';
import {
  budgetModeCapability,
  findBudgetCategory,
  planBudgetCopy,
  projectBudgetMonth,
  type BudgetCopyMode,
  type PublicBudgetCategory,
  type PublicBudgetGroup,
  type PublicBudgetMonth
} from './budget.js';
import {
  isWritableRuleAction,
  isWritableRuleCondition,
  projectRule,
  toSdkRule,
  type PublicRule,
  type PublicRuleAction,
  type PublicRuleCondition,
  type PublicRuleStage,
  type WritableRuleDraft
} from './rules.js';

export interface PublicAccount {
  id: string;
  name: string;
  offbudget: boolean;
  closed: boolean;
  balance?: number;
  balanceError?: string;
}

export interface PublicCategoryGroup {
  id: string;
  name: string;
  isIncome: boolean;
  hidden: boolean;
}

export interface PublicCategory {
  id: string;
  name: string;
  groupId: string;
  isIncome: boolean;
  hidden: boolean;
}

export interface PublicPayee {
  id: string;
  name: string;
  transferAccountId?: string | null;
}

export interface MutationResult<T> { success: true; changed: boolean; }
export type AccountMutationResult = MutationResult<PublicAccount> & { account: PublicAccount };
export type CategoryGroupMutationResult = MutationResult<PublicCategoryGroup> & { categoryGroup: PublicCategoryGroup };
export type CategoryMutationResult = MutationResult<PublicCategory> & { category: PublicCategory };
export type PayeeMutationResult = MutationResult<PublicPayee> & { payee: PublicPayee };
export type RuleMutationResult = MutationResult<PublicRule> & { rule: PublicRule };
export interface PayeeMergeImpact {
  payeeId: string;
  payeeName: string;
  relatedTransactionCount: number;
  relatedRuleCount: number;
}

export interface RuntimeHealth {
  connected: boolean;
  server: string;
  budgetLoaded: boolean;
  version?: string;
  diagnosticCode?: string;
}

export class ActualClient {
  private readonly queue = new FifoQueue();
  private config: ActualConfig | undefined;
  private initialization: Promise<void> | undefined;
  private ready = false;
  private lockPath: string | undefined;
  private shutdownPromise: Promise<void> | undefined;

  constructor(
    private readonly api: ActualApiAdapter,
    private readonly configLoader: () => Promise<ActualConfig> = () => loadConfig(),
    private readonly logger: Logger = createLogger()
  ) {}

  private secrets(): Array<string | undefined> {
    return [this.config?.password, this.config?.encryptionPassword];
  }

  private async acquireCacheLock(dataDir: string): Promise<void> {
    const lockPath = join(dataDir, '.actual-budget-mcp.lock');
    try {
      const handle = await open(lockPath, 'wx', 0o600);
      await handle.writeFile(`${process.pid}\n`, 'utf8');
      await handle.close();
      this.lockPath = lockPath;
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : '';
      if (code === 'EEXIST') {
        throw new PublicError('CACHE_IN_USE', 'Another process is already using this Actual cache directory.', 'initialize', false);
      }
      throw error;
    }
  }

  private async releaseCacheLock(): Promise<void> {
    if (!this.lockPath) return;
    const path = this.lockPath;
    this.lockPath = undefined;
    await unlink(path).catch(() => undefined);
  }

  private async initialize(): Promise<void> {
    this.config = await this.configLoader();
    await this.acquireCacheLock(this.config.dataDir);
    try {
      await this.api.init({
        dataDir: this.config.dataDir,
        serverURL: this.config.serverUrl,
        password: this.config.password,
        verbose: false
      });
      await this.api.downloadBudget(
        this.config.syncId,
        this.config.encryptionPassword === undefined ? undefined : { password: this.config.encryptionPassword }
      );
      this.ready = true;
    } catch (error) {
      await this.api.shutdown().catch(() => undefined);
      await this.releaseCacheLock();
      throw mapError(error, 'initialize', this.secrets());
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    if (!this.initialization) {
      this.initialization = this.initialize().finally(() => {
        if (!this.ready) this.initialization = undefined;
      });
    }
    await this.initialization;
  }

  private run<T>(operation: string, action: () => Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      try {
        await this.ensureReady();
        return await action();
      } catch (error) {
        throw mapError(error, operation, this.secrets());
      }
    });
  }

  async health(): Promise<RuntimeHealth> {
    return this.queue.run(async () => {
      try {
        await this.ensureReady();
        const status = await this.api.getServerVersion();
        if ('version' in status && status.version) {
          return {
            connected: true,
            server: sanitizeServerUrl(this.config!.serverUrl),
            budgetLoaded: this.ready,
            version: status.version
          };
        }
        return {
          connected: false,
          server: sanitizeServerUrl(this.config!.serverUrl),
          budgetLoaded: this.ready,
          diagnosticCode: status.error ?? 'SERVER_UNAVAILABLE'
        };
      } catch (error) {
        const mapped = mapError(error, 'actual_health', this.secrets());
        return {
          connected: false,
          server: this.config ? sanitizeServerUrl(this.config.serverUrl) : '[not-configured]',
          budgetLoaded: this.ready,
          diagnosticCode: mapped.code
        };
      }
    });
  }

  sync(): Promise<{ success: true; synchronizedAt: string }> {
    return this.run('actual_sync', async () => {
      await this.api.sync();
      return { success: true, synchronizedAt: new Date().toISOString() };
    });
  }

  listAccounts(): Promise<PublicAccount[]> {
    return this.run('actual_list_accounts', async () => {
      const accounts = await this.api.getAccounts();
      const output: PublicAccount[] = [];
      for (const account of accounts) {
        const normalized: PublicAccount = {
          id: account.id,
          name: account.name,
          offbudget: account.offbudget ?? false,
          closed: account.closed ?? false
        };
        try {
          normalized.balance = await this.api.getAccountBalance(account.id);
        } catch (error) {
          normalized.balanceError = redact(errorMessage(error), this.secrets()) || 'Balance unavailable.';
        }
        output.push(normalized);
      }
      return output;
    });
  }

  async getAccount(accountId: string): Promise<PublicAccount> {
    const accounts = await this.listAccounts();
    const account = accounts.find(item => item.id === accountId);
    if (!account) throw new PublicError('NOT_FOUND', 'The requested account was not found.', 'actual_get_account', false);
    return account;
  }

  listCategories() {
    return this.run('actual_list_categories', async () =>
      (await this.api.getCategoryGroups()).map(group => ({
        groupId: group.id,
        groupName: group.name,
        categories: (group.categories ?? []).map(category => ({ id: category.id, name: category.name, hidden: category.hidden ?? false }))
      }))
    );
  }

  listPayees() {
    return this.run('actual_list_payees', async () => (await this.api.getPayees()).map(payee => ({ id: payee.id, name: payee.name })));
  }

  getTransactions(accountId: string, startDate: string, endDate: string) {
    return this.run('actual_get_transactions', async () => {
      const transactions = await this.api.getTransactions(accountId, startDate, endDate);
      if (transactions.length > MAX_TRANSACTION_RESULTS) {
        throw new PublicError(
          'RESULT_TOO_LARGE',
          `The result exceeds ${MAX_TRANSACTION_RESULTS} transactions. Request a narrower date range.`,
          'actual_get_transactions',
          false
        );
      }
      return transactions.map(transaction => projectTransaction(transaction, 'actual_get_transactions'));
    });
  }

  private validBudgetMonth(value: string): boolean {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  }

  private async completeBudgetMonths(operation: string): Promise<string[]> {
    try {
      const months = await this.api.getBudgetMonths();
      if (!Array.isArray(months) || months.some(month => typeof month !== 'string' || !this.validBudgetMonth(month))) {
        throw new Error('Budget month range was malformed.');
      }
      return months;
    } catch (error) {
      if (error instanceof PublicError) throw error;
      throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'The official budget month range could not be verified.', operation, false, undefined, { cause: error });
    }
  }

  private async projectedBudgetMonth(month: string, operation: string, availableMonths?: readonly string[]): Promise<PublicBudgetMonth> {
    if (!this.validBudgetMonth(month)) throw new PublicError('INVALID_BUDGET_VALUE', 'Budget month must use valid YYYY-MM form.', operation, false, {
      entity: { type: 'budgetMonth', id: month }
    });
    const months = availableMonths ?? await this.completeBudgetMonths(operation);
    if (!months.includes(month)) throw new PublicError('BUDGET_MONTH_UNAVAILABLE', 'The requested month is outside the official available budget range.', operation, false, {
      entity: { type: 'budgetMonth', id: month }, details: { month }
    });
    try {
      const projected = projectBudgetMonth(await this.api.getBudgetMonth(month));
      if (projected.month !== month) throw new Error('Budget month identity did not match the request.');
      return projected;
    } catch (error) {
      throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'Actual returned an incomplete or unsupported budget month shape.', operation, false, {
        entity: { type: 'budgetMonth', id: month }
      }, { cause: error });
    }
  }

  private requireBudgetCategory(month: PublicBudgetMonth, categoryId: string, operation: string): PublicBudgetCategory {
    const category = findBudgetCategory(month, categoryId);
    if (!category) throw new PublicError('NOT_FOUND', 'The requested category was not found in the budget month.', operation, false, {
      entity: { type: 'category', id: categoryId }, details: { month: month.month }
    });
    return category;
  }

  listBudgetMonths(): Promise<{ months: string[]; count: number }> {
    const operation = 'actual_list_budget_months';
    return this.run(operation, async () => {
      const months = await this.completeBudgetMonths(operation);
      return { months, count: months.length };
    });
  }

  getBudgetMonth(month: string): Promise<PublicBudgetMonth> {
    const operation = 'actual_get_budget_month';
    return this.run(operation, async () => this.projectedBudgetMonth(month, operation));
  }

  getBudgetSummary(
    month: string,
    filters: { groupId?: string; categoryId?: string; limit?: number } = {}
  ) {
    const operation = 'actual_get_budget_summary';
    return this.run(operation, async () => {
      const projected = await this.projectedBudgetMonth(month, operation);
      const limit = filters.limit ?? DEFAULT_BUDGET_CATEGORY_RESULTS;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_BUDGET_CATEGORY_RESULTS) {
        throw new PublicError('INVALID_BUDGET_VALUE', `Budget detail limit must be between 1 and ${MAX_BUDGET_CATEGORY_RESULTS}.`, operation, false);
      }
      let groups = projected.categoryGroups;
      if (filters.groupId !== undefined) {
        if (!groups.some(group => group.id === filters.groupId)) throw new PublicError('NOT_FOUND', 'The requested category group was not found in the budget month.', operation, false, {
          entity: { type: 'categoryGroup', id: filters.groupId }, details: { month }
        });
        groups = groups.filter(group => group.id === filters.groupId);
      }
      if (filters.categoryId !== undefined && !groups.some(group => group.categories.some(category => category.id === filters.categoryId))) {
        throw new PublicError('NOT_FOUND', 'The requested category was not found in the selected budget detail.', operation, false, {
          entity: { type: 'category', id: filters.categoryId }, details: { month }
        });
      }
      const filtered = groups.map(group => ({
        ...group,
        categories: filters.categoryId === undefined ? group.categories : group.categories.filter(category => category.id === filters.categoryId)
      })).filter(group => group.categories.length > 0);
      const categoryCount = filtered.reduce((count, group) => count + group.categories.length, 0);
      let remaining = limit;
      const bounded: PublicBudgetGroup[] = [];
      for (const group of filtered) {
        if (remaining === 0) break;
        const categories = group.categories.slice(0, remaining);
        remaining -= categories.length;
        if (categories.length > 0) bounded.push({ ...group, categories });
      }
      return {
        month: projected.month,
        incomeAvailable: projected.incomeAvailable,
        lastMonthOverspent: projected.lastMonthOverspent,
        forNextMonth: projected.forNextMonth,
        totalBudgeted: projected.totalBudgeted,
        toBudget: projected.toBudget,
        fromLastMonth: projected.fromLastMonth,
        totalIncome: projected.totalIncome,
        totalSpent: projected.totalSpent,
        totalBalance: projected.totalBalance,
        categoryGroups: bounded,
        categoryCount,
        omittedCategoryCount: Math.max(0, categoryCount - limit)
      };
    });
  }

  private async synchronizeBudgetMutation<T>(
    operation: string,
    entity: { type: 'category' | 'budgetMonth'; id: string; name?: string },
    verify: () => Promise<T>
  ): Promise<T> {
    try {
      await this.api.sync();
    } catch (error) {
      throw new PublicError('MUTATION_SYNC_FAILED', 'The budget change may have succeeded locally, but synchronization failed. Run actual_sync and read the affected month before another mutation.', operation, false, {
        recoveryAction: 'actual_sync', entity, state: 'local_change_may_have_succeeded', partialState: true
      }, { cause: error });
    }
    try {
      return await verify();
    } catch (error) {
      if (error instanceof PublicError && error.code === 'BUDGET_VERIFICATION_FAILED') throw error;
      throw new PublicError('BUDGET_VERIFICATION_FAILED', 'The budget change synchronized, but its persisted state could not be verified.', operation, false, {
        recoveryAction: 'actual_sync', entity, state: 'synchronized_but_unverified', partialState: true
      }, { cause: error });
    }
  }

  setBudgetAmount(month: string, categoryId: string, amount: number) {
    const operation = 'actual_set_budget_amount';
    return this.run(operation, async () => {
      if (!Number.isSafeInteger(amount)) throw new PublicError('INVALID_BUDGET_VALUE', 'Budget amount must be a safe integer in minor units.', operation, false);
      const months = await this.completeBudgetMonths(operation);
      const beforeMonth = await this.projectedBudgetMonth(month, operation, months);
      const before = this.requireBudgetCategory(beforeMonth, categoryId, operation);
      if (!before.capabilities.budgetAmount || typeof before.budgeted !== 'number') throw new PublicError(
        'INCOMPATIBLE_BUDGET_CATEGORY',
        'The returned month shape does not prove that this category supports budget amounts.',
        operation,
        false,
        { entity: { type: 'category', id: before.id, name: before.name }, details: { month, isIncome: before.isIncome } }
      );
      if (before.budgeted === amount) return {
        success: true as const, changed: false, month, categoryId, previousAmount: before.budgeted, currentAmount: before.budgeted, category: before
      };
      try { await this.api.setBudgetAmount(month, categoryId, amount); }
      catch (error) { throw new PublicError('MUTATION_FAILED', 'Actual rejected the budget amount mutation.', operation, false, {
        entity: { type: 'category', id: before.id, name: before.name }, details: { month }
      }, { cause: error }); }
      const after = await this.synchronizeBudgetMutation(operation, { type: 'category', id: before.id, name: before.name }, async () => {
        const category = this.requireBudgetCategory(await this.projectedBudgetMonth(month, operation, months), categoryId, operation);
        if (category.budgeted !== amount) throw new Error('Persisted budget amount did not match the desired value.');
        return category;
      });
      return { success: true as const, changed: true, month, categoryId, previousAmount: before.budgeted, currentAmount: amount, category: after };
    });
  }

  setBudgetCarryover(month: string, categoryId: string, carryover: boolean) {
    const operation = 'actual_set_budget_carryover';
    return this.run(operation, async () => {
      const months = await this.completeBudgetMonths(operation);
      const start = months.indexOf(month);
      if (start < 0) await this.projectedBudgetMonth(month, operation, months);
      const affectedMonths = months.slice(start);
      const beforeStates: Array<{ month: string; category: PublicBudgetCategory }> = [];
      for (const affectedMonth of affectedMonths) {
        const category = this.requireBudgetCategory(await this.projectedBudgetMonth(affectedMonth, operation, months), categoryId, operation);
        if (category.isIncome || !category.capabilities.carryover || typeof category.carryover !== 'boolean') throw new PublicError(
          'INCOMPATIBLE_BUDGET_CATEGORY',
          'Carryover is supported only for expense categories with an observed carryover field.',
          operation,
          false,
          { entity: { type: 'category', id: category.id, name: category.name }, details: { month: affectedMonth, isIncome: category.isIncome } }
        );
        beforeStates.push({ month: affectedMonth, category });
      }
      const before = beforeStates[0]!;
      const verifiedThroughMonth = affectedMonths.at(-1) ?? month;
      if (beforeStates.every(state => state.category.carryover === carryover)) return {
        success: true as const, changed: false, month, categoryId, previousCarryover: before.category.carryover!, currentCarryover: carryover,
        effectiveFromMonth: month, verifiedThroughMonth, category: before.category
      };
      try { await this.api.setBudgetCarryover(month, categoryId, carryover); }
      catch (error) { throw new PublicError('MUTATION_FAILED', 'Actual rejected the prospective carryover mutation.', operation, false, {
        entity: { type: 'category', id: before.category.id, name: before.category.name }, details: { effectiveFromMonth: month }
      }, { cause: error }); }
      const after = await this.synchronizeBudgetMutation(operation, { type: 'category', id: before.category.id, name: before.category.name }, async () => {
        let selected: PublicBudgetCategory | undefined;
        for (const affectedMonth of affectedMonths) {
          const category = this.requireBudgetCategory(await this.projectedBudgetMonth(affectedMonth, operation, months), categoryId, operation);
          if (category.carryover !== carryover) throw new Error('Prospective carryover did not persist through the available range.');
          if (affectedMonth === month) selected = category;
        }
        if (!selected) throw new Error('Selected carryover month could not be verified.');
        return selected;
      });
      return {
        success: true as const, changed: true, month, categoryId, previousCarryover: before.category.carryover!, currentCarryover: carryover,
        effectiveFromMonth: month, verifiedThroughMonth, category: after
      };
    });
  }

  holdBudgetForNextMonth(month: string, amount: number) {
    const operation = 'actual_hold_budget_for_next_month';
    return this.run(operation, async () => {
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new PublicError('INVALID_BUDGET_VALUE', 'Hold amount must be a positive safe integer. Use actual_reset_budget_hold to remove a manual hold.', operation, false);
      const months = await this.completeBudgetMonths(operation);
      const before = await this.projectedBudgetMonth(month, operation, months);
      if (budgetModeCapability(before) !== 'envelope') throw new PublicError('UNSUPPORTED_BUDGET_MODE', 'Holding funds is supported only when the returned month shape proves envelope-budget behavior.', operation, false, {
        entity: { type: 'budgetMonth', id: month }
      });
      let applied: boolean;
      try { applied = await this.api.holdBudgetForNextMonth(month, amount); }
      catch (error) { throw new PublicError('MUTATION_FAILED', 'Actual rejected the incremental budget hold.', operation, false, {
        entity: { type: 'budgetMonth', id: month }
      }, { cause: error }); }
      if (!applied) return {
        success: true as const, changed: false, month, requestedAmount: amount, officialApplied: false,
        previousForNextMonth: before.forNextMonth, currentForNextMonth: before.forNextMonth
      };
      const after = await this.synchronizeBudgetMutation(operation, { type: 'budgetMonth', id: month }, async () => {
        const persisted = await this.projectedBudgetMonth(month, operation, months);
        if (persisted.forNextMonth === before.forNextMonth) throw new Error('Applied hold did not change the observed next-month aggregate.');
        return persisted;
      });
      return {
        success: true as const, changed: true, month, requestedAmount: amount, officialApplied: true,
        previousForNextMonth: before.forNextMonth, currentForNextMonth: after.forNextMonth
      };
    });
  }

  resetBudgetHold(month: string) {
    const operation = 'actual_reset_budget_hold';
    return this.run(operation, async () => {
      const months = await this.completeBudgetMonths(operation);
      const before = await this.projectedBudgetMonth(month, operation, months);
      if (budgetModeCapability(before) !== 'envelope') throw new PublicError('UNSUPPORTED_BUDGET_MODE', 'Resetting a manual hold is supported only when the returned month shape proves envelope-budget behavior.', operation, false, {
        entity: { type: 'budgetMonth', id: month }
      });
      try { await this.api.resetBudgetHold(month); }
      catch (error) { throw new PublicError('MUTATION_FAILED', 'Actual rejected the manual budget-hold reset.', operation, false, {
        entity: { type: 'budgetMonth', id: month }
      }, { cause: error }); }
      const after = await this.synchronizeBudgetMutation(operation, { type: 'budgetMonth', id: month }, async () =>
        this.projectedBudgetMonth(month, operation, months));
      return {
        success: true as const,
        changed: before.forNextMonth !== after.forNextMonth,
        month,
        previousForNextMonth: before.forNextMonth,
        currentForNextMonth: after.forNextMonth
      };
    });
  }

  copyBudgetMonth(sourceMonth: string, targetMonth: string, options: {
    dryRun?: boolean;
    mode?: BudgetCopyMode;
    includeCarryover?: boolean;
    includeHidden?: boolean;
    confirmOverwrite?: boolean;
    differenceLimit?: number;
    maxChanges?: number;
  } = {}) {
    const operation = 'actual_copy_budget_month';
    return this.run(operation, async () => {
      if (sourceMonth === targetMonth) throw new PublicError('INVALID_BUDGET_VALUE', 'Source and target budget months must be different.', operation, false);
      const dryRun = options.dryRun ?? true;
      const mode = options.mode ?? 'fill-empty';
      const includeCarryover = options.includeCarryover ?? false;
      const includeHidden = options.includeHidden ?? false;
      const confirmOverwrite = options.confirmOverwrite ?? false;
      const differenceLimit = options.differenceLimit ?? DEFAULT_BUDGET_CATEGORY_RESULTS;
      const maxChanges = options.maxChanges ?? MAX_BUDGET_CATEGORY_RESULTS;
      if (!['fill-empty', 'overwrite'].includes(mode) || !Number.isSafeInteger(differenceLimit) || differenceLimit < 1 || differenceLimit > MAX_BUDGET_CATEGORY_RESULTS ||
          !Number.isSafeInteger(maxChanges) || maxChanges < 1 || maxChanges > MAX_BUDGET_CATEGORY_RESULTS) {
        throw new PublicError('INVALID_BUDGET_VALUE', 'Budget copy mode or bounds are invalid.', operation, false);
      }
      const months = await this.completeBudgetMonths(operation);
      const source = await this.projectedBudgetMonth(sourceMonth, operation, months);
      const target = await this.projectedBudgetMonth(targetMonth, operation, months);
      const plan = planBudgetCopy({ source, target, mode, includeCarryover, includeHidden, differenceLimit });
      const { actionable, ...publicPlan } = plan;
      if (plan.counts.changes > maxChanges) throw new PublicError('RESULT_TOO_LARGE', `The copy would change more than ${maxChanges} categories.`, operation, false, {
        details: { sourceMonth, targetMonth, changeCount: plan.counts.changes, maxChanges }
      });
      if (!dryRun && plan.counts.overwrite > 0 && !confirmOverwrite) throw new PublicError(
        'OVERWRITE_CONFIRMATION_REQUIRED',
        'Set confirmOverwrite to true only after reviewing the nonzero overwrite preview.',
        operation,
        false,
        { entity: { type: 'budgetMonth', id: targetMonth }, details: { overwriteCount: plan.counts.overwrite, preview: publicPlan } }
      );
      const base = {
        success: true as const,
        changed: actionable.length > 0,
        dryRun,
        executed: false,
        synchronized: false,
        verified: true,
        ...publicPlan,
        attemptedCategoryIds: [] as string[],
        completedCategoryIds: [] as string[]
      };
      if (dryRun || actionable.length === 0) return base;

      const attemptedCategoryIds: string[] = [];
      const completedCategoryIds: string[] = [];
      const originalTargets = Object.fromEntries(actionable.map(item => [item.categoryId, {
        ...(item.targetBudgeted === undefined ? {} : { budgeted: item.targetBudgeted }),
        ...(item.targetCarryover === undefined ? {} : { carryover: item.targetCarryover })
      }]));
      const partialError = (message: string, state: 'local_change_may_have_succeeded' | 'synchronized_but_unverified', failedCategoryId?: string, cause?: unknown) =>
        new PublicError('BUDGET_COPY_PARTIAL_STATE', message, operation, false, {
          recoveryAction: 'actual_sync',
          entity: { type: 'budgetMonth', id: targetMonth },
          state,
          partialState: true,
          details: {
            sourceMonth,
            targetMonth,
            attemptedCategoryIds: [...attemptedCategoryIds],
            completedCategoryIds: [...completedCategoryIds],
            ...(failedCategoryId === undefined ? {} : { failedCategoryId }),
            originalTargets,
            recovery: 'Synchronize and read the target month before deciding on recovery; do not replay automatically.'
          }
        }, cause === undefined ? undefined : { cause });

      for (const item of actionable) {
        attemptedCategoryIds.push(item.categoryId);
        try {
          if (item.amountChange && item.sourceBudgeted !== undefined) await this.api.setBudgetAmount(targetMonth, item.categoryId, item.sourceBudgeted);
          if (item.carryoverChange && item.sourceCarryover !== undefined) await this.api.setBudgetCarryover(targetMonth, item.categoryId, item.sourceCarryover);
          completedCategoryIds.push(item.categoryId);
        } catch (error) {
          try { await this.api.sync(); }
          catch (syncError) { throw partialError('Budget copy stopped during local execution and synchronization also failed.', 'local_change_may_have_succeeded', item.categoryId, syncError); }
          throw partialError('Budget copy stopped during local execution after synchronization; inspect the target month before recovery.', 'synchronized_but_unverified', item.categoryId, error);
        }
      }
      try { await this.api.sync(); }
      catch (error) { throw partialError('Budget copy local changes may have succeeded, but synchronization failed.', 'local_change_may_have_succeeded', undefined, error); }
      try {
        const persisted = await this.projectedBudgetMonth(targetMonth, operation, months);
        for (const item of actionable) {
          const category = this.requireBudgetCategory(persisted, item.categoryId, operation);
          if (item.amountChange && category.budgeted !== item.sourceBudgeted) throw new Error(`Budget amount verification failed for ${item.categoryId}.`);
          if (item.carryoverChange && category.carryover !== item.sourceCarryover) throw new Error(`Carryover verification failed for ${item.categoryId}.`);
        }
      } catch (error) {
        throw partialError('Budget copy synchronized, but complete read-back verification failed.', 'synchronized_but_unverified', undefined, error);
      }
      return {
        ...base,
        executed: true,
        synchronized: true,
        attemptedCategoryIds,
        completedCategoryIds
      };
    });
  }

  getTransaction(transactionId: string) {
    const operation = 'actual_get_transaction';
    return this.run(operation, async () => {
      const exactRows = parseAqlRows(await this.api.aqlQuery(compileExactTransaction(transactionId, 'all')), operation);
      const exact = exactRows.find(row => row.id === transactionId);
      if (!exact) throw new PublicError('NOT_FOUND', 'The requested transaction was not found.', operation, false, {
        entity: { type: 'transaction', id: transactionId }
      });
      if (exact.is_parent) {
        const groupedRows = parseAqlRows(await this.api.aqlQuery(compileExactTransaction(transactionId, 'grouped')), operation);
        const parent = groupedRows.find(row => row.id === transactionId);
        if (parent) return projectTransaction(parent, operation);
      }
      return projectTransaction(exact, operation);
    });
  }

  searchTransactions(input: TransactionSearchRequest) {
    const operation = 'actual_search_transactions';
    return this.run(operation, async () => {
      const rows = parseAqlRows(await this.api.aqlQuery(compileTransactionSearch(input)), operation);
      const transactions = rows.map(row => projectTransaction(row, operation));
      const splitMode = input.splitMode ?? 'inline';
      const base = {
        transactions,
        page: { limit: input.limit, offset: input.offset, returned: transactions.length },
        splitMode
      };
      if (!input.includeTotals) return base;
      if (splitMode === 'grouped') {
        return { ...base, totals: { supported: false as const, reason: 'Totals are unavailable for grouped split results.' } };
      }
      const matched = parseAqlAggregate(await this.api.aqlQuery(compileTransactionTotal(input, 'count')), operation);
      const amount = parseAqlAggregate(await this.api.aqlQuery(compileTransactionTotal(input, 'sum')), operation);
      return { ...base, totals: { supported: true as const, matched, amount } };
    });
  }

  bulkUpdateTransactions(
    items: BulkUpdateItem[],
    options: { dryRun?: boolean; confirmWrite?: boolean } = {}
  ) {
    const operation = 'actual_bulk_update_transactions';
    return this.run(operation, async () => {
      const dryRun = options.dryRun ?? true;
      if (!dryRun && options.confirmWrite !== true) {
        throw new PublicError('WRITE_CONFIRMATION_REQUIRED', 'Set confirmWrite to true together with dryRun false to execute bulk updates.', operation, false, {
          details: { requestedIds: items.map(item => item.transactionId) }
        });
      }
      const requestedIds = items.map(item => item.transactionId);
      const [rowsResult, categories, payees] = await Promise.all([
        this.api.aqlQuery(compileTransactionsByIds(requestedIds)),
        this.api.getCategories(),
        this.api.getPayees()
      ]);
      const rows = parseAqlRows(rowsResult, operation);
      const ordinaryPayeeIds = new Set(payees.filter(payee => payee.transfer_acct == null).map(payee => payee.id));
      const plan = planBulkTransactionUpdates(items, rows, new Set(categories.map(category => category.id)), ordinaryPayeeIds);
      const base = {
        dryRun,
        executed: false,
        synchronized: false,
        verified: false,
        executable: plan.executable,
        counts: {
          requested: plan.requested,
          matched: plan.matched,
          wouldUpdate: plan.wouldUpdate,
          unchanged: plan.unchanged,
          blocked: plan.blocked
        },
        items: plan.items,
        updatedIds: [] as string[],
        unchangedIds: plan.items.filter(item => item.status === 'unchanged').map(item => item.transactionId),
        affectedIds: [] as string[]
      };
      if (dryRun) return base;
      if (!plan.executable) throw new PublicError(
        'BULK_PREFLIGHT_FAILED',
        'Bulk execution was refused because one or more transactions are protected.',
        operation,
        false,
        { details: {
          requestedIds,
          blocked: plan.items.filter(item => item.status === 'blocked').map(item => ({ id: item.transactionId, reason: item.reason }))
        } }
      );
      const actionable = plan.items.filter(item => item.status === 'would_update');
      if (!actionable.length) return { ...base, dryRun: false, executed: true, verified: true };

      const attemptedIds: string[] = [];
      const completedIds: string[] = [];
      const affectedIds = new Set<string>();
      const partialError = (
        message: string,
        phase: 'local_update' | 'sync' | 'read_back',
        state: 'local_change_may_have_succeeded' | 'synchronized_but_unverified',
        cause: unknown
      ) => new PublicError('BULK_PARTIAL_STATE', message, operation, false, {
        recoveryAction: state === 'local_change_may_have_succeeded' ? 'actual_sync_then_exact_read' : 'actual_get_transaction',
        state,
        partialState: true,
        details: {
          failedPhase: phase,
          requestedIds,
          attemptedIds,
          completedIds,
          pendingIds: actionable.map(item => item.transactionId).filter(id => !completedIds.includes(id)),
          affectedIds: [...affectedIds]
        }
      }, { cause });

      for (const planItem of actionable) {
        attemptedIds.push(planItem.transactionId);
        const requested = items.find(item => item.transactionId === planItem.transactionId)!;
        try {
          const result = await this.api.updateTransaction(planItem.transactionId, requested.fields as Partial<AdapterTransaction>);
          completedIds.push(planItem.transactionId);
          affectedIds.add(planItem.transactionId);
          if (Array.isArray(result)) for (const value of result) {
            if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') affectedIds.add(value.id);
          }
        } catch (error) {
          if (completedIds.length) {
            try { await this.api.sync(); }
            catch (syncError) { throw partialError('Bulk updates stopped locally and synchronization also failed.', 'sync', 'local_change_may_have_succeeded', syncError); }
            throw partialError('Bulk updates stopped after a partial local sequence; completed changes were synchronized but require exact reads.', 'local_update', 'synchronized_but_unverified', error);
          }
          throw new PublicError('MUTATION_FAILED', 'The first bulk local update failed before any completed change.', operation, false, {
            details: { requestedIds, attemptedIds, completedIds, pendingIds: requestedIds }
          }, { cause: error });
        }
      }
      try { await this.api.sync(); }
      catch (error) { throw partialError('Bulk local changes may have succeeded, but synchronization failed.', 'sync', 'local_change_may_have_succeeded', error); }

      let persisted: AdapterTransaction[];
      try {
        persisted = parseAqlRows(await this.api.aqlQuery(compileTransactionsByIds(requestedIds)), operation)
          .map(transaction => projectTransaction(transaction, operation));
      } catch (error) {
        throw partialError('Bulk updates synchronized, but exact read-back failed.', 'read_back', 'synchronized_but_unverified', error);
      }
      const persistedById = new Map(persisted.map(transaction => [transaction.id, transaction]));
      const failedVerificationIds = items.filter(item => {
        const transaction = persistedById.get(item.transactionId);
        return transaction === undefined || !desiredStateMatches(transaction, item.fields);
      }).map(item => item.transactionId);
      if (failedVerificationIds.length) throw new PublicError(
        'BULK_VERIFICATION_FAILED',
        'Bulk updates synchronized, but one or more desired states could not be verified.',
        operation,
        false,
        {
          recoveryAction: 'actual_get_transaction',
          state: 'synchronized_but_unverified',
          partialState: true,
          details: { requestedIds, attemptedIds, completedIds, affectedIds: [...affectedIds], failedVerificationIds, failedPhase: 'read_back' }
        }
      );
      return {
        ...base,
        dryRun: false,
        executed: true,
        synchronized: true,
        verified: true,
        updatedIds: completedIds,
        affectedIds: [...affectedIds]
      };
    });
  }

  private mutate<T>(operation: string, mutation: () => Promise<T>): Promise<T> {
    return this.run(operation, async () => {
      const result = await mutation();
      try {
        await this.api.sync();
      } catch (error) {
        this.logger.error('Synchronization failed after a local mutation.', { operation });
        throw new PublicError(
          'MUTATION_SYNC_FAILED',
          'The local change succeeded, but synchronization failed. Run actual_sync before retrying the mutation.',
          operation,
          false,
          { recoveryAction: 'actual_sync', state: 'local_change_may_have_succeeded', partialState: true },
          { cause: error }
        );
      }
      return result;
    });
  }

  importTransactions(
    accountId: string,
    transactions: Omit<ImportTransaction, 'account'>[],
    options: ImportRequestOptions = {},
    expectedPreviewFingerprint?: string
  ) {
    const operation = 'actual_import_transactions';
    return this.run(operation, async () => {
      const request = normalizeImportRequest(accountId, transactions, options);
      const requestFingerprint = importRequestFingerprint(request);
      if (expectedPreviewFingerprint !== undefined && expectedPreviewFingerprint !== requestFingerprint) {
        throw new PublicError('PREVIEW_FINGERPRINT_MISMATCH', 'The import request does not match the reviewed preview request.', operation, false);
      }
      const result = parseImportResult(await this.api.importTransactions(accountId, request.transactions, {
        ...request.options,
        dryRun: false
      }), operation);
      try { await this.api.sync(); }
      catch (error) {
        throw new PublicError(
          'MUTATION_SYNC_FAILED',
          'The local import may have succeeded, but synchronization failed. Run actual_sync before retrying.',
          operation,
          false,
          { recoveryAction: 'actual_sync', state: 'local_change_may_have_succeeded', partialState: true },
          { cause: error }
        );
      }
      return {
        added: result.added,
        updated: result.updated,
        errors: result.errors.map(error => ({ message: redact(error.message, this.secrets()) })),
        requestFingerprint,
        addedCount: result.added.length,
        updatedCount: result.updated.length,
        errorCount: result.errors.length
      };
    });
  }

  previewImport(
    accountId: string,
    transactions: Omit<ImportTransaction, 'account'>[],
    options: ImportRequestOptions = {}
  ) {
    const operation = 'actual_preview_import';
    return this.run(operation, async () => {
      const request = normalizeImportRequest(accountId, transactions, options);
      const requestFingerprint = importRequestFingerprint(request);
      const result = parseImportResult(await this.api.importTransactions(accountId, request.transactions, {
        ...request.options,
        dryRun: true
      }), operation);
      const ignoredCount = result.updatedPreview.filter(item => item.ignored === true).length;
      const wouldUpdateCount = result.updatedPreview.filter(item =>
        item.ignored !== true && item.existing !== undefined && item.existing !== false
      ).length;
      return {
        requestFingerprint,
        wouldAddCount: result.added.length,
        wouldUpdateCount,
        ignoredCount,
        errorCount: result.errors.length,
        previewOnlyIds: result.added,
        existingTransactionIds: result.updated,
        errors: result.errors.map(error => ({ message: redact(error.message, this.secrets()) })),
        evidence: result.updatedPreview.map(item => ({
          importedId: item.transaction.imported_id ?? null,
          ...(item.existing && typeof item.existing === 'object' ? { existingTransactionId: item.existing.id } : {}),
          ...(item.ignored === undefined ? {} : { ignored: item.ignored }),
          ...(item.tombstone === undefined ? {} : { tombstone: item.tombstone })
        }))
      };
    });
  }

  updateTransaction(transactionId: string, fields: Partial<AdapterTransaction>) {
    return this.mutate('actual_update_transaction', async () => {
      const updated = await this.api.updateTransaction(transactionId, fields);
      if (Array.isArray(updated) && updated.length === 0) {
        throw new PublicError('NOT_FOUND', 'The requested transaction was not found.', 'actual_update_transaction', false);
      }
      return { success: true as const, transactionId };
    });
  }

  deleteTransaction(transactionId: string) {
    return this.mutate('actual_delete_transaction', async () => {
      const deleted = await this.api.deleteTransaction(transactionId);
      if (Array.isArray(deleted) && deleted.length === 0) {
        throw new PublicError('NOT_FOUND', 'The requested transaction was not found.', 'actual_delete_transaction', false);
      }
      return { success: true as const, transactionId };
    });
  }

  private async findAccount(accountId: string): Promise<AdapterAccount | undefined> {
    return (await this.api.getAccounts()).find(account => account.id === accountId);
  }

  private async findCategoryGroup(groupId: string): Promise<AdapterCategoryGroup | undefined> {
    return (await this.api.getCategoryGroups()).find(group => group.id === groupId);
  }

  private async findCategory(categoryId: string): Promise<AdapterCategory | undefined> {
    return (await this.api.getCategories()).find(category => category.id === categoryId);
  }

  private requireAccount(account: AdapterAccount | undefined, operation: string): AdapterAccount {
    if (!account) throw new PublicError('NOT_FOUND', 'The requested account was not found.', operation, false);
    return account;
  }

  private requireCategoryGroup(group: AdapterCategoryGroup | undefined, operation: string): AdapterCategoryGroup {
    if (!group) throw new PublicError('NOT_FOUND', 'The requested category group was not found.', operation, false);
    return group;
  }

  private requireCategory(category: AdapterCategory | undefined, operation: string): AdapterCategory {
    if (!category) throw new PublicError('NOT_FOUND', 'The requested category was not found.', operation, false);
    return category;
  }

  private normalizeStructuralAccount(account: AdapterAccount, operation: string): PublicAccount {
    if (typeof account.offbudget !== 'boolean' || typeof account.closed !== 'boolean') {
      throw new PublicError(
        'PREFLIGHT_INCONCLUSIVE',
        'Actual returned an incomplete account shape.',
        operation,
        false,
        { entity: { type: 'account', id: account.id, name: account.name } }
      );
    }
    return { id: account.id, name: account.name, offbudget: account.offbudget, closed: account.closed };
  }

  private normalizeCategoryGroup(group: AdapterCategoryGroup, operation: string): PublicCategoryGroup {
    if (typeof group.is_income !== 'boolean' || typeof group.hidden !== 'boolean') {
      throw new PublicError(
        'PREFLIGHT_INCONCLUSIVE',
        'Actual returned an incomplete category-group shape.',
        operation,
        false,
        { entity: { type: 'categoryGroup', id: group.id, name: group.name } }
      );
    }
    return { id: group.id, name: group.name, isIncome: group.is_income, hidden: group.hidden };
  }

  private normalizeCategory(category: AdapterCategory, operation: string): PublicCategory {
    if (typeof category.is_income !== 'boolean' || typeof category.hidden !== 'boolean' || !category.group_id) {
      throw new PublicError(
        'PREFLIGHT_INCONCLUSIVE',
        'Actual returned an incomplete category shape.',
        operation,
        false,
        { entity: { type: 'category', id: category.id, name: category.name } }
      );
    }
    return {
      id: category.id,
      name: category.name,
      groupId: category.group_id,
      isIncome: category.is_income,
      hidden: category.hidden
    };
  }

  private async accountWithBalance(account: AdapterAccount, operation: string): Promise<PublicAccount> {
    const normalized = this.normalizeStructuralAccount(account, operation);
    try {
      normalized.balance = await this.api.getAccountBalance(account.id);
    } catch (error) {
      normalized.balanceError = redact(errorMessage(error), this.secrets()) || 'Balance unavailable.';
    }
    return normalized;
  }

  private mutationError(operation: string, error: unknown, entity: { type: 'account' | 'categoryGroup' | 'category' | 'payee' | 'rule'; id?: string; name?: string }): never {
    if (error instanceof PublicError) throw error;
    const lower = errorMessage(error).toLowerCase();
    if (lower.includes('already exists') || lower.includes('unique constraint') || lower.includes('duplicate')) {
      throw new PublicError('NAME_CONFLICT', 'Actual rejected the requested name because it conflicts with an existing entity.', operation, false, { entity }, { cause: error });
    }
    throw new PublicError('MUTATION_FAILED', 'Actual rejected the structural mutation.', operation, false, { entity }, { cause: error });
  }

  private async synchronizeAndVerify<T>(
    operation: string,
    entity: { type: 'account' | 'categoryGroup' | 'category' | 'payee' | 'rule'; id?: string; name?: string },
    verify: () => Promise<T>
  ): Promise<T> {
    try {
      await this.api.sync();
    } catch (error) {
      this.logger.error('Synchronization failed after a local structural mutation.', { operation, entityType: entity.type, entityId: entity.id });
      throw new PublicError(
        'MUTATION_SYNC_FAILED',
        'The local change may have succeeded, but synchronization failed. Run actual_sync and read the entity before another mutation.',
        operation,
        false,
        { recoveryAction: 'actual_sync', entity, state: 'local_change_may_have_succeeded', partialState: true },
        { cause: error }
      );
    }
    try {
      return await verify();
    } catch (error) {
      throw new PublicError(
        'POST_MUTATION_READ_FAILED',
        'The change synchronized, but its persisted state could not be verified.',
        operation,
        false,
        { recoveryAction: 'actual_sync', entity, state: 'synchronized_but_unverified', partialState: true },
        { cause: error }
      );
    }
  }

  private async completeAccountHistory(account: AdapterAccount, operation: string): Promise<AdapterTransaction[]> {
    try {
      const transactions = await this.api.getAllTransactions(account.id);
      if (!Array.isArray(transactions)) throw new Error('Transaction history was not an array.');
      this.validateTransactions(transactions);
      return transactions;
    } catch (error) {
      throw new PublicError(
        'PREFLIGHT_INCONCLUSIVE',
        'Complete account transaction history could not be verified.',
        operation,
        false,
        { entity: { type: 'account', id: account.id, name: account.name } },
        { cause: error }
      );
    }
  }

  private validateTransactions(transactions: readonly AdapterTransaction[]): void {
    for (const transaction of transactions) {
      if (!transaction || typeof transaction !== 'object' || typeof transaction.id !== 'string' ||
          typeof transaction.account !== 'string' || typeof transaction.date !== 'string' ||
          typeof transaction.amount !== 'number' || !Number.isSafeInteger(transaction.amount) ||
          (transaction.payee !== undefined && transaction.payee !== null && typeof transaction.payee !== 'string') ||
          (transaction.category !== undefined && transaction.category !== null && typeof transaction.category !== 'string')) {
        throw new Error('Transaction history contained a malformed record.');
      }
      if (transaction.subtransactions !== undefined) {
        if (!Array.isArray(transaction.subtransactions)) throw new Error('Transaction subtransactions were malformed.');
        this.validateTransactions(transaction.subtransactions);
      }
    }
  }

  private countCategoryTransactions(transactions: readonly AdapterTransaction[], categoryId: string): number {
    let count = 0;
    for (const transaction of transactions) {
      if (transaction.category === categoryId) count += 1;
      if (transaction.subtransactions) count += this.countCategoryTransactions(transaction.subtransactions, categoryId);
    }
    return count;
  }

  private inspectBudgetMonth(month: AdapterBudgetMonth, categoryId: string, isIncome: boolean): { budget: boolean; carryover: boolean } {
    if (!month || typeof month.month !== 'string' || !Array.isArray(month.categoryGroups)) {
      throw new Error('Budget month shape is incomplete.');
    }
    let budget = false;
    let carryover = false;
    for (const group of month.categoryGroups) {
      if (!Array.isArray(group.categories)) throw new Error('Budget month categories are incomplete.');
      for (const category of group.categories) {
        if (category.id !== categoryId) continue;
        if (!isIncome && (typeof category.budgeted !== 'number' || typeof category.carryover !== 'boolean')) {
          throw new Error('Budget relationship fields are incomplete.');
        }
        if (category.budgeted !== undefined && typeof category.budgeted !== 'number') throw new Error('Budget amount is malformed.');
        if (category.carryover !== undefined && typeof category.carryover !== 'boolean') throw new Error('Carryover flag is malformed.');
        budget ||= typeof category.budgeted === 'number' && category.budgeted !== 0;
        carryover ||= category.carryover === true;
      }
    }
    return { budget, carryover };
  }

  createAccount(name: string, offbudget = false, initialBalance?: number): Promise<AccountMutationResult> {
    const operation = 'actual_create_account';
    return this.run(operation, async () => {
      let id: string;
      try {
        id = await this.api.createAccount({ name, offbudget, closed: false }, initialBalance);
      } catch (error) {
        this.mutationError(operation, error, { type: 'account', name });
      }
      const account = await this.synchronizeAndVerify(operation, { type: 'account', id: id!, name }, async () => {
        const persisted = this.requireAccount(await this.findAccount(id!), operation);
        return this.accountWithBalance(persisted, operation);
      });
      return { success: true, changed: true, account };
    });
  }

  updateAccount(accountId: string, fields: { name?: string; offbudget?: boolean }): Promise<AccountMutationResult> {
    const operation = 'actual_update_account';
    return this.run(operation, async () => {
      const current = this.requireAccount(await this.findAccount(accountId), operation);
      const normalized = this.normalizeStructuralAccount(current, operation);
      if ((fields.name === undefined || fields.name === normalized.name) &&
          (fields.offbudget === undefined || fields.offbudget === normalized.offbudget)) {
        return { success: true, changed: false, account: await this.accountWithBalance(current, operation) };
      }
      try {
        await this.api.updateAccount(accountId, {
          ...(fields.name === undefined ? {} : { name: fields.name }),
          ...(fields.offbudget === undefined ? {} : { offbudget: fields.offbudget })
        });
      } catch (error) {
        this.mutationError(operation, error, { type: 'account', id: accountId, name: current.name });
      }
      const account = await this.synchronizeAndVerify(operation, { type: 'account', id: accountId, name: fields.name ?? current.name }, async () => {
        const persisted = this.requireAccount(await this.findAccount(accountId), operation);
        const projected = await this.accountWithBalance(persisted, operation);
        if ((fields.name !== undefined && projected.name !== fields.name) ||
            (fields.offbudget !== undefined && projected.offbudget !== fields.offbudget)) throw new Error('Persisted account did not match requested fields.');
        return projected;
      });
      return { success: true, changed: true, account };
    });
  }

  closeAccount(accountId: string, transferAccountId?: string, transferCategoryId?: string): Promise<AccountMutationResult> {
    const operation = 'actual_close_account';
    return this.run(operation, async () => {
      const current = this.requireAccount(await this.findAccount(accountId), operation);
      const normalized = this.normalizeStructuralAccount(current, operation);
      if (normalized.closed) return { success: true, changed: false, account: await this.accountWithBalance(current, operation) };
      const history = await this.completeAccountHistory(current, operation);
      if (history.length === 0) {
        throw new PublicError('UNSAFE_CLOSE_WOULD_DELETE_ACCOUNT', 'Actual would delete this zero-transaction account instead of closing it.', operation, false, {
          details: { relatedTransactionCount: 0 }, entity: { type: 'account', id: current.id, name: current.name }
        });
      }
      let balance: number;
      try { balance = await this.api.getAccountBalance(accountId); }
      catch (error) {
        throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'The account balance could not be verified.', operation, false, {
          entity: { type: 'account', id: current.id, name: current.name }
        }, { cause: error });
      }
      if (balance !== 0 && !transferAccountId) throw new PublicError('TRANSFER_ACCOUNT_REQUIRED', 'A nonzero balance requires a transfer account.', operation, false, {
          details: { balance }, entity: { type: 'account', id: current.id, name: current.name }
      });
      if (transferAccountId) {
        if (transferAccountId === accountId) throw new PublicError('TRANSFER_ACCOUNT_REQUIRED', 'The transfer account must differ from the account being closed.', operation, false);
        const transfer = this.requireAccount(await this.findAccount(transferAccountId), operation);
        const target = this.normalizeStructuralAccount(transfer, operation);
        if (target.closed) throw new PublicError('TRANSFER_ACCOUNT_REQUIRED', 'The transfer account must be open.', operation, false);
      }
      if (transferCategoryId) this.requireCategory(await this.findCategory(transferCategoryId), operation);
      try { await this.api.closeAccount(accountId, transferAccountId, transferCategoryId); }
      catch (error) { this.mutationError(operation, error, { type: 'account', id: current.id, name: current.name }); }
      const account = await this.synchronizeAndVerify(operation, { type: 'account', id: current.id, name: current.name }, async () => {
        const persisted = this.requireAccount(await this.findAccount(accountId), operation);
        const projected = await this.accountWithBalance(persisted, operation);
        if (!projected.closed) throw new Error('Account remained open.');
        return projected;
      });
      return { success: true, changed: true, account };
    });
  }

  reopenAccount(accountId: string): Promise<AccountMutationResult> {
    const operation = 'actual_reopen_account';
    return this.run(operation, async () => {
      const current = this.requireAccount(await this.findAccount(accountId), operation);
      const normalized = this.normalizeStructuralAccount(current, operation);
      if (!normalized.closed) return { success: true, changed: false, account: await this.accountWithBalance(current, operation) };
      try { await this.api.reopenAccount(accountId); }
      catch (error) { this.mutationError(operation, error, { type: 'account', id: current.id, name: current.name }); }
      const account = await this.synchronizeAndVerify(operation, { type: 'account', id: current.id, name: current.name }, async () => {
        const persisted = this.requireAccount(await this.findAccount(accountId), operation);
        const projected = await this.accountWithBalance(persisted, operation);
        if (projected.closed) throw new Error('Account remained closed.');
        return projected;
      });
      return { success: true, changed: true, account };
    });
  }

  deleteAccount(accountId: string) {
    const operation = 'actual_delete_account';
    return this.run(operation, async () => {
      const current = this.requireAccount(await this.findAccount(accountId), operation);
      const normalized = this.normalizeStructuralAccount(current, operation);
      const history = await this.completeAccountHistory(current, operation);
      if (history.length !== 0) throw new PublicError('ACCOUNT_NOT_EMPTY', 'Only a proven-empty account can be deleted.', operation, false, {
        details: { relatedTransactionCount: history.length }, entity: { type: 'account', id: current.id, name: current.name }
      });
      try {
        if (normalized.closed) await this.api.reopenAccount(accountId);
        await this.api.deleteAccount(accountId);
      } catch (error) { this.mutationError(operation, error, { type: 'account', id: current.id, name: current.name }); }
      await this.synchronizeAndVerify(operation, { type: 'account', id: current.id, name: current.name }, async () => {
        if (await this.findAccount(accountId)) throw new Error('Account remained present.');
      });
      return { success: true as const, deletedAccountId: current.id, deletedAccountName: current.name, relatedTransactionCount: 0 as const };
    });
  }

  createCategoryGroup(name: string, isIncome = false): Promise<CategoryGroupMutationResult> {
    const operation = 'actual_create_category_group';
    return this.run(operation, async () => {
      let id: string;
      try { id = await this.api.createCategoryGroup({ name, is_income: isIncome, hidden: false }); }
      catch (error) { this.mutationError(operation, error, { type: 'categoryGroup', name }); }
      const categoryGroup = await this.synchronizeAndVerify(operation, { type: 'categoryGroup', id: id!, name }, async () => {
        return this.normalizeCategoryGroup(this.requireCategoryGroup(await this.findCategoryGroup(id!), operation), operation);
      });
      return { success: true, changed: true, categoryGroup };
    });
  }

  updateCategoryGroup(groupId: string, name: string): Promise<CategoryGroupMutationResult> {
    const operation = 'actual_update_category_group';
    return this.run(operation, async () => {
      const current = this.requireCategoryGroup(await this.findCategoryGroup(groupId), operation);
      const normalized = this.normalizeCategoryGroup(current, operation);
      if (normalized.name === name) return { success: true, changed: false, categoryGroup: normalized };
      try { await this.api.updateCategoryGroup(groupId, { name }); }
      catch (error) { this.mutationError(operation, error, { type: 'categoryGroup', id: groupId, name: current.name }); }
      const categoryGroup = await this.synchronizeAndVerify(operation, { type: 'categoryGroup', id: groupId, name }, async () => {
        const persisted = this.normalizeCategoryGroup(this.requireCategoryGroup(await this.findCategoryGroup(groupId), operation), operation);
        if (persisted.name !== name) throw new Error('Category group name did not persist.');
        return persisted;
      });
      return { success: true, changed: true, categoryGroup };
    });
  }

  deleteCategoryGroup(groupId: string) {
    const operation = 'actual_delete_category_group';
    return this.run(operation, async () => {
      const current = this.requireCategoryGroup(await this.findCategoryGroup(groupId), operation);
      this.normalizeCategoryGroup(current, operation);
      let categories: AdapterCategory[];
      try {
        const allCategories = await this.api.getCategories();
        if (!Array.isArray(allCategories) || allCategories.some(category => !category || typeof category.id !== 'string' || typeof category.name !== 'string' || typeof category.group_id !== 'string')) {
          throw new Error('Category list was incomplete.');
        }
        categories = allCategories.filter(category => category.group_id === groupId);
      }
      catch (error) { throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'Linked categories could not be verified.', operation, false, {
        entity: { type: 'categoryGroup', id: current.id, name: current.name }
      }, { cause: error }); }
      if (categories.length) throw new PublicError('CATEGORY_GROUP_NOT_EMPTY', 'Only a proven-empty category group can be deleted.', operation, false, {
        details: { relatedCategoryCount: categories.length, categories: categories.map(({ id, name }) => ({ id, name })) },
        entity: { type: 'categoryGroup', id: current.id, name: current.name }
      });
      try { await this.api.deleteCategoryGroup(groupId); }
      catch (error) { this.mutationError(operation, error, { type: 'categoryGroup', id: current.id, name: current.name }); }
      await this.synchronizeAndVerify(operation, { type: 'categoryGroup', id: current.id, name: current.name }, async () => {
        if (await this.findCategoryGroup(groupId)) throw new Error('Category group remained present.');
      });
      return { success: true as const, deletedCategoryGroupId: current.id, deletedCategoryGroupName: current.name, relatedCategoryCount: 0 as const };
    });
  }

  createCategory(name: string, groupId: string): Promise<CategoryMutationResult> {
    const operation = 'actual_create_category';
    return this.run(operation, async () => {
      const group = this.normalizeCategoryGroup(this.requireCategoryGroup(await this.findCategoryGroup(groupId), operation), operation);
      let id: string;
      try { id = await this.api.createCategory({ name, group_id: groupId, is_income: group.isIncome, hidden: false }); }
      catch (error) { this.mutationError(operation, error, { type: 'category', name }); }
      const category = await this.synchronizeAndVerify(operation, { type: 'category', id: id!, name }, async () => {
        return this.normalizeCategory(this.requireCategory(await this.findCategory(id!), operation), operation);
      });
      return { success: true, changed: true, category };
    });
  }

  updateCategory(categoryId: string, name: string): Promise<CategoryMutationResult> {
    const operation = 'actual_update_category';
    return this.run(operation, async () => {
      const current = this.requireCategory(await this.findCategory(categoryId), operation);
      const normalized = this.normalizeCategory(current, operation);
      if (normalized.name === name) return { success: true, changed: false, category: normalized };
      try { await this.api.updateCategory(categoryId, { name }); }
      catch (error) { this.mutationError(operation, error, { type: 'category', id: categoryId, name: current.name }); }
      const category = await this.synchronizeAndVerify(operation, { type: 'category', id: categoryId, name }, async () => {
        const persisted = this.normalizeCategory(this.requireCategory(await this.findCategory(categoryId), operation), operation);
        if (persisted.name !== name) throw new Error('Category name did not persist.');
        return persisted;
      });
      return { success: true, changed: true, category };
    });
  }

  moveCategory(categoryId: string, targetGroupId: string): Promise<CategoryMutationResult> {
    const operation = 'actual_move_category';
    return this.run(operation, async () => {
      const current = this.normalizeCategory(this.requireCategory(await this.findCategory(categoryId), operation), operation);
      const target = this.normalizeCategoryGroup(this.requireCategoryGroup(await this.findCategoryGroup(targetGroupId), operation), operation);
      if (current.isIncome !== target.isIncome) throw new PublicError(
        'INCOMPATIBLE_CATEGORY_GROUP_TYPE',
        'Categories can move only between groups with the same income/expense type.',
        operation,
        false,
        { entity: { type: 'category', id: current.id, name: current.name }, details: { currentIsIncome: current.isIncome, targetIsIncome: target.isIncome } }
      );
      if (current.groupId === targetGroupId) return { success: true, changed: false, category: current };
      try { await this.api.updateCategory(categoryId, { group_id: targetGroupId }); }
      catch (error) { this.mutationError(operation, error, { type: 'category', id: current.id, name: current.name }); }
      const category = await this.synchronizeAndVerify(operation, { type: 'category', id: current.id, name: current.name }, async () => {
        const persisted = this.normalizeCategory(this.requireCategory(await this.findCategory(categoryId), operation), operation);
        if (persisted.groupId !== targetGroupId || persisted.isIncome !== current.isIncome) throw new Error('Category move did not persist safely.');
        return persisted;
      });
      return { success: true, changed: true, category };
    });
  }

  private setCategoryVisibility(categoryId: string, hidden: boolean, operation: string): Promise<CategoryMutationResult> {
    return this.run(operation, async () => {
      const current = this.normalizeCategory(this.requireCategory(await this.findCategory(categoryId), operation), operation);
      if (current.hidden === hidden) return { success: true, changed: false, category: current };
      try { await this.api.updateCategory(categoryId, { hidden }); }
      catch (error) { this.mutationError(operation, error, { type: 'category', id: current.id, name: current.name }); }
      const category = await this.synchronizeAndVerify(operation, { type: 'category', id: current.id, name: current.name }, async () => {
        const persisted = this.normalizeCategory(this.requireCategory(await this.findCategory(categoryId), operation), operation);
        if (persisted.hidden !== hidden) throw new Error('Category visibility did not persist.');
        return persisted;
      });
      return { success: true, changed: true, category };
    });
  }

  hideCategory(categoryId: string): Promise<CategoryMutationResult> {
    return this.setCategoryVisibility(categoryId, true, 'actual_hide_category');
  }

  unhideCategory(categoryId: string): Promise<CategoryMutationResult> {
    return this.setCategoryVisibility(categoryId, false, 'actual_unhide_category');
  }

  deleteCategory(categoryId: string) {
    const operation = 'actual_delete_category';
    return this.run(operation, async () => {
      const current = this.normalizeCategory(this.requireCategory(await this.findCategory(categoryId), operation), operation);
      let transactionCount = 0;
      let budgetMonthCount = 0;
      let carryoverMonthCount = 0;
      try {
        const accounts = await this.api.getAccounts();
        if (!Array.isArray(accounts) || accounts.some(account => !account || typeof account.id !== 'string' || typeof account.name !== 'string')) {
          throw new Error('Account list was incomplete.');
        }
        for (const account of accounts) transactionCount += this.countCategoryTransactions(await this.completeAccountHistory(account, operation), categoryId);
        const months = await this.api.getBudgetMonths();
        if (!Array.isArray(months) || months.some(month => typeof month !== 'string')) throw new Error('Budget month list was incomplete.');
        for (const month of months) {
          const budgetMonth = await this.api.getBudgetMonth(month);
          if (budgetMonth.month !== month) throw new Error('Budget month identity did not match.');
          const use = this.inspectBudgetMonth(budgetMonth, categoryId, current.isIncome);
          if (use.budget) budgetMonthCount += 1;
          if (use.carryover) carryoverMonthCount += 1;
        }
      } catch (error) {
        if (error instanceof PublicError && error.code === 'PREFLIGHT_INCONCLUSIVE') throw error;
        throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'Complete category usage could not be verified.', operation, false, {
          entity: { type: 'category', id: current.id, name: current.name }
        }, { cause: error });
      }
      if (transactionCount || budgetMonthCount || carryoverMonthCount) throw new PublicError('CATEGORY_IN_USE', 'Only a proven-unused category can be deleted.', operation, false, {
        details: { relatedTransactionCount: transactionCount, relatedBudgetMonthCount: budgetMonthCount, relatedCarryoverMonthCount: carryoverMonthCount },
        entity: { type: 'category', id: current.id, name: current.name }
      });
      try { await this.api.deleteCategory(categoryId); }
      catch (error) { this.mutationError(operation, error, { type: 'category', id: current.id, name: current.name }); }
      await this.synchronizeAndVerify(operation, { type: 'category', id: current.id, name: current.name }, async () => {
        if (await this.findCategory(categoryId)) throw new Error('Category remained present.');
      });
      return {
        success: true as const,
        deletedCategoryId: current.id,
        deletedCategoryName: current.name,
        relatedTransactionCount: 0 as const,
        relatedBudgetMonthCount: 0 as const,
        relatedCarryoverMonthCount: 0 as const
      };
    });
  }

  private completePayees(operation: string): Promise<AdapterPayee[]> {
    return this.api.getPayees().then(payees => {
      if (!Array.isArray(payees) || payees.some(payee => !payee || typeof payee.id !== 'string' || !payee.id ||
          typeof payee.name !== 'string' || (payee.transfer_acct !== undefined && payee.transfer_acct !== null && typeof payee.transfer_acct !== 'string'))) {
        throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'Actual returned an incomplete payee list.', operation, false);
      }
      return payees;
    }).catch(error => {
      if (error instanceof PublicError) throw error;
      throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'The complete payee list could not be verified.', operation, false, undefined, { cause: error });
    });
  }

  private normalizePayee(payee: AdapterPayee): PublicPayee {
    return {
      id: payee.id,
      name: payee.name,
      ...(payee.transfer_acct === undefined ? {} : { transferAccountId: payee.transfer_acct })
    };
  }

  private requirePayee(payees: readonly AdapterPayee[], payeeId: string, operation: string): AdapterPayee {
    const payee = payees.find(item => item.id === payeeId);
    if (!payee) throw new PublicError('NOT_FOUND', 'The requested payee was not found.', operation, false, {
      entity: { type: 'payee', id: payeeId }
    });
    return payee;
  }

  private ensureOrdinaryPayee(payee: AdapterPayee, operation: string): void {
    if (payee.transfer_acct !== undefined && payee.transfer_acct !== null) {
      throw new PublicError('TRANSFER_PAYEE_PROTECTED', 'Transfer payees cannot be changed by payee administration tools.', operation, false, {
        entity: { type: 'payee', id: payee.id, name: payee.name },
        details: { transferAccountId: payee.transfer_acct }
      });
    }
  }

  private countPayeeTransactions(transactions: readonly AdapterTransaction[], payeeId: string): number {
    let count = 0;
    for (const transaction of transactions) {
      if (transaction.payee === payeeId) count += 1;
      if (transaction.subtransactions) count += this.countPayeeTransactions(transaction.subtransactions, payeeId);
    }
    return count;
  }

  private collectPayeeTransactionIds(transactions: readonly AdapterTransaction[], payeeId: string, output = new Set<string>()): Set<string> {
    for (const transaction of transactions) {
      if (transaction.payee === payeeId) output.add(transaction.id);
      if (transaction.subtransactions) this.collectPayeeTransactionIds(transaction.subtransactions, payeeId, output);
    }
    return output;
  }

  private collectTransactionsById(transactions: readonly AdapterTransaction[], output = new Map<string, AdapterTransaction>()): Map<string, AdapterTransaction> {
    for (const transaction of transactions) {
      output.set(transaction.id, transaction);
      if (transaction.subtransactions) this.collectTransactionsById(transaction.subtransactions, output);
    }
    return output;
  }

  private async completePayeeReferences(payee: AdapterPayee, operation: string): Promise<{
    transactionCount: number;
    ruleIds: string[];
    transactionIds: Set<string>;
  }> {
    try {
      const accounts = await this.api.getAccounts();
      if (!Array.isArray(accounts) || accounts.some(account => !account || typeof account.id !== 'string' || typeof account.name !== 'string')) {
        throw new Error('Account list was incomplete.');
      }
      let transactionCount = 0;
      const transactionIds = new Set<string>();
      for (const account of accounts) {
        const transactions = await this.completeAccountHistory(account, operation);
        transactionCount += this.countPayeeTransactions(transactions, payee.id);
        this.collectPayeeTransactionIds(transactions, payee.id, transactionIds);
      }
      const rules = await this.api.getPayeeRules(payee.id);
      if (!Array.isArray(rules) || rules.some(rule => !rule || typeof rule.id !== 'string')) throw new Error('Payee rules were incomplete.');
      return { transactionCount, ruleIds: [...new Set(rules.map(rule => rule.id))], transactionIds };
    } catch (error) {
      if (error instanceof PublicError && error.code === 'PREFLIGHT_INCONCLUSIVE') throw error;
      throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'Complete payee relationships could not be verified.', operation, false, {
        entity: { type: 'payee', id: payee.id, name: payee.name }
      }, { cause: error });
    }
  }

  getPayee(payeeId: string): Promise<PublicPayee> {
    const operation = 'actual_get_payee';
    return this.run(operation, async () => this.normalizePayee(this.requirePayee(await this.completePayees(operation), payeeId, operation)));
  }

  createPayee(name: string): Promise<PayeeMutationResult> {
    const operation = 'actual_create_payee';
    return this.run(operation, async () => {
      name = name.trim();
      if (!name) throw new PublicError('CONFIGURATION_ERROR', 'Payee name must not be empty.', operation, false);
      const payees = await this.completePayees(operation);
      const matches = payees.filter(payee => payee.name.trim() === name);
      if (matches.length === 1 && (matches[0]!.transfer_acct === undefined || matches[0]!.transfer_acct === null)) {
        return { success: true, changed: false, payee: this.normalizePayee(matches[0]!) };
      }
      if (matches.length > 0) throw new PublicError('NAME_CONFLICT', 'The requested payee name is ambiguous or belongs to a protected transfer payee.', operation, false, {
        details: { exactMatchCount: matches.length }
      });
      let id: string;
      try { id = await this.api.createPayee({ name }); }
      catch (error) { this.mutationError(operation, error, { type: 'payee', name }); }
      if (!id || typeof id !== 'string') throw new PublicError('MUTATION_FAILED', 'Actual did not return the created payee ID.', operation, false);
      const payee = await this.synchronizeAndVerify(operation, { type: 'payee', id, name }, async () => {
        const persisted = this.requirePayee(await this.completePayees(operation), id, operation);
        this.ensureOrdinaryPayee(persisted, operation);
        if (persisted.name !== name) throw new Error('Payee name did not persist.');
        return this.normalizePayee(persisted);
      });
      return { success: true, changed: true, payee };
    });
  }

  updatePayee(payeeId: string, name: string): Promise<PayeeMutationResult> {
    const operation = 'actual_update_payee';
    return this.run(operation, async () => {
      name = name.trim();
      if (!name) throw new PublicError('CONFIGURATION_ERROR', 'Payee name must not be empty.', operation, false);
      const current = this.requirePayee(await this.completePayees(operation), payeeId, operation);
      this.ensureOrdinaryPayee(current, operation);
      if (current.name === name) return { success: true, changed: false, payee: this.normalizePayee(current) };
      try { await this.api.updatePayee(payeeId, { name }); }
      catch (error) { this.mutationError(operation, error, { type: 'payee', id: current.id, name: current.name }); }
      const payee = await this.synchronizeAndVerify(operation, { type: 'payee', id: current.id, name: current.name }, async () => {
        const persisted = this.requirePayee(await this.completePayees(operation), payeeId, operation);
        this.ensureOrdinaryPayee(persisted, operation);
        if (persisted.name !== name) throw new Error('Payee rename did not persist.');
        return this.normalizePayee(persisted);
      });
      return { success: true, changed: true, payee };
    });
  }

  deletePayee(payeeId: string, confirmDestructive: boolean) {
    const operation = 'actual_delete_payee';
    return this.run(operation, async () => {
      const current = this.requirePayee(await this.completePayees(operation), payeeId, operation);
      this.ensureOrdinaryPayee(current, operation);
      const references = await this.completePayeeReferences(current, operation);
      const details = { relatedTransactionCount: references.transactionCount, relatedRuleCount: references.ruleIds.length };
      if (!confirmDestructive) throw new PublicError(
        'DESTRUCTIVE_CONFIRMATION_REQUIRED',
        'Set confirmDestructive to true only after reviewing this payee deletion preflight.',
        operation,
        false,
        { entity: { type: 'payee', id: current.id, name: current.name }, details }
      );
      if (references.transactionCount > 0 || references.ruleIds.length > 0) throw new PublicError(
        'PAYEE_IN_USE',
        'Only a proven-unused payee can be deleted.',
        operation,
        false,
        { entity: { type: 'payee', id: current.id, name: current.name }, details }
      );
      try { await this.api.deletePayee(payeeId); }
      catch (error) { this.mutationError(operation, error, { type: 'payee', id: current.id, name: current.name }); }
      await this.synchronizeAndVerify(operation, { type: 'payee', id: current.id, name: current.name }, async () => {
        if ((await this.completePayees(operation)).some(payee => payee.id === payeeId)) throw new Error('Payee remained present.');
      });
      return {
        success: true as const,
        deletedPayeeId: current.id,
        deletedPayeeName: current.name,
        relatedTransactionCount: 0 as const,
        relatedRuleCount: 0 as const
      };
    });
  }

  mergePayees(sourcePayeeIds: string[], targetPayeeId: string, confirmDestructive: boolean) {
    const operation = 'actual_merge_payees';
    return this.run(operation, async () => {
      if (sourcePayeeIds.length === 0 || new Set(sourcePayeeIds).size !== sourcePayeeIds.length || sourcePayeeIds.includes(targetPayeeId)) {
        throw new PublicError('CONFIGURATION_ERROR', 'Payee merge requires unique non-empty sources distinct from the target.', operation, false);
      }
      const payees = await this.completePayees(operation);
      const target = this.requirePayee(payees, targetPayeeId, operation);
      this.ensureOrdinaryPayee(target, operation);
      const sources = sourcePayeeIds.map(id => this.requirePayee(payees, id, operation));
      sources.forEach(source => this.ensureOrdinaryPayee(source, operation));
      const preflight = await Promise.all(sources.map(async source => ({ source, references: await this.completePayeeReferences(source, operation) })));
      const impacts: PayeeMergeImpact[] = preflight.map(({ source, references }) => ({
        payeeId: source.id,
        payeeName: source.name,
        relatedTransactionCount: references.transactionCount,
        relatedRuleCount: references.ruleIds.length
      }));
      if (!confirmDestructive) throw new PublicError(
        'DESTRUCTIVE_CONFIRMATION_REQUIRED',
        'Set confirmDestructive to true only after reviewing this payee merge preflight.',
        operation,
        false,
        { entity: { type: 'payee', id: target.id, name: target.name }, details: { impacts } }
      );
      const impactedTransactionIds = new Set(preflight.flatMap(item => [...item.references.transactionIds]));
      const impactedRuleIds = new Set(preflight.flatMap(item => item.references.ruleIds));
      const partialFailure = (message: string, error?: unknown): PublicError => new PublicError(
        'MERGE_PARTIAL_STATE',
        message,
        operation,
        false,
        {
          recoveryAction: 'actual_sync',
          entity: { type: 'payee', id: target.id, name: target.name },
          state: 'local_change_may_have_succeeded',
          partialState: true,
          details: { sourcePayeeIds, targetPayeeId }
        },
        error === undefined ? undefined : { cause: error }
      );
      try { await this.api.mergePayees(targetPayeeId, sourcePayeeIds); }
      catch (error) { throw partialFailure('The payee merge may have partially changed local state. Synchronize and inspect all named payees before another merge.', error); }
      try { await this.api.sync(); }
      catch (error) { throw partialFailure('The payee merge may have succeeded locally but synchronization failed. Run actual_sync and inspect all named payees.', error); }
      try {
        const persistedPayees = await this.completePayees(operation);
        const persistedTarget = this.requirePayee(persistedPayees, targetPayeeId, operation);
        this.ensureOrdinaryPayee(persistedTarget, operation);
        if (sourcePayeeIds.some(id => persistedPayees.some(payee => payee.id === id))) throw new Error('A source payee remained present.');
        const accounts = await this.api.getAccounts();
        if (!Array.isArray(accounts)) throw new Error('Account list was incomplete.');
        const byId = new Map<string, AdapterTransaction>();
        for (const account of accounts) this.collectTransactionsById(await this.completeAccountHistory(account, operation), byId);
        for (const transactionId of impactedTransactionIds) {
          if (byId.get(transactionId)?.payee !== targetPayeeId) throw new Error('An impacted transaction did not resolve to the target payee.');
        }
        const targetRules = await this.api.getPayeeRules(targetPayeeId);
        const targetRuleIds = new Set(targetRules.map(rule => rule.id));
        if ([...impactedRuleIds].some(id => !targetRuleIds.has(id))) throw new Error('An impacted rule did not resolve to the target payee.');
        return {
          success: true as const,
          targetPayee: this.normalizePayee(persistedTarget),
          mergedSourcePayeeIds: [...sourcePayeeIds],
          impacts
        };
      } catch (error) {
        throw partialFailure('The payee merge synchronized but its complete result could not be verified. Inspect the target, sources, transactions, and rules.', error);
      }
    });
  }

  private normalizeRule(rule: AdapterRule, operation: string): PublicRule {
    try { return projectRule(rule); }
    catch (error) {
      throw new PublicError('UNSUPPORTED_RULE_SHAPE', 'Actual returned a rule outside the pinned readable contract.', operation, false, {
        entity: { type: 'rule', id: rule?.id }
      }, { cause: error });
    }
  }

  private async completeRules(operation: string): Promise<AdapterRule[]> {
    try {
      const rules = await this.api.getRules();
      if (!Array.isArray(rules)) throw new Error('Rule list was not an array.');
      rules.forEach(rule => this.normalizeRule(rule, operation));
      return rules;
    } catch (error) {
      if (error instanceof PublicError) throw error;
      throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'The complete Actual rule list could not be verified.', operation, false, undefined, { cause: error });
    }
  }

  private requireRule(rules: readonly AdapterRule[], ruleId: string, operation: string): AdapterRule {
    const rule = rules.find(item => item.id === ruleId);
    if (!rule) throw new PublicError('NOT_FOUND', 'The requested rule was not found.', operation, false, {
      entity: { type: 'rule', id: ruleId }
    });
    return rule;
  }

  listRules(): Promise<PublicRule[]> {
    const operation = 'actual_list_rules';
    return this.run(operation, async () => (await this.completeRules(operation)).map(rule => this.normalizeRule(rule, operation)));
  }

  getRule(ruleId: string): Promise<PublicRule> {
    const operation = 'actual_get_rule';
    return this.run(operation, async () => this.normalizeRule(this.requireRule(await this.completeRules(operation), ruleId, operation), operation));
  }

  private async validateRuleReferences(rule: WritableRuleDraft, operation: string): Promise<void> {
    try {
      const [accounts, groups, categories, payees] = await Promise.all([
        this.api.getAccounts(), this.api.getCategoryGroups(), this.api.getCategories(), this.api.getPayees()
      ]);
      if (![accounts, groups, categories, payees].every(Array.isArray) ||
          accounts.some(item => !item || typeof item.id !== 'string') ||
          groups.some(item => !item || typeof item.id !== 'string') ||
          categories.some(item => !item || typeof item.id !== 'string') ||
          payees.some(item => !item || typeof item.id !== 'string')) throw new Error('A reference list was incomplete.');
      const sets = {
        account: new Set(accounts.map(item => item.id)),
        category_group: new Set(groups.map(item => item.id)),
        category: new Set(categories.map(item => item.id)),
        payee: new Set(payees.map(item => item.id))
      };
      const check = (type: keyof typeof sets, value: unknown) => {
        const values = Array.isArray(value) ? value : [value];
        for (const id of values) if (typeof id !== 'string' || !sets[type].has(id)) throw new PublicError(
          'INVALID_REFERENCE',
          `The rule references a ${type.replace('_', ' ')} that does not exist.`,
          operation,
          false,
          { details: { referenceType: type, referenceId: typeof id === 'string' ? id : '[invalid]' } }
        );
      };
      for (const condition of rule.conditions) if (condition.field in sets) check(condition.field as keyof typeof sets, condition.value);
      for (const action of rule.actions) if (action.op === 'set' && action.field && action.field in sets) check(action.field as keyof typeof sets, action.value);
    } catch (error) {
      if (error instanceof PublicError) throw error;
      throw new PublicError('PREFLIGHT_INCONCLUSIVE', 'Complete rule references could not be verified.', operation, false, undefined, { cause: error });
    }
  }

  private requireWritableRuleDraft(rule: WritableRuleDraft, operation: string): void {
    if (rule.conditions.length === 0 || rule.actions.length === 0 ||
        !rule.conditions.every(isWritableRuleCondition) || !rule.actions.every(isWritableRuleAction)) {
      throw new PublicError('UNSUPPORTED_RULE_SHAPE', 'The requested rule is outside the MCP authoring subset.', operation, false);
    }
  }

  private comparableRuleDraft(rule: WritableRuleDraft): string {
    return JSON.stringify({
      stage: rule.stage,
      conditionsOp: rule.conditionsOp,
      conditions: rule.conditions.map(condition => ({
        field: condition.field,
        op: condition.op,
        value: condition.value,
        ...(condition.options && Object.keys(condition.options).length > 0 ? { options: condition.options } : {})
      })),
      actions: rule.actions.map(action => ({
        op: action.op,
        ...(action.op === 'set' && action.field !== undefined ? { field: action.field } : {}),
        value: action.value,
        ...(action.options && Object.keys(action.options).length > 0 ? { options: action.options } : {})
      }))
    });
  }

  createRule(rule: WritableRuleDraft): Promise<RuleMutationResult> {
    const operation = 'actual_create_rule';
    return this.run(operation, async () => {
      this.requireWritableRuleDraft(rule, operation);
      await this.validateRuleReferences(rule, operation);
      let created: AdapterRule;
      try { created = await this.api.createRule(toSdkRule(rule)); }
      catch (error) { this.mutationError(operation, error, { type: 'rule' }); }
      if (!created || typeof created.id !== 'string' || !created.id) throw new PublicError('MUTATION_FAILED', 'Actual did not return the created rule ID.', operation, false);
      const persisted = await this.synchronizeAndVerify(operation, { type: 'rule', id: created.id }, async () => {
        const current = this.requireRule(await this.completeRules(operation), created.id, operation);
        const projected = this.normalizeRule(current, operation);
        if (!projected.writable || this.comparableRuleDraft({
          stage: projected.stage,
          conditionsOp: projected.conditionsOp,
          conditions: projected.conditions,
          actions: projected.actions
        }) !== this.comparableRuleDraft(rule)) {
          throw new Error('Created rule did not persist as writable.');
        }
        return projected;
      });
      return { success: true, changed: true, rule: persisted };
    });
  }

  updateRule(
    ruleId: string,
    fields: { stage?: PublicRuleStage; conditionsOp?: 'and' | 'or'; conditions?: PublicRuleCondition[]; actions?: PublicRuleAction[] }
  ): Promise<RuleMutationResult> {
    const operation = 'actual_update_rule';
    return this.run(operation, async () => {
      const currentAdapter = this.requireRule(await this.completeRules(operation), ruleId, operation);
      const current = this.normalizeRule(currentAdapter, operation);
      if (!current.writable) throw new PublicError('UNSUPPORTED_RULE_SHAPE', 'Advanced rules are read-only through this MCP version.', operation, false, {
        entity: { type: 'rule', id: ruleId }
      });
      const desired: WritableRuleDraft = {
        stage: fields.stage ?? current.stage,
        conditionsOp: fields.conditionsOp ?? current.conditionsOp,
        conditions: fields.conditions ?? current.conditions,
        actions: fields.actions ?? current.actions
      };
      this.requireWritableRuleDraft(desired, operation);
      await this.validateRuleReferences(desired, operation);
      const currentDraft: WritableRuleDraft = {
        stage: current.stage, conditionsOp: current.conditionsOp, conditions: current.conditions, actions: current.actions
      };
      if (this.comparableRuleDraft(currentDraft) === this.comparableRuleDraft(desired)) return { success: true, changed: false, rule: current };
      try { await this.api.updateRule(toSdkRule(desired, ruleId)); }
      catch (error) { this.mutationError(operation, error, { type: 'rule', id: ruleId }); }
      const persisted = await this.synchronizeAndVerify(operation, { type: 'rule', id: ruleId }, async () => {
        const projected = this.normalizeRule(this.requireRule(await this.completeRules(operation), ruleId, operation), operation);
        if (!projected.writable || this.comparableRuleDraft({
          stage: projected.stage, conditionsOp: projected.conditionsOp, conditions: projected.conditions, actions: projected.actions
        }) !== this.comparableRuleDraft(desired)) throw new Error('Updated rule did not match the desired state.');
        return projected;
      });
      return { success: true, changed: true, rule: persisted };
    });
  }

  deleteRule(ruleId: string, confirmDestructive: boolean) {
    const operation = 'actual_delete_rule';
    return this.run(operation, async () => {
      this.requireRule(await this.completeRules(operation), ruleId, operation);
      if (!confirmDestructive) throw new PublicError(
        'DESTRUCTIVE_CONFIRMATION_REQUIRED',
        'Set confirmDestructive to true only after explicitly authorizing this rule deletion.',
        operation,
        false,
        { entity: { type: 'rule', id: ruleId } }
      );
      let deleted: boolean;
      try { deleted = await this.api.deleteRule(ruleId); }
      catch (error) { this.mutationError(operation, error, { type: 'rule', id: ruleId }); }
      if (!deleted) throw new PublicError('PROTECTED_ACTUAL_ENTITY', 'Actual protects this rule from direct deletion.', operation, false, {
        entity: { type: 'rule', id: ruleId }
      });
      await this.synchronizeAndVerify(operation, { type: 'rule', id: ruleId }, async () => {
        if ((await this.completeRules(operation)).some(rule => rule.id === ruleId)) throw new Error('Rule remained present.');
      });
      return { success: true as const, deletedRuleId: ruleId };
    });
  }

  shutdown(): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.shutdownPromise = this.queue
      .run(async () => {
        if (this.ready || this.initialization) await this.api.shutdown().catch(error => this.logger.error('Actual shutdown failed.', { message: redact(errorMessage(error), this.secrets()) }));
        this.ready = false;
        await this.releaseCacheLock();
      })
      .then(() => this.queue.close());
    return this.shutdownPromise;
  }
}
