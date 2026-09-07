import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdapterBudgetMonth } from '../src/actual/adapter.js';
import { planBudgetCopy, projectBudgetMonth } from '../src/actual/budget.js';
import { ActualClient } from '../src/actual/client.js';
import { budgetMonthOutputSchema, budgetSummaryOutputSchema } from '../src/mcp/contracts.js';
import { fakeAdapter } from './helpers.js';
import { purityBoundaryFingerprint } from './purity-fingerprint.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))));

function rawMonth(month = '2026-08', options: {
  tracking?: boolean;
  expenseBudgeted?: number;
  carryover?: boolean;
  hidden?: boolean;
  secondExpense?: boolean;
} = {}): AdapterBudgetMonth {
  const expenseCategories: Array<Record<string, unknown>> = [{
    id: 'expense', name: 'Rent', group_id: 'expense-group', is_income: false, hidden: options.hidden ?? false,
    budgeted: options.expenseBudgeted ?? 10000, spent: -9000, balance: 1000, carryover: options.carryover ?? false
  }];
  if (options.secondExpense) expenseCategories.push({
    id: 'expense-2', name: 'Food', group_id: 'expense-group', is_income: false, hidden: false,
    budgeted: 5000, spent: -4500, balance: 500, carryover: false
  });
  const income = options.tracking
    ? { id: 'income', name: 'Salary', group_id: 'income-group', is_income: true, hidden: false, budgeted: 20000, received: 21000, balance: 1000, carryover: false }
    : { id: 'income', name: 'Salary', group_id: 'income-group', is_income: true, hidden: false, received: 21000 };
  return {
    month,
    incomeAvailable: 20000,
    lastMonthOverspent: -500,
    forNextMonth: 0,
    totalBudgeted: options.expenseBudgeted ?? 10000,
    toBudget: 9500,
    fromLastMonth: -500,
    totalIncome: 21000,
    totalSpent: -9000,
    totalBalance: 1000,
    categoryGroups: [
      {
        id: 'expense-group', name: 'Housing', is_income: false, hidden: false,
        budgeted: options.expenseBudgeted ?? 10000, spent: -9000, balance: 1000, categories: expenseCategories
      },
      {
        id: 'income-group', name: 'Income', is_income: true, hidden: false,
        ...(options.tracking ? { budgeted: 20000, received: 21000, balance: 1000 } : { received: 21000 }), categories: [income]
      }
    ]
  };
}

async function clientFixture(months: Record<string, AdapterBudgetMonth>) {
  const dataDir = await mkdtemp(join(tmpdir(), 'actual-budget-domain-'));
  directories.push(dataDir);
  const api = fakeAdapter();
  vi.mocked(api.getBudgetMonths).mockResolvedValue(Object.keys(months));
  vi.mocked(api.getBudgetMonth).mockImplementation(async month => structuredClone(months[month]!));
  const client = new ActualClient(api, async () => ({
    serverUrl: 'http://actual.example:5006', password: 'budget-test-sentinel', syncId: 'budget', dataDir
  }));
  return { api, client, months };
}

describe('budget projection and reads', () => {
  it('preserves official signs, hidden state, absent fields, and envelope capabilities', () => {
    const projected = projectBudgetMonth(rawMonth('2026-08', { hidden: true }));
    expect(projected).toMatchObject({
      month: '2026-08', lastMonthOverspent: -500, totalSpent: -9000,
      capabilities: { holdForNextMonth: true, incomeBudgeting: false }
    });
    const expense = projected.categoryGroups[0]!.categories[0]!;
    const income = projected.categoryGroups[1]!.categories[0]!;
    expect(expense).toMatchObject({ hidden: true, budgeted: 10000, spent: -9000, carryover: false });
    expect(income).toMatchObject({ received: 21000, capabilities: { budgetAmount: false, carryover: false } });
    expect('budgeted' in income).toBe(false);
    expect(() => budgetMonthOutputSchema.parse(projected)).not.toThrow();
  });

  it('preserves the tracking income variant and reports only shape-proven capabilities', () => {
    const projected = projectBudgetMonth(rawMonth('2026-08', { tracking: true }));
    expect(projected.capabilities).toEqual({ holdForNextMonth: false, incomeBudgeting: true });
    expect(projected.categoryGroups[1]!.categories[0]).toMatchObject({
      budgeted: 20000, received: 21000, balance: 1000,
      capabilities: { budgetAmount: true, carryover: false }
    });
  });

  it('rejects malformed nullable or absent required SDK fields instead of inventing values', () => {
    const malformed = rawMonth();
    malformed.totalSpent = null;
    expect(() => projectBudgetMonth(malformed)).toThrow('safe integer');
    const malformedCategory = rawMonth();
    malformedCategory.categoryGroups[0]!.categories![0]!.balance = null;
    expect(() => projectBudgetMonth(malformedCategory)).toThrow('safe integer');
  });

  it('lists official months in order, rejects unavailable months, and returns bounded filtered summaries', async () => {
    const fixture = await clientFixture({ '2026-08': rawMonth(), '2026-09': rawMonth('2026-09') });
    try {
      await expect(fixture.client.listBudgetMonths()).resolves.toEqual({ months: ['2026-08', '2026-09'], count: 2 });
      await expect(fixture.client.getBudgetMonth('2026-10')).rejects.toMatchObject({ code: 'BUDGET_MONTH_UNAVAILABLE' });
      const summary = await fixture.client.getBudgetSummary('2026-08', { groupId: 'expense-group', categoryId: 'expense', limit: 1 });
      expect(summary).toMatchObject({ totalSpent: -9000, categoryCount: 1, omittedCategoryCount: 0 });
      expect(summary.categoryGroups).toHaveLength(1);
      expect(() => budgetSummaryOutputSchema.parse(summary)).not.toThrow();
      expect(fixture.api.getBudgetMonth).toHaveBeenCalledWith('2026-08');
    } finally { await fixture.client.shutdown(); }
  });
});

describe('single budget mutations', () => {
  it('sets zero and signed negative desired amounts, synchronizes, verifies, and skips matching state', async () => {
    const months: Record<string, AdapterBudgetMonth> = { '2026-08': rawMonth() };
    const fixture = await clientFixture(months);
    vi.mocked(fixture.api.setBudgetAmount).mockImplementation(async (month, categoryId, value) => {
      const category = months[month]!.categoryGroups.flatMap(group => group.categories ?? []).find(item => item.id === categoryId)!;
      category.budgeted = value;
    });
    try {
      await expect(fixture.client.setBudgetAmount('2026-08', 'expense', 0)).resolves.toMatchObject({ changed: true, currentAmount: 0 });
      await expect(fixture.client.setBudgetAmount('2026-08', 'expense', 0)).resolves.toMatchObject({ changed: false, currentAmount: 0 });
      await expect(fixture.client.setBudgetAmount('2026-08', 'expense', -250)).resolves.toMatchObject({ changed: true, currentAmount: -250 });
      expect(fixture.api.sync).toHaveBeenCalledTimes(2);
    } finally { await fixture.client.shutdown(); }
  });

  it('allows shape-proven tracking income and refuses envelope income without mutation', async () => {
    const envelope = await clientFixture({ '2026-08': rawMonth() });
    try {
      await expect(envelope.client.setBudgetAmount('2026-08', 'income', 100)).rejects.toMatchObject({ code: 'INCOMPATIBLE_BUDGET_CATEGORY' });
      expect(envelope.api.setBudgetAmount).not.toHaveBeenCalled();
    } finally { await envelope.client.shutdown(); }

    const trackingMonths: Record<string, AdapterBudgetMonth> = { '2026-08': rawMonth('2026-08', { tracking: true }) };
    const tracking = await clientFixture(trackingMonths);
    vi.mocked(tracking.api.setBudgetAmount).mockImplementation(async (month, categoryId, value) => {
      trackingMonths[month]!.categoryGroups.flatMap(group => group.categories ?? []).find(item => item.id === categoryId)!.budgeted = value;
    });
    try {
      await expect(tracking.client.setBudgetAmount('2026-08', 'income', 22000)).resolves.toMatchObject({ changed: true, currentAmount: 22000 });
    } finally { await tracking.client.shutdown(); }
  });

  it('applies expense carryover prospectively and verifies every later available month', async () => {
    const months: Record<string, AdapterBudgetMonth> = { '2026-08': rawMonth(), '2026-09': rawMonth('2026-09') };
    const fixture = await clientFixture(months);
    vi.mocked(fixture.api.setBudgetCarryover).mockImplementation(async (startMonth, categoryId, flag) => {
      for (const [month, budget] of Object.entries(months)) if (month >= startMonth) {
        budget.categoryGroups.flatMap(group => group.categories ?? []).find(item => item.id === categoryId)!.carryover = flag;
      }
    });
    try {
      await expect(fixture.client.setBudgetCarryover('2026-08', 'expense', true)).resolves.toMatchObject({
        changed: true, currentCarryover: true, effectiveFromMonth: '2026-08', verifiedThroughMonth: '2026-09'
      });
      expect(fixture.api.sync).toHaveBeenCalledOnce();
    } finally { await fixture.client.shutdown(); }
  });

  it('reports hold clamping, avoids sync for an official no-op, resets observed aggregate, and rejects tracking mode', async () => {
    const months: Record<string, AdapterBudgetMonth> = { '2026-08': rawMonth() };
    const fixture = await clientFixture(months);
    vi.mocked(fixture.api.holdBudgetForNextMonth).mockImplementation(async (month, amount) => {
      const budget = months[month]!;
      const applied = Math.min(amount, Math.max(0, Number(budget.toBudget)));
      if (applied === 0) return false;
      budget.forNextMonth = Number(budget.forNextMonth) + applied;
      return true;
    });
    vi.mocked(fixture.api.resetBudgetHold).mockImplementation(async month => { months[month]!.forNextMonth = 0; });
    try {
      await expect(fixture.client.holdBudgetForNextMonth('2026-08', 20000)).resolves.toMatchObject({
        officialApplied: true, previousForNextMonth: 0, currentForNextMonth: 9500
      });
      await expect(fixture.client.resetBudgetHold('2026-08')).resolves.toMatchObject({ changed: true, currentForNextMonth: 0 });
      months['2026-08']!.toBudget = 0;
      await expect(fixture.client.holdBudgetForNextMonth('2026-08', 100)).resolves.toMatchObject({ changed: false, officialApplied: false });
      expect(fixture.api.sync).toHaveBeenCalledTimes(2);
    } finally { await fixture.client.shutdown(); }

    const tracking = await clientFixture({ '2026-08': rawMonth('2026-08', { tracking: true }) });
    try {
      await expect(tracking.client.holdBudgetForNextMonth('2026-08', 100)).rejects.toMatchObject({ code: 'UNSUPPORTED_BUDGET_MODE' });
      expect(tracking.api.holdBudgetForNextMonth).not.toHaveBeenCalled();
    } finally { await tracking.client.shutdown(); }
  });

  it('reports synchronized but unverified when amount read-back disagrees', async () => {
    const fixture = await clientFixture({ '2026-08': rawMonth() });
    try {
      await expect(fixture.client.setBudgetAmount('2026-08', 'expense', 123)).rejects.toMatchObject({
        code: 'BUDGET_VERIFICATION_FAILED', metadata: { state: 'synchronized_but_unverified', partialState: true }
      });
    } finally { await fixture.client.shutdown(); }
  });
});

describe('budget copy planning and execution', () => {
  it('plans fill-empty, overwrite, hidden opt-in, carryover, repeat state, and bounded differences', () => {
    const source = projectBudgetMonth(rawMonth('2026-08', { secondExpense: true }));
    const targetRaw = rawMonth('2026-09', { expenseBudgeted: 0, carryover: true, secondExpense: true });
    targetRaw.categoryGroups[0]!.categories![1]!.budgeted = 2500;
    targetRaw.categoryGroups[0]!.categories![1]!.hidden = true;
    const target = projectBudgetMonth(targetRaw);
    const fill = planBudgetCopy({ source, target, mode: 'fill-empty', includeCarryover: true, includeHidden: false, differenceLimit: 1 });
    expect(fill.counts).toMatchObject({ changes: 1, set: 1, hiddenSkip: 1 });
    expect(fill.prospectiveCarryover).toBe(true);
    expect(fill.differences).toHaveLength(1);
    expect(fill.omittedDifferenceCount).toBeGreaterThan(0);
    const overwrite = planBudgetCopy({ source, target, mode: 'overwrite', includeCarryover: false, includeHidden: true, differenceLimit: 100 });
    expect(overwrite.counts).toMatchObject({ changes: 2, set: 1, overwrite: 1 });
    const repeated = planBudgetCopy({ source, target: source, mode: 'overwrite', includeCarryover: true, includeHidden: true, differenceLimit: 100 });
    expect(repeated.counts.changes).toBe(0);
  });

  it('previews by default, requires overwrite confirmation, executes sequentially, verifies, and becomes idempotent', async () => {
    const source = rawMonth('2026-08', { secondExpense: true });
    const target = rawMonth('2026-09', { expenseBudgeted: 0, secondExpense: true });
    target.categoryGroups[0]!.categories![1]!.budgeted = 2500;
    const months: Record<string, AdapterBudgetMonth> = { '2026-08': source, '2026-09': target };
    const fixture = await clientFixture(months);
    vi.mocked(fixture.api.setBudgetAmount).mockImplementation(async (month, categoryId, amount) => {
      months[month]!.categoryGroups.flatMap(group => group.categories ?? []).find(item => item.id === categoryId)!.budgeted = amount;
    });
    try {
      const beforePreview = purityBoundaryFingerprint(fixture.api, months);
      await expect(fixture.client.copyBudgetMonth('2026-08', '2026-09')).resolves.toMatchObject({ dryRun: true, executed: false });
      expect(fixture.api.setBudgetAmount).not.toHaveBeenCalled();
      expect(purityBoundaryFingerprint(fixture.api, months)).toBe(beforePreview);
      await expect(fixture.client.copyBudgetMonth('2026-08', '2026-09', { dryRun: false, mode: 'overwrite' }))
        .rejects.toMatchObject({ code: 'OVERWRITE_CONFIRMATION_REQUIRED' });
      const executed = await fixture.client.copyBudgetMonth('2026-08', '2026-09', {
        dryRun: false, mode: 'overwrite', confirmOverwrite: true
      });
      expect(executed).toMatchObject({ changed: true, executed: true, synchronized: true, verified: true });
      expect(executed.completedCategoryIds).toEqual(['expense', 'expense-2']);
      expect(fixture.api.setBudgetAmount).toHaveBeenCalledTimes(2);
      await expect(fixture.client.copyBudgetMonth('2026-08', '2026-09', {
        dryRun: false, mode: 'overwrite', confirmOverwrite: true
      })).resolves.toMatchObject({ changed: false, executed: false });
    } finally { await fixture.client.shutdown(); }
  });

  it('returns safe partial metadata without replay when a later copy item fails', async () => {
    const months: Record<string, AdapterBudgetMonth> = {
      '2026-08': rawMonth('2026-08', { secondExpense: true }),
      '2026-09': rawMonth('2026-09', { expenseBudgeted: 0, secondExpense: true })
    };
    months['2026-09']!.categoryGroups[0]!.categories![1]!.budgeted = 0;
    const fixture = await clientFixture(months);
    vi.mocked(fixture.api.setBudgetAmount).mockImplementation(async (month, categoryId, amount) => {
      if (categoryId === 'expense-2') throw new Error('synthetic second-item failure');
      months[month]!.categoryGroups.flatMap(group => group.categories ?? []).find(item => item.id === categoryId)!.budgeted = amount;
    });
    try {
      await expect(fixture.client.copyBudgetMonth('2026-08', '2026-09', { dryRun: false }))
        .rejects.toMatchObject({
          code: 'BUDGET_COPY_PARTIAL_STATE',
          metadata: {
            state: 'synchronized_but_unverified', partialState: true,
            details: { attemptedCategoryIds: ['expense', 'expense-2'], completedCategoryIds: ['expense'], failedCategoryId: 'expense-2' }
          }
        });
      expect(fixture.api.setBudgetAmount).toHaveBeenCalledTimes(2);
      expect(fixture.api.sync).toHaveBeenCalledOnce();
    } finally { await fixture.client.shutdown(); }
  });
});
