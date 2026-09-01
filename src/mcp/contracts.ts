import { z } from 'zod/v4';
import {
  batchSchema,
  budgetMonthSchema,
  budgetResultLimitSchema,
  boundedTextSchema,
  DEFAULT_BUDGET_CATEGORY_RESULTS,
  entityNameSchema,
  integerAmountSchema,
  isoDateSchema,
  MAX_DATE_RANGE_DAYS,
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
      type: z.enum(['account', 'categoryGroup', 'category', 'transaction', 'payee', 'rule', 'budgetMonth']),
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

export const transactionSchema = z.object({
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
  cleared: z.boolean().optional(),
  reconciled: z.boolean().optional(),
  starting_balance_flag: z.boolean().optional()
}).strict().describe('Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.');

export const healthOutputSchema = z.object({
  connected: z.boolean(),
  server: z.string(),
  budgetLoaded: z.boolean(),
  version: z.string().optional(),
  diagnosticCode: z.string().optional()
}).strict().describe('Sanitized Actual connectivity and local budget status.');

export const syncOutputSchema = z.object({
  success: z.literal(true),
  synchronizedAt: z.iso.datetime()
}).strict().describe('Successful synchronization result and completion timestamp.');

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

export const importTransactionItemSchema = z
  .object({
    date: isoDateSchema,
    amount: integerAmountSchema,
    imported_id: opaqueIdSchema,
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
  transactions: batchSchema(importTransactionItemSchema)
}).strict().describe('Target account and one to 500 idempotent import items.');

export const importTransactionsOutputSchema = z.object({
  added: z.array(opaqueIdSchema),
  updated: z.array(opaqueIdSchema),
  errors: z.array(z.object({ message: z.string() }).strict())
}).strict().describe('Official reconciliation outcome with sanitized item errors.');

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
  transactionId: opaqueIdSchema
}).strict().describe('Successful synchronized transaction mutation.');

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
  differenceLimit: budgetResultLimitSchema.optional().default(DEFAULT_BUDGET_CATEGORY_RESULTS),
  maxChanges: budgetResultLimitSchema.optional().default(500)
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
  const list = z.object({ field: z.literal(field), op: idListOps, value: z.array(opaqueIdSchema).min(1) }).strict();
  const accountBudget = z.object({
    field: z.literal('account'),
    op: z.enum(['onBudget', 'offBudget']),
    value: opaqueIdSchema
  }).strict();
  return field === 'account' ? z.union([scalar, list, accountBudget]) : z.union([scalar, list]);
}

const importedPayeeConditionSchema = z.union([
  z.object({ field: z.literal('imported_payee'), op: textScalarOps, value: boundedTextSchema.min(1) }).strict(),
  z.object({ field: z.literal('imported_payee'), op: idListOps, value: z.array(boundedTextSchema.min(1)).min(1) }).strict()
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
  conditions: z.array(writableRuleConditionSchema).min(1, 'At least one condition is required.'),
  actions: z.array(writableRuleActionSchema).min(1, 'At least one action is required.')
}).strict().describe('Complete supported rule authoring request.');

export const updateRuleInputSchema = z.object({
  ruleId: opaqueIdSchema,
  stage: ruleStageSchema.optional(),
  conditionsOp: ruleConditionsOpSchema.optional(),
  conditions: z.array(writableRuleConditionSchema).min(1, 'Conditions must not be empty.').optional(),
  actions: z.array(writableRuleActionSchema).min(1, 'Actions must not be empty.').optional()
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
