import type { PublicBudgetMonth } from '../../src/actual/budget.js';

export interface SafeBudgetTestMonths {
  sourceMonth: string;
  targetMonth: string;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function protectedBudgetState(
  month: PublicBudgetMonth,
  ownedCategoryIds: ReadonlySet<string> = new Set()
): Array<{ categoryId?: string; reason: string }> {
  const protectedState: Array<{ categoryId?: string; reason: string }> = [];
  if (month.forNextMonth !== 0) protectedState.push({ reason: 'nonzero-forNextMonth' });
  for (const category of month.categoryGroups.flatMap(group => group.categories)) {
    if (ownedCategoryIds.has(category.id)) continue;
    if (typeof category.budgeted === 'number' && category.budgeted !== 0) {
      protectedState.push({ categoryId: category.id, reason: 'nonzero-budgeted' });
    }
    if (category.carryover === true) protectedState.push({ categoryId: category.id, reason: 'enabled-carryover' });
  }
  return protectedState;
}

export async function selectSafeBudgetTestMonths(options: {
  months: readonly string[];
  getBudgetMonth: (month: string) => Promise<PublicBudgetMonth>;
  ownedCategoryIds?: ReadonlySet<string>;
  hasProtectedTransactions?: (month: string) => Promise<boolean>;
  nowMonth?: string;
}): Promise<SafeBudgetTestMonths> {
  const now = options.nowMonth ?? currentMonth();
  const future = options.months.filter(month => month > now);
  for (let targetIndex = future.length - 1; targetIndex >= 1; targetIndex -= 1) {
    const sourceMonth = future[targetIndex - 1]!;
    const targetMonth = future[targetIndex]!;
    const [source, target, sourceTransactions, targetTransactions] = await Promise.all([
      options.getBudgetMonth(sourceMonth),
      options.getBudgetMonth(targetMonth),
      options.hasProtectedTransactions?.(sourceMonth) ?? false,
      options.hasProtectedTransactions?.(targetMonth) ?? false
    ]);
    if (sourceTransactions || targetTransactions) continue;
    if (protectedBudgetState(source, options.ownedCategoryIds).length > 0) continue;
    if (protectedBudgetState(target, options.ownedCategoryIds).length > 0) continue;
    return { sourceMonth, targetMonth };
  }
  throw new Error('No safe future budget-month pair is available; refusing real budget writes.');
}
