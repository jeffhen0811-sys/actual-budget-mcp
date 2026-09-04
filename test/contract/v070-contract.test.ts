import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { compileScheduleTransactions, projectSchedule } from '../../src/actual/schedules.js';
import { compileSummaryLedgerQuery, parseSummaryRows } from '../../src/actual/summaries.js';

describe('@actual-app/api 26.8.1 schedule and summary contract', () => {
  it('pins the four public schedule exports, return types, and absent advanced exports', async () => {
    const declarations = await readFile('node_modules/@actual-app/api/@types/methods.d.ts', 'utf8');
    expect(declarations).toContain("createSchedule(schedule: Omit<APIScheduleEntity, 'id'>): Promise<string>");
    expect(declarations).toContain("updateSchedule(id: APIScheduleEntity['id'], fields: Partial<APIScheduleEntity>, resetNextDate?: boolean): Promise<string>");
    expect(declarations).toContain("deleteSchedule(scheduleId: APIScheduleEntity['id']): Promise<void>");
    expect(declarations).toContain('getSchedules(): Promise<APIScheduleEntity[]>');
    expect(declarations).not.toMatch(/function (?:getSchedule|postSchedule|skipSchedule|discoverSchedules|forceRunSchedule)\(/);
  });

  it('pins date, amount, nullable reference, and system-managed declaration shapes', async () => {
    const schedule = await readFile('node_modules/@actual-app/core/@types/src/types/models/schedule.d.ts', 'utf8');
    const apiModels = await readFile('node_modules/@actual-app/core/@types/src/server/api-models.d.ts', 'utf8');
    for (const value of ["'daily' | 'weekly' | 'monthly' | 'yearly'", "type: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'day'", "endMode?: 'never' | 'after_n_occurrences' | 'on_date'"]) {
      expect(schedule).toContain(value);
    }
    expect(apiModels).toContain("next_date?: ScheduleEntity['next_date']");
    expect(apiModels).toContain("completed?: ScheduleEntity['completed']");
    expect(apiModels).toContain("payee?: ScheduleEntity['_payee']");
    expect(apiModels).toContain("amount?: ScheduleEntity['_amount']");
    expect(apiModels).toContain("export type AmountOPType = 'is' | 'isapprox' | 'isbetween'");
  });

  it('pins installed omitted-amount, system-managed, linked-rule, sync, and advancement behavior', async () => {
    const implementation = await readFile('node_modules/@actual-app/api/dist/index.js', 'utf8');
    expect(implementation).toContain('const amount = schedule.amount ?? 0');
    expect(implementation).toContain('Field ${typedKey} is system-managed and not user-editable.');
    expect(implementation).toContain('await delete_("rules", ruleId)');
    expect(implementation).toContain('await delete_("schedules", id)');
    expect(implementation).toContain('await handlers$1["sync-budget"]()');
    expect(implementation).toContain('runMutator(() => advanceSchedulesService(type === "success"))');
    expect(implementation).toContain('await advanceRecurringScheduleFromNextDate(currentSchedule)');
    expect(implementation).toContain('function createScheduleWithUniqueName(params)');
  });

  it('accepts sanitized installed schedule variants and marks legacy shapes non-writable', () => {
    const fixtures = [
      { id: 'one', name: 'One time', posts_transaction: true, account: 'a', payee: null, amount: -100, amountOp: 'is' as const, date: '2026-09-20', next_date: '2026-09-20', completed: false },
      { id: 'recurring', posts_transaction: false, account: 'a', amount: 50, amountOp: 'isapprox' as const, date: { frequency: 'monthly' as const, start: '2026-09-01', interval: 1, patterns: [{ type: 'day' as const, value: 15 }], endMode: 'after_n_occurrences' as const, endOccurrences: 3 } },
      { id: 'between', posts_transaction: true, account: 'a', amount: { num1: -200, num2: -100 }, amountOp: 'isbetween' as const, date: { frequency: 'weekly' as const, start: '2026-09-01' } }
    ];
    expect(fixtures.map(projectSchedule).every(item => item.writable)).toBe(true);
    expect(projectSchedule({ id: 'legacy', posts_transaction: true, amount: 1, amountOp: 'is', date: { frequency: 'quarterly' } as never }).writable).toBe(false);
  });

  it('serializes only fixed summary and linked-schedule query shapes', () => {
    const summary = compileSummaryLedgerQuery({ startDate: '2026-09-01', endDate: '2026-09-30', accountIds: ['a'], includeOffbudget: true }).serialize();
    expect(summary).toMatchObject({ table: 'transactions', tableOptions: { splits: 'inline' }, limit: 5001, orderExpressions: [{ id: 'asc' }] });
    expect(summary.selectExpressions).toContainEqual({ category_is_income: 'category.is_income' });
    expect(summary.selectExpressions).toContainEqual({ account_offbudget: 'account.offbudget' });
    expect(JSON.stringify(summary.filterExpressions)).toContain('transfer_id');
    expect(JSON.stringify(summary.filterExpressions)).toContain('starting_balance_flag');
    expect(compileScheduleTransactions('schedule-id').serialize()).toMatchObject({ table: 'transactions', tableOptions: { splits: 'all' }, selectExpressions: ['id', 'schedule'] });
    expect(parseSummaryRows({ data: [] }, 'summary')).toEqual([]);
    expect(() => parseSummaryRows({ rows: [] }, 'summary')).toThrow();
  });
});
