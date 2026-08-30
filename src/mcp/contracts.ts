import { z } from 'zod/v4';
import {
  batchSchema,
  boundedTextSchema,
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
    retryable: z.boolean().describe('Whether retrying later may succeed.')
  })
});

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
