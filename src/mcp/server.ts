import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';
import type { ActualClient } from '../actual/client.js';
import type { AdapterTransaction, ImportTransaction } from '../actual/adapter.js';
import type { Logger } from '../logger.js';
import { batchSchema, boundedTextSchema, integerAmountSchema, isoDateSchema, opaqueIdSchema } from '../schemas.js';
import { successResult, toolError } from './response.js';

const emptyInput = z.object({}).strict().describe('No input is required.');
const errorOutput = z.object({
  error: z.object({
    code: z.string().describe('Stable public error code.'),
    message: z.string().describe('Sanitized English error message.'),
    operation: z.string().describe('Tool operation that failed.'),
    retryable: z.boolean().describe('Whether retrying later may succeed.')
  })
});

const accountSchema = z.object({
  id: opaqueIdSchema.describe('Opaque Actual account identifier.'),
  name: z.string().describe('User-authored account name, returned verbatim.'),
  offbudget: z.boolean().describe('Whether the account is excluded from the budget.'),
  closed: z.boolean().describe('Whether the account is closed.'),
  balance: integerAmountSchema.optional().describe('Ledger balance in integer minor units.'),
  balanceError: z.string().optional().describe('Sanitized balance lookup error, when balance retrieval failed.')
}).describe('Normalized Actual account.');

const transactionSchema = z.object({
  id: opaqueIdSchema,
  account: opaqueIdSchema,
  date: isoDateSchema,
  amount: integerAmountSchema,
  payee: opaqueIdSchema.nullable().optional(),
  category: opaqueIdSchema.optional(),
  notes: z.string().optional(),
  cleared: z.boolean().optional(),
  imported_id: opaqueIdSchema.optional()
}).describe('Normalized Actual transaction with integer minor-unit amount.');

const getTransactionsInput = z
  .object({ accountId: opaqueIdSchema, startDate: isoDateSchema, endDate: isoDateSchema })
  .strict()
  .superRefine(({ startDate, endDate }, context) => {
    const start = Date.parse(`${startDate}T00:00:00Z`);
    const end = Date.parse(`${endDate}T00:00:00Z`);
    if (start > end) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be on or after startDate.' });
    } else if (Math.floor((end - start) / 86_400_000) + 1 > 366) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'The inclusive date range must not exceed 366 days.' });
    }
  })
  .describe('Account and inclusive transaction date range, limited to 366 days.');

const importItemSchema = z
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

const updateFields = z
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

export interface ToolRuntime {
  health: ActualClient['health'];
  sync: ActualClient['sync'];
  listAccounts: ActualClient['listAccounts'];
  getAccount: ActualClient['getAccount'];
  listCategories: ActualClient['listCategories'];
  listPayees: ActualClient['listPayees'];
  getTransactions: ActualClient['getTransactions'];
  importTransactions: ActualClient['importTransactions'];
  updateTransaction: ActualClient['updateTransaction'];
  deleteTransaction: ActualClient['deleteTransaction'];
}

export const TOOL_NAMES = [
  'actual_health',
  'actual_list_accounts',
  'actual_get_account',
  'actual_list_categories',
  'actual_list_payees',
  'actual_get_transactions',
  'actual_import_transactions',
  'actual_update_transaction',
  'actual_delete_transaction',
  'actual_sync'
] as const;

export function createMcpServer(runtime: ToolRuntime, logger: Logger): McpServer {
  const server = new McpServer(
    { name: 'actual-budget-mcp', title: 'Actual Budget MCP', version: '0.1.0' },
    { instructions: 'Amounts are integer minor units. Use confirmDestructive=true only for an explicitly authorized deletion.' }
  );

  server.registerTool(
    'actual_health',
    {
      title: 'Check Actual health',
      description: 'Check Actual Server connectivity and local budget state without exposing credentials.',
      inputSchema: emptyInput,
      outputSchema: z.object({
        connected: z.boolean(), server: z.string(), budgetLoaded: z.boolean(), version: z.string().optional(), diagnosticCode: z.string().optional()
      }).describe('Sanitized Actual connectivity and local budget status.'),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult(await runtime.health()); } catch (error) { return toolError(error, 'actual_health', logger); }
    }
  );

  server.registerTool(
    'actual_sync',
    {
      title: 'Synchronize Actual budget',
      description: 'Synchronize the loaded local budget with Actual Server.',
      inputSchema: emptyInput,
      outputSchema: z.object({ success: z.literal(true), synchronizedAt: z.iso.datetime() }).describe('Successful synchronization result and completion timestamp.'),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult(await runtime.sync()); } catch (error) { return toolError(error, 'actual_sync', logger); }
    }
  );

  server.registerTool(
    'actual_list_accounts',
    {
      title: 'List Actual accounts',
      description: 'List every Actual account with its official ledger balance when available.',
      inputSchema: emptyInput,
      outputSchema: z.object({ accounts: z.array(accountSchema) }).describe('All Actual accounts and available ledger balances.'),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ accounts: await runtime.listAccounts() }); } catch (error) { return toolError(error, 'actual_list_accounts', logger); }
    }
  );

  server.registerTool(
    'actual_get_account',
    {
      title: 'Get Actual account',
      description: 'Get one Actual account by its opaque identifier, including its official ledger balance.',
      inputSchema: z.object({ accountId: opaqueIdSchema.describe('Opaque Actual account identifier.') }).strict().describe('Opaque identifier of the requested account.'),
      outputSchema: z.object({ account: accountSchema }).describe('The requested Actual account and available ledger balance.'),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId }) => {
      try { return successResult({ account: await runtime.getAccount(accountId) }); } catch (error) { return toolError(error, 'actual_get_account', logger); }
    }
  );

  server.registerTool(
    'actual_list_categories',
    {
      title: 'List Actual categories',
      description: 'List Actual category groups while preserving their nested categories.',
      inputSchema: emptyInput,
      outputSchema: z.object({ categoryGroups: z.array(z.object({
        groupId: opaqueIdSchema, groupName: z.string(), categories: z.array(z.object({ id: opaqueIdSchema, name: z.string(), hidden: z.boolean() }))
      })) }).describe('Actual category groups with nested categories.'),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ categoryGroups: await runtime.listCategories() }); } catch (error) { return toolError(error, 'actual_list_categories', logger); }
    }
  );

  server.registerTool(
    'actual_list_payees',
    {
      title: 'List Actual payees',
      description: 'List every Actual payee with its opaque identifier and user-authored name.',
      inputSchema: emptyInput,
      outputSchema: z.object({ payees: z.array(z.object({ id: opaqueIdSchema, name: z.string() })) }).describe('Every Actual payee and opaque identifier.'),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      try { return successResult({ payees: await runtime.listPayees() }); } catch (error) { return toolError(error, 'actual_list_payees', logger); }
    }
  );

  server.registerTool(
    'actual_get_transactions',
    {
      title: 'Get Actual transactions',
      description: 'Get transactions for one account over an inclusive period of at most 366 days.',
      inputSchema: getTransactionsInput,
      outputSchema: z.object({ transactions: z.array(transactionSchema) }).describe('Transactions returned for the requested bounded date range.'),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, startDate, endDate }) => {
      try { return successResult({ transactions: await runtime.getTransactions(accountId, startDate, endDate) }); } catch (error) { return toolError(error, 'actual_get_transactions', logger); }
    }
  );

  server.registerTool(
    'actual_import_transactions',
    {
      title: 'Import Actual transactions',
      description: 'Import up to 500 transactions idempotently using required opaque imported_id values.',
      inputSchema: z.object({ accountId: opaqueIdSchema, transactions: batchSchema(importItemSchema) }).strict().describe('Target account and one to 500 idempotent import items.'),
      outputSchema: z.object({ added: z.array(opaqueIdSchema), updated: z.array(opaqueIdSchema), errors: z.array(z.object({ message: z.string() })) }).describe('Official reconciliation outcome with sanitized item errors.'),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ accountId, transactions }) => {
      try { return successResult(await runtime.importTransactions(accountId, transactions as Omit<ImportTransaction, 'account'>[])); } catch (error) { return toolError(error, 'actual_import_transactions', logger); }
    }
  );

  server.registerTool(
    'actual_update_transaction',
    {
      title: 'Update Actual transaction',
      description: 'Update only the permitted fields of one Actual transaction, then synchronize.',
      inputSchema: z.object({ transactionId: opaqueIdSchema, fields: updateFields }).strict().describe('Target transaction and allowlisted partial update.'),
      outputSchema: z.object({ success: z.literal(true), transactionId: opaqueIdSchema }).describe('Successful synchronized transaction update.'),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ transactionId, fields }) => {
      try { return successResult(await runtime.updateTransaction(transactionId, fields as Partial<AdapterTransaction>)); } catch (error) { return toolError(error, 'actual_update_transaction', logger); }
    }
  );

  server.registerTool(
    'actual_delete_transaction',
    {
      title: 'Delete Actual transaction',
      description: 'DESTRUCTIVE OPERATION: Permanently delete one Actual transaction only after explicit confirmation, then synchronize.',
      inputSchema: z.object({ transactionId: opaqueIdSchema, confirmDestructive: z.literal(true, 'confirmDestructive must be true.') }).strict().describe('Target transaction and literal destructive confirmation.'),
      outputSchema: z.object({ success: z.literal(true), transactionId: opaqueIdSchema }).describe('Successful synchronized transaction deletion.'),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ transactionId }) => {
      try { return successResult(await runtime.deleteTransaction(transactionId)); } catch (error) { return toolError(error, 'actual_delete_transaction', logger); }
    }
  );

  void errorOutput;
  return server;
}
