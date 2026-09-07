import { z } from 'zod/v4';
import type { AdapterTransaction } from '../actual/adapter.js';
import {
  batchSchema,
  budgetMonthSchema,
  budgetResultLimitSchema,
  boundedTextSchema,
  DEFAULT_BUDGET_CATEGORY_RESULTS,
  DEFAULT_BUDGET_COPY_DIFFERENCE_RESULTS,
  DEFAULT_DIAGNOSTIC_WINDOW_DAYS,
  DEFAULT_PAGINATION_OFFSET,
  DEFAULT_SCHEDULE_RESULTS,
  DEFAULT_TOP_PAYEE_RESULTS,
  DEFAULT_TRANSACTION_SEARCH_RESULTS,
  entityNameSchema,
  integerAmountSchema,
  isoDateSchema,
  MAX_BUDGET_COPY_CHANGES,
  MAX_BUDGET_COPY_DIFFERENCE_RESULTS,
  MAX_DATE_RANGE_DAYS,
  MAX_DIAGNOSTIC_WINDOW_DAYS,
  MAX_IMPORT_BATCH,
  MAX_BULK_TRANSACTION_UPDATES,
  MAX_PAYEE_MERGE_SOURCES,
  MAX_RULE_ACTIONS,
  MAX_RULE_CONDITIONS,
  MAX_RULE_LIST_VALUES,
  MAX_SCHEDULE_MONTH_DAY,
  MAX_SCHEDULE_PATTERNS,
  MAX_SCHEDULE_WEEKDAY_OCCURRENCE,
  MAX_SUMMARY_SCOPE_IDS,
  MAX_TRANSACTION_SEARCH_OFFSET,
  MAX_TRANSACTION_SEARCH_RESULTS,
  MAX_SCHEDULE_OFFSET,
  MAX_SCHEDULE_RESULTS,
  MAX_TOP_PAYEE_RESULTS,
  opaqueIdSchema,
  positiveIntegerAmountSchema
} from '../schemas.js';

export const emptyInputSchema = z.object({}).strict().describe('No input is required.');

export const errorOutputSchema = z.object({
  error: z.object({
    code: z.string().describe('Stable public error code.'),
    message: z.string().describe('Sanitized English error message.'),
    operation: z.string().describe('Tool operation that failed.'),
    retryable: z.boolean().describe('Whether retrying later may succeed.'),
    details: z.record(z.string(), z.unknown()).optional().describe('Safe relationship or refusal details.'),
    recoveryAction: z.string().optional().describe('Safe next operation for partial-state recovery.'),
    entity: z.object({
      type: z.enum(['account', 'categoryGroup', 'category', 'transaction', 'payee', 'rule', 'schedule', 'budgetMonth']),
      id: opaqueIdSchema.optional(),
      name: z.string().optional()
    }).strict().optional(),
    state: z.enum(['local_change_may_have_succeeded', 'synchronized_but_unverified']).optional(),
    partialState: z.boolean().optional()
  }).strict()
}).strict();

export const accountSchema = z.object({
  id: opaqueIdSchema.describe('Opaque Actual account identifier.'),
  name: z.string().describe('User-authored account name, returned verbatim.'),
  offbudget: z.boolean().describe('Whether the account is excluded from the budget.'),
  closed: z.boolean().describe('Whether the account is closed.'),
  balance: integerAmountSchema.optional().describe('Ledger balance in integer minor units.'),
  balanceError: z.string().optional().describe('Sanitized balance lookup error, when balance retrieval failed.')
}).strict().describe('Normalized Actual account.');

const nullableOptionalId = opaqueIdSchema.nullable().optional();
const nullableOptionalText = z.string().nullable().optional();

export const transactionSchema: z.ZodType<AdapterTransaction> = (z.lazy(() => z.object({
  id: opaqueIdSchema,
  account: opaqueIdSchema,
  date: isoDateSchema,
  amount: integerAmountSchema,
  payee: nullableOptionalId,
  category: nullableOptionalId,
  notes: nullableOptionalText,
  imported_id: nullableOptionalId,
  imported_payee: nullableOptionalText,
  transfer_id: nullableOptionalId,
  isTransfer: z.boolean().optional(),
  cleared: z.boolean().optional(),
  reconciled: z.boolean().optional(),
  starting_balance_flag: z.boolean().optional(),
  is_parent: z.boolean().optional(),
  is_child: z.boolean().optional(),
  parent_id: nullableOptionalId,
  payee_name: nullableOptionalText,
  category_name: nullableOptionalText,
  subtransactions: z.array(transactionSchema).optional()
}).strict()) as z.ZodType<AdapterTransaction>)
  .describe('Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.');

export const healthOutputSchema = z.object({
  connected: z.boolean(),
  server: z.string(),
  budgetLoaded: z.boolean(),
  version: z.string().optional(),
  diagnosticCode: z.string().optional(),
  mcpVersion: z.string().optional(),
  sdkVersion: z.string().optional(),
  readOnlyMode: z.boolean().optional()
}).strict().describe('Sanitized Actual connectivity and local budget status.');

export const syncOutputSchema = z.object({
  success: z.literal(true),
  synchronizedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  durationMs: z.number().nonnegative().optional()
}).strict().describe('Successful synchronization result and completion timestamp.');

const schedulePatternSchema = z.object({
  type: z.enum(['day', 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']),
  value: z.number().int().safe()
}).strict();

function buildScheduleDateSchema(maxPatterns?: number) {
  const patternsSchema = z.array(schedulePatternSchema).min(1);
  const boundedPatternsSchema = maxPatterns === undefined ? patternsSchema : patternsSchema.max(maxPatterns);
  return z.discriminatedUnion('type', [
    z.object({ type: z.literal('oneTime'), date: isoDateSchema }).strict(),
    z.object({
      type: z.literal('recurring'),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
      start: isoDateSchema,
      interval: z.number().int().safe().positive(),
      patterns: boundedPatternsSchema.optional(),
      weekend: z.enum(['none', 'before', 'after']).default('none'),
      end: z.discriminatedUnion('type', [
        z.object({ type: z.literal('never') }).strict(),
        z.object({ type: z.literal('afterOccurrences'), occurrences: z.number().int().safe().positive() }).strict(),
        z.object({ type: z.literal('onDate'), date: isoDateSchema }).strict()
      ]).default({ type: 'never' })
    }).strict().superRefine((value, context) => {
      if (value.frequency === 'monthly' && !value.patterns?.length) context.addIssue({ code: 'custom', path: ['patterns'], message: 'Monthly schedules require patterns.' });
      if (value.frequency !== 'monthly' && value.patterns !== undefined) context.addIssue({ code: 'custom', path: ['patterns'], message: 'Patterns are supported only for monthly schedules.' });
      for (const [index, pattern] of (value.patterns ?? []).entries()) {
        const valid = pattern.type === 'day'
          ? pattern.value >= 1 && pattern.value <= MAX_SCHEDULE_MONTH_DAY
          : pattern.value >= -MAX_SCHEDULE_WEEKDAY_OCCURRENCE &&
            pattern.value <= MAX_SCHEDULE_WEEKDAY_OCCURRENCE && pattern.value !== 0;
        if (!valid) context.addIssue({ code: 'custom', path: ['patterns', index, 'value'], message: 'Unsupported monthly pattern value.' });
      }
      if (value.end.type === 'onDate' && value.end.date < value.start) context.addIssue({ code: 'custom', path: ['end', 'date'], message: 'End date must be on or after start.' });
    })
  ]);
}

export const scheduleDateSchema = buildScheduleDateSchema();
const scheduleDateInputSchema = buildScheduleDateSchema(MAX_SCHEDULE_PATTERNS);

export const scheduleAmountSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('exact'), amount: integerAmountSchema }).strict(),
  z.object({ type: z.literal('approximate'), amount: integerAmountSchema }).strict(),
  z.object({ type: z.literal('between'), minAmount: integerAmountSchema, maxAmount: integerAmountSchema }).strict()
    .refine(value => value.minAmount <= value.maxAmount, { path: ['maxAmount'], message: 'maxAmount must be at least minAmount.' })
]);

export const scheduleSchema = z.object({
  id: opaqueIdSchema, name: z.string().optional(), accountId: opaqueIdSchema.nullable(), payeeId: opaqueIdSchema.nullable(),
  amount: scheduleAmountSchema.nullable(), date: scheduleDateSchema.nullable(), nextDate: isoDateSchema.optional(), completed: z.boolean(),
  postsTransaction: z.boolean(), writable: z.boolean(), unsupportedReasons: z.array(z.string())
}).strict().describe('Stable schedule projection without protected rule internals.');

export const listSchedulesInputSchema = z.object({
  accountId: opaqueIdSchema.optional(), completed: z.boolean().optional(),
  limit: z.number().int().min(1).max(MAX_SCHEDULE_RESULTS).default(DEFAULT_SCHEDULE_RESULTS),
  offset: z.number().int().min(DEFAULT_PAGINATION_OFFSET).max(MAX_SCHEDULE_OFFSET).default(DEFAULT_PAGINATION_OFFSET)
}).strict().describe('Bounded schedule list filters and pagination.');
export const listSchedulesOutputSchema = z.object({
  schedules: z.array(scheduleSchema),
  scope: z.object({ accountId: opaqueIdSchema.optional(), completed: z.boolean().optional() }).strict(),
  page: z.object({ limit: z.number().int(), offset: z.number().int(), returned: z.number().int().nonnegative(), total: z.number().int().nonnegative() }).strict()
}).strict().describe('Filtered and bounded schedule list.');
export const getScheduleInputSchema = z.object({ scheduleId: opaqueIdSchema }).strict().describe('Exact schedule identifier.');
export const getScheduleOutputSchema = z.object({ schedule: scheduleSchema }).strict().describe('Exact projected schedule.');

const scheduleDraftShape = {
  name: entityNameSchema.optional(), accountId: opaqueIdSchema, payeeId: opaqueIdSchema.nullable().optional(),
  amount: scheduleAmountSchema, date: scheduleDateInputSchema, postsTransaction: z.boolean()
};
export const createScheduleInputSchema = z.object(scheduleDraftShape).strict().describe('Supported schedule creation fields.');
export const updateScheduleInputSchema = z.object({
  scheduleId: opaqueIdSchema, name: entityNameSchema.optional(), accountId: opaqueIdSchema.optional(), payeeId: opaqueIdSchema.nullable().optional(),
  amount: scheduleAmountSchema.optional(), date: scheduleDateInputSchema.optional(), postsTransaction: z.boolean().optional()
}).strict().refine(value => Object.keys(value).some(key => key !== 'scheduleId'), 'At least one editable field is required.').describe('Non-empty supported schedule update.');
export const deleteScheduleInputSchema = z.object({ scheduleId: opaqueIdSchema, confirmDestructive: z.literal(true) }).strict().describe('Confirmed schedule deletion.');
export const scheduleMutationOutputSchema = z.object({
  success: z.literal(true), changed: z.boolean(), changedFields: z.array(z.string()).optional(), schedule: scheduleSchema
}).strict().describe('Verified schedule mutation result.');
export const scheduleDeletionOutputSchema = z.object({
  success: z.literal(true), deletedScheduleId: opaqueIdSchema, deletedScheduleName: z.string().nullable(), linkedTransactionIds: z.array(opaqueIdSchema), historicalTransactionsPreserved: z.literal(true)
}).strict().describe('Verified schedule deletion and historical-transaction preservation.');

const uniqueSummaryIds = z.array(opaqueIdSchema).min(1).max(MAX_SUMMARY_SCOPE_IDS)
  .refine(values => new Set(values).size === values.length, 'Identifiers must be unique.');
const summaryScopeShape = {
  accountIds: uniqueSummaryIds.optional(), categoryIds: uniqueSummaryIds.optional(), categoryGroupIds: uniqueSummaryIds.optional(),
  includeOffbudget: z.boolean().default(false), topPayeeLimit: z.number().int().min(1).max(MAX_TOP_PAYEE_RESULTS).default(DEFAULT_TOP_PAYEE_RESULTS)
};
export const monthSummaryInputSchema = z.object({ month: budgetMonthSchema, ...summaryScopeShape }).strict().describe('Month and bounded optional financial scope.');
export const rangeSummaryInputSchema = z.object({ startDate: isoDateSchema, endDate: isoDateSchema, ...summaryScopeShape }).strict()
  .superRefine((value, context) => {
    const start = Date.parse(`${value.startDate}T00:00:00Z`), end = Date.parse(`${value.endDate}T00:00:00Z`);
    if (start > end || Math.floor((end - start) / 86_400_000) + 1 > MAX_DATE_RANGE_DAYS) context.addIssue({ code: 'custom', path: ['endDate'], message: `Range must be ordered and no more than ${MAX_DATE_RANGE_DAYS} inclusive days.` });
  }).describe('Bounded inclusive financial summary range.');

const summaryScopeOutputSchema = z.object({ startDate: isoDateSchema, endDate: isoDateSchema, accountIds: z.array(opaqueIdSchema), includeOffbudget: z.boolean() }).strict();
const breakdownSchema = z.object({ id: z.string(), name: z.string().nullable(), amount: integerAmountSchema, transactionCount: z.number().int().nonnegative() }).strict();
const offbudgetSchema = z.object({ inflowAmount: integerAmountSchema, outflowAmount: integerAmountSchema, netChange: integerAmountSchema, transactionCount: z.number().int().nonnegative() }).strict();
const exclusionsSchema = z.object({ transfers: z.literal(true), startingBalances: z.literal(true), splitParents: z.literal(true) }).strict();
export const ledgerSummarySchema = z.object({
  source: z.literal('fixed-actualql-ledger'), scope: summaryScopeOutputSchema,
  incomeAmount: integerAmountSchema, expenseAmount: integerAmountSchema, netAmount: integerAmountSchema,
  transactionCount: z.number().int().nonnegative(), incomeTransactionCount: z.number().int().nonnegative(), expenseTransactionCount: z.number().int().nonnegative(),
  categorizedCount: z.number().int().nonnegative(), uncategorizedCount: z.number().int().nonnegative(),
  uncategorizedIncomeAmount: integerAmountSchema, uncategorizedExpenseAmount: integerAmountSchema,
  incomeCategoryBreakdown: z.array(breakdownSchema), expenseCategoryBreakdown: z.array(breakdownSchema), expenseGroupBreakdown: z.array(breakdownSchema),
  topIncomePayees: z.array(breakdownSchema), topExpensePayees: z.array(breakdownSchema), topPayeeLimit: z.number().int(),
  offbudgetCashFlow: offbudgetSchema.optional(), exclusions: exclusionsSchema
}).strict();
export const monthSummaryOutputSchema = z.object({
  month: budgetMonthSchema, ledger: ledgerSummarySchema,
  budget: z.discriminatedUnion('available', [
    z.object({ available: z.literal(true), source: z.literal('official-getBudgetMonth'), data: z.lazy(() => budgetMonthOutputSchema) }).strict(),
    z.object({ available: z.literal(false), reason: z.string() }).strict()
  ])
}).strict().describe('Ledger month summary with a separately sourced official budget section when compatible.');
export const spendingSummaryOutputSchema = z.object({
  source: z.literal('fixed-actualql-ledger'), scope: summaryScopeOutputSchema, netExpenseAmount: integerAmountSchema,
  transactionCount: z.number().int().nonnegative(), uncategorizedExpenseAmount: integerAmountSchema,
  categoryBreakdown: z.array(breakdownSchema), groupBreakdown: z.array(breakdownSchema), topPayees: z.array(breakdownSchema), topPayeeLimit: z.number().int(),
  offbudgetCashFlow: offbudgetSchema.optional(), exclusions: exclusionsSchema
}).strict().describe('Signed spending summary with deterministic bounded breakdowns.');
export const incomeSummaryOutputSchema = z.object({
  source: z.literal('fixed-actualql-ledger'), scope: summaryScopeOutputSchema, netIncomeAmount: integerAmountSchema,
  transactionCount: z.number().int().nonnegative(), uncategorizedIncomeAmount: integerAmountSchema,
  categoryBreakdown: z.array(breakdownSchema), topPayees: z.array(breakdownSchema), topPayeeLimit: z.number().int(),
  offbudgetCashFlow: offbudgetSchema.optional(), exclusions: exclusionsSchema
}).strict().describe('Signed income summary with deterministic bounded breakdowns.');

export const runtimeStatusOutputSchema = z.object({
  mcpVersion: z.string(), sdkVersion: z.string(), connected: z.boolean(), budgetLoaded: z.boolean(), server: z.string(), uptimeMs: z.number().nonnegative(),
  modes: z.object({ readOnly: z.boolean(), allowDestructive: z.boolean(), effectiveWriteAllowed: z.boolean() }).strict(),
  cache: z.object({ configured: z.boolean(), locked: z.boolean() }).strict(),
  queue: z.object({ queuedCount: z.number().int().nonnegative(), activeOperation: z.string().optional() }).strict(),
  syncTelemetry: z.object({ lastSyncAttemptAt: z.iso.datetime().optional(), lastSuccessfulSyncAt: z.iso.datetime().optional(), lastSyncDurationMs: z.number().nonnegative().optional(), lastSyncErrorCode: z.string().optional() }).strict(),
  telemetryScope: z.literal('mcp-initiated-syncs-only'), unavailableMetadata: z.tuple([z.literal('initialFullSync'), z.literal('sdkInternalScheduleServiceRuns')]),
  diagnosticCode: z.string().optional()
}).strict().describe('Sanitized process-lifetime runtime status.');

export const accountsOutputSchema = z.object({ accounts: z.array(accountSchema) }).strict()
  .describe('All Actual accounts and available ledger balances.');

export const accountOutputSchema = z.object({ account: accountSchema }).strict()
  .describe('The requested Actual account and available ledger balance.');

export const categorySchema = z.object({
  id: opaqueIdSchema,
  name: z.string(),
  hidden: z.boolean()
}).strict();

export const categoryGroupSchema = z.object({
  groupId: opaqueIdSchema,
  groupName: z.string(),
  categories: z.array(categorySchema)
}).strict();

export const categoriesOutputSchema = z.object({ categoryGroups: z.array(categoryGroupSchema) }).strict()
  .describe('Actual category groups with nested categories.');

export const payeeSchema = z.object({ id: opaqueIdSchema, name: z.string() }).strict();
export const payeesOutputSchema = z.object({ payees: z.array(payeeSchema) }).strict()
  .describe('Every Actual payee and opaque identifier.');

export const transactionsOutputSchema = z.object({ transactions: z.array(transactionSchema) }).strict()
  .describe('Transactions returned for the requested bounded date range.');

export const accountIdInputSchema = z.object({
  accountId: opaqueIdSchema.describe('Opaque Actual account identifier.')
}).strict().describe('Opaque identifier of the requested account.');

export const getTransactionsInputSchema = z
  .object({ accountId: opaqueIdSchema, startDate: isoDateSchema, endDate: isoDateSchema })
  .strict()
  .superRefine(({ startDate, endDate }, context) => {
    const start = Date.parse(`${startDate}T00:00:00Z`);
    const end = Date.parse(`${endDate}T00:00:00Z`);
    if (start > end) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be on or after startDate.' });
    } else if (Math.floor((end - start) / 86_400_000) + 1 > MAX_DATE_RANGE_DAYS) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: `The inclusive date range must not exceed ${MAX_DATE_RANGE_DAYS} days.`
      });
    }
  })
  .describe(`Account and inclusive transaction date range, limited to ${MAX_DATE_RANGE_DAYS} days.`);

export const getTransactionInputSchema = z.object({ transactionId: opaqueIdSchema }).strict()
  .describe('Exact opaque transaction identifier.');

export const transactionOutputSchema = z.object({ transaction: transactionSchema }).strict()
  .describe('The exact requested canonical transaction.');

const uniqueIdListSchema = z.array(opaqueIdSchema).min(1).max(MAX_TRANSACTION_SEARCH_RESULTS)
  .refine(values => new Set(values).size === values.length, 'Identifier lists must not contain duplicates.');

export const searchTransactionsInputSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  accountIds: uniqueIdListSchema.optional(),
  transactionIds: uniqueIdListSchema.optional(),
  payeeIds: uniqueIdListSchema.optional(),
  categoryIds: uniqueIdListSchema.optional(),
  uncategorizedOnly: z.boolean().optional(),
  importSource: z.enum(['any', 'manual', 'imported']).default('any'),
  transferState: z.enum(['any', 'transfer', 'non-transfer']).default('any'),
  cleared: z.boolean().optional(),
  minAmount: integerAmountSchema.optional(),
  maxAmount: integerAmountSchema.optional(),
  text: boundedTextSchema.min(1, 'Search text must not be empty.')
    .refine(value => !value.includes('\0'), 'Search text must not contain a null byte.').optional(),
  splitMode: z.enum(['inline', 'grouped']).default('inline'),
  sort: z.enum([
    'date_desc', 'date_asc', 'amount_desc', 'amount_asc',
    'payee_asc', 'payee_desc', 'category_asc', 'category_desc'
  ]).default('date_desc'),
  limit: z.number().int().min(1).max(MAX_TRANSACTION_SEARCH_RESULTS).default(DEFAULT_TRANSACTION_SEARCH_RESULTS),
  offset: z.number().int().min(DEFAULT_PAGINATION_OFFSET).max(MAX_TRANSACTION_SEARCH_OFFSET).default(DEFAULT_PAGINATION_OFFSET),
  includeTotals: z.boolean().default(false)
}).strict().superRefine((value, context) => {
  const start = Date.parse(`${value.startDate}T00:00:00Z`);
  const end = Date.parse(`${value.endDate}T00:00:00Z`);
  if (start > end) context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be on or after startDate.' });
  else if (Math.floor((end - start) / 86_400_000) + 1 > MAX_DATE_RANGE_DAYS) context.addIssue({
    code: 'custom', path: ['endDate'], message: `The inclusive date range must not exceed ${MAX_DATE_RANGE_DAYS} days.`
  });
  if (value.minAmount !== undefined && value.maxAmount !== undefined && value.minAmount > value.maxAmount) {
    context.addIssue({ code: 'custom', path: ['maxAmount'], message: 'maxAmount must be greater than or equal to minAmount.' });
  }
  if (value.uncategorizedOnly && value.categoryIds?.length) context.addIssue({
    code: 'custom', path: ['categoryIds'], message: 'categoryIds cannot be combined with uncategorizedOnly.'
  });
}).describe('Bounded typed cross-account transaction search.');

const searchTotalsSchema = z.discriminatedUnion('supported', [
  z.object({ supported: z.literal(true), matched: z.number().int().nonnegative(), amount: integerAmountSchema }).strict(),
  z.object({ supported: z.literal(false), reason: z.string() }).strict()
]);

export const searchTransactionsOutputSchema = z.object({
  transactions: z.array(transactionSchema),
  page: z.object({ limit: z.number().int(), offset: z.number().int(), returned: z.number().int().nonnegative() }).strict(),
  splitMode: z.enum(['inline', 'grouped']),
  totals: searchTotalsSchema.optional()
}).strict().describe('Deterministic transaction search page and optional supported totals.');

export const importTransactionItemSchema = z
  .object({
    date: isoDateSchema,
    amount: integerAmountSchema,
    imported_id: opaqueIdSchema,
    payee: opaqueIdSchema.optional(),
    payee_name: boundedTextSchema.optional(),
    imported_payee: boundedTextSchema.optional(),
    notes: boundedTextSchema.optional(),
    cleared: z.boolean().optional(),
    category: opaqueIdSchema.optional()
  })
  .strict()
  .describe('One transaction to reconcile through the official import API.');

export const importTransactionsInputSchema = z.object({
  accountId: opaqueIdSchema,
  transactions: batchSchema(importTransactionItemSchema),
  defaultCleared: z.boolean().optional(),
  reimportDeleted: z.boolean().optional(),
  expectedPreviewFingerprint: z.string().regex(/^v1:[a-f0-9]{64}$/, 'Expected a versioned SHA-256 preview fingerprint.').optional()
}).strict().describe(`Target account and one to ${MAX_IMPORT_BATCH} idempotent import items.`);

export const importTransactionsOutputSchema = z.object({
  added: z.array(opaqueIdSchema),
  updated: z.array(opaqueIdSchema),
  errors: z.array(z.object({ message: z.string() }).strict()),
  requestFingerprint: z.string().regex(/^v1:[a-f0-9]{64}$/).optional(),
  addedCount: z.number().int().nonnegative().optional(),
  updatedCount: z.number().int().nonnegative().optional(),
  errorCount: z.number().int().nonnegative().optional()
}).strict().describe('Official reconciliation outcome with sanitized item errors.');

export const previewImportInputSchema = z.object({
  accountId: opaqueIdSchema,
  transactions: batchSchema(importTransactionItemSchema),
  defaultCleared: z.boolean().optional(),
  reimportDeleted: z.boolean().optional()
}).strict().describe('Read-only official import preview request; dry-run cannot be disabled.');

export const previewImportOutputSchema = z.object({
  requestFingerprint: z.string().regex(/^v1:[a-f0-9]{64}$/),
  wouldAddCount: z.number().int().nonnegative(),
  wouldUpdateCount: z.number().int().nonnegative(),
  ignoredCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  previewOnlyIds: z.array(opaqueIdSchema).describe('Generated preview identifiers that are not persisted transaction IDs.'),
  existingTransactionIds: z.array(opaqueIdSchema),
  errors: z.array(z.object({ message: z.string() }).strict()),
  evidence: z.array(z.object({
    importedId: z.string().nullable(),
    existingTransactionId: opaqueIdSchema.optional(),
    ignored: z.boolean().optional(),
    tombstone: z.boolean().optional()
  }).strict())
}).strict().describe('Sanitized official reconciliation preview evidence and request fingerprint.');

export const bulkTransactionFieldsSchema = z.object({
  category: opaqueIdSchema.nullable().optional(),
  payee: opaqueIdSchema.nullable().optional(),
  notes: boundedTextSchema.nullable().optional(),
  cleared: z.boolean().optional()
}).strict().refine(value => Object.keys(value).length > 0, 'At least one desired-state field is required.');

export const bulkTransactionItemSchema = z.object({
  transactionId: opaqueIdSchema,
  fields: bulkTransactionFieldsSchema
}).strict();

export const bulkUpdateTransactionsInputSchema = z.object({
  items: z.array(bulkTransactionItemSchema).min(1).max(
    MAX_BULK_TRANSACTION_UPDATES,
    `Bulk update must not exceed ${MAX_BULK_TRANSACTION_UPDATES} transactions.`
  ),
  dryRun: z.boolean().default(true),
  confirmWrite: z.boolean().optional()
}).strict().superRefine((value, context) => {
  const ids = value.items.map(item => item.transactionId);
  if (new Set(ids).size !== ids.length) context.addIssue({
    code: 'custom', path: ['items'], message: 'Bulk transaction IDs must be unique.'
  });
}).describe(`One to ${MAX_BULK_TRANSACTION_UPDATES} unique heterogeneous desired-state transaction updates; dry-run defaults to true.`);

const bulkPlanItemSchema = z.object({
  transactionId: opaqueIdSchema,
  status: z.enum(['would_update', 'unchanged', 'blocked']),
  changedFields: z.array(z.enum(['category', 'payee', 'notes', 'cleared'])),
  before: transactionSchema,
  after: transactionSchema,
  reason: z.enum(['SPLIT_TRANSACTION_PROTECTED', 'TRANSFER_PROTECTED']).optional()
}).strict();

export const bulkUpdateTransactionsOutputSchema = z.object({
  dryRun: z.boolean(),
  executed: z.boolean(),
  synchronized: z.boolean(),
  verified: z.boolean(),
  executable: z.boolean(),
  counts: z.object({
    requested: z.number().int().nonnegative(),
    matched: z.number().int().nonnegative(),
    wouldUpdate: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative()
  }).strict(),
  items: z.array(bulkPlanItemSchema).max(MAX_BULK_TRANSACTION_UPDATES),
  updatedIds: z.array(opaqueIdSchema),
  unchangedIds: z.array(opaqueIdSchema),
  affectedIds: z.array(opaqueIdSchema)
}).strict().describe('Auditable bulk plan or verified single-sync execution result.');

export const updateTransactionFieldsSchema = z
  .object({
    category: opaqueIdSchema.nullable().optional(),
    payee: opaqueIdSchema.nullable().optional(),
    notes: boundedTextSchema.nullable().optional(),
    cleared: z.boolean().optional(),
    date: isoDateSchema.optional(),
    amount: integerAmountSchema.optional()
  })
  .strict()
  .refine(value => Object.keys(value).length > 0, 'At least one permitted update field is required.')
  .describe('One or more allowlisted transaction fields.');

export const updateTransactionInputSchema = z.object({
  transactionId: opaqueIdSchema,
  fields: updateTransactionFieldsSchema
}).strict().describe('Target transaction and allowlisted partial update.');

export const transactionMutationOutputSchema = z.object({
  success: z.literal(true),
  transactionId: opaqueIdSchema,
  linkedTransferAffected: z.boolean().optional(),
  counterpartTransactionId: opaqueIdSchema.optional(),
  mirroredFields: z.array(z.enum(['category', 'payee', 'notes', 'cleared', 'date', 'amount'])).optional(),
  affectedTransactionIds: z.array(opaqueIdSchema).optional(),
  deletedTransferPair: z.boolean().optional(),
  verified: z.boolean().optional()
}).strict().describe('Successful synchronized transaction mutation.');

export const transferPayeeSchema = z.object({
  id: opaqueIdSchema,
  name: z.string(),
  accountId: opaqueIdSchema,
  accountName: z.string(),
  accountClosed: z.boolean(),
  accountOffBudget: z.boolean()
}).strict();
export const transferPayeesOutputSchema = z.object({ transferPayees: z.array(transferPayeeSchema) }).strict()
  .describe('Official transfer payees with resolved destination account metadata.');

export const transferIntegrityReasonSchema = z.enum([
  'MISSING_COUNTERPART', 'NON_RECIPROCAL_RELATIONSHIP', 'SAME_ACCOUNT', 'ZERO_AMOUNT',
  'SAME_SIGN', 'MAGNITUDE_MISMATCH', 'MALFORMED_RELATIONSHIP_ID'
]);
export const transferPairSchema = z.object({
  pairKey: z.string().regex(/^v1:[a-f0-9]{64}$/),
  transactionA: transactionSchema.nullable(),
  transactionB: transactionSchema.nullable(),
  integrity: z.enum(['VALID', 'INVALID']),
  reasonCodes: z.array(transferIntegrityReasonSchema),
  fromTransaction: transactionSchema.nullable(),
  toTransaction: transactionSchema.nullable(),
  magnitude: positiveIntegerAmountSchema.nullable()
}).strict().describe('Canonical observed reciprocal transfer pair and deterministic integrity evidence.');

export const getTransferInputSchema = z.object({ transactionId: opaqueIdSchema }).strict().describe('Exact transaction ID on either transfer side.');
export const getTransferOutputSchema = transferPairSchema;

const magnitudeBounds = {
  minMagnitude: positiveIntegerAmountSchema.optional(),
  maxMagnitude: positiveIntegerAmountSchema.optional()
} as const;
const transferSortSchema = z.enum(['date_desc', 'date_asc', 'magnitude_desc', 'magnitude_asc']);
const searchTransferBase = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  accountIds: uniqueIdListSchema.optional(),
  ...magnitudeBounds,
  sort: transferSortSchema.default('date_desc'),
  limit: z.number().int().min(1).max(MAX_TRANSACTION_SEARCH_RESULTS).default(DEFAULT_TRANSACTION_SEARCH_RESULTS),
  offset: z.number().int().min(DEFAULT_PAGINATION_OFFSET).max(MAX_TRANSACTION_SEARCH_OFFSET).default(DEFAULT_PAGINATION_OFFSET)
}).strict();
function validateBoundedRangeAndMagnitude(value: { startDate: string; endDate: string; minMagnitude?: number | undefined; maxMagnitude?: number | undefined }, context: z.core.$RefinementCtx) {
  const days = Math.floor((Date.parse(`${value.endDate}T00:00:00Z`) - Date.parse(`${value.startDate}T00:00:00Z`)) / 86_400_000) + 1;
  if (days < 1) context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be on or after startDate.', input: value.endDate });
  else if (days > MAX_DATE_RANGE_DAYS) context.addIssue({ code: 'custom', path: ['endDate'], message: `The inclusive date range must not exceed ${MAX_DATE_RANGE_DAYS} days.`, input: value.endDate });
  if (value.minMagnitude !== undefined && value.maxMagnitude !== undefined && value.minMagnitude > value.maxMagnitude) {
    context.addIssue({ code: 'custom', path: ['maxMagnitude'], message: 'maxMagnitude must be greater than or equal to minMagnitude.', input: value.maxMagnitude });
  }
}
export const searchTransfersInputSchema = searchTransferBase.extend({
  integrity: z.enum(['any', 'VALID', 'INVALID']).default('any')
}).superRefine(validateBoundedRangeAndMagnitude).describe('Bounded deterministic transfer-pair search.');
export const searchTransfersOutputSchema = z.object({
  transfers: z.array(transferPairSchema),
  counts: z.object({ matched: z.number().int().nonnegative(), valid: z.number().int().nonnegative(), invalid: z.number().int().nonnegative() }).strict(),
  page: z.object({ limit: z.number().int().positive(), offset: z.number().int().nonnegative(), returned: z.number().int().nonnegative() }).strict()
}).strict().describe('Transfer pairs, complete pre-pagination counts, and deterministic page metadata.');

const transferSidePlanSchema = z.object({
  accountId: opaqueIdSchema,
  amount: integerAmountSchema,
  payeeId: opaqueIdSchema,
  categoryId: opaqueIdSchema.nullable(),
  cleared: z.boolean(),
  notes: z.string().optional()
}).strict();
export const createTransferInputSchema = z.object({
  fromAccountId: opaqueIdSchema,
  toAccountId: opaqueIdSchema,
  amount: positiveIntegerAmountSchema,
  date: isoDateSchema,
  notes: boundedTextSchema.optional(),
  categoryId: opaqueIdSchema.optional(),
  fromCleared: z.boolean().default(false),
  toCleared: z.boolean().default(false),
  dryRun: z.boolean().default(true),
  confirmWrite: z.boolean().optional()
}).strict().refine(value => value.fromAccountId !== value.toAccountId, {
  path: ['toAccountId'], message: 'fromAccountId and toAccountId must be different.'
}).describe('Manual transfer preview or explicitly confirmed creation request.');
export const createTransferOutputSchema = z.object({
  dryRun: z.boolean(), executed: z.boolean(), synchronized: z.boolean(), verified: z.boolean(),
  phase: z.enum(['preflight', 'created_unverified', 'pair_discovered', 'side_updates_applied', 'synchronized', 'verified']),
  anchorAccountId: opaqueIdSchema,
  fromSide: transferSidePlanSchema,
  toSide: transferSidePlanSchema,
  pair: transferPairSchema.nullable()
}).strict().describe('Exact transfer plan and verified creation phase evidence.');

const diagnosticBase = searchTransferBase.extend({
  dateWindowDays: z.number().int().min(0).max(MAX_DIAGNOSTIC_WINDOW_DAYS).default(DEFAULT_DIAGNOSTIC_WINDOW_DAYS)
});
const diagnosticPageSchema = z.object({
  limit: z.number().int().positive(), offset: z.number().int().nonnegative(), returned: z.number().int().nonnegative()
}).strict();
const candidateBase = {
  candidateKey: z.string().regex(/^v1:[a-f0-9]{64}$/), transactionA: transactionSchema, transactionB: transactionSchema,
  dateDifferenceDays: z.number().int().nonnegative()
} as const;
export const findPossibleTransfersInputSchema = diagnosticBase.extend({
  classification: z.enum(['any', 'UNIQUE', 'AMBIGUOUS']).default('any')
}).superRefine(validateBoundedRangeAndMagnitude).describe('Bounded read-only possible-transfer diagnostic request.');
export const transferCandidateSchema = z.object({
  ...candidateBase,
  classification: z.enum(['UNIQUE', 'AMBIGUOUS']),
  leftCandidateCount: z.number().int().positive(),
  rightCandidateCount: z.number().int().positive(),
  reasonCodes: z.array(z.enum(['OPPOSITE_AMOUNT', 'SAME_DATE', 'DATE_WITHIN_WINDOW']))
}).strict();
export const findPossibleTransfersOutputSchema = z.object({
  candidates: z.array(transferCandidateSchema),
  counts: z.object({ matched: z.number().int().nonnegative(), unique: z.number().int().nonnegative(), ambiguous: z.number().int().nonnegative() }).strict(),
  page: diagnosticPageSchema
}).strict().describe('Possible unlinked transfer candidates with graph classification and complete counts.');
export const findPossibleDuplicatesInputSchema = diagnosticBase.extend({
  classification: z.enum(['any', 'STRONG', 'LIKELY']).default('any')
}).superRefine(validateBoundedRangeAndMagnitude).describe('Bounded read-only possible-duplicate diagnostic request.');
export const findPossibleDuplicatesOutputSchema = z.object({
  candidates: z.array(z.object({
    ...candidateBase,
    classification: z.enum(['STRONG', 'LIKELY']),
    reasonCodes: z.array(z.enum(['SAME_IMPORTED_ID', 'SAME_DATE', 'SAME_PAYEE', 'SAME_IMPORTED_PAYEE', 'DATE_WITHIN_WINDOW']))
  }).strict()),
  counts: z.object({ matched: z.number().int().nonnegative(), strong: z.number().int().nonnegative(), likely: z.number().int().nonnegative() }).strict(),
  page: diagnosticPageSchema
}).strict().describe('Possible duplicate candidates with deterministic evidence and complete counts.');

export const accountReconciliationInputSchema = z.object({
  accountId: opaqueIdSchema,
  cutoff: isoDateSchema.optional(),
  statementBalance: integerAmountSchema.optional()
}).strict().describe('Exact account, optional cutoff, and optional signed statement balance.');
const reconciliationValuesSchema = z.object({
  ledger: integerAmountSchema, cleared: integerAmountSchema, reconciled: integerAmountSchema, uncleared: integerAmountSchema
}).strict();
const reconciliationCountsSchema = z.object({
  ledger: z.number().int().nonnegative(), cleared: z.number().int().nonnegative(),
  reconciled: z.number().int().nonnegative(), uncleared: z.number().int().nonnegative()
}).strict();
export const accountReconciliationOutputSchema = z.object({
  account: z.object({ id: opaqueIdSchema, name: z.string() }).strict(),
  cutoff: isoDateSchema,
  balances: reconciliationValuesSchema,
  counts: reconciliationCountsSchema,
  status: z.enum(['NO_STATEMENT', 'MATCHES_BOTH', 'MATCHES_CLEARED', 'MATCHES_LEDGER', 'DIFFERENCE']),
  statement: z.object({
    balance: integerAmountSchema, differenceFromLedger: integerAmountSchema, differenceFromCleared: integerAmountSchema,
    status: z.enum(['MATCHES_BOTH', 'MATCHES_CLEARED', 'MATCHES_LEDGER', 'DIFFERENCE'])
  }).strict().nullable(),
  bankReported: z.object({ balanceCurrent: integerAmountSchema, differenceFromLedger: integerAmountSchema }).strict().optional()
}).strict().describe('Split-safe read-only ledger, statement, and bank metadata reconciliation snapshot.');

const changedSchema = z.boolean().describe('Whether this call changed persisted Actual state.');

const budgetCategoryCapabilitiesSchema = z.object({
  budgetAmount: z.boolean().describe('Whether the returned month shape exposes a numeric budgeted field for this category.'),
  carryover: z.boolean().describe('Whether the returned expense-category shape exposes a boolean carryover field.')
}).strict();

export const budgetCategorySchema = z.object({
  id: opaqueIdSchema,
  name: z.string(),
  groupId: opaqueIdSchema,
  isIncome: z.boolean(),
  hidden: z.boolean(),
  budgeted: integerAmountSchema.optional(),
  spent: integerAmountSchema.optional(),
  received: integerAmountSchema.optional(),
  balance: integerAmountSchema.optional(),
  carryover: z.boolean().optional(),
  capabilities: budgetCategoryCapabilitiesSchema
}).strict().describe('Runtime-validated budget category preserving only installed SDK fields and signed values.');

export const budgetGroupSchema = z.object({
  id: opaqueIdSchema,
  name: z.string(),
  isIncome: z.boolean(),
  hidden: z.boolean(),
  budgeted: integerAmountSchema.optional(),
  spent: integerAmountSchema.optional(),
  received: integerAmountSchema.optional(),
  balance: integerAmountSchema.optional(),
  categories: z.array(budgetCategorySchema)
}).strict().describe('Runtime-validated budget category group.');

const budgetAggregateShape = {
  incomeAvailable: integerAmountSchema,
  lastMonthOverspent: integerAmountSchema,
  forNextMonth: integerAmountSchema,
  totalBudgeted: integerAmountSchema,
  toBudget: integerAmountSchema,
  fromLastMonth: integerAmountSchema,
  totalIncome: integerAmountSchema,
  totalSpent: integerAmountSchema,
  totalBalance: integerAmountSchema
} as const;

export const budgetMonthOutputSchema = z.object({
  month: budgetMonthSchema,
  ...budgetAggregateShape,
  capabilities: z.object({
    holdForNextMonth: z.boolean(),
    incomeBudgeting: z.boolean()
  }).strict(),
  categoryGroups: z.array(budgetGroupSchema)
}).strict().describe('Official monthly budget aggregates and nested validated category projections.');

export const listBudgetMonthsOutputSchema = z.object({
  months: z.array(budgetMonthSchema),
  count: z.number().int().nonnegative()
}).strict().describe('Chronological months available through the official budget API and their exact count.');

export const budgetMonthInputSchema = z.object({ month: budgetMonthSchema }).strict()
  .describe('One available Actual budget month in strict YYYY-MM form.');

export const budgetSummaryInputSchema = z.object({
  month: budgetMonthSchema,
  groupId: opaqueIdSchema.optional(),
  categoryId: opaqueIdSchema.optional(),
  limit: budgetResultLimitSchema.optional().default(DEFAULT_BUDGET_CATEGORY_RESULTS)
}).strict().describe('Budget month with optional group/category detail filters and a bounded category limit.');

export const budgetSummaryOutputSchema = z.object({
  month: budgetMonthSchema,
  ...budgetAggregateShape,
  categoryGroups: z.array(budgetGroupSchema),
  categoryCount: z.number().int().nonnegative(),
  omittedCategoryCount: z.number().int().nonnegative()
}).strict().describe('Official monthly aggregates plus bounded optionally filtered category detail.');

export const setBudgetAmountInputSchema = z.object({
  month: budgetMonthSchema,
  categoryId: opaqueIdSchema,
  amount: integerAmountSchema
}).strict().describe('Desired signed category budget amount in integer minor units; zero clears planning.');

export const setBudgetCarryoverInputSchema = z.object({
  month: budgetMonthSchema,
  categoryId: opaqueIdSchema,
  carryover: z.boolean()
}).strict().describe('Desired expense-category carryover state, effective from the selected month forward.');

export const holdBudgetInputSchema = z.object({
  month: budgetMonthSchema,
  amount: positiveIntegerAmountSchema
}).strict().describe('Positive incremental amount to hold for the next month in an envelope budget.');

const budgetMutationBaseShape = {
  success: z.literal(true),
  changed: changedSchema,
  month: budgetMonthSchema,
  categoryId: opaqueIdSchema
} as const;

export const budgetAmountMutationOutputSchema = z.object({
  ...budgetMutationBaseShape,
  previousAmount: integerAmountSchema,
  currentAmount: integerAmountSchema,
  category: budgetCategorySchema
}).strict().describe('Verified desired-state category budget amount result.');

export const budgetCarryoverMutationOutputSchema = z.object({
  ...budgetMutationBaseShape,
  previousCarryover: z.boolean(),
  currentCarryover: z.boolean(),
  effectiveFromMonth: budgetMonthSchema,
  verifiedThroughMonth: budgetMonthSchema,
  category: budgetCategorySchema
}).strict().describe('Verified prospective expense carryover result.');

export const budgetHoldOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  month: budgetMonthSchema,
  requestedAmount: positiveIntegerAmountSchema,
  officialApplied: z.boolean(),
  previousForNextMonth: integerAmountSchema,
  currentForNextMonth: integerAmountSchema
}).strict().describe('Observed envelope hold result without claiming that the aggregate is exclusively manual hold.');

export const budgetResetHoldOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  month: budgetMonthSchema,
  previousForNextMonth: integerAmountSchema,
  currentForNextMonth: integerAmountSchema
}).strict().describe('Observed aggregate before and after resetting only the manual envelope hold.');

export const copyBudgetInputSchema = z.object({
  sourceMonth: budgetMonthSchema,
  targetMonth: budgetMonthSchema,
  dryRun: z.boolean().optional().default(true),
  mode: z.enum(['fill-empty', 'overwrite']).optional().default('fill-empty'),
  includeCarryover: z.boolean().optional().default(false),
  includeHidden: z.boolean().optional().default(false),
  confirmOverwrite: z.boolean().optional().default(false),
  differenceLimit: z.number().int().min(1).max(MAX_BUDGET_COPY_DIFFERENCE_RESULTS)
    .optional().default(DEFAULT_BUDGET_COPY_DIFFERENCE_RESULTS),
  maxChanges: z.number().int().min(1).max(MAX_BUDGET_COPY_CHANGES).optional().default(MAX_BUDGET_COPY_CHANGES)
}).strict().refine(value => value.sourceMonth !== value.targetMonth, {
  path: ['targetMonth'], message: 'sourceMonth and targetMonth must be different.'
}).describe('Bounded budget copy request; defaults to a fill-empty dry run without carryover or hidden categories.');

export const budgetCopyDifferenceSchema = z.object({
  categoryId: opaqueIdSchema,
  categoryName: z.string(),
  groupId: opaqueIdSchema,
  hidden: z.boolean(),
  action: z.enum(['set', 'overwrite', 'skip', 'skip-hidden', 'skip-incompatible', 'unchanged']),
  sourceBudgeted: integerAmountSchema.optional(),
  targetBudgeted: integerAmountSchema.optional(),
  sourceCarryover: z.boolean().optional(),
  targetCarryover: z.boolean().optional(),
  amountChange: z.boolean(),
  carryoverChange: z.boolean()
}).strict();

const budgetCopyCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  changes: z.number().int().nonnegative(),
  set: z.number().int().nonnegative(),
  overwrite: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  hiddenSkip: z.number().int().nonnegative(),
  incompatibleSkip: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative()
}).strict();

export const budgetCopyOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  dryRun: z.boolean(),
  executed: z.boolean(),
  synchronized: z.boolean(),
  verified: z.boolean(),
  sourceMonth: budgetMonthSchema,
  targetMonth: budgetMonthSchema,
  mode: z.enum(['fill-empty', 'overwrite']),
  includeCarryover: z.boolean(),
  includeHidden: z.boolean(),
  prospectiveCarryover: z.boolean(),
  counts: budgetCopyCountsSchema,
  differences: z.array(budgetCopyDifferenceSchema),
  omittedDifferenceCount: z.number().int().nonnegative(),
  attemptedCategoryIds: z.array(opaqueIdSchema),
  completedCategoryIds: z.array(opaqueIdSchema)
}).strict().describe('Bounded copy preview or verified sequential execution metadata.');

export const deleteTransactionInputSchema = z.object({
  transactionId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().describe('Target transaction and literal destructive confirmation.');

export const createAccountInputSchema = z.object({
  name: entityNameSchema,
  offbudget: z.boolean().optional().default(false),
  initialBalance: integerAmountSchema.optional()
}).strict().describe('New account name, budget inclusion, and optional signed opening balance in integer minor units.');

export const updateAccountInputSchema = z.object({
  accountId: opaqueIdSchema,
  name: entityNameSchema.optional(),
  offbudget: z.boolean().optional()
}).strict().refine(value => value.name !== undefined || value.offbudget !== undefined, {
  message: 'At least one permitted update field is required.'
}).describe('Target account and one or more allowlisted name/offbudget updates.');

export const closeAccountInputSchema = z.object({
  accountId: opaqueIdSchema,
  transferAccountId: opaqueIdSchema.optional(),
  transferCategoryId: opaqueIdSchema.optional()
}).strict().describe('Account to close and optional official balance-transfer targets.');

export const reopenAccountInputSchema = accountIdInputSchema.describe('Closed account to reopen.');

export const deleteAccountInputSchema = z.object({
  accountId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().describe('DESTRUCTIVE OPERATION input for deleting one proven-empty account.');

export const accountMutationOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  account: accountSchema
}).strict().describe('Persisted account state after a structural operation.');

export const accountDeletionOutputSchema = z.object({
  success: z.literal(true),
  deletedAccountId: opaqueIdSchema,
  deletedAccountName: z.string(),
  relatedTransactionCount: z.literal(0)
}).strict().describe('Immutable summary of a confirmed empty-account deletion.');

export const createCategoryGroupInputSchema = z.object({
  name: entityNameSchema,
  isIncome: z.boolean().optional().default(false)
}).strict().describe('New visible category group with an explicit or default expense/income type.');

export const updateCategoryGroupInputSchema = z.object({
  groupId: opaqueIdSchema,
  name: entityNameSchema
}).strict().describe('Category group to rename; type and visibility are not caller-controlled.');

export const deleteCategoryGroupInputSchema = z.object({
  groupId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().describe('DESTRUCTIVE OPERATION input for deleting one proven-empty category group.');

export const administeredCategoryGroupSchema = z.object({
  id: opaqueIdSchema,
  name: z.string(),
  isIncome: z.boolean(),
  hidden: z.boolean()
}).strict().describe('Normalized category-group administration entity.');

export const categoryGroupMutationOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  categoryGroup: administeredCategoryGroupSchema
}).strict().describe('Persisted category-group state after a structural operation.');

export const categoryGroupDeletionOutputSchema = z.object({
  success: z.literal(true),
  deletedCategoryGroupId: opaqueIdSchema,
  deletedCategoryGroupName: z.string(),
  relatedCategoryCount: z.literal(0)
}).strict().describe('Immutable summary of a confirmed empty category-group deletion.');

export const createCategoryInputSchema = z.object({
  name: entityNameSchema,
  groupId: opaqueIdSchema
}).strict().describe('New visible category whose type is derived from its persisted group.');

export const updateCategoryInputSchema = z.object({
  categoryId: opaqueIdSchema,
  name: entityNameSchema
}).strict().describe('Category to rename; group, type, and visibility are not caller-controlled.');

export const moveCategoryInputSchema = z.object({
  categoryId: opaqueIdSchema,
  targetGroupId: opaqueIdSchema
}).strict().describe('Category and same-type target group for a semantic move.');

export const categoryIdInputSchema = z.object({
  categoryId: opaqueIdSchema
}).strict().describe('Opaque identifier of the requested category.');

export const deleteCategoryInputSchema = z.object({
  categoryId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().describe('DESTRUCTIVE OPERATION input for deleting one proven-unused category.');

export const administeredCategorySchema = z.object({
  id: opaqueIdSchema,
  name: z.string(),
  groupId: opaqueIdSchema,
  isIncome: z.boolean(),
  hidden: z.boolean()
}).strict().describe('Normalized category administration entity.');

export const categoryMutationOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  category: administeredCategorySchema
}).strict().describe('Persisted category state after a structural operation.');

export const categoryDeletionOutputSchema = z.object({
  success: z.literal(true),
  deletedCategoryId: opaqueIdSchema,
  deletedCategoryName: z.string(),
  relatedTransactionCount: z.literal(0),
  relatedBudgetMonthCount: z.literal(0),
  relatedCarryoverMonthCount: z.literal(0)
}).strict().describe('Immutable summary of a confirmed unused-category deletion.');

export const administeredPayeeSchema = z.object({
  id: opaqueIdSchema,
  name: z.string(),
  transferAccountId: opaqueIdSchema.nullable().optional()
}).strict().describe('One Actual payee with transfer context preserved when supplied by the official API.');

export const payeeIdInputSchema = z.object({
  payeeId: opaqueIdSchema
}).strict().describe('Opaque identifier of the requested payee.');

export const payeeOutputSchema = z.object({ payee: administeredPayeeSchema }).strict()
  .describe('The requested Actual payee.');

export const createPayeeInputSchema = z.object({ name: entityNameSchema }).strict()
  .describe('Name for an ordinary Actual payee; no transfer or category metadata is accepted.');

export const updatePayeeInputSchema = z.object({ payeeId: opaqueIdSchema, name: entityNameSchema }).strict()
  .describe('Ordinary payee to rename and its desired trimmed name.');

export const deletePayeeInputSchema = z.object({
  payeeId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().describe('DESTRUCTIVE OPERATION input for deleting one proven-unused ordinary payee.');

export const payeeMutationOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  payee: administeredPayeeSchema
}).strict().describe('Persisted payee state after a create or rename operation.');

export const payeeDeletionOutputSchema = z.object({
  success: z.literal(true),
  deletedPayeeId: opaqueIdSchema,
  deletedPayeeName: z.string(),
  relatedTransactionCount: z.literal(0),
  relatedRuleCount: z.literal(0)
}).strict().describe('Immutable summary of a confirmed unused-payee deletion.');

export const payeeMergeImpactSchema = z.object({
  payeeId: opaqueIdSchema,
  payeeName: z.string(),
  relatedTransactionCount: z.number().int().nonnegative(),
  relatedRuleCount: z.number().int().nonnegative()
}).strict();

export const mergePayeesInputSchema = z.object({
  sourcePayeeIds: z.array(opaqueIdSchema).min(1, 'At least one source payee is required.')
    .max(MAX_PAYEE_MERGE_SOURCES, `At most ${MAX_PAYEE_MERGE_SOURCES} source payees may be merged at once.`)
    .refine(ids => new Set(ids).size === ids.length, 'Source payee identifiers must be unique.'),
  targetPayeeId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().refine(value => !value.sourcePayeeIds.includes(value.targetPayeeId), {
  path: ['targetPayeeId'],
  message: 'The target payee must be distinct from every source payee.'
}).describe('DESTRUCTIVE OPERATION input for merging ordinary source payees into one distinct ordinary target.');

export const payeeMergeOutputSchema = z.object({
  success: z.literal(true),
  targetPayee: administeredPayeeSchema,
  mergedSourcePayeeIds: z.array(opaqueIdSchema).min(1),
  impacts: z.array(payeeMergeImpactSchema).min(1)
}).strict().describe('Verified result of one official payee merge.');

const ruleStageSchema = z.enum(['pre', 'default', 'post']);
const ruleConditionsOpSchema = z.enum(['and', 'or']);
const idScalarOps = z.enum(['is', 'isNot', 'contains', 'doesNotContain', 'matches']);
const idListOps = z.enum(['oneOf', 'notOneOf']);
const textScalarOps = z.enum(['is', 'isNot', 'contains', 'doesNotContain', 'matches']);

function idCondition(field: 'account' | 'category' | 'category_group' | 'payee') {
  const scalar = z.object({ field: z.literal(field), op: idScalarOps, value: opaqueIdSchema }).strict();
  const list = z.object({
    field: z.literal(field),
    op: idListOps,
    value: z.array(opaqueIdSchema).min(1).max(MAX_RULE_LIST_VALUES)
  }).strict();
  const accountBudget = z.object({
    field: z.literal('account'),
    op: z.enum(['onBudget', 'offBudget']),
    value: opaqueIdSchema
  }).strict();
  return field === 'account' ? z.union([scalar, list, accountBudget]) : z.union([scalar, list]);
}

const importedPayeeConditionSchema = z.union([
  z.object({ field: z.literal('imported_payee'), op: textScalarOps, value: boundedTextSchema.min(1) }).strict(),
  z.object({
    field: z.literal('imported_payee'),
    op: idListOps,
    value: z.array(boundedTextSchema.min(1)).min(1).max(MAX_RULE_LIST_VALUES)
  }).strict()
]);
const notesConditionSchema = z.object({
  field: z.literal('notes'),
  op: z.enum(['is', 'isNot', 'contains', 'doesNotContain', 'matches', 'hasTags', 'hasAnyTag']),
  value: boundedTextSchema.min(1)
}).strict();
const amountConditionOptionsSchema = z.object({ inflow: z.boolean().optional(), outflow: z.boolean().optional() }).strict()
  .refine(value => !(value.inflow && value.outflow), 'Amount options cannot select both inflow and outflow.');
const amountConditionSchema = z.union([
  z.object({
    field: z.literal('amount'),
    op: z.enum(['is', 'isapprox', 'gt', 'gte', 'lt', 'lte']),
    value: integerAmountSchema,
    options: amountConditionOptionsSchema.optional()
  }).strict(),
  z.object({
    field: z.literal('amount'),
    op: z.literal('isbetween'),
    value: z.object({ num1: integerAmountSchema, num2: integerAmountSchema }).strict(),
    options: amountConditionOptionsSchema.optional()
  }).strict()
]);
const dateConditionSchema = z.object({
  field: z.literal('date'),
  op: z.enum(['is', 'isapprox', 'gt', 'gte', 'lt', 'lte']),
  value: isoDateSchema,
  options: z.object({ month: z.boolean().optional(), year: z.boolean().optional() }).strict().optional()
}).strict();
const savedConditionSchema = z.object({ field: z.literal('saved'), op: z.literal('is'), value: boundedTextSchema }).strict();
const booleanConditionSchema = z.union([
  z.object({ field: z.literal('cleared'), op: z.literal('is'), value: z.boolean() }).strict(),
  z.object({ field: z.literal('reconciled'), op: z.literal('is'), value: z.boolean() }).strict(),
  z.object({ field: z.literal('transfer'), op: z.literal('is'), value: z.boolean() }).strict()
]);

export const writableRuleConditionSchema = z.union([
  idCondition('account'),
  idCondition('category'),
  idCondition('category_group'),
  idCondition('payee'),
  importedPayeeConditionSchema,
  notesConditionSchema,
  amountConditionSchema,
  dateConditionSchema,
  savedConditionSchema,
  booleanConditionSchema
]).describe('One supported field/operator/value rule condition.');

const setIdActionSchema = z.union([
  z.object({ op: z.literal('set'), field: z.literal('category'), value: opaqueIdSchema }).strict(),
  z.object({ op: z.literal('set'), field: z.literal('payee'), value: opaqueIdSchema }).strict(),
  z.object({ op: z.literal('set'), field: z.literal('account'), value: opaqueIdSchema }).strict()
]);

export const writableRuleActionSchema = z.union([
  setIdActionSchema,
  z.object({ op: z.literal('set'), field: z.literal('notes'), value: boundedTextSchema }).strict(),
  z.object({ op: z.literal('set'), field: z.literal('cleared'), value: z.boolean() }).strict(),
  z.object({ op: z.literal('set'), field: z.literal('date'), value: isoDateSchema }).strict(),
  z.object({ op: z.literal('set'), field: z.literal('amount'), value: integerAmountSchema }).strict(),
  z.object({ op: z.literal('prepend-notes'), value: boundedTextSchema }).strict(),
  z.object({ op: z.literal('append-notes'), value: boundedTextSchema }).strict()
]).describe('One supported non-destructive rule action.');

const ruleConditionOptionsReadSchema = z.object({
  inflow: z.boolean().optional(), outflow: z.boolean().optional(), month: z.boolean().optional(), year: z.boolean().optional()
}).strict();
export const ruleConditionReadSchema = z.object({
  field: z.enum(['account', 'category', 'category_group', 'amount', 'date', 'notes', 'payee', 'imported_payee', 'saved', 'cleared', 'reconciled', 'transfer']),
  op: z.enum(['is', 'isNot', 'oneOf', 'notOneOf', 'contains', 'doesNotContain', 'matches', 'onBudget', 'offBudget', 'isapprox', 'isbetween', 'gt', 'gte', 'lt', 'lte', 'hasTags', 'hasAnyTag']),
  value: z.unknown(),
  options: ruleConditionOptionsReadSchema.nullable().optional(),
  conditionsOp: ruleConditionsOpSchema.optional(),
  type: z.enum(['id', 'boolean', 'date', 'number', 'string']).optional(),
  customName: z.string().optional(),
  queryFilter: z.record(z.string(), z.object({ $oneof: z.array(z.string()) }).strict()).optional()
}).strict();

const setRuleActionReadSchema = z.object({
  op: z.literal('set'), field: z.string(), value: z.unknown(),
  options: z.object({ template: z.string().optional(), formula: z.string().optional(), splitIndex: z.number().int().optional() }).strict().nullable().optional(),
  type: z.string().optional()
}).strict();
export const ruleActionReadSchema = z.union([
  setRuleActionReadSchema,
  z.object({
    op: z.literal('set-split-amount'), field: z.null().optional(), value: integerAmountSchema.nullable(),
    options: z.object({ splitIndex: z.number().int().optional(), method: z.enum(['fixed-amount', 'fixed-percent', 'formula', 'remainder']), formula: z.string().optional() }).strict().nullable().optional(),
    type: z.string().optional()
  }).strict(),
  z.object({ op: z.literal('link-schedule'), field: z.null().optional(), value: opaqueIdSchema, type: z.string().optional() }).strict(),
  z.object({ op: z.literal('prepend-notes'), field: z.literal('notes').optional(), value: z.string(), type: z.string().optional() }).strict(),
  z.object({ op: z.literal('append-notes'), field: z.literal('notes').optional(), value: z.string(), type: z.string().optional() }).strict(),
  z.object({ op: z.literal('delete-transaction'), field: z.null().optional(), value: z.string(), type: z.string().optional() }).strict()
]);

export const ruleSchema = z.object({
  id: opaqueIdSchema,
  stage: ruleStageSchema,
  conditionsOp: ruleConditionsOpSchema,
  conditions: z.array(ruleConditionReadSchema),
  actions: z.array(ruleActionReadSchema),
  writable: z.boolean(),
  writeRestriction: z.string().optional()
}).strict().describe('Complete normalized rule with MCP writability classification.');

export const rulesOutputSchema = z.object({ rules: z.array(ruleSchema) }).strict()
  .describe('All Actual rules in official execution order.');
export const ruleIdInputSchema = z.object({ ruleId: opaqueIdSchema }).strict()
  .describe('Opaque identifier of the requested rule.');
export const ruleOutputSchema = z.object({ rule: ruleSchema }).strict().describe('The requested Actual rule.');

export const createRuleInputSchema = z.object({
  stage: ruleStageSchema,
  conditionsOp: ruleConditionsOpSchema,
  conditions: z.array(writableRuleConditionSchema).min(1, 'At least one condition is required.').max(MAX_RULE_CONDITIONS),
  actions: z.array(writableRuleActionSchema).min(1, 'At least one action is required.').max(MAX_RULE_ACTIONS)
}).strict().describe('Complete supported rule authoring request.');

export const updateRuleInputSchema = z.object({
  ruleId: opaqueIdSchema,
  stage: ruleStageSchema.optional(),
  conditionsOp: ruleConditionsOpSchema.optional(),
  conditions: z.array(writableRuleConditionSchema).min(1, 'Conditions must not be empty.').max(MAX_RULE_CONDITIONS).optional(),
  actions: z.array(writableRuleActionSchema).min(1, 'Actions must not be empty.').max(MAX_RULE_ACTIONS).optional()
}).strict().refine(value => value.stage !== undefined || value.conditionsOp !== undefined || value.conditions !== undefined || value.actions !== undefined, {
  message: 'At least one permitted rule update field is required.'
}).describe('Rule identifier and one or more allowlisted desired-state changes.');

export const deleteRuleInputSchema = z.object({
  ruleId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().describe('DESTRUCTIVE OPERATION input for deleting one identified rule.');

export const ruleMutationOutputSchema = z.object({
  success: z.literal(true),
  changed: changedSchema,
  rule: ruleSchema
}).strict().describe('Persisted normalized rule after creation or desired-state update.');

export const ruleDeletionOutputSchema = z.object({
  success: z.literal(true),
  deletedRuleId: opaqueIdSchema
}).strict().describe('Immutable result of one confirmed protected rule deletion.');
