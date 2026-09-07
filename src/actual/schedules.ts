import { q } from '@actual-app/api';
import { PublicError } from '../errors.js';
import {
  isCalendarDate,
  LEDGER_QUERY_SENTINEL_LIMIT,
  MAX_SCHEDULE_MONTH_DAY,
  MAX_SCHEDULE_WEEKDAY_OCCURRENCE
} from '../schemas.js';
import type { AdapterRecurConfig, AdapterSchedule, AdapterTransactionQuery } from './adapter.js';

export type ScheduleAmount =
  | { type: 'exact'; amount: number }
  | { type: 'approximate'; amount: number }
  | { type: 'between'; minAmount: number; maxAmount: number };

export type ScheduleDate =
  | { type: 'oneTime'; date: string }
  | {
      type: 'recurring'; frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; start: string; interval: number;
      patterns?: Array<{ type: 'day' | 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'; value: number }>;
      weekend?: 'none' | 'before' | 'after';
      end?: { type: 'never' } | { type: 'afterOccurrences'; occurrences: number } | { type: 'onDate'; date: string };
    };

export interface PublicSchedule {
  id: string;
  name?: string;
  accountId: string | null;
  payeeId: string | null;
  amount: ScheduleAmount | null;
  date: ScheduleDate | null;
  nextDate?: string;
  completed: boolean;
  postsTransaction: boolean;
  writable: boolean;
  unsupportedReasons: string[];
}

export interface ScheduleDraft {
  name?: string;
  accountId: string;
  payeeId?: string | null;
  amount: ScheduleAmount;
  date: ScheduleDate;
  postsTransaction: boolean;
}

export type ScheduleUpdate = Partial<ScheduleDraft>;

function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function toSdkScheduleAmount(amount: ScheduleAmount): Pick<AdapterSchedule, 'amount' | 'amountOp'> {
  if (amount.type === 'exact' || amount.type === 'approximate') {
    if (!safeInteger(amount.amount)) throw new PublicError('INVALID_RECURRENCE', 'Schedule amount must be a signed safe integer.', 'actual_schedule_amount', false);
    return { amount: amount.amount, amountOp: amount.type === 'exact' ? 'is' : 'isapprox' };
  }
  if (!safeInteger(amount.minAmount) || !safeInteger(amount.maxAmount) || amount.minAmount > amount.maxAmount) {
    throw new PublicError('INVALID_RECURRENCE', 'Schedule amount bounds must be ordered signed safe integers.', 'actual_schedule_amount', false);
  }
  return { amount: { num1: amount.minAmount, num2: amount.maxAmount }, amountOp: 'isbetween' };
}

export function fromSdkScheduleAmount(schedule: AdapterSchedule): ScheduleAmount | null {
  if ((schedule.amountOp === 'is' || schedule.amountOp === 'isapprox') && safeInteger(schedule.amount)) {
    return { type: schedule.amountOp === 'is' ? 'exact' : 'approximate', amount: schedule.amount };
  }
  if (schedule.amountOp === 'isbetween' && schedule.amount && typeof schedule.amount === 'object' &&
      safeInteger(schedule.amount.num1) && safeInteger(schedule.amount.num2) && schedule.amount.num1 <= schedule.amount.num2) {
    return { type: 'between', minAmount: schedule.amount.num1, maxAmount: schedule.amount.num2 };
  }
  return null;
}

function recurError(message: string): never {
  throw new PublicError('INVALID_RECURRENCE', message, 'actual_schedule_recurrence', false);
}

export function toSdkScheduleDate(date: ScheduleDate): string | AdapterRecurConfig {
  if (date.type === 'oneTime') {
    if (!isCalendarDate(date.date)) recurError('One-time schedule date must use valid YYYY-MM-DD form.');
    return date.date;
  }
  if (!isCalendarDate(date.start)) recurError('Recurring schedule start must use valid YYYY-MM-DD form.');
  if (!Number.isSafeInteger(date.interval) || date.interval < 1) recurError('Recurring interval must be a positive safe integer.');
  if (date.frequency !== 'monthly' && date.patterns !== undefined) recurError('Only monthly schedules accept explicit patterns.');
  if (date.frequency === 'monthly') {
    if (!date.patterns?.length) recurError('Monthly schedules require at least one supported pattern.');
    for (const pattern of date.patterns) {
      if (pattern.type === 'day') {
        if (!Number.isSafeInteger(pattern.value) || pattern.value < 1 || pattern.value > MAX_SCHEDULE_MONTH_DAY) {
          recurError(`Monthly day values must be between 1 and ${MAX_SCHEDULE_MONTH_DAY}.`);
        }
      } else if (!Number.isSafeInteger(pattern.value) || pattern.value === 0 ||
          pattern.value < -MAX_SCHEDULE_WEEKDAY_OCCURRENCE || pattern.value > MAX_SCHEDULE_WEEKDAY_OCCURRENCE) {
        recurError(`Monthly weekday ordinals must be between -${MAX_SCHEDULE_WEEKDAY_OCCURRENCE} and ${MAX_SCHEDULE_WEEKDAY_OCCURRENCE} and cannot be zero.`);
      }
    }
  }
  const end = date.end ?? { type: 'never' as const };
  if (end.type === 'afterOccurrences' && (!Number.isSafeInteger(end.occurrences) || end.occurrences < 1)) {
    recurError('Recurring occurrence count must be a positive safe integer.');
  }
  if (end.type === 'onDate' && (!isCalendarDate(end.date) || end.date < date.start)) {
    recurError('Recurring end date must be a valid date on or after the start date.');
  }
  const weekend = date.weekend ?? 'none';
  return {
    frequency: date.frequency,
    interval: date.interval,
    start: date.start,
    ...(date.patterns === undefined ? {} : { patterns: date.patterns }),
    ...(weekend === 'none' ? { skipWeekend: false } : { skipWeekend: true, weekendSolveMode: weekend }),
    ...(end.type === 'never' ? { endMode: 'never' as const } : end.type === 'afterOccurrences'
      ? { endMode: 'after_n_occurrences' as const, endOccurrences: end.occurrences }
      : { endMode: 'on_date' as const, endDate: end.date })
  };
}

export function fromSdkScheduleDate(value: unknown): ScheduleDate | null {
  if (typeof value === 'string') return isCalendarDate(value) ? { type: 'oneTime', date: value } : null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const recur = value as Partial<AdapterRecurConfig>;
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(String(recur.frequency)) || !isCalendarDate(String(recur.start)) ||
      (recur.interval !== undefined && (!Number.isSafeInteger(recur.interval) || recur.interval < 1))) return null;
  const patterns = recur.patterns;
  if (recur.frequency === 'monthly' && (!Array.isArray(patterns) || patterns.length === 0)) return null;
  if (recur.frequency !== 'monthly' && patterns !== undefined) return null;
  if (patterns?.some(pattern => !['day', 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].includes(pattern.type) ||
    !Number.isSafeInteger(pattern.value) || (pattern.type === 'day'
      ? pattern.value < 1 || pattern.value > MAX_SCHEDULE_MONTH_DAY
      : pattern.value === 0 || pattern.value < -MAX_SCHEDULE_WEEKDAY_OCCURRENCE ||
        pattern.value > MAX_SCHEDULE_WEEKDAY_OCCURRENCE))) return null;
  let end: NonNullable<Extract<ScheduleDate, { type: 'recurring' }>['end']>;
  if (recur.endMode === undefined || recur.endMode === 'never') end = { type: 'never' };
  else if (recur.endMode === 'after_n_occurrences' && Number.isSafeInteger(recur.endOccurrences) && recur.endOccurrences! > 0) {
    end = { type: 'afterOccurrences', occurrences: recur.endOccurrences! };
  } else if (recur.endMode === 'on_date' && typeof recur.endDate === 'string' && isCalendarDate(recur.endDate) && recur.endDate >= recur.start!) {
    end = { type: 'onDate', date: recur.endDate };
  } else return null;
  const weekend = recur.skipWeekend ? recur.weekendSolveMode : 'none';
  if (weekend !== 'none' && weekend !== 'before' && weekend !== 'after') return null;
  return {
    type: 'recurring', frequency: recur.frequency!, start: recur.start!, interval: recur.interval ?? 1,
    ...(patterns === undefined ? {} : { patterns }), weekend, end
  };
}

export function projectSchedule(schedule: AdapterSchedule): PublicSchedule {
  if (!schedule || typeof schedule.id !== 'string' || typeof schedule.posts_transaction !== 'boolean') {
    throw new PublicError('QUERY_SHAPE_INVALID', 'Actual returned an incomplete schedule.', 'actual_schedule_projection', false);
  }
  const amount = fromSdkScheduleAmount(schedule);
  const date = fromSdkScheduleDate(schedule.date);
  const unsupportedReasons = [
    ...(amount === null ? ['unsupported_amount'] : []),
    ...(date === null ? ['unsupported_date'] : []),
    ...(schedule.account !== undefined && schedule.account !== null && typeof schedule.account !== 'string' ? ['unsupported_account'] : []),
    ...(schedule.payee !== undefined && schedule.payee !== null && typeof schedule.payee !== 'string' ? ['unsupported_payee'] : [])
  ];
  return {
    id: schedule.id,
    ...(typeof schedule.name === 'string' ? { name: schedule.name } : {}),
    accountId: typeof schedule.account === 'string' ? schedule.account : null,
    payeeId: typeof schedule.payee === 'string' ? schedule.payee : null,
    amount,
    date,
    ...(typeof schedule.next_date === 'string' && isCalendarDate(schedule.next_date) ? { nextDate: schedule.next_date } : {}),
    completed: schedule.completed === true,
    postsTransaction: schedule.posts_transaction,
    writable: unsupportedReasons.length === 0,
    unsupportedReasons
  };
}

export function scheduleDraftToSdk(draft: ScheduleDraft): Omit<AdapterSchedule, 'id'> {
  return {
    ...(draft.name === undefined ? {} : { name: draft.name }),
    account: draft.accountId,
    ...(draft.payeeId === undefined ? {} : { payee: draft.payeeId }),
    ...toSdkScheduleAmount(draft.amount),
    date: toSdkScheduleDate(draft.date),
    posts_transaction: draft.postsTransaction
  };
}

export function scheduleMatches(schedule: PublicSchedule, desired: ScheduleUpdate): boolean {
  return (desired.name === undefined || schedule.name === desired.name) &&
    (desired.accountId === undefined || schedule.accountId === desired.accountId) &&
    (desired.payeeId === undefined || schedule.payeeId === desired.payeeId) &&
    (desired.postsTransaction === undefined || schedule.postsTransaction === desired.postsTransaction) &&
    (desired.amount === undefined || JSON.stringify(schedule.amount) === JSON.stringify(desired.amount)) &&
    (desired.date === undefined || JSON.stringify(schedule.date) === JSON.stringify(desired.date));
}

export function compileScheduleTransactions(scheduleId: string): AdapterTransactionQuery {
  return q('transactions')
    .filter({ schedule: scheduleId })
    .select(['id', 'schedule'])
    .orderBy([{ id: 'asc' }])
    .limit(LEDGER_QUERY_SENTINEL_LIMIT)
    .options({ splits: 'all' });
}
