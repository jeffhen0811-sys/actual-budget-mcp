import { q } from '@actual-app/api';
import { PublicError } from '../errors.js';
import { DEFAULT_TOP_PAYEE_RESULTS, MAX_DATE_RANGE_DAYS, MAX_TOP_PAYEE_RESULTS, isCalendarDate } from '../schemas.js';
import type { AdapterTransactionQuery } from './adapter.js';

export interface SummaryScope {
  startDate: string;
  endDate: string;
  accountIds?: string[];
  categoryIds?: string[];
  categoryGroupIds?: string[];
  includeOffbudget?: boolean;
  topPayeeLimit?: number;
}

export interface SummaryLedgerRow {
  id: string;
  account: string;
  account_offbudget: boolean;
  amount: number;
  payee?: string | null;
  payee_name?: string | null;
  category?: string | null;
  category_name?: string | null;
  category_is_income?: boolean | null;
  category_group?: string | null;
  category_group_name?: string | null;
  transfer_id?: string | null;
  starting_balance_flag?: boolean;
  is_parent?: boolean;
}

export interface SummaryBreakdown { id: string; name: string | null; amount: number; transactionCount: number }

export interface LedgerSummary {
  source: 'fixed-actualql-ledger';
  scope: { startDate: string; endDate: string; accountIds: string[]; includeOffbudget: boolean };
  incomeAmount: number;
  expenseAmount: number;
  netAmount: number;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  categorizedCount: number;
  uncategorizedCount: number;
  uncategorizedIncomeAmount: number;
  uncategorizedExpenseAmount: number;
  incomeCategoryBreakdown: SummaryBreakdown[];
  expenseCategoryBreakdown: SummaryBreakdown[];
  expenseGroupBreakdown: SummaryBreakdown[];
  topIncomePayees: SummaryBreakdown[];
  topExpensePayees: SummaryBreakdown[];
  topPayeeLimit: number;
  offbudgetCashFlow?: { inflowAmount: number; outflowAmount: number; netChange: number; transactionCount: number };
  exclusions: { transfers: true; startingBalances: true; splitParents: true };
}

function invalidRange(message: string): never {
  throw new PublicError('INVALID_SUMMARY_RANGE', message, 'actual_financial_summary', false);
}

export function normalizeSummaryScope(scope: SummaryScope): Required<Pick<SummaryScope, 'startDate' | 'endDate' | 'includeOffbudget' | 'topPayeeLimit'>> & SummaryScope {
  if (!isCalendarDate(scope.startDate) || !isCalendarDate(scope.endDate)) invalidRange('Summary dates must use valid YYYY-MM-DD form.');
  const start = Date.parse(`${scope.startDate}T00:00:00Z`);
  const end = Date.parse(`${scope.endDate}T00:00:00Z`);
  if (start > end) invalidRange('Summary start date must not be after the end date.');
  if (Math.floor((end - start) / 86_400_000) + 1 > MAX_DATE_RANGE_DAYS) invalidRange(`Summary range must not exceed ${MAX_DATE_RANGE_DAYS} inclusive days.`);
  const topPayeeLimit = scope.topPayeeLimit ?? DEFAULT_TOP_PAYEE_RESULTS;
  if (!Number.isSafeInteger(topPayeeLimit) || topPayeeLimit < 1 || topPayeeLimit > MAX_TOP_PAYEE_RESULTS) {
    invalidRange(`Top payee limit must be between 1 and ${MAX_TOP_PAYEE_RESULTS}.`);
  }
  for (const values of [scope.accountIds, scope.categoryIds, scope.categoryGroupIds]) {
    if (values && (values.length === 0 || new Set(values).size !== values.length)) invalidRange('Summary identifier filters must be non-empty and unique.');
  }
  return { ...scope, includeOffbudget: scope.includeOffbudget ?? false, topPayeeLimit };
}

export function compileSummaryLedgerQuery(scopeInput: SummaryScope): AdapterTransactionQuery {
  const scope = normalizeSummaryScope(scopeInput);
  const filters: Array<Record<string, unknown>> = [
    { date: { $gte: scope.startDate, $lte: scope.endDate } },
    { $or: [{ transfer_id: null }, { transfer_id: '' }] },
    { starting_balance_flag: false },
    { is_parent: false }
  ];
  if (scope.accountIds?.length) filters.push({ account: { $oneof: scope.accountIds } });
  if (scope.categoryIds?.length) filters.push({ category: { $oneof: scope.categoryIds } });
  if (scope.categoryGroupIds?.length) filters.push({ 'category.group': { $oneof: scope.categoryGroupIds } });
  return q('transactions')
    .filter({ $and: filters })
    .select([
      'id', 'account', { account_offbudget: 'account.offbudget' }, 'amount', 'payee', { payee_name: 'payee.name' },
      'category', { category_name: 'category.name' }, { category_is_income: 'category.is_income' },
      { category_group: 'category.group' }, { category_group_name: 'category.group.name' },
      'transfer_id', 'starting_balance_flag', 'is_parent'
    ])
    .orderBy([{ id: 'asc' }])
    .limit(5001)
    .options({ splits: 'inline' });
}

export function parseSummaryRows(value: unknown, operation: string): SummaryLedgerRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray((value as { data?: unknown }).data)) {
    throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an unsupported summary query envelope.', operation, false);
  }
  const rows = (value as { data: unknown[] }).data;
  if (rows.length > 5000) throw new PublicError('RESULT_TOO_LARGE', 'The summary query exceeds 5000 effective transactions.', operation, false);
  return rows.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an unsupported summary row.', operation, false);
    const item = row as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.account !== 'string' || !Number.isSafeInteger(item.amount) || typeof item.account_offbudget !== 'boolean') {
      throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an incomplete summary row.', operation, false);
    }
    for (const key of ['payee', 'payee_name', 'category', 'category_name', 'category_group', 'category_group_name', 'transfer_id'] as const) {
      if (item[key] !== undefined && item[key] !== null && typeof item[key] !== 'string') throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an invalid summary reference.', operation, false);
    }
    if (item.category_is_income !== undefined && item.category_is_income !== null && typeof item.category_is_income !== 'boolean') {
      throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an invalid category income flag.', operation, false);
    }
    return item as unknown as SummaryLedgerRow;
  });
}

function add(map: Map<string, SummaryBreakdown>, id: string, name: string | null, amount: number): void {
  const current = map.get(id);
  if (current) { current.amount += amount; current.transactionCount += 1; }
  else map.set(id, { id, name, amount, transactionCount: 1 });
}

function ordered(values: Map<string, SummaryBreakdown>, direction: 'income' | 'expense' | 'id'): SummaryBreakdown[] {
  return [...values.values()].sort((a, b) => direction === 'income'
    ? b.amount - a.amount || a.id.localeCompare(b.id)
    : direction === 'expense'
      ? a.amount - b.amount || a.id.localeCompare(b.id)
      : a.id.localeCompare(b.id));
}

export function summarizeLedger(rows: readonly SummaryLedgerRow[], scopeInput: SummaryScope, appliedAccountIds: string[]): LedgerSummary {
  const scope = normalizeSummaryScope(scopeInput);
  let incomeAmount = 0, expenseAmount = 0, transactionCount = 0, incomeTransactionCount = 0, expenseTransactionCount = 0;
  let categorizedCount = 0, uncategorizedCount = 0;
  let uncategorizedIncomeAmount = 0, uncategorizedExpenseAmount = 0;
  let offIn = 0, offOut = 0, offCount = 0;
  const incomeCategories = new Map<string, SummaryBreakdown>();
  const expenseCategories = new Map<string, SummaryBreakdown>();
  const expenseGroups = new Map<string, SummaryBreakdown>();
  const incomePayees = new Map<string, SummaryBreakdown>();
  const expensePayees = new Map<string, SummaryBreakdown>();
  for (const row of rows) {
    if ((typeof row.transfer_id === 'string' && row.transfer_id.length > 0) || row.starting_balance_flag || row.is_parent) continue;
    if (row.account_offbudget) {
      if (scope.includeOffbudget) {
        if (row.amount >= 0) offIn += row.amount; else offOut += row.amount;
        offCount += 1;
      }
      continue;
    }
    transactionCount += 1;
    const categorized = typeof row.category === 'string' && row.category.length > 0;
    if (categorized) categorizedCount += 1; else uncategorizedCount += 1;
    const income = categorized ? row.category_is_income === true : row.amount > 0;
    if (income) {
      incomeTransactionCount += 1;
      incomeAmount += row.amount;
      if (categorized) add(incomeCategories, row.category!, row.category_name ?? null, row.amount);
      else uncategorizedIncomeAmount += row.amount;
      if (row.payee) add(incomePayees, row.payee, row.payee_name ?? null, row.amount);
    } else {
      expenseTransactionCount += 1;
      expenseAmount += row.amount;
      if (categorized) {
        add(expenseCategories, row.category!, row.category_name ?? null, row.amount);
        add(expenseGroups, row.category_group ?? '[ungrouped]', row.category_group_name ?? null, row.amount);
      } else uncategorizedExpenseAmount += row.amount;
      if (row.payee) add(expensePayees, row.payee, row.payee_name ?? null, row.amount);
    }
  }
  return {
    source: 'fixed-actualql-ledger',
    scope: { startDate: scope.startDate, endDate: scope.endDate, accountIds: [...appliedAccountIds], includeOffbudget: scope.includeOffbudget },
    incomeAmount, expenseAmount, netAmount: incomeAmount + expenseAmount, transactionCount, incomeTransactionCount, expenseTransactionCount,
    categorizedCount, uncategorizedCount,
    uncategorizedIncomeAmount, uncategorizedExpenseAmount,
    incomeCategoryBreakdown: ordered(incomeCategories, 'id'), expenseCategoryBreakdown: ordered(expenseCategories, 'id'),
    expenseGroupBreakdown: ordered(expenseGroups, 'id'),
    topIncomePayees: ordered(incomePayees, 'income').slice(0, scope.topPayeeLimit),
    topExpensePayees: ordered(expensePayees, 'expense').slice(0, scope.topPayeeLimit), topPayeeLimit: scope.topPayeeLimit,
    ...(scope.includeOffbudget ? { offbudgetCashFlow: { inflowAmount: offIn, outflowAmount: offOut, netChange: offIn + offOut, transactionCount: offCount } } : {}),
    exclusions: { transfers: true, startingBalances: true, splitParents: true }
  };
}
