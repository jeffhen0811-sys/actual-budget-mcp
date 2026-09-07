import { z } from 'zod/v4';

export const MAX_DATE_RANGE_DAYS = 366;
export const MAX_IMPORT_BATCH = 500;
export const MAX_LEDGER_SCAN_RESULTS = 5_000;
export const LEDGER_QUERY_SENTINEL_LIMIT = MAX_LEDGER_SCAN_RESULTS + 1;
export const LINKED_TRANSACTION_LOOKUP_LIMIT = 2;
export const DEFAULT_TRANSACTION_SEARCH_RESULTS = 100;
export const DEFAULT_PAGINATION_OFFSET = 0;
export const MAX_TRANSACTION_SEARCH_RESULTS = 250;
export const MAX_TRANSACTION_SEARCH_OFFSET = 10_000;
export const MAX_SUMMARY_SCOPE_IDS = 250;
export const MAX_BULK_TRANSACTION_UPDATES = 100;
export const MAX_ID_LENGTH = 512;
export const MAX_TEXT_LENGTH = 10_000;
export const MAX_ENTITY_NAME_LENGTH = 255;
export const MAX_BUDGET_CATEGORY_RESULTS = 500;
export const DEFAULT_BUDGET_CATEGORY_RESULTS = 100;
export const DEFAULT_SCHEDULE_RESULTS = 100;
export const MAX_SCHEDULE_RESULTS = 250;
export const MAX_SCHEDULE_OFFSET = 10_000;
export const DEFAULT_TOP_PAYEE_RESULTS = 10;
export const MAX_TOP_PAYEE_RESULTS = 50;
export const DEFAULT_DIAGNOSTIC_WINDOW_DAYS = 3;
export const MAX_DIAGNOSTIC_WINDOW_DAYS = 7;
export const MAX_SCHEDULE_PATTERNS = 31;
export const MAX_SCHEDULE_MONTH_DAY = 31;
export const MAX_SCHEDULE_WEEKDAY_OCCURRENCE = 5;
export const MAX_PAYEE_MERGE_SOURCES = 100;
export const MAX_RULE_CONDITIONS = 100;
export const MAX_RULE_ACTIONS = 100;
export const MAX_RULE_LIST_VALUES = 250;
export const DEFAULT_BUDGET_COPY_DIFFERENCE_RESULTS = 100;
export const MAX_BUDGET_COPY_DIFFERENCE_RESULTS = 500;
export const MAX_BUDGET_COPY_CHANGES = 500;

export const PUBLIC_LIMIT_CATALOG = {
  MAX_DATE_RANGE_DAYS: { value: MAX_DATE_RANGE_DAYS, kind: 'public', description: 'Maximum inclusive date range in days.' },
  MAX_IMPORT_BATCH: { value: MAX_IMPORT_BATCH, kind: 'public', description: 'Maximum transactions in one import request.' },
  MAX_LEDGER_SCAN_RESULTS: { value: MAX_LEDGER_SCAN_RESULTS, kind: 'public', description: 'Maximum complete ledger rows classified or returned by bounded operations.' },
  LEDGER_QUERY_SENTINEL_LIMIT: { value: LEDGER_QUERY_SENTINEL_LIMIT, kind: 'sentinel', description: 'Internal one-extra-row query limit used only to detect ledger overflow.' },
  LINKED_TRANSACTION_LOOKUP_LIMIT: { value: LINKED_TRANSACTION_LOOKUP_LIMIT, kind: 'sentinel', description: 'Exact transaction plus at most one linked counterpart.' },
  DEFAULT_TRANSACTION_SEARCH_RESULTS: { value: DEFAULT_TRANSACTION_SEARCH_RESULTS, kind: 'default', description: 'Default transaction, transfer, and diagnostic page size.' },
  DEFAULT_PAGINATION_OFFSET: { value: DEFAULT_PAGINATION_OFFSET, kind: 'default', description: 'Default and minimum zero-based page offset.' },
  MAX_TRANSACTION_SEARCH_RESULTS: { value: MAX_TRANSACTION_SEARCH_RESULTS, kind: 'public', description: 'Maximum transaction, transfer, diagnostic page, or identifier-filter size.' },
  MAX_TRANSACTION_SEARCH_OFFSET: { value: MAX_TRANSACTION_SEARCH_OFFSET, kind: 'public', description: 'Maximum transaction, transfer, or diagnostic page offset.' },
  MAX_SUMMARY_SCOPE_IDS: { value: MAX_SUMMARY_SCOPE_IDS, kind: 'public', description: 'Maximum account IDs or category IDs in one summary scope.' },
  MAX_BULK_TRANSACTION_UPDATES: { value: MAX_BULK_TRANSACTION_UPDATES, kind: 'public', description: 'Maximum desired-state transaction updates in one bulk call.' },
  MAX_ID_LENGTH: { value: MAX_ID_LENGTH, kind: 'public', description: 'Maximum trimmed opaque identifier length.' },
  MAX_TEXT_LENGTH: { value: MAX_TEXT_LENGTH, kind: 'public', description: 'Maximum caller-authored notes, text, or rule text length.' },
  MAX_ENTITY_NAME_LENGTH: { value: MAX_ENTITY_NAME_LENGTH, kind: 'public', description: 'Maximum trimmed entity-name length.' },
  MAX_BUDGET_CATEGORY_RESULTS: { value: MAX_BUDGET_CATEGORY_RESULTS, kind: 'public', description: 'Maximum categories returned by a budget detail request.' },
  DEFAULT_BUDGET_CATEGORY_RESULTS: { value: DEFAULT_BUDGET_CATEGORY_RESULTS, kind: 'default', description: 'Default categories returned by budget detail.' },
  DEFAULT_SCHEDULE_RESULTS: { value: DEFAULT_SCHEDULE_RESULTS, kind: 'default', description: 'Default schedule page size.' },
  MAX_SCHEDULE_RESULTS: { value: MAX_SCHEDULE_RESULTS, kind: 'public', description: 'Maximum schedule page size.' },
  MAX_SCHEDULE_OFFSET: { value: MAX_SCHEDULE_OFFSET, kind: 'public', description: 'Maximum schedule page offset.' },
  DEFAULT_TOP_PAYEE_RESULTS: { value: DEFAULT_TOP_PAYEE_RESULTS, kind: 'default', description: 'Default top-payee breakdown size.' },
  MAX_TOP_PAYEE_RESULTS: { value: MAX_TOP_PAYEE_RESULTS, kind: 'public', description: 'Maximum top-payee breakdown size.' },
  DEFAULT_DIAGNOSTIC_WINDOW_DAYS: { value: DEFAULT_DIAGNOSTIC_WINDOW_DAYS, kind: 'default', description: 'Default transfer/duplicate candidate date window.' },
  MAX_DIAGNOSTIC_WINDOW_DAYS: { value: MAX_DIAGNOSTIC_WINDOW_DAYS, kind: 'public', description: 'Maximum transfer/duplicate candidate date window.' },
  MAX_SCHEDULE_PATTERNS: { value: MAX_SCHEDULE_PATTERNS, kind: 'public', description: 'Maximum recurrence patterns in one schedule input.' },
  MAX_SCHEDULE_MONTH_DAY: { value: MAX_SCHEDULE_MONTH_DAY, kind: 'public', description: 'Maximum calendar day recurrence value.' },
  MAX_SCHEDULE_WEEKDAY_OCCURRENCE: { value: MAX_SCHEDULE_WEEKDAY_OCCURRENCE, kind: 'public', description: 'Absolute maximum monthly weekday occurrence.' },
  MAX_PAYEE_MERGE_SOURCES: { value: MAX_PAYEE_MERGE_SOURCES, kind: 'public', description: 'Maximum source payees in one merge.' },
  MAX_RULE_CONDITIONS: { value: MAX_RULE_CONDITIONS, kind: 'public', description: 'Maximum conditions in one writable rule.' },
  MAX_RULE_ACTIONS: { value: MAX_RULE_ACTIONS, kind: 'public', description: 'Maximum actions in one writable rule.' },
  MAX_RULE_LIST_VALUES: { value: MAX_RULE_LIST_VALUES, kind: 'public', description: 'Maximum values in one list-valued rule condition.' },
  DEFAULT_BUDGET_COPY_DIFFERENCE_RESULTS: { value: DEFAULT_BUDGET_COPY_DIFFERENCE_RESULTS, kind: 'default', description: 'Default visible budget-copy differences.' },
  MAX_BUDGET_COPY_DIFFERENCE_RESULTS: { value: MAX_BUDGET_COPY_DIFFERENCE_RESULTS, kind: 'public', description: 'Maximum visible budget-copy differences.' },
  MAX_BUDGET_COPY_CHANGES: { value: MAX_BUDGET_COPY_CHANGES, kind: 'public', description: 'Maximum category changes in one budget copy.' }
} as const;

export type PublicLimitName = keyof typeof PUBLIC_LIMIT_CATALOG;

export const opaqueIdSchema = z
  .string('Identifier must be a string.')
  .trim()
  .min(1, 'Identifier must not be empty.')
  .max(MAX_ID_LENGTH, `Identifier must not exceed ${MAX_ID_LENGTH} characters.`);

export const integerAmountSchema = z
  .number('Amount must be a number.')
  .int('Amount must be an integer in minor units.')
  .safe('Amount must be a safe integer.');

export const entityNameSchema = z
  .string('Name must be a string.')
  .trim()
  .min(1, 'Name must not be empty.')
  .max(MAX_ENTITY_NAME_LENGTH, `Name must not exceed ${MAX_ENTITY_NAME_LENGTH} characters.`);

export const boundedTextSchema = z.string().max(MAX_TEXT_LENGTH, `Text must not exceed ${MAX_TEXT_LENGTH} characters.`);

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

export const isoDateSchema = z
  .string('Date must be a string.')
  .refine(isCalendarDate, 'Date must be a valid calendar date in YYYY-MM-DD format.');

function isCalendarMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split('-').map(Number);
  return Number.isInteger(year) && Number.isInteger(month) && year! >= 1 && month! >= 1 && month! <= 12;
}

export const budgetMonthSchema = z
  .string('Budget month must be a string.')
  .refine(isCalendarMonth, 'Budget month must be a valid calendar month in YYYY-MM format.');

export const positiveIntegerAmountSchema = integerAmountSchema
  .refine(value => value > 0, 'Amount must be greater than zero.');

export const budgetResultLimitSchema = z
  .number('Limit must be a number.')
  .int('Limit must be an integer.')
  .min(1, 'Limit must be at least 1.')
  .max(MAX_BUDGET_CATEGORY_RESULTS, `Limit must not exceed ${MAX_BUDGET_CATEGORY_RESULTS}.`);

export const dateRangeSchema = z
  .object({ startDate: isoDateSchema, endDate: isoDateSchema })
  .strict()
  .superRefine(({ startDate, endDate }, context) => {
    const start = Date.parse(`${startDate}T00:00:00Z`);
    const end = Date.parse(`${endDate}T00:00:00Z`);
    if (start > end) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be on or after startDate.' });
      return;
    }
    const days = Math.floor((end - start) / 86_400_000) + 1;
    if (days > MAX_DATE_RANGE_DAYS) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: `The inclusive date range must not exceed ${MAX_DATE_RANGE_DAYS} days.`
      });
    }
  });

export function batchSchema<T extends z.ZodType>(item: T) {
  return z
    .array(item)
    .min(1, 'At least one transaction is required.')
    .max(MAX_IMPORT_BATCH, `A batch must not exceed ${MAX_IMPORT_BATCH} transactions.`);
}
