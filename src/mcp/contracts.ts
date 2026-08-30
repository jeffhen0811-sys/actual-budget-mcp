import { z } from 'zod/v4';
import {
  batchSchema,
  boundedTextSchema,
  entityNameSchema,
  integerAmountSchema,
  isoDateSchema,
  MAX_DATE_RANGE_DAYS,
  opaqueIdSchema
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
      type: z.enum(['account', 'categoryGroup', 'category', 'transaction']),
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

export const deleteTransactionInputSchema = z.object({
  transactionId: opaqueIdSchema,
  confirmDestructive: z.literal(true, 'confirmDestructive must be true.')
}).strict().describe('Target transaction and literal destructive confirmation.');

const changedSchema = z.boolean().describe('Whether this call changed persisted Actual state.');

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
