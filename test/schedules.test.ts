import { describe, expect, it } from 'vitest';
import { projectSchedule, scheduleMatches, toSdkScheduleAmount, toSdkScheduleDate } from '../src/actual/schedules.js';
import { createScheduleInputSchema, updateScheduleInputSchema } from '../src/mcp/contracts.js';

describe('schedule domain', () => {
  it('maps exact, approximate, between, and explicit zero amounts', () => {
    expect(toSdkScheduleAmount({ type: 'exact', amount: 0 })).toEqual({ amount: 0, amountOp: 'is' });
    expect(toSdkScheduleAmount({ type: 'approximate', amount: -10 })).toEqual({ amount: -10, amountOp: 'isapprox' });
    expect(toSdkScheduleAmount({ type: 'between', minAmount: -20, maxAmount: 30 })).toEqual({ amount: { num1: -20, num2: 30 }, amountOp: 'isbetween' });
    expect(() => toSdkScheduleAmount({ type: 'between', minAmount: 2, maxAmount: 1 })).toThrow();
    expect(() => toSdkScheduleAmount({ type: 'exact', amount: 1.5 })).toThrow();
    expect(() => toSdkScheduleAmount({ type: 'approximate', amount: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
  });

  it('maps every recurrence frequency and validates monthly/end/weekend constraints', () => {
    expect(toSdkScheduleDate({ type: 'oneTime', date: '2026-09-03' })).toBe('2026-09-03');
    for (const frequency of ['daily', 'weekly', 'yearly'] as const) {
      expect(toSdkScheduleDate({ type: 'recurring', frequency, start: '2026-09-03', interval: 1 })).toMatchObject({ frequency, start: '2026-09-03', interval: 1, endMode: 'never' });
    }
    expect(toSdkScheduleDate({ type: 'recurring', frequency: 'monthly', start: '2026-09-03', interval: 2, patterns: [{ type: 'MO', value: -1 }], weekend: 'before', end: { type: 'onDate', date: '2027-01-01' } })).toMatchObject({ frequency: 'monthly', skipWeekend: true, weekendSolveMode: 'before', endMode: 'on_date' });
    expect(() => toSdkScheduleDate({ type: 'recurring', frequency: 'monthly', start: '2026-09-03', interval: 1 })).toThrow();
    expect(() => toSdkScheduleDate({ type: 'recurring', frequency: 'weekly', start: '2026-09-03', interval: 1, patterns: [{ type: 'day', value: 1 }] })).toThrow();
    expect(() => toSdkScheduleDate({ type: 'recurring', frequency: 'monthly', start: '2026-09-03', interval: 1, patterns: [{ type: 'day', value: 0 }] })).toThrow();
    expect(() => toSdkScheduleDate({ type: 'recurring', frequency: 'daily', start: '2026-09-03', interval: 1, end: { type: 'afterOccurrences', occurrences: 0 } })).toThrow();
    expect(() => toSdkScheduleDate({ type: 'recurring', frequency: 'yearly', start: '2026-09-03', interval: 1, end: { type: 'onDate', date: '2026-09-02' } })).toThrow();
  });

  it('projects supported fields without leaking rule internals and marks unsupported data', () => {
    const schedule = projectSchedule({
      id: 'schedule', name: 'Rent', rule: 'secret-rule', posts_transaction: true, account: 'account', payee: null,
      amount: -100, amountOp: 'is', date: '2026-09-15', completed: false, next_date: '2026-09-15', _conditions: ['hidden']
    });
    expect(schedule).toEqual({ id: 'schedule', name: 'Rent', accountId: 'account', payeeId: null, amount: { type: 'exact', amount: -100 }, date: { type: 'oneTime', date: '2026-09-15' }, nextDate: '2026-09-15', completed: false, postsTransaction: true, writable: true, unsupportedReasons: [] });
    expect(JSON.stringify(schedule)).not.toMatch(/rule|condition/i);
    expect(projectSchedule({ id: 'legacy', posts_transaction: false, amountOp: 'is', date: 'not-a-date' }).writable).toBe(false);
  });

  it('requires explicit creation amount and non-empty allowlisted updates', () => {
    const base = { accountId: 'a', amount: { type: 'exact' as const, amount: 0 }, date: { type: 'oneTime' as const, date: '2026-09-03' }, postsTransaction: true };
    expect(createScheduleInputSchema.safeParse(base).success).toBe(true);
    expect(createScheduleInputSchema.safeParse({ ...base, amount: undefined }).success).toBe(false);
    expect(updateScheduleInputSchema.safeParse({ scheduleId: 's' }).success).toBe(false);
    expect(updateScheduleInputSchema.safeParse({ scheduleId: 's', completed: true }).success).toBe(false);
    expect(scheduleMatches(projectSchedule({ id: 's', posts_transaction: true, account: 'a', payee: null, amount: 0, amountOp: 'is', date: '2026-09-03' }), base)).toBe(true);
  });
});
