import { describe, expect, it } from 'vitest';
import { compileSummaryLedgerQuery, normalizeSummaryScope, parseSummaryRows, summarizeLedger, type SummaryLedgerRow } from '../src/actual/summaries.js';

const row = (id: string, amount: number, fields: Partial<SummaryLedgerRow> = {}): SummaryLedgerRow => ({
  id, account: 'on', account_offbudget: false, amount, ...fields
});

describe('financial summary engine', () => {
  it('validates inclusive ranges and shared top-payee limits', () => {
    expect(normalizeSummaryScope({ startDate: '2024-01-01', endDate: '2024-12-31' }).topPayeeLimit).toBe(10);
    expect(() => normalizeSummaryScope({ startDate: '2024-01-01', endDate: '2025-01-01' })).toThrow();
    expect(() => normalizeSummaryScope({ startDate: '2026-09-02', endDate: '2026-09-01' })).toThrow();
    expect(() => normalizeSummaryScope({ startDate: '2026-09-01', endDate: '2026-09-02', topPayeeLimit: 51 })).toThrow();
    expect(normalizeSummaryScope({ startDate: '2026-01-01', endDate: '2026-12-31', topPayeeLimit: 50 }).topPayeeLimit).toBe(50);
    expect(() => normalizeSummaryScope({ startDate: '2026-09-01', endDate: '2026-09-02', accountIds: [] })).toThrow();
    expect(() => normalizeSummaryScope({ startDate: '2026-09-01', endDate: '2026-09-02', categoryIds: ['same', 'same'] })).toThrow();
  });

  it('returns exact zero-data output and compiles only validated fixed filters', () => {
    const result = summarizeLedger([], { startDate: '2026-09-01', endDate: '2026-09-30' }, ['on']);
    expect(result).toMatchObject({ incomeAmount: 0, expenseAmount: 0, netAmount: 0, transactionCount: 0, incomeCategoryBreakdown: [], expenseCategoryBreakdown: [], topIncomePayees: [], topExpensePayees: [] });
    const query = compileSummaryLedgerQuery({
      startDate: '2026-09-01', endDate: '2026-09-30', accountIds: ['account'], categoryIds: ['category'], categoryGroupIds: ['group']
    }).serialize();
    expect(JSON.stringify(query.filterExpressions)).toContain('account');
    expect(JSON.stringify(query.filterExpressions)).toContain('category.group');
    expect(query).toMatchObject({ table: 'transactions', tableOptions: { splits: 'inline' }, limit: 5001 });
  });

  it('uses category-driven signed classification with refunds, adjustments, and uncategorized values', () => {
    const result = summarizeLedger([
      row('salary', 1000, { category: 'income', category_name: 'Salary', category_is_income: true, payee: 'employer' }),
      row('adjustment', -100, { category: 'income', category_name: 'Salary', category_is_income: true, payee: 'employer' }),
      row('expense', -500, { category: 'food', category_name: 'Food', category_group: 'living', category_group_name: 'Living', category_is_income: false, payee: 'market' }),
      row('refund', 50, { category: 'food', category_name: 'Food', category_group: 'living', category_group_name: 'Living', category_is_income: false, payee: 'market' }),
      row('uncat-in', 25), row('uncat-out', -20), row('zero', 0)
    ], { startDate: '2026-09-01', endDate: '2026-09-30' }, ['on']);
    expect(result).toMatchObject({ incomeAmount: 925, expenseAmount: -470, netAmount: 455, uncategorizedIncomeAmount: 25, uncategorizedExpenseAmount: -20, transactionCount: 7 });
    expect(result.incomeCategoryBreakdown[0]?.amount).toBe(900);
    expect(result.expenseCategoryBreakdown[0]?.amount).toBe(-450);
    expect(result.expenseGroupBreakdown[0]?.amount).toBe(-450);
  });

  it('excludes transfers, starting balances, and split parents while separating off-budget cash flow', () => {
    const result = summarizeLedger([
      row('transfer', -100, { transfer_id: 'other' }), row('starting', 1000, { starting_balance_flag: true }),
      row('parent', -500, { is_parent: true }), row('child', -500),
      row('off-in', 200, { account: 'off', account_offbudget: true }), row('off-out', -50, { account: 'off', account_offbudget: true })
    ], { startDate: '2026-09-01', endDate: '2026-09-30', includeOffbudget: true }, ['on', 'off']);
    expect(result).toMatchObject({ expenseAmount: -500, transactionCount: 1, offbudgetCashFlow: { inflowAmount: 200, outflowAmount: -50, netChange: 150, transactionCount: 2 } });
  });

  it('orders top payees deterministically and rejects malformed envelopes', () => {
    const result = summarizeLedger([
      row('a', -100, { payee: 'z', payee_name: 'Z' }), row('b', -200, { payee: 'b', payee_name: 'B' }), row('c', -200, { payee: 'a', payee_name: 'A' })
    ], { startDate: '2026-09-01', endDate: '2026-09-30', topPayeeLimit: 2 }, ['on']);
    expect(result.topExpensePayees.map(item => item.id)).toEqual(['a', 'b']);
    expect(() => parseSummaryRows({ data: [{ id: 'bad', account: 'a', amount: 1.2, account_offbudget: false }] }, 'summary')).toThrow();
    expect(() => parseSummaryRows({ data: [{ id: 'bad', account: 'a', amount: 1, account_offbudget: false, category_is_income: 'yes' }] }, 'summary')).toThrow();
    expect(() => parseSummaryRows({ data: Array.from({ length: 5001 }, (_, index) => row(String(index), 1)) }, 'summary')).toThrow();
  });
});
