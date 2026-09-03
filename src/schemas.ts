import { z } from 'zod/v4';

export const MAX_DATE_RANGE_DAYS = 366;
export const MAX_IMPORT_BATCH = 500;
export const MAX_TRANSACTION_RESULTS = 5_000;
export const DEFAULT_TRANSACTION_SEARCH_RESULTS = 100;
export const MAX_TRANSACTION_SEARCH_RESULTS = 250;
export const MAX_TRANSACTION_SEARCH_OFFSET = 10_000;
export const MAX_BULK_TRANSACTION_UPDATES = 100;
export const MAX_ID_LENGTH = 512;
export const MAX_TEXT_LENGTH = 10_000;
export const MAX_ENTITY_NAME_LENGTH = 255;
export const MAX_BUDGET_CATEGORY_RESULTS = 500;
export const DEFAULT_BUDGET_CATEGORY_RESULTS = 100;

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

function isCalendarDate(value: string): boolean {
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
