import type { AdapterBudgetMonth } from './adapter.js';

export type BudgetModeCapability = 'envelope' | 'tracking' | 'unknown';

export interface PublicBudgetCategory {
  id: string;
  name: string;
  groupId: string;
  isIncome: boolean;
  hidden: boolean;
  budgeted?: number;
  spent?: number;
  received?: number;
  balance?: number;
  carryover?: boolean;
  capabilities: {
    budgetAmount: boolean;
    carryover: boolean;
  };
}

export interface PublicBudgetGroup {
  id: string;
  name: string;
  isIncome: boolean;
  hidden: boolean;
  budgeted?: number;
  spent?: number;
  received?: number;
  balance?: number;
  categories: PublicBudgetCategory[];
}

export interface PublicBudgetMonth {
  month: string;
  incomeAvailable: number;
  lastMonthOverspent: number;
  forNextMonth: number;
  totalBudgeted: number;
  toBudget: number;
  fromLastMonth: number;
  totalIncome: number;
  totalSpent: number;
  totalBalance: number;
  capabilities: {
    holdForNextMonth: boolean;
    incomeBudgeting: boolean;
  };
  categoryGroups: PublicBudgetGroup[];
}

const aggregateKeys = [
  'incomeAvailable',
  'lastMonthOverspent',
  'forNextMonth',
  'totalBudgeted',
  'toBudget',
  'fromLastMonth',
  'totalIncome',
  'totalSpent',
  'totalBalance'
] as const;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Budget ${field} must be a non-empty string.`);
  return value;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Budget ${field} must be a boolean.`);
  return value;
}

function requiredInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Budget ${field} must be a safe integer.`);
  return value;
}

function optionalInteger(record: Record<string, unknown>, field: string): { [key: string]: number } {
  if (record[field] === undefined) return {};
  return { [field]: requiredInteger(record[field], field) };
}

function optionalBoolean(record: Record<string, unknown>, field: string): { [key: string]: boolean } {
  if (record[field] === undefined) return {};
  return { [field]: requiredBoolean(record[field], field) };
}

function projectCategory(raw: Record<string, unknown>, group: { id: string; isIncome: boolean }): PublicBudgetCategory {
  const id = requiredString(raw.id, 'category id');
  const groupId = requiredString(raw.group_id, 'category group id');
  const isIncome = requiredBoolean(raw.is_income, 'category income flag');
  if (groupId !== group.id || isIncome !== group.isIncome) throw new Error('Budget category identity disagrees with its parent group.');
  const financial = {
    ...optionalInteger(raw, 'budgeted'),
    ...optionalInteger(raw, 'spent'),
    ...optionalInteger(raw, 'received'),
    ...optionalInteger(raw, 'balance'),
    ...optionalBoolean(raw, 'carryover')
  };
  return {
    id,
    name: requiredString(raw.name, 'category name'),
    groupId,
    isIncome,
    hidden: requiredBoolean(raw.hidden, 'category hidden flag'),
    ...financial,
    capabilities: {
      budgetAmount: typeof raw.budgeted === 'number',
      carryover: !isIncome && typeof raw.carryover === 'boolean'
    }
  } as PublicBudgetCategory;
}

function projectGroup(raw: Record<string, unknown>): PublicBudgetGroup {
  const id = requiredString(raw.id, 'group id');
  const isIncome = requiredBoolean(raw.is_income, 'group income flag');
  if (!Array.isArray(raw.categories)) throw new Error('Budget group categories must be an array.');
  return {
    id,
    name: requiredString(raw.name, 'group name'),
    isIncome,
    hidden: requiredBoolean(raw.hidden, 'group hidden flag'),
    ...optionalInteger(raw, 'budgeted'),
    ...optionalInteger(raw, 'spent'),
    ...optionalInteger(raw, 'received'),
    ...optionalInteger(raw, 'balance'),
    categories: raw.categories.map(category => {
      if (!category || typeof category !== 'object' || Array.isArray(category)) throw new Error('Budget category must be an object.');
      return projectCategory(category as Record<string, unknown>, { id, isIncome });
    })
  } as PublicBudgetGroup;
}

export function budgetModeCapability(month: PublicBudgetMonth): BudgetModeCapability {
  const incomeGroups = month.categoryGroups.filter(group => group.isIncome);
  if (incomeGroups.length === 0) return 'unknown';
  return incomeGroups.some(group => typeof group.budgeted === 'number' || group.categories.some(category => category.capabilities.budgetAmount))
    ? 'tracking'
    : 'envelope';
}

export function projectBudgetMonth(raw: AdapterBudgetMonth): PublicBudgetMonth {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.categoryGroups)) throw new Error('Budget month shape is incomplete.');
  const aggregates = Object.fromEntries(aggregateKeys.map(key => [key, requiredInteger(raw[key], key)])) as Record<(typeof aggregateKeys)[number], number>;
  const groups = raw.categoryGroups.map(group => projectGroup(group));
  const provisional: PublicBudgetMonth = {
    month: requiredString(raw.month, 'month'),
    ...aggregates,
    capabilities: { holdForNextMonth: false, incomeBudgeting: false },
    categoryGroups: groups
  };
  const mode = budgetModeCapability(provisional);
  provisional.capabilities = {
    holdForNextMonth: mode === 'envelope',
    incomeBudgeting: mode === 'tracking'
  };
  return provisional;
}

export function findBudgetCategory(month: PublicBudgetMonth, categoryId: string): PublicBudgetCategory | undefined {
  for (const group of month.categoryGroups) {
    const category = group.categories.find(item => item.id === categoryId);
    if (category) return category;
  }
  return undefined;
}

export type BudgetCopyMode = 'fill-empty' | 'overwrite';
export type BudgetCopyAction = 'set' | 'overwrite' | 'skip' | 'skip-hidden' | 'skip-incompatible' | 'unchanged';

export interface BudgetCopyDifference {
  categoryId: string;
  categoryName: string;
  groupId: string;
  hidden: boolean;
  action: BudgetCopyAction;
  sourceBudgeted?: number;
  targetBudgeted?: number;
  sourceCarryover?: boolean;
  targetCarryover?: boolean;
  amountChange: boolean;
  carryoverChange: boolean;
}

export interface BudgetCopyPlan {
  sourceMonth: string;
  targetMonth: string;
  mode: BudgetCopyMode;
  includeCarryover: boolean;
  includeHidden: boolean;
  prospectiveCarryover: boolean;
  counts: {
    total: number;
    changes: number;
    set: number;
    overwrite: number;
    skip: number;
    hiddenSkip: number;
    incompatibleSkip: number;
    unchanged: number;
  };
  differences: BudgetCopyDifference[];
  omittedDifferenceCount: number;
  actionable: BudgetCopyDifference[];
}

export function planBudgetCopy(options: {
  source: PublicBudgetMonth;
  target: PublicBudgetMonth;
  mode: BudgetCopyMode;
  includeCarryover: boolean;
  includeHidden: boolean;
  differenceLimit: number;
}): BudgetCopyPlan {
  const targetById = new Map(options.target.categoryGroups.flatMap(group => group.categories).map(category => [category.id, category]));
  const all: BudgetCopyDifference[] = [];
  for (const source of options.source.categoryGroups.flatMap(group => group.categories)) {
    const target = targetById.get(source.id);
    let action: BudgetCopyAction;
    let amountChange = false;
    let carryoverChange = false;
    if ((source.hidden || target?.hidden) && !options.includeHidden) {
      action = 'skip-hidden';
    } else if (!target || !source.capabilities.budgetAmount || !target.capabilities.budgetAmount ||
      typeof source.budgeted !== 'number' || typeof target.budgeted !== 'number') {
      action = 'skip-incompatible';
    } else {
      amountChange = source.budgeted !== target.budgeted;
      carryoverChange = options.includeCarryover && !source.isIncome && !target.isIncome &&
        typeof source.carryover === 'boolean' && typeof target.carryover === 'boolean' && source.carryover !== target.carryover;
      if (!amountChange && !carryoverChange) action = 'unchanged';
      else if (options.mode === 'fill-empty' && target.budgeted !== 0) {
        action = 'skip';
        amountChange = false;
        carryoverChange = false;
      } else if (amountChange && target.budgeted !== 0) action = 'overwrite';
      else action = 'set';
    }
    all.push({
      categoryId: source.id,
      categoryName: source.name,
      groupId: source.groupId,
      hidden: source.hidden || (target?.hidden ?? false),
      action,
      ...(source.budgeted === undefined ? {} : { sourceBudgeted: source.budgeted }),
      ...(target?.budgeted === undefined ? {} : { targetBudgeted: target.budgeted }),
      ...(options.includeCarryover && source.carryover !== undefined ? { sourceCarryover: source.carryover } : {}),
      ...(options.includeCarryover && target?.carryover !== undefined ? { targetCarryover: target.carryover } : {}),
      amountChange,
      carryoverChange
    });
  }
  const actionable = all.filter(item => item.action === 'set' || item.action === 'overwrite');
  const visible = all.filter(item => item.action !== 'unchanged');
  return {
    sourceMonth: options.source.month,
    targetMonth: options.target.month,
    mode: options.mode,
    includeCarryover: options.includeCarryover,
    includeHidden: options.includeHidden,
    prospectiveCarryover: options.includeCarryover && actionable.some(item => item.carryoverChange),
    counts: {
      total: all.length,
      changes: actionable.length,
      set: all.filter(item => item.action === 'set').length,
      overwrite: all.filter(item => item.action === 'overwrite').length,
      skip: all.filter(item => item.action === 'skip').length,
      hiddenSkip: all.filter(item => item.action === 'skip-hidden').length,
      incompatibleSkip: all.filter(item => item.action === 'skip-incompatible').length,
      unchanged: all.filter(item => item.action === 'unchanged').length
    },
    differences: visible.slice(0, options.differenceLimit),
    omittedDifferenceCount: Math.max(0, visible.length - options.differenceLimit),
    actionable
  };
}
